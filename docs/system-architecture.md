# System Architecture

NestJS + GraphQL e-commerce backend. Deployable as a local HTTP server or an AWS Lambda function behind API Gateway. Phase 4 (Notification Service) is complete.

---

## Module Map

```
src/
├── app.module.ts             # Root module; registers all feature modules and global guards
├── main.ts                   # Local HTTP bootstrap (port 3000)
├── lambda.ts                 # Lambda bootstrap — cached handler, callbackWaitsForEmptyEventLoop=false
├── data-source.ts            # TypeORM DataSource for CLI migrations
├── config/
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── aws.config.ts
│   └── redis.config.ts
├── common/
│   ├── decorators/           # @CurrentUser, @Roles, @Public
│   ├── guards/               # JwtAuthGuard (global), RolesGuard (global)
│   ├── filters/              # HttpExceptionFilter
│   └── transformers/
│       └── price.transformer.ts   # DECIMAL → number for TypeORM columns
└── modules/
    ├── auth/                 # JWT register/login
    ├── users/                # User + Address entities, DataLoader
    ├── finance/              # Transaction entity and resolver
    ├── catalog/              # Product + Category, S3 signed-URL images, paginated list
    ├── orders/               # Cart (Redis) + Order CQRS pipeline + SNS publish via NotificationsService
    └── notifications/        # NotificationsService — SNS fan-out for order events
```

---

## Transport Layer

| Mode | Entry point | Notes |
|------|-------------|-------|
| Local dev | `src/main.ts` | `nest start --watch`, port 3000 |
| Lambda | `src/lambda.ts` | `@vendia/serverless-express` adapter; handler cached per execution environment |

GraphQL endpoint: `/graphql` (local) or `/api/graphql` (Lambda, global prefix `api`).

`autoSchemaFile` writes `src/schema.gql` locally; in Lambda it generates in-memory because `/var/task` is read-only.

CSRF prevention and introspection are toggled by `NODE_ENV`.

---

## Authentication & Authorization

- **Strategy**: JWT via `passport-jwt`. `JwtAuthGuard` is registered as a global `APP_GUARD`.
- **Public routes**: decorated with `@Public()` — the guard skips them.
- **Role enforcement**: `RolesGuard` is the second global guard; resolvers use `@Roles(UserRole.ADMIN)`.
- **Roles**: `UserRole.ADMIN` and `UserRole.USER` (stored as a Postgres enum on the `users` table).
- Passwords are hashed with `bcryptjs` at salt rounds 12.

---

## Database

- **Engine**: PostgreSQL via TypeORM 0.3.
- **Entity registration**: explicit array in `AppModule` (required for esbuild bundling — glob patterns do not survive bundling).
- **Migrations**: CLI-driven via `npm run migration:generate / migration:run`.
- `synchronize` is enabled only when `NODE_ENV !== 'production'`.
- SSL is enabled automatically when `DB_HOST` is set to a non-localhost value.

### Entities

| Table | Entity | Notes |
|-------|--------|-------|
| `users` | `User` | email indexed, role enum |
| `addresses` | `Address` | belongs to user, cascade delete |
| `transactions` | `Transaction` | belongs to user |
| `categories` | `Category` | — |
| `products` | `Product` | categoryId FK, stock int, imageKeys text[], price DECIMAL |
| `orders` | `Order` | userId indexed, status enum, totalAmount DECIMAL |
| `order_items` | `OrderItem` | orderId indexed, unitPrice DECIMAL (price snapshot) |

`priceTransformer` (`src/common/transformers/price.transformer.ts`) is applied to every `DECIMAL` price column — PostgreSQL returns decimals as strings; the transformer parses them back to `number`.

---

## Modules

### Auth (`src/modules/auth`)
GraphQL mutations `register` and `login`. Returns `{ accessToken, user }`. JWT payload: `{ sub: userId, email }`.

### Users (`src/modules/users`)
CRUD for `User` and `Address`. `UsersDataLoader` batches user lookups by ID to prevent N+1 queries.

### Finance (`src/modules/finance`)
`Transaction` entity and resolver. Tracks financial records linked to users.

### Catalog (`src/modules/catalog`)

- **Products**: paginated list (`ProductsArgs`), create/update/delete (admin), S3 presigned upload URL.
- **Categories**: CRUD, `CategoriesDataLoader` for batch resolution.
- **S3**: `S3Service` generates presigned GET/PUT URLs; image keys stored on the product, resolved to URLs at query time via `@ResolveField`.

### Orders (`src/modules/orders`) — Phase 3

See [Order Service](#order-service) section below.

### Notifications (`src/modules/notifications`) — Phase 4

`NotificationsService` wraps `@aws-sdk/client-sns` and publishes `OrderEvent` messages to the SNS topic configured at `aws.orderTopicArn` (`ORDER_EVENTS_TOPIC_ARN`). If the env var is absent, `publishOrderEvent` returns early — no error is thrown (local dev without SNS).

Each published message includes two `MessageAttributes` — `eventType` and `userId` — enabling SNS filter policies on subscriber queues (e.g. `order-processor` and `email-notifier` SQS queues).

`NotificationsModule` exports `NotificationsService` for injection into `OrdersModule`.

---

## Order Service

### Cart (Redis)

- **Storage**: Redis hash `cart:{userId}` — field = `productId`, value = quantity string.
- **Quantity accumulation**: `HINCRBY` — repeated `addToCart` calls increment, not replace.
- **TTL**: 24 hours, refreshed on every write (`EXPIRE cart:{userId} 86400`).
- **Redis provider**: module-level singleton (`RedisProvider`) — connection is reused across Lambda warm invocations.

| Operation | GraphQL | Implementation |
|-----------|---------|----------------|
| View cart | `query myCart` | `HGETALL` + product lookup for prices |
| Add item | `mutation addToCart(input: AddToCartInput)` | `HINCRBY` |
| Remove item | `mutation removeFromCart(productId: ID)` | `HDEL` |

`CartType` returns `items[]` (each with `productId`, `product`, `quantity`, `subtotal`) and a `total` float.

### Order CQRS Pipeline

```
placeOrder mutation
  → PlaceOrderCommand
    → PlaceOrderHandler
        1. Validate cart is non-empty
        2. Validate address ownership (IDOR: address.userId === command.userId)
        3. DB transaction:
           a. Load products, validate stock
           b. Build OrderItem[] with unitPrice snapshot
           c. Save Order + cascade OrderItems
           d. Atomic stock decrement:
              UPDATE products SET stock = stock - qty
              WHERE id = ? AND stock >= qty
        4. Clear cart (best-effort, outside transaction)
        5. Publish OrderPlacedEvent
  → OrderPlacedEvent
    → OrderPlacedHandler → NotificationsService.publishOrderEvent({ eventType: 'OrderPlaced', ... })
                             → SNS order-events topic
                               → order-processor SQS queue  (filter: eventType = OrderPlaced)
                               → email-notifier SQS queue   (filter: eventType = OrderPlaced)

updateOrderStatus mutation (admin)
  → UpdateOrderStatusCommand
    → UpdateOrderStatusHandler
        1. Load order; throw NotFoundException if missing
        2. Save updated status to DB
        3. NotificationsService.publishOrderEvent({ eventType: 'OrderStatusUpdated', ... })  [best-effort]
```

The stock decrement uses a conditional `WHERE stock >= quantity` guard — if another request races and drains stock between the validation check and the update, the affected-rows count will be 0 and a `BadRequestException` is thrown, rolling back the transaction.

### Order Queries & Mutations

| Operation | Auth | Description |
|-----------|------|-------------|
| `mutation placeOrder(shippingAddressId)` | user | Converts cart to order |
| `query myOrders` | user | All orders for current user |
| `query myOrder(id)` | user | Single order; ownership enforced in `GetOrderHandler` |
| `mutation updateOrderStatus(id, status)` | admin only | State machine update |

### OrderStatus Enum

`pending` → `confirmed` → `processing` → `shipped` → `delivered` | `cancelled`

No transition enforcement is implemented in Phase 3 — any status can be set by an admin.

### SNS Fan-out (Phase 4)

`OrderPlacedHandler` and `UpdateOrderStatusHandler` both call `NotificationsService.publishOrderEvent()` instead of the previous direct `SqsService.sendOrderPlaced()` call. `SqsService` remains in the codebase but is no longer wired into `OrdersModule`.

| Event | Trigger | `eventType` attribute |
|-------|---------|----------------------|
| `OrderPlaced` | `placeOrder` mutation completes | `OrderPlaced` |
| `OrderStatusUpdated` | admin `updateOrderStatus` commits to DB | `OrderStatusUpdated` |

Both publishes are **best-effort**: failures are caught, logged via `Logger.error`, and not re-thrown — a SNS outage does not surface as a 500 to the caller.

**MessageAttributes** on every publish:

| Attribute | Type | Purpose |
|-----------|------|---------|
| `eventType` | String | SNS filter policy routing |
| `userId` | String | SNS filter policy routing |

**Env var**: `ORDER_EVENTS_TOPIC_ARN` → `aws.orderTopicArn`. Absent value skips the publish silently.

---

## Infrastructure & Deployment

### AWS Resources

| Resource | Purpose |
|----------|---------|
| API Gateway + Lambda | HTTP handler |
| RDS PostgreSQL | Primary database |
| ElastiCache Redis | Cart storage |
| SNS topic (`order-events`) | Order event fan-out; publishes `OrderPlaced` and `OrderStatusUpdated` |
| SQS queues | Subscribers to SNS topic (e.g. `order-processor`, `email-notifier`) |
| S3 bucket | Product image storage |

### Build for Lambda

```bash
npm run build:lambda   # esbuild bundles to dist/bundle.js
npm run package:lambda # zips to function.zip
```

### Migrations

```bash
npm run migration:generate -- --name <MigrationName>
npm run migration:run
npm run migration:revert
```

---

## Security Notes

- Address IDOR: `PlaceOrderHandler` checks `address.userId === command.userId` before proceeding.
- Order ownership: `GetOrderHandler` enforces `order.userId === query.userId`, throwing `ForbiddenException('Access denied')` on mismatch.
- Global guards run on every resolver — `@Public()` opt-out is explicit.
- `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` strips and rejects unknown fields.

---

## Key Conventions

- All `DECIMAL` columns use `priceTransformer` to avoid string-typed prices leaking into GraphQL.
- Cart clear after order placement is intentionally outside the DB transaction — a failed clear does not roll back the order.
- GraphQL subscriptions are not used; clients poll `myOrder(id)` for status updates (Lambda does not support persistent connections).
- `@nestjs/cqrs` v11 wires commands, queries, and events through `CommandBus`, `QueryBus`, and `EventBus` without custom infrastructure.

---

_Last updated: 2026-05-28 — reflects Phase 4 (Notification Service) completion._

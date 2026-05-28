# 2026-05-28 — Phase 3 & 4: Order Service + Notification Service

## Phase 3 — Order Service

Implemented the full order lifecycle with CQRS and Redis-backed cart.

**Key decisions:**
- Cart uses Redis HSET/`hincrby` (accumulation semantics), 24h TTL, NaN-guarded reads. `getCartItems` filters invalid quantities before they reach SQL.
- `PlaceOrderHandler` wraps all DB writes in `DataSource.transaction()` — order creation + stock decrements are atomic. Each `UPDATE` result is checked for `affected > 0`; zero rows triggers rollback + `BadRequestException` (prevents oversell under concurrency).
- Address ownership validated before persisting (`shippingAddressId` must belong to requesting user — IDOR fix).
- `priceTransformer` extracted to `src/common/transformers/price.transformer.ts`; shared across Product, Order, OrderItem — PostgreSQL returns DECIMAL as string, transformer parses to float with NaN→0 guard.
- `csrfPrevention` and `introspection` made environment-conditional (production-safe).

## Phase 4 — Notification Service

Replaced direct SQS send with SNS fan-out.

**Key decisions:**
- `NotificationsService` publishes `OrderPlaced` and `OrderStatusUpdated` events to SNS with `MessageAttributes` (`eventType`, `userId`) enabling per-subscriber filter policies.
- SNS fan-out target: `order-processor` + `email-notifier` SQS queues (infrastructure wired manually).
- Both event/command handlers wrap `publishOrderEvent` in try/catch + `Logger.error` — SNS failures are observable but non-fatal. The DB write already committed; surfacing a 500 would be worse than logging and continuing.
- `SqsService` removed from `OrdersModule` after migration (dead code).
- `topicArn` guard (skip publish if env var empty) preserves local dev compatibility.

## State
- TypeScript: zero errors. Build: clean. Tests: 2 pre-existing bcrypt spy failures in `auth.service.spec.ts` (unrelated).
- Phase 5 (Tests & CI) is next.

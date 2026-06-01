const { Client } = require('pg');

const DB = {
  host: 'nestjs-db-apac.cjsy2mekuouh.ap-southeast-1.rds.amazonaws.com',
  port: 5432,
  database: 'nestjs_graphql',
  user: 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
};

async function run() {
  const client = new Client(DB);
  await client.connect();
  console.log('Connected to DB');

  // ── 1. Create all tables ─────────────────────────────────────────────────
  await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  await client.query(`DO $$ BEGIN
    CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'user');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "email" character varying NOT NULL,
      "password" character varying NOT NULL,
      "name" character varying NOT NULL,
      "role" "public"."users_role_enum" NOT NULL DEFAULT 'user',
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_users_email" UNIQUE ("email"),
      CONSTRAINT "PK_users" PRIMARY KEY ("id")
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email")`);
  console.log('users ✓');

  await client.query(`
    CREATE TABLE IF NOT EXISTS "addresses" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "street" character varying NOT NULL,
      "city" character varying NOT NULL,
      "country" character varying NOT NULL,
      "postalCode" character varying,
      "isDefault" boolean NOT NULL DEFAULT false,
      "userId" uuid NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_addresses" PRIMARY KEY ("id"),
      CONSTRAINT "FK_addresses_userId" FOREIGN KEY ("userId")
        REFERENCES "users"("id") ON DELETE CASCADE
    )
  `);
  console.log('addresses ✓');

  await client.query(`
    CREATE TABLE IF NOT EXISTS "categories" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "name" character varying NOT NULL,
      "description" character varying,
      "isActive" boolean NOT NULL DEFAULT true,
      "parentId" uuid,
      CONSTRAINT "UQ_categories_name" UNIQUE ("name"),
      CONSTRAINT "PK_categories" PRIMARY KEY ("id")
    )
  `);
  // Add parentId FK if missing
  await client.query(`
    DO $$ BEGIN
      ALTER TABLE "categories"
        ADD COLUMN IF NOT EXISTS "parentId" uuid;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$
  `);
  console.log('categories ✓');

  await client.query(`
    CREATE TABLE IF NOT EXISTS "categories_closure" (
      "id_ancestor" uuid NOT NULL,
      "id_descendant" uuid NOT NULL,
      CONSTRAINT "PK_categories_closure" PRIMARY KEY ("id_ancestor", "id_descendant"),
      CONSTRAINT "FK_categories_closure_ancestor" FOREIGN KEY ("id_ancestor")
        REFERENCES "categories"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_categories_closure_descendant" FOREIGN KEY ("id_descendant")
        REFERENCES "categories"("id") ON DELETE CASCADE
    )
  `);
  console.log('categories_closure ✓');

  await client.query(`
    CREATE TABLE IF NOT EXISTS "products" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "name" character varying NOT NULL,
      "description" text,
      "price" numeric(10,2) NOT NULL,
      "stock" integer NOT NULL DEFAULT 0,
      "imageKeys" text[] NOT NULL DEFAULT '{}',
      "isActive" boolean NOT NULL DEFAULT true,
      "categoryId" uuid NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_products" PRIMARY KEY ("id"),
      CONSTRAINT "FK_products_categoryId" FOREIGN KEY ("categoryId")
        REFERENCES "categories"("id") ON DELETE RESTRICT
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS "IDX_products_categoryId" ON "products" ("categoryId")`);
  console.log('products ✓');

  await client.query(`DO $$ BEGIN
    CREATE TYPE "public"."orders_status_enum" AS ENUM('pending','confirmed','processing','shipped','delivered','cancelled');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "orders" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "userId" uuid NOT NULL,
      "status" "public"."orders_status_enum" NOT NULL DEFAULT 'pending',
      "totalAmount" numeric(10,2) NOT NULL,
      "shippingAddressId" uuid,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_orders" PRIMARY KEY ("id"),
      CONSTRAINT "FK_orders_userId" FOREIGN KEY ("userId")
        REFERENCES "users"("id") ON DELETE CASCADE
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS "IDX_orders_userId" ON "orders" ("userId")`);
  console.log('orders ✓');

  await client.query(`
    CREATE TABLE IF NOT EXISTS "order_items" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "orderId" uuid NOT NULL,
      "productId" uuid NOT NULL,
      "quantity" integer NOT NULL,
      "unitPrice" numeric(10,2) NOT NULL,
      CONSTRAINT "PK_order_items" PRIMARY KEY ("id"),
      CONSTRAINT "FK_order_items_orderId" FOREIGN KEY ("orderId")
        REFERENCES "orders"("id") ON DELETE CASCADE
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS "IDX_order_items_orderId" ON "order_items" ("orderId")`);
  console.log('order_items ✓');

  // ── 2. Seed demo users ───────────────────────────────────────────────────
  // bcrypt hash for "demo1234" with salt 10
  const bcrypt = require('bcryptjs');
  const demoPass = await bcrypt.hash('demo1234', 10);
  await client.query(`
    INSERT INTO users (email, password, name, role) VALUES
      ('admin@demo.com', $1, 'Admin Demo', 'admin'),
      ('user@demo.com', $1, 'User Demo', 'user')
    ON CONFLICT (email) DO NOTHING
  `, [demoPass]);
  console.log('demo users ✓');

  // ── 3. Seed categories ───────────────────────────────────────────────────
  const cats = [
    { name: 'Electronics', desc: 'Gadgets and electronic devices' },
    { name: 'Clothing', desc: 'Fashion and apparel' },
    { name: 'Books', desc: 'Books, eBooks and literature' },
    { name: 'Home & Kitchen', desc: 'Home appliances and kitchenware' },
    { name: 'Sports', desc: 'Sports equipment and fitness gear' },
  ];
  const catIds = {};
  for (const c of cats) {
    const res = await client.query(
      `INSERT INTO categories (name, description)
       VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
       RETURNING id`,
      [c.name, c.desc]
    );
    catIds[c.name] = res.rows[0].id;
    console.log(`category "${c.name}" → ${catIds[c.name]}`);
  }

  // Sub-categories
  const subCats = [
    { name: 'Smartphones', parent: 'Electronics', desc: 'Mobile phones' },
    { name: 'Laptops', parent: 'Electronics', desc: 'Portable computers' },
    { name: "Men's Clothing", parent: 'Clothing', desc: 'Clothing for men' },
    { name: "Women's Clothing", parent: 'Clothing', desc: 'Clothing for women' },
    { name: 'Fiction', parent: 'Books', desc: 'Fiction and novels' },
    { name: 'Non-Fiction', parent: 'Books', desc: 'Non-fiction books' },
  ];
  for (const s of subCats) {
    const res = await client.query(
      `INSERT INTO categories (name, description, "parentId")
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
       RETURNING id`,
      [s.name, s.desc, catIds[s.parent]]
    );
    catIds[s.name] = res.rows[0].id;
    console.log(`  sub-category "${s.name}" → ${catIds[s.name]}`);
  }

  // ── 4. Seed products ─────────────────────────────────────────────────────
  const products = [
    { name: 'iPhone 15 Pro', desc: 'Apple iPhone 15 Pro 256GB, Titanium finish', price: 999.99, stock: 50, cat: 'Smartphones' },
    { name: 'Samsung Galaxy S24', desc: 'Samsung Galaxy S24 Ultra 512GB', price: 1099.99, stock: 40, cat: 'Smartphones' },
    { name: 'MacBook Pro 14"', desc: 'Apple MacBook Pro 14-inch M3 chip, 16GB RAM', price: 1999.99, stock: 25, cat: 'Laptops' },
    { name: 'Dell XPS 13', desc: 'Dell XPS 13 Plus, Intel Core i7, 16GB', price: 1299.99, stock: 30, cat: 'Laptops' },
    { name: 'Classic Oxford Shirt', desc: 'Men\'s slim-fit Oxford button-down shirt', price: 49.99, stock: 100, cat: "Men's Clothing" },
    { name: 'Chino Pants', desc: 'Men\'s stretch chino pants, multiple colors', price: 59.99, stock: 80, cat: "Men's Clothing" },
    { name: 'Floral Midi Dress', desc: 'Women\'s floral print midi dress', price: 69.99, stock: 60, cat: "Women's Clothing" },
    { name: 'The Great Gatsby', desc: 'F. Scott Fitzgerald classic novel', price: 12.99, stock: 200, cat: 'Fiction' },
    { name: 'Atomic Habits', desc: 'James Clear - Build good habits, break bad ones', price: 16.99, stock: 150, cat: 'Non-Fiction' },
    { name: 'Yoga Mat Premium', desc: 'Non-slip 6mm thick yoga mat with carrying strap', price: 39.99, stock: 75, cat: 'Sports' },
    { name: 'Running Shoes X1', desc: 'Lightweight breathable running shoes', price: 89.99, stock: 45, cat: 'Sports' },
    { name: 'Air Fryer 5L', desc: 'Digital air fryer 5-liter capacity', price: 79.99, stock: 35, cat: 'Home & Kitchen' },
    { name: 'Coffee Maker Pro', desc: 'Programmable drip coffee maker 12-cup', price: 49.99, stock: 55, cat: 'Home & Kitchen' },
  ];

  const prodIds = [];
  for (const p of products) {
    const res = await client.query(
      `INSERT INTO products (name, description, price, stock, "categoryId")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [p.name, p.desc, p.price, p.stock, catIds[p.cat]]
    );
    if (res.rows[0]) {
      prodIds.push({ id: res.rows[0].id, price: p.price, name: p.name });
      console.log(`product "${p.name}" → ${res.rows[0].id}`);
    } else {
      console.log(`product "${p.name}" already exists, skipping`);
    }
  }

  // ── 4. Seed address for demo users ───────────────────────────────────────
  const usersRes = await client.query(`SELECT id, email FROM users WHERE email IN ($1,$2)`, [
    'admin@demo.com',
    'user@demo.com',
  ]);
  const usersMap = {};
  for (const u of usersRes.rows) usersMap[u.email] = u.id;
  console.log('Demo users found:', Object.keys(usersMap));

  for (const [email, userId] of Object.entries(usersMap)) {
    const existing = await client.query(`SELECT id FROM addresses WHERE "userId" = $1 LIMIT 1`, [userId]);
    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO addresses (street, city, country, "postalCode", "isDefault", "userId")
         VALUES ($1, $2, $3, $4, true, $5)`,
        ['123 Demo Street', 'Ho Chi Minh City', 'Vietnam', '700000', userId]
      );
      console.log(`address created for ${email}`);
    } else {
      console.log(`address already exists for ${email}`);
    }
  }

  // ── 5. Seed demo order for user@demo.com ─────────────────────────────────
  const userId = usersMap['user@demo.com'];
  if (userId && prodIds.length >= 2) {
    const addrRes = await client.query(`SELECT id FROM addresses WHERE "userId" = $1 LIMIT 1`, [userId]);
    const addrId = addrRes.rows[0]?.id;

    const existingOrder = await client.query(`SELECT id FROM orders WHERE "userId" = $1 LIMIT 1`, [userId]);
    if (existingOrder.rows.length === 0) {
      const item1 = prodIds[0];
      const item2 = prodIds[2];
      const total = (item1.price + item2.price).toFixed(2);

      const orderRes = await client.query(
        `INSERT INTO orders ("userId", status, "totalAmount", "shippingAddressId")
         VALUES ($1, 'delivered', $2, $3) RETURNING id`,
        [userId, total, addrId]
      );
      const orderId = orderRes.rows[0].id;

      await client.query(
        `INSERT INTO order_items ("orderId", "productId", quantity, "unitPrice") VALUES ($1, $2, 1, $3)`,
        [orderId, item1.id, item1.price]
      );
      await client.query(
        `INSERT INTO order_items ("orderId", "productId", quantity, "unitPrice") VALUES ($1, $2, 1, $3)`,
        [orderId, item2.id, item2.price]
      );
      console.log(`demo order created for user@demo.com → ${orderId}`);
    } else {
      console.log('demo order already exists');
    }
  }

  await client.end();
  console.log('\n✅ All done!');
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

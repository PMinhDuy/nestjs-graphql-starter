const { Client } = require('pg');

const RDS = {
  host: 'nestjs-db-apac.cjsy2mekuouh.ap-southeast-1.rds.amazonaws.com',
  port: 5432,
  database: 'nestjs_graphql',
  user: 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
};

const NEON = {
  connectionString: process.env.NEON_URL,
  ssl: { rejectUnauthorized: false },
};

async function copyTable(src, dst, table, columns) {
  const { rows } = await src.query(`SELECT * FROM "${table}"`);
  if (!rows.length) { console.log(`  ${table}: empty, skip`); return; }

  const cols = columns.map(c => `"${c}"`).join(', ');
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

  for (const row of rows) {
    const vals = columns.map(c => row[c]);
    await dst.query(
      `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
      vals
    );
  }
  console.log(`  ${table}: ${rows.length} rows ✓`);
}

async function run() {
  const src = new Client(RDS);
  const dst = new Client(NEON);
  await src.connect();
  await dst.connect();
  console.log('Connected to both DBs\n');

  // ── 1. Create schema on Neon ─────────────────────────────────────────────
  console.log('Creating schema on Neon...');
  await dst.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  await dst.query(`DO $$ BEGIN
    CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'user');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

  await dst.query(`DO $$ BEGIN
    CREATE TYPE "public"."orders_status_enum" AS ENUM('pending','confirmed','processing','shipped','delivered','cancelled');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

  await dst.query(`CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email varchar NOT NULL CONSTRAINT uq_users_email UNIQUE,
    password varchar NOT NULL,
    name varchar NOT NULL,
    role "public"."users_role_enum" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
  )`);

  await dst.query(`CREATE TABLE IF NOT EXISTS addresses (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    street varchar NOT NULL,
    city varchar NOT NULL,
    country varchar NOT NULL,
    "postalCode" varchar,
    "isDefault" boolean NOT NULL DEFAULT false,
    "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now()
  )`);

  await dst.query(`CREATE TABLE IF NOT EXISTS categories (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar NOT NULL CONSTRAINT uq_categories_name UNIQUE,
    description varchar,
    "isActive" boolean NOT NULL DEFAULT true,
    "parentId" uuid
  )`);

  await dst.query(`CREATE TABLE IF NOT EXISTS categories_closure (
    id_ancestor uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    id_descendant uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (id_ancestor, id_descendant)
  )`);

  await dst.query(`CREATE TABLE IF NOT EXISTS products (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    stock integer NOT NULL DEFAULT 0,
    "imageKeys" text[] NOT NULL DEFAULT '{}',
    "isActive" boolean NOT NULL DEFAULT true,
    "categoryId" uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
  )`);

  await dst.query(`CREATE TABLE IF NOT EXISTS orders (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status "public"."orders_status_enum" NOT NULL DEFAULT 'pending',
    "totalAmount" numeric(10,2) NOT NULL,
    "shippingAddressId" uuid,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
  )`);

  await dst.query(`CREATE TABLE IF NOT EXISTS order_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "orderId" uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    "productId" uuid NOT NULL,
    quantity integer NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL
  )`);

  await dst.query(`CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    timestamp bigint NOT NULL,
    name varchar NOT NULL
  )`);

  console.log('Schema created ✓\n');

  // ── 2. Copy data (order matters for FK constraints) ───────────────────────
  console.log('Copying data...');
  await copyTable(src, dst, 'users',     ['id','email','password','name','role','createdAt','updatedAt']);
  await copyTable(src, dst, 'addresses', ['id','street','city','country','postalCode','isDefault','userId','createdAt']);
  await copyTable(src, dst, 'categories',['id','name','description','isActive','parentId']);
  await copyTable(src, dst, 'categories_closure', ['id_ancestor','id_descendant']);
  await copyTable(src, dst, 'products',  ['id','name','description','price','stock','imageKeys','isActive','categoryId','createdAt','updatedAt']);
  await copyTable(src, dst, 'orders',    ['id','userId','status','totalAmount','shippingAddressId','createdAt','updatedAt']);
  await copyTable(src, dst, 'order_items',['id','orderId','productId','quantity','unitPrice']);
  await copyTable(src, dst, 'migrations',['timestamp','name']);

  await src.end();
  await dst.end();
  console.log('\n✅ Migration complete!');
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1); });

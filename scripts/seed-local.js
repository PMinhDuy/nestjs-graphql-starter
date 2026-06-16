const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const DB = {
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432'),
  database: process.env.DB_NAME ?? 'nestjs_graphql',
  user: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  ssl: false,
};

async function run() {
  const client = new Client(DB);
  await client.connect();
  console.log('Connected to local DB');

  // ── Users ────────────────────────────────────────────────────────────────
  const demoPass = await bcrypt.hash('demo1234', 10);
  await client.query(
    `INSERT INTO users (email, password, name, role) VALUES
      ('admin@demo.com', $1, 'Admin Demo', 'admin'),
      ('user@demo.com',  $1, 'User Demo',  'user')
     ON CONFLICT (email) DO NOTHING`,
    [demoPass],
  );
  console.log('users ✓');

  // ── Categories ───────────────────────────────────────────────────────────
  const rootCats = [
    { name: 'Electronics',   desc: 'Gadgets and electronic devices' },
    { name: 'Clothing',      desc: 'Fashion and apparel' },
    { name: 'Books',         desc: 'Books, eBooks and literature' },
    { name: 'Home & Kitchen', desc: 'Home appliances and kitchenware' },
    { name: 'Sports',        desc: 'Sports equipment and fitness gear' },
  ];

  const catIds = {};
  for (const c of rootCats) {
    const res = await client.query(
      `INSERT INTO categories (name, description)
       VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
       RETURNING id`,
      [c.name, c.desc],
    );
    catIds[c.name] = res.rows[0].id;
  }

  // Root category self-references in closure table
  for (const id of Object.values(catIds)) {
    await client.query(
      `INSERT INTO categories_closure ("id_ancestor", "id_descendant") VALUES ($1, $1) ON CONFLICT DO NOTHING`,
      [id],
    );
  }

  const subCats = [
    { name: 'Smartphones',      parent: 'Electronics', desc: 'Mobile phones' },
    { name: 'Laptops',          parent: 'Electronics', desc: 'Portable computers' },
    { name: "Men's Clothing",   parent: 'Clothing',    desc: 'Clothing for men' },
    { name: "Women's Clothing", parent: 'Clothing',    desc: 'Clothing for women' },
    { name: 'Fiction',          parent: 'Books',       desc: 'Fiction and novels' },
    { name: 'Non-Fiction',      parent: 'Books',       desc: 'Non-fiction books' },
  ];
  for (const s of subCats) {
    const parentId = catIds[s.parent];
    const res = await client.query(
      `INSERT INTO categories (name, description, "parentId")
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, "parentId" = EXCLUDED."parentId"
       RETURNING id`,
      [s.name, s.desc, parentId],
    );
    const subId = res.rows[0].id;
    catIds[s.name] = subId;
    // Closure table: self-ref + parent→child
    await client.query(
      `INSERT INTO categories_closure ("id_ancestor", "id_descendant") VALUES ($1, $1), ($2, $1) ON CONFLICT DO NOTHING`,
      [subId, parentId],
    );
  }
  console.log('categories ✓');

  // ── Products ─────────────────────────────────────────────────────────────
  const products = [
    { name: 'iPhone 15 Pro',      desc: 'Apple iPhone 15 Pro 256GB, Titanium finish',          price: 999.99,  stock: 50,  cat: 'Smartphones' },
    { name: 'Samsung Galaxy S24', desc: 'Samsung Galaxy S24 Ultra 512GB',                      price: 1099.99, stock: 40,  cat: 'Smartphones' },
    { name: 'MacBook Pro 14"',    desc: 'Apple MacBook Pro 14-inch M3 chip, 16GB RAM',         price: 1999.99, stock: 25,  cat: 'Laptops' },
    { name: 'Dell XPS 13',        desc: 'Dell XPS 13 Plus, Intel Core i7, 16GB',               price: 1299.99, stock: 30,  cat: 'Laptops' },
    { name: 'Classic Oxford Shirt', desc: "Men's slim-fit Oxford button-down shirt",           price: 49.99,   stock: 100, cat: "Men's Clothing" },
    { name: 'Chino Pants',        desc: "Men's stretch chino pants, multiple colors",          price: 59.99,   stock: 80,  cat: "Men's Clothing" },
    { name: 'Floral Midi Dress',  desc: "Women's floral print midi dress",                     price: 69.99,   stock: 60,  cat: "Women's Clothing" },
    { name: 'The Great Gatsby',   desc: 'F. Scott Fitzgerald classic novel',                   price: 12.99,   stock: 200, cat: 'Fiction' },
    { name: 'Atomic Habits',      desc: 'James Clear - Build good habits, break bad ones',     price: 16.99,   stock: 150, cat: 'Non-Fiction' },
    { name: 'Yoga Mat Premium',   desc: 'Non-slip 6mm thick yoga mat with carrying strap',     price: 39.99,   stock: 75,  cat: 'Sports' },
    { name: 'Running Shoes X1',   desc: 'Lightweight breathable running shoes',                price: 89.99,   stock: 45,  cat: 'Sports' },
    { name: 'Air Fryer 5L',       desc: 'Digital air fryer 5-liter capacity',                  price: 79.99,   stock: 35,  cat: 'Home & Kitchen' },
    { name: 'Coffee Maker Pro',   desc: 'Programmable drip coffee maker 12-cup',               price: 49.99,   stock: 55,  cat: 'Home & Kitchen' },
  ];

  const prodIds = [];
  for (const p of products) {
    const res = await client.query(
      `INSERT INTO products (name, description, price, stock, "categoryId")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [p.name, p.desc, p.price, p.stock, catIds[p.cat]],
    );
    if (res.rows[0]) prodIds.push({ id: res.rows[0].id, price: p.price });
  }
  console.log(`products ✓ (${prodIds.length} inserted)`);

  // ── Addresses ────────────────────────────────────────────────────────────
  const usersRes = await client.query(
    `SELECT id, email FROM users WHERE email IN ('admin@demo.com', 'user@demo.com')`,
  );
  const usersMap = {};
  for (const u of usersRes.rows) usersMap[u.email] = u.id;

  for (const [email, userId] of Object.entries(usersMap)) {
    const existing = await client.query(
      `SELECT id FROM addresses WHERE "userId" = $1 LIMIT 1`,
      [userId],
    );
    if (!existing.rows.length) {
      await client.query(
        `INSERT INTO addresses (street, city, country, "postalCode", "isDefault", "userId")
         VALUES ($1, $2, $3, $4, true, $5)`,
        ['123 Demo Street', 'Ho Chi Minh City', 'Vietnam', '700000', userId],
      );
    }
  }
  console.log('addresses ✓');

  // ── Demo order (status: delivered — so reviews can be written) ───────────
  const userId = usersMap['user@demo.com'];
  if (userId && prodIds.length >= 3) {
    const existing = await client.query(
      `SELECT id FROM orders WHERE "userId" = $1 LIMIT 1`,
      [userId],
    );
    if (!existing.rows.length) {
      const addrRes = await client.query(
        `SELECT id FROM addresses WHERE "userId" = $1 LIMIT 1`,
        [userId],
      );
      const addrId = addrRes.rows[0]?.id;
      const [item1, item2] = [prodIds[0], prodIds[2]];
      const total = (item1.price + item2.price).toFixed(2);

      const orderRes = await client.query(
        `INSERT INTO orders ("userId", status, "totalAmount", "shippingAddressId")
         VALUES ($1, 'delivered', $2, $3) RETURNING id`,
        [userId, total, addrId],
      );
      const orderId = orderRes.rows[0].id;

      await client.query(
        `INSERT INTO order_items ("orderId", "productId", quantity, "unitPrice") VALUES ($1, $2, 1, $3)`,
        [orderId, item1.id, item1.price],
      );
      await client.query(
        `INSERT INTO order_items ("orderId", "productId", quantity, "unitPrice") VALUES ($1, $2, 1, $3)`,
        [orderId, item2.id, item2.price],
      );
      console.log(`demo order ✓ → ${orderId}`);
    } else {
      console.log('demo order already exists, skipping');
    }
  }

  await client.end();
  console.log('\n✅ Local seed complete!');
  console.log('   admin@demo.com / demo1234  (role: admin)');
  console.log('   user@demo.com  / demo1234  (role: user)');
}

run().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});

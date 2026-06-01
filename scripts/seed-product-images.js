const { Client } = require('pg');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const https = require('https');

const DB = {
  host: 'nestjs-db-apac.cjsy2mekuouh.ap-southeast-1.rds.amazonaws.com',
  port: 5432,
  database: 'nestjs_graphql',
  user: 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
};

const s3 = new S3Client({ region: 'ap-southeast-1' });
const BUCKET = 'nestjs-ecommerce-products';

// Map product name → loremflickr search keyword
const PRODUCT_IMAGES = {
  'iPhone 15 Pro':        'iphone,smartphone',
  'Samsung Galaxy S24':   'samsung,smartphone',
  'MacBook Pro 14"':      'macbook,laptop',
  'Dell XPS 13':          'laptop,computer',
  'Classic Oxford Shirt': 'oxford,shirt',
  'Chino Pants':          'chino,pants',
  'Floral Midi Dress':    'floral,dress',
  'The Great Gatsby':     'book,novel',
  'Atomic Habits':        'book,habits',
  'Yoga Mat Premium':     'yoga,mat',
  'Running Shoes X1':     'running,shoes',
  'Air Fryer 5L':         'airfryer,kitchen',
  'Coffee Maker Pro':     'coffee,maker',
};

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function downloadImage(url, baseHost = null) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        let location = res.headers.location;
        // Handle relative redirects
        if (location.startsWith('/')) {
          const host = baseHost || new URL(url).origin;
          location = host + location;
        }
        return downloadImage(location, baseHost || new URL(url).origin).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'image/jpeg' }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function run() {
  const client = new Client(DB);
  await client.connect();
  console.log('Connected to DB\n');

  const { rows: products } = await client.query('SELECT id, name FROM products ORDER BY name');

  for (const product of products) {
    const keyword = PRODUCT_IMAGES[product.name];
    if (!keyword) {
      console.log(`⚠  No image config for "${product.name}", skipping`);
      continue;
    }

    const slug = toSlug(product.name);
    const s3Key = `products/${slug}/main.jpg`;
    const imageUrl = `https://loremflickr.com/600/600/${keyword}`;

    process.stdout.write(`Downloading "${product.name}"... `);
    try {
      const { buffer, contentType } = await downloadImage(imageUrl);

      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
      }));

      await client.query(
        `UPDATE products SET "imageKeys" = $1 WHERE id = $2`,
        [[s3Key], product.id]
      );

      console.log(`✓ (${buffer.length} bytes → s3://${BUCKET}/${s3Key})`);
    } catch (err) {
      console.log(`✗ ${err.message}`);
    }
  }

  await client.end();
  console.log('\n✅ Done!');
}

run().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});

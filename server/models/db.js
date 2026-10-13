// 100PANIK - Baz done PostgreSQL (Supabase)
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connStr = process.env.DATABASE_URL;
if (!connStr) {
  console.error('❌ DATABASE_URL manke nan .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on('error', (err) => console.error('DB pool erè:', err.message));

// ---------- HELPERS ----------
async function query(text, params) {
  return pool.query(text, params);
}
async function get(text, params) {
  const res = await pool.query(text, params);
  return res.rows[0] || null;
}
async function all(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}
async function run(text, params) {
  const res = await pool.query(text, params);
  return {
    lastInsertRowid: res.rows[0] ? (res.rows[0].id || null) : null,
    changes: res.rowCount,
    rows: res.rows
  };
}

// ---------- INIT DB ----------
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL DEFAULT 0,
      compare_price REAL DEFAULT 0,
      category TEXT DEFAULT 'general',
      sizes TEXT DEFAULT '[]',
      colors TEXT DEFAULT '[]',
      images TEXT DEFAULT '[]',
      stock INTEGER DEFAULT 0,
      featured INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      department TEXT,
      city TEXT,
      notes TEXT,
      shipping_method TEXT DEFAULT 'standard',
      shipping_cost REAL DEFAULT 0,
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      promo_code TEXT,
      payment_method TEXT DEFAULT 'cod',
      status TEXT DEFAULT 'pending',
      tracking TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      size TEXT,
      color TEXT,
      image TEXT
    );

    CREATE TABLE IF NOT EXISTS shipping_zones (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      express_price REAL DEFAULT 0,
      estimated_days TEXT DEFAULT '3-5',
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS promo_codes (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      type TEXT DEFAULT 'percent',
      value REAL NOT NULL DEFAULT 0,
      min_total REAL DEFAULT 0,
      max_uses INTEGER DEFAULT 0,
      uses INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      expires_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password TEXT NOT NULL,
      address TEXT,
      department TEXT,
      city TEXT,
      avatar TEXT,
      verified INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ Tab yo pare');
}

// ---------- SEED ----------
async function seed() {
  const u = await get('SELECT COUNT(*)::int AS c FROM users');
  if (u.c === 0) {
    const email = process.env.ADMIN_EMAIL || 'metalluscarlinsky@gmail.com';
    const pass = process.env.ADMIN_PASS || '32924776';
    const hash = bcrypt.hashSync(pass, 10);
    await run('INSERT INTO users (username, password) VALUES ($1, $2)', [email, hash]);
    console.log('✅ Admin kreye: ' + email);
  }

  const z = await get('SELECT COUNT(*)::int AS c FROM shipping_zones');
  if (z.c === 0) {
    const zones = [
      ['Ouest (Port-au-Prince)', 250, 500, '1-2'],
      ['Nord (Cap-Haitien)', 400, 750, '2-3'],
      ['Nord-Est (Fort-Liberte)', 450, 850, '3-4'],
      ['Nord-Ouest (Port-de-Paix)', 500, 900, '3-5'],
      ['Artibonite (Gonaives)', 400, 750, '2-3'],
      ['Centre (Hinche)', 450, 850, '3-4'],
      ['Sud (Les Cayes)', 500, 900, '3-5'],
      ['Sud-Est (Jacmel)', 350, 700, '2-3'],
      ["Grand'Anse (Jeremie)", 550, 1000, '4-5'],
      ['Nippes (Miragoane)', 450, 850, '3-4'],
      ['Entenasyonal', 1500, 3000, '7-14']
    ];
    for (const zz of zones) {
      await run('INSERT INTO shipping_zones (name, price, express_price, estimated_days) VALUES ($1, $2, $3, $4)', zz);
    }
    console.log('✅ Zòn livrezon yo kreye');
  }

  const p = await get('SELECT COUNT(*)::int AS c FROM products');
  if (p.c === 0) {
    const demo = [
      ['Hoodie Neon Pulse', 'hoodie-neon-pulse', 'Hoodie premium ak detay neon.', 3500, 4500, 'hoodie', ['S','M','L','XL'], ['Nwa','Blan'], 20, 1],
      ['Tee Cyber Wave', 'tee-cyber-wave', 'T-shirt koton 100% ak design futurist.', 1500, 2000, 't-shirt', ['S','M','L','XL'], ['Nwa','Blan','Cyan'], 50, 1],
      ['Jogger Dark Mode', 'jogger-dark-mode', 'Jogger konfotab pou tout jou.', 2800, 3500, 'pantalon', ['S','M','L','XL'], ['Nwa'], 30, 0],
      ['Vest Panik Tech', 'vest-panik-tech', 'Vest techwear ak poch miltip.', 4200, 5200, 'veste', ['M','L','XL'], ['Nwa'], 15, 1]
    ];
    for (const d of demo) {
      await run(`INSERT INTO products (name, slug, description, price, compare_price, category, sizes, colors, stock, featured) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [d[0], d[1], d[2], d[3], d[4], d[5], JSON.stringify(d[6]), JSON.stringify(d[7]), d[8], d[9]]);
    }
    console.log('✅ Pwodwi demo kreye');
  }

  const s = await get('SELECT COUNT(*)::int AS c FROM settings');
  if (s.c === 0) {
    const defaults = {
      brand_name: '100PANIK',
      tagline: 'Rad pou moun ki pa janm kanpe.',
      contact_email: 'metalluscarlinsky@gmail.com',
      contact_phone: '+509 0000-0000',
      instagram: 'https://instagram.com/100panik',
      facebook: '',
      tiktok: '',
      primary_color: '#00f0ff',
      accent_color: '#ff0040'
    };
    for (const k of Object.keys(defaults)) {
      await run('INSERT INTO settings (key, value) VALUES ($1, $2)', [k, defaults[k]]);
    }
    console.log('✅ Settings default');
  }
}

module.exports = { query, get, all, run, pool, initDb, seed };

// 100PANIK - Baz done SQLite (node:sqlite built-in)
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  size TEXT,
  color TEXT,
  image TEXT,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shipping_zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  express_price REAL DEFAULT 0,
  estimated_days TEXT DEFAULT '3-5',
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS promo_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'percent',
  value REAL NOT NULL DEFAULT 0,
  min_total REAL DEFAULT 0,
  max_uses INTEGER DEFAULT 0,
  uses INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  expires_at DATETIME
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

function transaction(fn) {
  return (...args) => {
    db.exec('BEGIN');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  };
}
db.transaction = transaction;

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    const email = process.env.ADMIN_EMAIL || 'metalluscarlinsky@gmail.com';
    const pass = process.env.ADMIN_PASS || '32924776';
    const hash = bcrypt.hashSync(pass, 10);
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(email, hash);
    console.log('Admin kreye: ' + email + ' / ' + pass);
  }

  const zoneCount = db.prepare('SELECT COUNT(*) as c FROM shipping_zones').get().c;
  if (zoneCount === 0) {
    const zones = [
      ['Ouest (Port-au-Prince)', 250, 500, '1-2'],
      ['Nord (Cap-Haitien)', 400, 750, '2-3'],
      ['Nord-Est (Fort-Liberte)', 450, 850, '3-4'],
      ['Nord-Ouest (Port-de-Paix)', 500, 900, '3-5'],
      ['Artibonite (Gonaives)', 400, 750, '2-3'],
      ['Centre (Hinche)', 450, 850, '3-4'],
      ['Sud (Les Cayes)', 500, 900, '3-5'],
      ['Sud-Est (Jacmel)', 350, 700, '2-3'],
      ['Grand-Anse (Jeremie)', 550, 1000, '4-5'],
      ['Nippes (Miragoane)', 450, 850, '3-4'],
      ['Entenasyonal', 1500, 3000, '7-14']
    ];
    const stmt = db.prepare('INSERT INTO shipping_zones (name, price, express_price, estimated_days) VALUES (?, ?, ?, ?)');
    zones.forEach(function(z) { stmt.run(z[0], z[1], z[2], z[3]); });
  }

  const prodCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  if (prodCount === 0) {
    const demo = [
      ['Hoodie Neon Pulse', 'hoodie-neon-pulse', 'Hoodie premium ak detay neon.', 3500, 4500, 'hoodie', ['S','M','L','XL'], ['Nwa','Blan'], 20, 1],
      ['Tee Cyber Wave', 'tee-cyber-wave', 'T-shirt koton 100% ak design futurist.', 1500, 2000, 't-shirt', ['S','M','L','XL'], ['Nwa','Blan','Cyan'], 50, 1],
      ['Jogger Dark Mode', 'jogger-dark-mode', 'Jogger konfotab pou tout jou.', 2800, 3500, 'pantalon', ['S','M','L','XL'], ['Nwa'], 30, 0],
      ['Vest Panik Tech', 'vest-panik-tech', 'Vest techwear ak poch miltip.', 4200, 5200, 'veste', ['M','L','XL'], ['Nwa'], 15, 1]
    ];
    const stmt = db.prepare('INSERT INTO products (name, slug, description, price, compare_price, category, sizes, colors, stock, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    demo.forEach(function(p) {
      stmt.run(p[0], p[1], p[2], p[3], p[4], p[5], JSON.stringify(p[6]), JSON.stringify(p[7]), p[8], p[9]);
    });
  }

  const sett = db.prepare('SELECT COUNT(*) as c FROM settings').get().c;
  if (sett === 0) {
    const defaults = {
      brand_name: '100PANIK',
      tagline: 'Rad pou moun ki pa janm kanpe.',
      contact_email: 'metalluscarlinsky@gmail.com',
      contact_phone: '+509 32924776',
      instagram: 'https://instagram.com/100panik',
      facebook: '',
      tiktok: '',
      primary_color: '#00f0ff',
      accent_color: '#ff0040'
    };
    const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    Object.keys(defaults).forEach(function(k) { stmt.run(k, defaults[k]); });
  }
}
seed();

module.exports = db;

// ============================================
// 100PANIK - Wout ADMIN (pwoteje ak JWT)
// Kategori: tout kalite rad, sou-vètman, akseswa, elatriye
// ============================================
const express = require('express');
const db = require('../models/db');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const router = express.Router();
router.use(requireAuth); // TOUT wout admin pwoteje

// ============ LIS KATEGORI KONPLÈ ============
const ALL_CATEGORIES = [
  // Rad anlè
  't-shirt', 'chemise', 'blouse', 'polo', 'hoodie', 'sweatshirt',
  'pull', 'cardigan', 'veste', 'manteau', 'blazer', 'kimono', 'crop-top',
  'debardeur', 'maillot', 'body',
  // Rad anba
  'pantalon', 'jeans', 'jogger', 'short', 'jupe', 'robe', 'salopette',
  'legging', 'chino', 'cargo',
  // Sou-vètman
  'kalson', 'slip', 'boxer', 'chòt', 'soutien-gorge', 'brassiere',
  'marcel', 'chemise-nwi', 'pyjama', 'chanday-len', 'chaussette',
  // Rad espesyal
  'rad-maryaj', 'rad-fèt', 'rad-sport', 'rad-plaj', 'rad-travay',
  'rad-lise', 'rad-tradisyonèl', 'rad-militaire', 'uniforme',
  // Akseswa
  'bonn', 'chapè', 'kas', 'echap', 'sentì', 'sak', 'valiz',
  'gant', 'foular', 'linèt', 'mont', 'bijou', 'soulye', 'sandal',
  'bòt', 'tennis',
  // Timoun
  'rad-timoun', 'rad-bebe',
  // Lòt
  'general', 'nouvo', 'promo', 'exclusive'
];

router.get('/categories', (req, res) => {
  res.json(ALL_CATEGORIES);
});

// ============ STATISTIK / DASHBOARD ============
router.get('/stats', (req, res) => {
  const totalProducts = db.prepare('SELECT COUNT(*) c FROM products').get().c;
  const totalOrders = db.prepare('SELECT COUNT(*) c FROM orders').get().c;
  const totalCustomers = db.prepare('SELECT COUNT(DISTINCT phone) c FROM orders').get().c;
  const revenue = db.prepare(`SELECT COALESCE(SUM(total),0) s FROM orders WHERE status != 'cancelled'`).get().s;
  const pendingOrders = db.prepare(`SELECT COUNT(*) c FROM orders WHERE status = 'pending'`).get().c;
  const lowStock = db.prepare('SELECT COUNT(*) c FROM products WHERE stock < 5 AND active = 1').get().c;

  const topProducts = db.prepare(`
    SELECT oi.name, SUM(oi.quantity) qty, SUM(oi.price * oi.quantity) rev
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status != 'cancelled'
    GROUP BY oi.name ORDER BY qty DESC LIMIT 5
  `).all();

  const recentOrders = db.prepare(`
    SELECT id, order_number, customer_name, total, status, created_at
    FROM orders ORDER BY created_at DESC LIMIT 10
  `).all();

  const salesByDay = db.prepare(`
    SELECT DATE(created_at) day, SUM(total) total, COUNT(*) orders
    FROM orders WHERE status != 'cancelled'
    GROUP BY DATE(created_at) ORDER BY day DESC LIMIT 14
  `).all();

  res.json({
    totalProducts, totalOrders, totalCustomers,
    revenue: Math.round(revenue * 100) / 100,
    pendingOrders, lowStock, topProducts, recentOrders, salesByDay
  });
});

// ============ PWODWI ============
router.get('/products', (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
  res.json(rows.map(parseProduct));
});

router.get('/products/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Pa jwenn' });
  res.json(parseProduct(row));
});

router.post('/products', (req, res) => {
  const p = req.body || {};
  if (!p.name) return res.status(400).json({ error: 'Non obligatwa' });
  const slug = p.slug || slugify(p.name) + '-' + Date.now().toString(36);
  const info = db.prepare(`INSERT INTO products
    (name, slug, description, price, compare_price, category, sizes, colors, images, stock, featured, active)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      p.name, slug, p.description || '', Number(p.price) || 0, Number(p.compare_price) || 0,
      p.category || 'general',
      JSON.stringify(p.sizes || []),
      JSON.stringify(p.colors || []),
      JSON.stringify(p.images || []),
      Number(p.stock) || 0,
      p.featured ? 1 : 0,
      p.active === false ? 0 : 1
    );
  res.json({ id: info.lastInsertRowid, slug });
});

router.put('/products/:id', (req, res) => {
  const p = req.body || {};
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Pa jwenn' });

  db.prepare(`UPDATE products SET
    name = ?, description = ?, price = ?, compare_price = ?, category = ?,
    sizes = ?, colors = ?, images = ?, stock = ?, featured = ?, active = ?
    WHERE id = ?`).run(
      p.name ?? existing.name,
      p.description ?? existing.description,
      Number(p.price) ?? existing.price,
      Number(p.compare_price) ?? existing.compare_price,
      p.category ?? existing.category,
      JSON.stringify(p.sizes || JSON.parse(existing.sizes || '[]')),
      JSON.stringify(p.colors || JSON.parse(existing.colors || '[]')),
      JSON.stringify(p.images || JSON.parse(existing.images || '[]')),
      Number(p.stock) ?? existing.stock,
      p.featured != null ? (p.featured ? 1 : 0) : existing.featured,
      p.active != null ? (p.active ? 1 : 0) : existing.active,
      req.params.id
    );
  res.json({ success: true });
});

router.delete('/products/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Upload foto
router.post('/upload', upload.array('images', 10), (req, res) => {
  const files = (req.files || []).map(f => `/uploads/${f.filename}`);
  res.json({ files });
});

// ============ KÒMAND ============
router.get('/orders', (req, res) => {
  const { status } = req.query;
  let sql = 'SELECT * FROM orders';
  const params = [];
  if (status) { sql += ' WHERE status = ?'; params.push(status); }
  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/orders/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pa jwenn' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ ...order, items });
});

router.put('/orders/:id/status', (req, res) => {
  const { status } = req.body || {};
  const valid = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Estati envalid' });
  db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(status, req.params.id);
  res.json({ success: true });
});

router.delete('/orders/:id', (req, res) => {
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ============ KLIYAN ============
router.get('/customers', (req, res) => {
  const rows = db.prepare(`
    SELECT phone, customer_name, email, COUNT(*) orders_count,
           SUM(total) total_spent, MAX(created_at) last_order
    FROM orders GROUP BY phone ORDER BY last_order DESC
  `).all();
  res.json(rows);
});

router.get('/customers/:phone/orders', (req, res) => {
  const rows = db.prepare('SELECT * FROM orders WHERE phone = ? ORDER BY created_at DESC')
    .all(req.params.phone);
  res.json(rows);
});

// ============ LIVREZON ============
router.get('/shipping', (req, res) => {
  res.json(db.prepare('SELECT * FROM shipping_zones ORDER BY id').all());
});

router.post('/shipping', (req, res) => {
  const { name, price, express_price, estimated_days } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Non obligatwa' });
  const info = db.prepare(`INSERT INTO shipping_zones (name, price, express_price, estimated_days)
    VALUES (?,?,?,?)`).run(name, Number(price) || 0, Number(express_price) || 0, estimated_days || '3-5');
  res.json({ id: info.lastInsertRowid });
});

router.put('/shipping/:id', (req, res) => {
  const { name, price, express_price, estimated_days, active } = req.body || {};
  db.prepare(`UPDATE shipping_zones SET name=?, price=?, express_price=?, estimated_days=?, active=? WHERE id=?`)
    .run(name, Number(price) || 0, Number(express_price) || 0, estimated_days || '3-5',
         active === false ? 0 : 1, req.params.id);
  res.json({ success: true });
});

router.delete('/shipping/:id', (req, res) => {
  db.prepare('DELETE FROM shipping_zones WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ============ PWOMO ============
router.get('/promos', (req, res) => {
  res.json(db.prepare('SELECT * FROM promo_codes ORDER BY id DESC').all());
});

router.post('/promos', (req, res) => {
  const { code, type, value, min_total, max_uses, expires_at } = req.body || {};
  if (!code || value == null) return res.status(400).json({ error: 'Kòd ak valè obligatwa' });
  try {
    const info = db.prepare(`INSERT INTO promo_codes
      (code, type, value, min_total, max_uses, expires_at)
      VALUES (?,?,?,?,?,?)`).run(
        code.toUpperCase(), type || 'percent', Number(value),
        Number(min_total) || 0, Number(max_uses) || 0, expires_at || null
      );
    res.json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: 'Kòd deja egziste' });
  }
});

router.put('/promos/:id', (req, res) => {
  const { code, type, value, min_total, max_uses, active, expires_at } = req.body || {};
  db.prepare(`UPDATE promo_codes SET code=?, type=?, value=?, min_total=?, max_uses=?, active=?, expires_at=? WHERE id=?`)
    .run(code.toUpperCase(), type || 'percent', Number(value),
         Number(min_total) || 0, Number(max_uses) || 0,
         active === false ? 0 : 1, expires_at || null, req.params.id);
  res.json({ success: true });
});

router.delete('/promos/:id', (req, res) => {
  db.prepare('DELETE FROM promo_codes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ============ KONFIGIRASYON SIT ============
router.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const obj = {};
  rows.forEach(r => obj[r.key] = r.value);
  res.json(obj);
});

router.put('/settings', (req, res) => {
  const updates = req.body || {};
  const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  const tx = db.transaction((entries) => {
    for (const [k, v] of entries) stmt.run(k, String(v));
  });
  tx(Object.entries(updates));
  res.json({ success: true });
});

// ============ CHANJE MODPAS ADMIN ============
router.post('/change-password', (req, res) => {
  const { current, next } = req.body || {};
  if (!current || !next || next.length < 6) {
    return res.status(400).json({ error: 'Modpas nouvo dwe gen 6 karaktè minimòm' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current, user.password)) {
    return res.status(401).json({ error: 'Modpas aktyèl envalid' });
  }
  const hash = bcrypt.hashSync(next, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ success: true });
});

// ============ UTILS ============
function parseProduct(p) {
  return {
    ...p,
    sizes: safeJSON(p.sizes, []),
    colors: safeJSON(p.colors, []),
    images: safeJSON(p.images, [])
  };
}
function safeJSON(s, fb) { try { return JSON.parse(s); } catch { return fb; } }
function slugify(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');}

// ============ KLIYAN ENSKRI ============
router.get('/registered-customers', (req, res) => {
  const rows = db.prepare(`
    SELECT id, full_name, email, phone, address, department, city,
           active, created_at
    FROM customers
    ORDER BY created_at DESC
  `).all();
  res.json(rows);
});

router.put('/registered-customers/:id', (req, res) => {
  const b = req.body || {};
  db.prepare('UPDATE customers SET active = ? WHERE id = ?')
    .run(b.active ? 1 : 0, req.params.id);
  res.json({ success: true });
});

router.delete('/registered-customers/:id', (req, res) => {
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;








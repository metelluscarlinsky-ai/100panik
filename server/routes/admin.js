const express = require('express');
const db = require('../models/db');
const { requireAuth } = require('../middleware/auth');
const { upload, uploadToSupabase } = require('../middleware/upload');
const bcrypt = require('bcryptjs');

const router = express.Router();
router.use(requireAuth);

const ALL_CATEGORIES = [
  't-shirt','chemise','chemizit','blouse','polo','hoodie','sweatshirt','pull',
  'cardigan','veste','manteau','blazer','kimono','crop-top','debardeur',
  'maillot','body','kosaj','tank-top','sweater',
  'pantalon','jeans','jogger','short','jupe','robe','salopette','legging',
  'chino','cargo','kilt','jip','jip-long','jip-kout',
  'kalson','kilot','slip','chot','soutien-gorge','brassiere','ganntwa',
  'kosel','tanga','string','culotte','bikini','tankini','monokini',
  'ba-personalize','ba-soutien-gorge','ba-kosel',
  'boxer','slip-gason','chemiz-nwi','marcel','kamisòl','chanday-len',
  'pyjama','pyjama-fanm','pyjama-gason','wob-de-chambre','chaussette',
  'rad-maryaj','rad-fet','rad-sport','rad-plaj','rad-travay','rad-lise',
  'rad-tradisyonel','rad-militaire','uniforme','karabela','kostim',
  'sweat-sport','short-sport','brassiere-sport','legging-sport',
  'jogging','maillot-de-bain','maillot-foutbol',
  'bonn','chape','kas','echap','senti','sak','valiz','gant','foular',
  'linet','mont','bijou','kolye','bwe','zanno','soulye','sandal',
  'bot','tennis','espadril','mokasen','kle',
  'rad-timoun','rad-bebe','body-bebe','kimono-bebe',
  'general','nouvo','promo','exclusive','lot','paket','kado'
];

router.get('/categories', (req, res) => res.json(ALL_CATEGORIES));

// ============ STATS ============
router.get('/stats', async (req, res) => {
  try {
    const totalProducts = (await db.get('SELECT COUNT(*)::int c FROM products')).c;
    const totalOrders = (await db.get('SELECT COUNT(*)::int c FROM orders')).c;
    const totalCustomers = (await db.get('SELECT COUNT(DISTINCT phone)::int c FROM orders')).c;
    const revenue = (await db.get("SELECT COALESCE(SUM(total),0) s FROM orders WHERE status != 'cancelled'")).s;
    const pendingOrders = (await db.get("SELECT COUNT(*)::int c FROM orders WHERE status = 'pending'")).c;
    const lowStock = (await db.get('SELECT COUNT(*)::int c FROM products WHERE stock < 5 AND active = 1')).c;

    const topProducts = await db.all(`
      SELECT oi.name, SUM(oi.quantity)::int qty, SUM(oi.price * oi.quantity) rev
      FROM order_items oi JOIN orders o ON o.id = oi.order_id
      WHERE o.status != 'cancelled'
      GROUP BY oi.name ORDER BY qty DESC LIMIT 5
    `);
    const recentOrders = await db.all(`
      SELECT id, order_number, customer_name, total, status, created_at
      FROM orders ORDER BY created_at DESC LIMIT 10
    `);

    res.json({
      totalProducts, totalOrders, totalCustomers,
      revenue: Math.round(revenue * 100) / 100,
      pendingOrders, lowStock, topProducts, recentOrders
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erè' }); }
});

// ============ PWODWI ============
router.get('/products', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM products ORDER BY created_at DESC');
    res.json(rows.map(parseProduct));
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.post('/products', async (req, res) => {
  try {
    const p = req.body || {};
    if (!p.name) return res.status(400).json({ error: 'Non obligatwa' });
    const slug = p.slug || slugify(p.name) + '-' + Date.now().toString(36);
    const info = await db.run(
      `INSERT INTO products (name, slug, description, price, compare_price, category, sizes, colors, images, stock, featured, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [p.name, slug, p.description || '', Number(p.price) || 0, Number(p.compare_price) || 0,
       p.category || 'general', JSON.stringify(p.sizes || []), JSON.stringify(p.colors || []),
       JSON.stringify(p.images || []), Number(p.stock) || 0, p.featured ? 1 : 0, p.active === false ? 0 : 1]
    );
    res.json({ id: info.lastInsertRowid, slug });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erè' }); }
});

router.put('/products/:id', async (req, res) => {
  try {
    const p = req.body || {};
    const ex = await db.get('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Pa jwenn' });
    await db.run(
      `UPDATE products SET name=$1, description=$2, price=$3, compare_price=$4, category=$5,
        sizes=$6, colors=$7, images=$8, stock=$9, featured=$10, active=$11 WHERE id=$12`,
      [p.name ?? ex.name, p.description ?? ex.description, Number(p.price) ?? ex.price,
       Number(p.compare_price) ?? ex.compare_price, p.category ?? ex.category,
       JSON.stringify(p.sizes || JSON.parse(ex.sizes || '[]')),
       JSON.stringify(p.colors || JSON.parse(ex.colors || '[]')),
       JSON.stringify(p.images || JSON.parse(ex.images || '[]')),
       Number(p.stock) ?? ex.stock, p.featured != null ? (p.featured ? 1 : 0) : ex.featured,
       p.active != null ? (p.active ? 1 : 0) : ex.active, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erè' }); }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.post('/upload', upload.array('images', 10), async (req, res) => {
  try {
    const files = req.files || [];
    if (files.length === 0) return res.json({ files: [] });
    
    console.log('Ap upload', files.length, 'fichye sou Supabase...');
    const urls = [];
    
    for (let i = 0; i < files.length; i++) {
      const url = await uploadToSupabase(files[i]);
      urls.push(url);
    }
    
    console.log('Upload siksè. URLs:', urls);
    res.json({ files: urls });
  } catch (e) {
    console.error('Erè upload:', e);
    res.status(500).json({ error: e.message || 'Erè pandan upload la' });
  }
});
});

// ============ KOMAND ============
router.get('/orders', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM orders';
    const params = [];
    if (status) { sql += ' WHERE status = $1'; params.push(status); }
    sql += ' ORDER BY created_at DESC';
    res.json(await db.all(sql, params));
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const o = await db.get('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (!o) return res.status(404).json({ error: 'Pa jwenn' });
    const items = await db.all('SELECT * FROM order_items WHERE order_id = $1', [o.id]);
    res.json({ ...o, items });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body || {};
    const valid = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Estati envalid' });
    await db.run('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [status, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.delete('/orders/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM orders WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

// ============ KLIYAN ============
router.get('/customers', async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT phone, customer_name, email, COUNT(*)::int orders_count,
             SUM(total) total_spent, MAX(created_at) last_order
      FROM orders GROUP BY phone, customer_name, email ORDER BY last_order DESC
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.get('/registered-customers', async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT id, full_name, email, phone, address, department, city, active, created_at
      FROM customers ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.put('/registered-customers/:id', async (req, res) => {
  try {
    const { active } = req.body || {};
    await db.run('UPDATE customers SET active = $1 WHERE id = $2', [active ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.delete('/registered-customers/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM customers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

// ============ LIVREZON ============
router.get('/shipping', async (req, res) => {
  try {
    res.json(await db.all('SELECT * FROM shipping_zones ORDER BY id'));
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.post('/shipping', async (req, res) => {
  try {
    const { name, price, express_price, estimated_days } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Non obligatwa' });
    const info = await db.run(
      'INSERT INTO shipping_zones (name, price, express_price, estimated_days) VALUES ($1,$2,$3,$4) RETURNING id',
      [name, Number(price) || 0, Number(express_price) || 0, estimated_days || '3-5']
    );
    res.json({ id: info.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.put('/shipping/:id', async (req, res) => {
  try {
    const { name, price, express_price, estimated_days, active } = req.body || {};
    await db.run(
      'UPDATE shipping_zones SET name=$1, price=$2, express_price=$3, estimated_days=$4, active=$5 WHERE id=$6',
      [name, Number(price) || 0, Number(express_price) || 0, estimated_days || '3-5',
       active === false ? 0 : 1, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.delete('/shipping/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM shipping_zones WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

// ============ PWOMO ============
router.get('/promos', async (req, res) => {
  try {
    res.json(await db.all('SELECT * FROM promo_codes ORDER BY id DESC'));
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.post('/promos', async (req, res) => {
  try {
    const { code, type, value, min_total, max_uses, expires_at } = req.body || {};
    if (!code || value == null) return res.status(400).json({ error: 'Kòd ak valè obligatwa' });
    const info = await db.run(
      `INSERT INTO promo_codes (code, type, value, min_total, max_uses, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [String(code).toUpperCase(), type || 'percent', Number(value),
       Number(min_total) || 0, Number(max_uses) || 0, expires_at || null]
    );
    res.json({ id: info.lastInsertRowid });
  } catch (e) { res.status(400).json({ error: 'Kòd deja egziste' }); }
});

router.put('/promos/:id', async (req, res) => {
  try {
    const { code, type, value, min_total, max_uses, active, expires_at } = req.body || {};
    await db.run(
      `UPDATE promo_codes SET code=$1, type=$2, value=$3, min_total=$4, max_uses=$5, active=$6, expires_at=$7 WHERE id=$8`,
      [String(code).toUpperCase(), type || 'percent', Number(value), Number(min_total) || 0,
       Number(max_uses) || 0, active === false ? 0 : 1, expires_at || null, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.delete('/promos/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM promo_codes WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

// ============ SETTINGS ============
router.get('/settings', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM settings');
    const obj = {};
    rows.forEach(r => obj[r.key] = r.value);
    res.json(obj);
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.put('/settings', async (req, res) => {
  try {
    const updates = req.body || {};
    for (const k of Object.keys(updates)) {
      await db.run(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [k, String(updates[k])]
      );
    }
    res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erè' }); }
});

router.post('/change-password', async (req, res) => {
  try {
    const { current, next } = req.body || {};
    if (!current || !next || next.length < 6) {
      return res.status(400).json({ error: 'Modpas nouvo dwe gen 6 karakte minimum' });
    }
    const user = await db.get('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!bcrypt.compareSync(current, user.password)) {
      return res.status(401).json({ error: 'Modpas aktyel envalid' });
    }
    const hash = bcrypt.hashSync(next, 10);
    await db.run('UPDATE users SET password = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

// ============ UTILS ============
function parseProduct(p) {
  return { ...p, sizes: safeJSON(p.sizes, []), colors: safeJSON(p.colors, []), images: safeJSON(p.images, []) };
}
function safeJSON(s, fb) { try { return JSON.parse(s); } catch { return fb; } }
function slugify(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ============ ADS (PIBLISITE) ============
router.get('/ads', async (req, res) => {
  try {
    res.json(await db.all('SELECT * FROM ads ORDER BY sort_order ASC, created_at DESC'));
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.post('/ads', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.media_url) return res.status(400).json({ error: 'Media obligatwa' });
    const info = await db.run(
      `INSERT INTO ads (title, type, media_url, thumb_url, link_url, position, active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        b.title || '',
        b.type || 'image',
        b.media_url,
        b.thumb_url || null,
        b.link_url || null,
        b.position || 'home_footer',
        b.active === false ? 0 : 1,
        Number(b.sort_order) || 0
      ]
    );
    res.json({ id: info.lastInsertRowid });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erè' }); }
});

router.put('/ads/:id', async (req, res) => {
  try {
    const b = req.body || {};
    await db.run(
      `UPDATE ads SET title=$1, type=$2, media_url=$3, thumb_url=$4, link_url=$5, position=$6, active=$7, sort_order=$8 WHERE id=$9`,
      [
        b.title || '',
        b.type || 'image',
        b.media_url,
        b.thumb_url || null,
        b.link_url || null,
        b.position || 'home_footer',
        b.active === false ? 0 : 1,
        Number(b.sort_order) || 0,
        req.params.id
      ]
    );
    res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erè' }); }
});

router.delete('/ads/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM ads WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

module.exports = router;

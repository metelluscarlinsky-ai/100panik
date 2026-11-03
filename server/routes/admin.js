const express = require('express');
const db = require('../models/db');
const { requireAuth } = require('../middleware/auth');
const { upload, uploadToSupabase } = require('../middleware/upload');
const bcrypt = require('bcryptjs');

const router = express.Router();
router.use(requireAuth);

// ============ STATS ============
router.get('/stats', async (req, res) => {
  try {
    const totalProducts = (await db.get('SELECT COUNT(*)::int c FROM products')).c;
    const totalOrders = (await db.get('SELECT COUNT(*)::int c FROM orders')).c;
    const totalCustomers = (await db.get('SELECT COUNT(DISTINCT phone)::int c FROM orders')).c;
    const revenue = (await db.get("SELECT COALESCE(SUM(total),0) s FROM orders WHERE status != 'cancelled'")).s;
    res.json({ totalProducts, totalOrders, totalCustomers, revenue });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ PWODWI ============
router.get('/products', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM products ORDER BY created_at DESC');
    res.json(rows.map(function(p) {
      return { ...p, sizes: JSON.parse(p.sizes || '[]'), colors: JSON.parse(p.colors || '[]'), images: JSON.parse(p.images || '[]') };
    }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/products', async (req, res) => {
  try {
    const p = req.body || {};
    if (!p.name) return res.status(400).json({ error: 'Non obligatwa' });
    
    // Kreye yon slug inik
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
    
    const info = await db.run(
      `INSERT INTO products (name, slug, description, price, compare_price, category, sizes, colors, images, stock, featured, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [p.name, slug, p.description || '', Number(p.price) || 0, Number(p.compare_price) || 0, p.category || 'general', JSON.stringify(p.sizes || []), JSON.stringify(p.colors || []), JSON.stringify(p.images || []), Number(p.stock) || 0, p.featured ? 1 : 0, p.active === false ? 0 : 1]
    );
    res.json({ id: info.lastInsertRowid, slug: slug });
  } catch (e) { 
    console.error(e); 
    res.status(500).json({ error: e.message }); // Kounye a l ap voye vrè erè a
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const p = req.body || {};
    await db.run(
      `UPDATE products SET name=$1, description=$2, price=$3, compare_price=$4, category=$5, sizes=$6, colors=$7, images=$8, stock=$9, featured=$10, active=$11 WHERE id=$12`,
      [p.name, p.description || '', Number(p.price) || 0, Number(p.compare_price) || 0, p.category || 'general', JSON.stringify(p.sizes || []), JSON.stringify(p.colors || []), JSON.stringify(p.images || []), Number(p.stock) || 0, p.featured ? 1 : 0, p.active === false ? 0 : 1, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { 
    console.error(e); 
    res.status(500).json({ error: e.message }); 
  }
});

router.delete('/products/:id', async (req, res) => {
  try { await db.run('DELETE FROM products WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ UPLOAD ============
router.post('/upload', upload.array('images', 10), async (req, res) => {
  try {
    const files = req.files || [];
    if (files.length === 0) return res.json({ files: [] });
    const urls = [];
    for (let i = 0; i < files.length; i++) {
      const url = await uploadToSupabase(files[i]);
      urls.push(url);
    }
    res.json({ files: urls });
  } catch (e) { 
    console.error('Erè upload:', e); 
    res.status(500).json({ error: e.message }); 
  }
});

// ============ ADS (PIBLISITE) ============
router.get('/ads', async (req, res) => {
  try { res.json(await db.all('SELECT * FROM ads ORDER BY id DESC')); } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ads', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.media_url) return res.status(400).json({ error: 'Media obligatwa' });
    const info = await db.run(
      `INSERT INTO ads (title, type, media_url, active) VALUES ($1,$2,$3,$4) RETURNING id`,
      [b.title || '', b.type || 'image', b.media_url, 1]
    );
    res.json({ id: info.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/ads/:id', async (req, res) => {
  try { await db.run('DELETE FROM ads WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ KONFIGIRASYON (SETTINGS) ============
router.get('/settings', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM settings');
    const obj = {};
    rows.forEach(function(r) { obj[r.key] = r.value; });
    res.json(obj);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/settings', async (req, res) => {
  try {
    const updates = req.body || {};
    const keys = Object.keys(updates);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      await db.run(`INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [k, String(updates[k])]);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ CHANJE MODPAS ============
router.post('/change-password', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.current || !b.next || b.next.length < 6) return res.status(400).json({ error: 'Modpas nouvo dwe gen 6 karakte minimum' });
    const user = await db.get('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!bcrypt.compareSync(b.current, user.password)) return res.status(401).json({ error: 'Modpas aktyel envalid' });
    const hash = bcrypt.hashSync(b.next, 10);
    await db.run('UPDATE users SET password = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

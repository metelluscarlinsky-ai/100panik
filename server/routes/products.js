const express = require('express');
const db = require('../models/db');
const router = express.Router();

function parseProduct(p) {
  return {
    ...p,
    sizes: safeJSON(p.sizes, []),
    colors: safeJSON(p.colors, []),
    images: safeJSON(p.images, [])
  };
}
function safeJSON(s, fb) { try { return JSON.parse(s); } catch { return fb; } }

router.get('/', async (req, res) => {
  try {
    const { category, min_price, max_price, search, featured } = req.query;
    let sql = 'SELECT * FROM products WHERE active = 1';
    const params = [];
    let i = 1;

    if (category) { sql += ` AND category = $${i++}`; params.push(category); }
    if (min_price) { sql += ` AND price >= $${i++}`; params.push(Number(min_price)); }
    if (max_price) { sql += ` AND price <= $${i++}`; params.push(Number(max_price)); }
    if (search) { sql += ` AND name ILIKE $${i++}`; params.push('%' + search + '%'); }
    if (featured === '1') sql += ' AND featured = 1';
    sql += ' ORDER BY created_at DESC';

    const rows = await db.all(sql, params);
    res.json(rows.map(parseProduct));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erè' }); }
});

router.get('/meta/categories', async (req, res) => {
  try {
    const rows = await db.all('SELECT DISTINCT category FROM products WHERE active = 1');
    res.json(rows.map(r => r.category));
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.get('/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const numId = Number(slug) || 0;
    const row = await db.get(
      'SELECT * FROM products WHERE (slug = $1 OR id = $2) AND active = 1',
      [slug, numId]
    );
    if (!row) return res.status(404).json({ error: 'Pwodwi pa jwenn' });
    res.json(parseProduct(row));
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

module.exports = router;

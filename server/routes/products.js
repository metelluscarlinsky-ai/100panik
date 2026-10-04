// ============================================
// 100PANIK - Wout pwodwi piblik
// ============================================
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

function safeJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

// Lis tout pwodwi (ak filtè)
router.get('/', (req, res) => {
  const { category, min_price, max_price, search, featured } = req.query;
  let sql = 'SELECT * FROM products WHERE active = 1';
  const params = [];

  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (min_price) { sql += ' AND price >= ?'; params.push(Number(min_price)); }
  if (max_price) { sql += ' AND price <= ?'; params.push(Number(max_price)); }
  if (search) { sql += ' AND name LIKE ?'; params.push(`%${search}%`); }
  if (featured === '1') { sql += ' AND featured = 1'; }

  sql += ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(parseProduct));
});

// Yon sèl pwodwi pa slug oswa id
router.get('/:slug', (req, res) => {
  const { slug } = req.params;
  const row = db.prepare('SELECT * FROM products WHERE (slug = ? OR id = ?) AND active = 1')
    .get(slug, Number(slug) || 0);
  if (!row) return res.status(404).json({ error: 'Pwodwi pa jwenn' });
  res.json(parseProduct(row));
});

// Kategori
router.get('/meta/categories', (req, res) => {
  const rows = db.prepare('SELECT DISTINCT category FROM products WHERE active = 1').all();
  res.json(rows.map(r => r.category));
});

module.exports = router;

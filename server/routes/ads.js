const express = require('express');
const db = require('../models/db');
const router = express.Router();

// Jwenn tout piblisite yo
router.get('/', async (req, res) => {
  try {
    const position = req.query.position || 'home_footer';
    const rows = await db.all(
      'SELECT * FROM ads WHERE active = 1 AND position = $1 ORDER BY sort_order ASC, created_at DESC',
      [position]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Erè' });
  }
});

// Jwenn yon sèl piblisite ak detay li
router.get('/:id', async (req, res) => {
  try {
    const ad = await db.get('SELECT * FROM ads WHERE id = $1 AND active = 1', [req.params.id]);
    if (!ad) return res.status(404).json({ error: 'Pa jwenn' });
    res.json(ad);
  } catch (e) {
    res.status(500).json({ error: 'Erè' });
  }
});

// Ajoute yon Like
router.post('/:id/like', async (req, res) => {
  try {
    await db.run('UPDATE ads SET likes = COALESCE(likes, 0) + 1 WHERE id = $1', [req.params.id]);
    const ad = await db.get('SELECT likes FROM ads WHERE id = $1', [req.params.id]);
    res.json({ success: true, likes: ad.likes });
  } catch (e) {
    res.status(500).json({ error: 'Erè' });
  }
});

// Jwenn komantè yo
router.get('/:id/comments', async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT * FROM ad_comments WHERE ad_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Erè' });
  }
});

// Ajoute yon komantè
router.post('/:id/comments', async (req, res) => {
  try {
    const { user_name, comment } = req.body;
    if (!user_name || !comment) return res.status(400).json({ error: 'Non ak komantè obligatwa' });
    
    await db.run(
      'INSERT INTO ad_comments (ad_id, user_name, comment) VALUES ($1, $2, $3)',
      [req.params.id, user_name, comment]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erè' });
  }
});

module.exports = router;

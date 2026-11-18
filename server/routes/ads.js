const express = require('express');
const db = require('../models/db');
const { requireCustomer } = require('../middleware/customer-auth');
const router = express.Router();
const jwt = require('jsonwebtoken');
const SECRET = (process.env.JWT_SECRET || 'dev_secret_panik') + '_customer';

// Jwenn tout piblisite yo
router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM ads WHERE active = 1 ORDER BY sort_order ASC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

// Jwenn yon sèl piblisite (ak verifye si kliyan an te like l deja)
router.get('/:id', async (req, res) => {
  try {
    const ad = await db.get('SELECT * FROM ads WHERE id = $1', [req.params.id]);
    if (!ad) return res.status(404).json({ error: 'Not found' });

    let hasLiked = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], SECRET);
        const like = await db.get('SELECT id FROM ad_likes WHERE ad_id = $1 AND customer_id = $2', [ad.id, decoded.id]);
        if (like) hasLiked = true;
      } catch (err) {}
    }
    res.json({ ...ad, hasLiked });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

// LIKE (Yon sèl fwa / Toggle)
router.post('/:id/like', requireCustomer, async (req, res) => {
  try {
    const existing = await db.get('SELECT id FROM ad_likes WHERE ad_id = $1 AND customer_id = $2', [req.params.id, req.customer.id]);
    if (existing) {
      // Retire Like a
      await db.run('DELETE FROM ad_likes WHERE id = $1', [existing.id]);
      await db.run('UPDATE ads SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = $1', [req.params.id]);
      const ad = await db.get('SELECT likes FROM ads WHERE id = $1', [req.params.id]);
      res.json({ success: true, liked: false, likes: ad.likes });
    } else {
      // Ajoute Like a
      await db.run('INSERT INTO ad_likes (ad_id, customer_id) VALUES ($1, $2)', [req.params.id, req.customer.id]);
      await db.run('UPDATE ads SET likes = COALESCE(likes, 0) + 1 WHERE id = $1', [req.params.id]);
      const ad = await db.get('SELECT likes FROM ads WHERE id = $1', [req.params.id]);
      res.json({ success: true, liked: true, likes: ad.likes });
    }
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

// JWENN KOMANTÈ
router.get('/:id/comments', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM ad_comments WHERE ad_id = $1 ORDER BY created_at DESC', [req.params.id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

// KOMANTE (Obligatwa pou konekte)
router.post('/:id/comments', requireCustomer, async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment) return res.status(400).json({ error: 'Comment required' });
    
    const customer = await db.get('SELECT full_name FROM customers WHERE id = $1', [req.customer.id]);
    await db.run(
      'INSERT INTO ad_comments (ad_id, customer_id, user_name, comment) VALUES ($1, $2, $3, $4)',
      [req.params.id, req.customer.id, customer.full_name, comment]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

// EFASE KOMANTÈ
router.delete('/comments/:commentId', requireCustomer, async (req, res) => {
  try {
    const comment = await db.get('SELECT * FROM ad_comments WHERE id = $1', [req.params.commentId]);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.customer_id !== req.customer.id) return res.status(403).json({ error: 'Unauthorized' });
    
    await db.run('DELETE FROM ad_comments WHERE id = $1', [req.params.commentId]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

module.exports = router;

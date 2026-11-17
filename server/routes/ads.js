const express = require('express');
const db = require('../models/db');
const { requireCustomer } = require('../middleware/customer-auth');
const router = express.Router();

// Jwenn tout piblisite yo
router.get('/', async (req, res) => {
  try {
    const position = req.query.position || 'home_footer';
    const rows = await db.all('SELECT * FROM ads WHERE active = 1 AND position = $1 ORDER BY sort_order ASC, created_at DESC', [position]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

// Jwenn yon sèl piblisite (ak verifye si kliyan an te like l deja)
router.get('/:id', async (req, res) => {
  try {
    const ad = await db.get('SELECT * FROM ads WHERE id = $1 AND active = 1', [req.params.id]);
    if (!ad) return res.status(404).json({ error: 'Pa jwenn' });
    
    // Verifye si kliyan an konekte epi si li te like
    let hasLiked = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const SECRET = (process.env.JWT_SECRET || 'dev_secret_panik') + '_customer';
        const decoded = jwt.verify(token, SECRET);
        const like = await db.get('SELECT id FROM ad_likes WHERE ad_id = $1 AND customer_id = $2', [ad.id, decoded.id]);
        if (like) hasLiked = true;
      } catch (err) { /* Token envalid, pa fè anyen */ }
    }
    
    res.json({ ...ad, hasLiked });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

// Like (Obligatwa pou kliyan konekte, epi yon sèl fwa)
router.post('/:id/like', requireCustomer, async (req, res) => {
  try {
    const adId = req.params.id;
    const customerId = req.customer.id;
    
    // Verifye si li te deja like
    const existing = await db.get('SELECT id FROM ad_likes WHERE ad_id = $1 AND customer_id = $2', [adId, customerId]);
    if (existing) {
      return res.status(400).json({ error: 'Ou deja like piblisite sa a.' });
    }
    
    // Anrejistre like a
    await db.run('INSERT INTO ad_likes (ad_id, customer_id) VALUES ($1, $2)', [adId, customerId]);
    await db.run('UPDATE ads SET likes = COALESCE(likes, 0) + 1 WHERE id = $1', [adId]);
    
    const ad = await db.get('SELECT likes FROM ads WHERE id = $1', [adId]);
    res.json({ success: true, likes: ad.likes });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

// Jwenn komantè yo
router.get('/:id/comments', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM ad_comments WHERE ad_id = $1 ORDER BY created_at DESC', [req.params.id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

// Komante (Obligatwa pou kliyan konekte)
router.post('/:id/comments', requireCustomer, async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment) return res.status(400).json({ error: 'Komantè obligatwa' });
    
    // Pran non kliyan an nan baz done a (pou l pa ka bay manti)
    const customer = await db.get('SELECT full_name FROM customers WHERE id = $1', [req.customer.id]);
    
    await db.run(
      'INSERT INTO ad_comments (ad_id, user_name, comment) VALUES ($1, $2, $3)',
      [req.params.id, customer.full_name, comment]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

module.exports = router;

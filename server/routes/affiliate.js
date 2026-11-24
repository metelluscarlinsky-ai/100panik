const express = require('express');
const db = require('../models/db');
const router = express.Router();

// Koneksyon Afilye
router.post('/login', async (req, res) => {
  try {
    const { email, code } = req.body;
    const aff = await db.get('SELECT * FROM affiliates WHERE email = $1 AND code = $2 AND status = $3', [email, code, 'active']);
    if (!aff) return res.status(401).json({ error: 'Invalid email or code' });
    res.json({ success: true, affiliate: aff });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Jwenn estatik afilye a
router.get('/:id/stats', async (req, res) => {
  try {
    const aff = await db.get('SELECT * FROM affiliates WHERE id = $1', [req.params.id]);
    if (!aff) return res.status(404).json({ error: 'Not found' });
    const orders = await db.all('SELECT id, order_number, total, created_at FROM orders WHERE affiliate_code = $1 AND status != $2 ORDER BY created_at DESC', [aff.code, 'cancelled']);
    res.json({ affiliate: aff, orders });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
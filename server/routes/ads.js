// 100PANIK - Piblisite (piblik)
const express = require('express');
const db = require('../models/db');

const router = express.Router();

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

module.exports = router;

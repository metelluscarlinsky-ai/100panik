const express = require('express');
const db = require('../models/db');
const router = express.Router();

router.get('/zones', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM shipping_zones WHERE active = 1');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.post('/quote', async (req, res) => {
  try {
    const { department, method } = req.body || {};
    if (!department) return res.status(400).json({ error: 'Depatman obligatwa' });
    const zone = await db.get('SELECT * FROM shipping_zones WHERE name = $1 AND active = 1', [department]);
    if (!zone) return res.status(404).json({ error: 'Zòn pa jwenn' });
    const cost = method === 'express' ? zone.express_price : zone.price;
    res.json({ zone: zone.name, method: method || 'standard', cost, estimated_days: zone.estimated_days });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.post('/promo', async (req, res) => {
  try {
    const { code, subtotal } = req.body || {};
    if (!code) return res.status(400).json({ error: 'Kòd obligatwa' });
    const promo = await db.get('SELECT * FROM promo_codes WHERE code = $1 AND active = 1', [String(code).toUpperCase()]);
    if (!promo) return res.status(404).json({ error: 'Kòd pa valid' });
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Kòd ekspire' });
    }
    if (promo.max_uses > 0 && promo.uses >= promo.max_uses) {
      return res.status(400).json({ error: 'Kòd fin itilize' });
    }
    if (subtotal && subtotal < promo.min_total) {
      return res.status(400).json({ error: 'Minimom ' + promo.min_total + ' HTG' });
    }
    let discount = 0;
    if (promo.type === 'percent') discount = (subtotal || 0) * (promo.value / 100);
    else discount = promo.value;
    res.json({ code: promo.code, type: promo.type, value: promo.value, discount: Math.round(discount) });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

module.exports = router;

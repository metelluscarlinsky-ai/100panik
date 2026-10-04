// ============================================
// 100PANIK - Wout livrezon
// ============================================
const express = require('express');
const db = require('../models/db');

const router = express.Router();

router.get('/zones', (req, res) => {
  const rows = db.prepare('SELECT * FROM shipping_zones WHERE active = 1').all();
  res.json(rows);
});

router.post('/quote', (req, res) => {
  const { department, method } = req.body || {};
  if (!department) return res.status(400).json({ error: 'Depatman obligatwa' });
  const zone = db.prepare('SELECT * FROM shipping_zones WHERE name = ? AND active = 1').get(department);
  if (!zone) return res.status(404).json({ error: 'Zòn pa jwenn' });
  const cost = method === 'express' ? zone.express_price : zone.price;
  res.json({ zone: zone.name, method: method || 'standard', cost, estimated_days: zone.estimated_days });
});

// Verifye kòd pwomo
router.post('/promo', (req, res) => {
  const { code, subtotal } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Kòd obligatwa' });
  const promo = db.prepare('SELECT * FROM promo_codes WHERE code = ? AND active = 1').get(code.toUpperCase());
  if (!promo) return res.status(404).json({ error: 'Kòd pa valid' });
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Kòd ekspire' });
  }
  if (promo.max_uses > 0 && promo.uses >= promo.max_uses) {
    return res.status(400).json({ error: 'Kòd fin itilize' });
  }
  if (subtotal && subtotal < promo.min_total) {
    return res.status(400).json({ error: `Minimòm ${promo.min_total} HTG` });
  }
  let discount = 0;
  if (promo.type === 'percent') discount = (subtotal || 0) * (promo.value / 100);
  else discount = promo.value;
  res.json({ code: promo.code, type: promo.type, value: promo.value, discount: Math.round(discount) });
});

module.exports = router;

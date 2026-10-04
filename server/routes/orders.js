// ============================================
// 100PANIK - Wout kòmand (kliyan)
// ============================================
const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../models/db');

const router = express.Router();

// Kreye kòmand
router.post('/', (req, res) => {
  const {
    customer_name, email, phone, address, department, city, notes,
    shipping_method, payment_method, promo_code, items
  } = req.body || {};

  // Validasyon
  if (!customer_name || !phone || !address || !department) {
    return res.status(400).json({ error: 'Chan obligatwa manke' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Panier vid' });
  }

  try {
    const result = db.transaction(() => {
      // Verifye stock + kalkile total
      let subtotal = 0;
      const resolvedItems = [];
      for (const it of items) {
        const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(it.product_id);
        if (!prod) throw new Error(`Pwodwi #${it.product_id} pa egziste`);
        if (prod.stock < it.quantity) throw new Error(`Stock ensifizan pou ${prod.name}`);
        subtotal += prod.price * it.quantity;
        resolvedItems.push({
          product_id: prod.id,
          name: prod.name,
          price: prod.price,
          quantity: it.quantity,
          size: it.size || null,
          color: it.color || null,
          image: (JSON.parse(prod.images || '[]')[0]) || null
        });
      }

      // Frè livrezon
      const zone = db.prepare('SELECT * FROM shipping_zones WHERE name = ? AND active = 1').get(department);
      if (!zone) throw new Error('Zòn livrezon pa valid');
      const shipping_cost = shipping_method === 'express' ? zone.express_price : zone.price;

      // Pwomo
      let discount = 0;
      let validPromo = null;
      if (promo_code) {
        const promo = db.prepare('SELECT * FROM promo_codes WHERE code = ? AND active = 1').get(promo_code.toUpperCase());
        if (promo && (!promo.expires_at || new Date(promo.expires_at) > new Date()) &&
            (promo.max_uses === 0 || promo.uses < promo.max_uses) &&
            subtotal >= promo.min_total) {
          discount = promo.type === 'percent' ? subtotal * (promo.value / 100) : promo.value;
          validPromo = promo;
        }
      }

      const total = Math.max(0, subtotal + shipping_cost - discount);
      const order_number = 'PANIK-' + nanoid(8).toUpperCase();
      const tracking = 'TRK' + nanoid(10).toUpperCase();

      const insOrder = db.prepare(`INSERT INTO orders
        (order_number, customer_name, email, phone, address, department, city, notes,
         shipping_method, shipping_cost, subtotal, discount, total, promo_code,
         payment_method, status, tracking)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

      const info = insOrder.run(
        order_number, customer_name, email || null, phone, address, department, city || null, notes || null,
        shipping_method || 'standard', shipping_cost, subtotal, discount, total,
        validPromo ? validPromo.code : null,
        payment_method || 'cod', 'pending', tracking
      );
      const orderId = info.lastInsertRowid;

      const insItem = db.prepare(`INSERT INTO order_items
        (order_id, product_id, name, price, quantity, size, color, image)
        VALUES (?,?,?,?,?,?,?,?)`);
      const updStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

      for (const it of resolvedItems) {
        insItem.run(orderId, it.product_id, it.name, it.price, it.quantity, it.size, it.color, it.image);
        updStock.run(it.quantity, it.product_id);
      }

      if (validPromo) {
        db.prepare('UPDATE promo_codes SET uses = uses + 1 WHERE id = ?').run(validPromo.id);
      }

      return { order_number, tracking, total };
    })();

    res.json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Erè nan kòmand lan' });
  }
});

// Trase kòmand
router.get('/track/:orderNumber', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE order_number = ? OR tracking = ?')
    .get(req.params.orderNumber, req.params.orderNumber);
  if (!order) return res.status(404).json({ error: 'Kòmand pa jwenn' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({
    order_number: order.order_number,
    status: order.status,
    tracking: order.tracking,
    total: order.total,
    customer_name: order.customer_name,
    shipping_method: order.shipping_method,
    department: order.department,
    created_at: order.created_at,
    items
  });
});

module.exports = router;


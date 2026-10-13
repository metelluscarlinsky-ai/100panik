const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../models/db');
const router = express.Router();

router.post('/', async (req, res) => {
  const {
    customer_name, email, phone, address, department, city, notes,
    shipping_method, payment_method, promo_code, items
  } = req.body || {};

  if (!customer_name || !phone || !address || !department) {
    return res.status(400).json({ error: 'Chan obligatwa manke' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Panye vid' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    let subtotal = 0;
    const resolved = [];
    for (const it of items) {
      const r = await client.query('SELECT * FROM products WHERE id = $1', [it.product_id]);
      const prod = r.rows[0];
      if (!prod) throw new Error('Pwodwi #' + it.product_id + ' pa egziste');
      if (prod.stock < it.quantity) throw new Error('Stock ensifizan pou ' + prod.name);
      subtotal += prod.price * it.quantity;
      const imgs = JSON.parse(prod.images || '[]');
      resolved.push({
        product_id: prod.id,
        name: prod.name,
        price: prod.price,
        quantity: it.quantity,
        size: it.size || null,
        color: it.color || null,
        image: imgs[0] || null
      });
    }

    const zr = await client.query('SELECT * FROM shipping_zones WHERE name = $1 AND active = 1', [department]);
    const zone = zr.rows[0];
    if (!zone) throw new Error('Zòn livrezon pa valid');
    const shipping_cost = shipping_method === 'express' ? zone.express_price : zone.price;

    let discount = 0;
    let validPromo = null;
    if (promo_code) {
      const pr = await client.query('SELECT * FROM promo_codes WHERE code = $1 AND active = 1', [String(promo_code).toUpperCase()]);
      const promo = pr.rows[0];
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

    const orderRes = await client.query(
      `INSERT INTO orders
       (order_number, customer_name, email, phone, address, department, city, notes,
        shipping_method, shipping_cost, subtotal, discount, total, promo_code,
        payment_method, status, tracking)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING id`,
      [order_number, customer_name, email || null, phone, address, department, city || null, notes || null,
       shipping_method || 'standard', shipping_cost, subtotal, discount, total,
       validPromo ? validPromo.code : null, payment_method || 'cod', 'pending', tracking]
    );
    const orderId = orderRes.rows[0].id;

    for (const it of resolved) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, name, price, quantity, size, color, image)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [orderId, it.product_id, it.name, it.price, it.quantity, it.size, it.color, it.image]
      );
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [it.quantity, it.product_id]);
    }

    if (validPromo) {
      await client.query('UPDATE promo_codes SET uses = uses + 1 WHERE id = $1', [validPromo.id]);
    }

    await client.query('COMMIT');
    res.json({ success: true, order_number, tracking, total });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(400).json({ error: err.message || 'Erè nan kòmand lan' });
  } finally {
    client.release();
  }
});

router.get('/track/:orderNumber', async (req, res) => {
  try {
    const num = req.params.orderNumber;
    const order = await db.get('SELECT * FROM orders WHERE order_number = $1 OR tracking = $1', [num]);
    if (!order) return res.status(404).json({ error: 'Kòmand pa jwenn' });
    const items = await db.all('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
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
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

module.exports = router;

const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../models/db');
const { signCustomerToken, requireCustomer } = require('../middleware/customer-auth');

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Twop tantativ. Eseye anko pita.' }
});

router.post('/register', limiter, async (req, res) => {
  try {
    const b = req.body || {};
    const full_name = String(b.full_name || '').trim();
    const email = String(b.email || '').trim().toLowerCase();
    const phone = String(b.phone || '').trim();
    const password = String(b.password || '');

    if (!full_name || !email || !password) return res.status(400).json({ error: 'Non, imel ak modpas obligatwa' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Imel envalid' });
    if (password.length < 6) return res.status(400).json({ error: 'Modpas dwe gen 6 karakte minimum' });

    const exists = await db.get('SELECT id FROM customers WHERE email = $1', [email]);
    if (exists) return res.status(400).json({ error: 'Imel sa a deja enskri' });

    const hash = bcrypt.hashSync(password, 10);
    const info = await db.run(
      'INSERT INTO customers (full_name, email, phone, password) VALUES ($1, $2, $3, $4) RETURNING id',
      [full_name, email, phone, hash]
    );

    const customer = await db.get('SELECT * FROM customers WHERE id = $1', [info.lastInsertRowid]);
    const token = signCustomerToken(customer);
    res.json({
      token,
      customer: {
        id: customer.id, full_name: customer.full_name, email: customer.email,
        phone: customer.phone, created_at: customer.created_at
      }
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erè sèvè' }); }
});

router.post('/login', limiter, async (req, res) => {
  try {
    const b = req.body || {};
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    if (!email || !password) return res.status(400).json({ error: 'Imel ak modpas obligatwa' });

    const customer = await db.get('SELECT * FROM customers WHERE email = $1', [email]);
    if (!customer) return res.status(401).json({ error: 'Imel oswa modpas envalid' });
    if (!customer.active) return res.status(403).json({ error: 'Kont ou dezaktive' });
    if (!bcrypt.compareSync(password, customer.password)) {
      return res.status(401).json({ error: 'Imel oswa modpas envalid' });
    }

    const token = signCustomerToken(customer);
    res.json({
      token,
      customer: {
        id: customer.id, full_name: customer.full_name, email: customer.email,
        phone: customer.phone, address: customer.address, department: customer.department,
        city: customer.city, created_at: customer.created_at
      }
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erè sèvè' }); }
});

router.get('/me', requireCustomer, async (req, res) => {
  try {
    const c = await db.get(
      'SELECT id, full_name, email, phone, address, department, city, avatar, created_at FROM customers WHERE id = $1',
      [req.customer.id]
    );
    if (!c) return res.status(404).json({ error: 'Kont pa jwenn' });
    res.json(c);
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.put('/me', requireCustomer, async (req, res) => {
  try {
    const b = req.body || {};
    await db.run(
      `UPDATE customers SET
        full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        address = COALESCE($3, address),
        department = COALESCE($4, department),
        city = COALESCE($5, city)
       WHERE id = $6`,
      [b.full_name || null, b.phone || null, b.address || null, b.department || null, b.city || null, req.customer.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.post('/change-password', requireCustomer, async (req, res) => {
  try {
    const b = req.body || {};
    const current = String(b.current || '');
    const next = String(b.next || '');
    if (next.length < 6) return res.status(400).json({ error: 'Modpas nouvo dwe gen 6 karakte minimum' });
    const c = await db.get('SELECT * FROM customers WHERE id = $1', [req.customer.id]);
    if (!bcrypt.compareSync(current, c.password)) {
      return res.status(401).json({ error: 'Modpas aktyel envalid' });
    }
    const hash = bcrypt.hashSync(next, 10);
    await db.run('UPDATE customers SET password = $1 WHERE id = $2', [hash, req.customer.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.get('/orders', requireCustomer, async (req, res) => {
  try {
    const c = await db.get('SELECT email, phone FROM customers WHERE id = $1', [req.customer.id]);
    const orders = await db.all(
      'SELECT * FROM orders WHERE email = $1 OR phone = $2 ORDER BY created_at DESC',
      [c.email, c.phone]
    );
    res.json(orders);
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.get('/orders/:id', requireCustomer, async (req, res) => {
  try {
    const c = await db.get('SELECT email, phone FROM customers WHERE id = $1', [req.customer.id]);
    const order = await db.get('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Pa jwenn' });
    if (order.email !== c.email && order.phone !== c.phone) {
      return res.status(403).json({ error: 'Aksè refize' });
    }
    const items = await db.all('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    res.json({ ...order, items });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

module.exports = router;

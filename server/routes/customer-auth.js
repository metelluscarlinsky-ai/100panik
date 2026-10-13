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

// ENSKRIPSYON
router.post('/register', limiter, (req, res) => {
  const b = req.body || {};
  const full_name = String(b.full_name || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const phone = String(b.phone || '').trim();
  const password = String(b.password || '');

  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Non, imel ak modpas obligatwa' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Imel envalid' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Modpas dwe gen 6 karakte minimum' });
  }

  const exists = db.prepare('SELECT id FROM customers WHERE email = ?').get(email);
  if (exists) return res.status(400).json({ error: 'Imel sa a deja enskri' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(
    'INSERT INTO customers (full_name, email, phone, password) VALUES (?, ?, ?, ?)'
  ).run(full_name, email, phone, hash);

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid);
  const token = signCustomerToken(customer);

  res.json({
    token,
    customer: {
      id: customer.id,
      full_name: customer.full_name,
      email: customer.email,
      phone: customer.phone,
      created_at: customer.created_at
    }
  });
});

// KONEKSYON
router.post('/login', limiter, (req, res) => {
  const b = req.body || {};
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Imel ak modpas obligatwa' });
  }

  const customer = db.prepare('SELECT * FROM customers WHERE email = ?').get(email);
  if (!customer) return res.status(401).json({ error: 'Imel oswa modpas envalid' });
  if (!customer.active) return res.status(403).json({ error: 'Kont ou dezaktive' });

  if (!bcrypt.compareSync(password, customer.password)) {
    return res.status(401).json({ error: 'Imel oswa modpas envalid' });
  }

  const token = signCustomerToken(customer);
  res.json({
    token,
    customer: {
      id: customer.id,
      full_name: customer.full_name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      department: customer.department,
      city: customer.city,
      created_at: customer.created_at
    }
  });
});

// PWOFIL
router.get('/me', requireCustomer, (req, res) => {
  const customer = db.prepare('SELECT id, full_name, email, phone, address, department, city, avatar, created_at FROM customers WHERE id = ?').get(req.customer.id);
  if (!customer) return res.status(404).json({ error: 'Kont pa jwenn' });
  res.json(customer);
});

// MIZAJOU PWOFIL
router.put('/me', requireCustomer, (req, res) => {
  const b = req.body || {};
  db.prepare(`
    UPDATE customers SET
      full_name = COALESCE(?, full_name),
      phone = COALESCE(?, phone),
      address = COALESCE(?, address),
      department = COALESCE(?, department),
      city = COALESCE(?, city)
    WHERE id = ?
  `).run(
    b.full_name || null,
    b.phone || null,
    b.address || null,
    b.department || null,
    b.city || null,
    req.customer.id
  );
  res.json({ success: true });
});

// CHANJE MODPAS
router.post('/change-password', requireCustomer, (req, res) => {
  const b = req.body || {};
  const current = String(b.current || '');
  const next = String(b.next || '');
  if (next.length < 6) return res.status(400).json({ error: 'Modpas nouvo dwe gen 6 karakte minimum' });

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.customer.id);
  if (!bcrypt.compareSync(current, customer.password)) {
    return res.status(401).json({ error: 'Modpas aktyel envalid' });
  }
  const hash = bcrypt.hashSync(next, 10);
  db.prepare('UPDATE customers SET password = ? WHERE id = ?').run(hash, req.customer.id);
  res.json({ success: true });
});

// KOMAND KLIYAN
router.get('/orders', requireCustomer, (req, res) => {
  const customer = db.prepare('SELECT email, phone FROM customers WHERE id = ?').get(req.customer.id);
  const orders = db.prepare(`
    SELECT * FROM orders
    WHERE email = ? OR phone = ?
    ORDER BY created_at DESC
  `).all(customer.email, customer.phone);
  res.json(orders);
});

router.get('/orders/:id', requireCustomer, (req, res) => {
  const customer = db.prepare('SELECT email, phone FROM customers WHERE id = ?').get(req.customer.id);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pa jwenn' });
  if (order.email !== customer.email && order.phone !== customer.phone) {
    return res.status(403).json({ error: 'Aksè refize' });
  }
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ ...order, items });
});

module.exports = router;

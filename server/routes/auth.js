const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../models/db');
const { signToken } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Twop tantativ. Eseye anko nan 15 minit.' }
});

router.post('/login', loginLimiter, (req, res) => {
  const body = req.body || {};
  const username = body.username;
  const password = body.password;

  if (!username || !password) {
    return res.status(400).json({ error: 'Email ak modpas obligatwa' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username).trim().toLowerCase());

  if (!user) return res.status(401).json({ error: 'Enfomasyon envalid' });

  if (!bcrypt.compareSync(String(password), user.password)) {
    return res.status(401).json({ error: 'Enfomasyon envalid' });
  }

  const token = signToken(user);
  res.json({ token: token, user: { id: user.id, username: user.username } });
});

module.exports = router;

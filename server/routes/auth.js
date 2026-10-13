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

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const body = req.body || {};
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!username || !password) {
      return res.status(400).json({ error: 'Email ak modpas obligatwa' });
    }

    const user = await db.get('SELECT * FROM users WHERE username = $1', [username]);
    if (!user) {
      console.log('Login echwe: user pa jwenn (' + username + ')');
      return res.status(401).json({ error: 'Enfomasyon envalid' });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      console.log('Login echwe: modpas envalid (' + username + ')');
      return res.status(401).json({ error: 'Enfomasyon envalid' });
    }

    const token = signToken(user);
    res.json({ token: token, user: { id: user.id, username: user.username } });
  } catch (e) {
    console.error('LOGIN ERÈ:', e);
    res.status(500).json({ error: 'Erè sèvè: ' + e.message });
  }
});

module.exports = router;

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../models/db');
const { signToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting retire pou devlopman
router.post('/login', async (req, res) => {
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
      console.log('Login echwe: modpas envalid');
      return res.status(401).json({ error: 'Enfomasyon envalid' });
    }

    const token = signToken(user);
    console.log('✅ Login siksè pou:', username);
    res.json({ token: token, user: { id: user.id, username: user.username } });
  } catch (e) {
    console.error('LOGIN ERÈ:', e);
    res.status(500).json({ error: 'Erè sèvè: ' + e.message });
  }
});

module.exports = router;

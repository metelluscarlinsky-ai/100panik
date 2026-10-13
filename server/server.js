// ============================================
// 100PANIK - Sèvè Express prensipal
// ============================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/customer', require('./routes/customer-auth'));

// Rate limit jeneral
app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
}));

// ---------- SEKIRITE HEADERS ----------
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');
  next();
});

// ---------- ROUTES API ----------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/shipping', require('./routes/shipping'));
app.use('/api/admin', require('./routes/admin'));

// ---------- UPLOADS ----------
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  maxAge: '7d'
}));

// ---------- STATIC PUBLIC ----------
app.use(express.static(path.join(__dirname, '..', 'public'), {
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    // Service worker pa dwe cache
    if (filePath.endsWith('service-worker.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Service-Worker-Allowed', '/');
    }
  }
}));

// ---------- FALLBACK ----------

// Bloke endèks admin nan Google
app.get('/admin-100panik*', (req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  next();
});


app.get('/admin-100panik', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-100panik.html'));
});
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ---------- ERROR HANDLER ----------
app.use((err, req, res, next) => {
  console.error('❌', err.message);
  if (err.message && err.message.includes('imaj')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Erè sèvè' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════╗
║  🖤 100PANIK — Sèvè ap kouri                  ║
║  http://localhost:${PORT}                       ║
║  Admin: http://localhost:${PORT}/admin-100panik ║
╚══════════════════════════════════════════════╝
  `);
});

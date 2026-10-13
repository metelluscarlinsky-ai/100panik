const jwt = require('jsonwebtoken');

const SECRET = (process.env.JWT_SECRET || 'dev_secret_panik') + '_customer';

function signCustomerToken(customer) {
  return jwt.sign(
    { id: customer.id, email: customer.email, type: 'customer' },
    SECRET,
    { expiresIn: '30d' }
  );
}

function requireCustomer(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Ou dwe konekte' });
  try {
    const payload = jwt.verify(token, SECRET);
    if (payload.type !== 'customer') throw new Error('Tip envalid');
    req.customer = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Sesyon ekspire' });
  }
}

module.exports = { signCustomerToken, requireCustomer, CUSTOMER_SECRET: SECRET };

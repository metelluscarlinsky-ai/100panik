require('dotenv').config();
const db = require('./server/models/db');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    console.log('1. DB env:', process.env.DATABASE_URL ? 'OK' : 'MANKE');
    console.log('2. DB koneksyon...');
    const r = await db.get('SELECT NOW() as now');
    console.log('   DB OK:', r.now);

    console.log('3. Chèche user...');
    const user = await db.get('SELECT * FROM users WHERE username = $1', ['metelluscarlinsky@gmail.com']);
    console.log('   User:', user ? user.username : 'PA JWENN');
    if (!user) {
      console.log('   → Pa gen kont admin ak imèl sa a');
      process.exit(1);
    }

    console.log('4. Verifye modpas OGPLUG45...');
    const ok = bcrypt.compareSync('OGPLUG45', user.password);
    console.log('   Match:', ok);
    if (!ok) {
      console.log('   → Modpas pa bon');
      process.exit(1);
    }

    console.log('');
    console.log('TOUT BAGAY BON');
    process.exit(0);
  } catch (e) {
    console.error('ERÈ:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();

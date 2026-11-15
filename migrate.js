require('dotenv').config();
const { Pool } = require('pg');

// Ansyen baz done Supabase ou a
const OLD_DB = 'postgresql://postgres.bqvuvtjghjvuekdzhnqj:OGSUNENTREPRISE@aws-0-us-east-2.pooler.supabase.com:6543/postgres';
// Nouvo baz done Neon ou a (soti nan .env)
const NEW_DB = process.env.DATABASE_URL;

const oldPool = new Pool({ connectionString: OLD_DB, ssl: { rejectUnauthorized: false } });
const newPool = new Pool({ connectionString: NEW_DB, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    console.log('Ap kopye PWODWI yo soti Supabase ale Neon...');
    const prods = await oldPool.query('SELECT * FROM products');
    for (let p of prods.rows) {
      await newPool.query(
        `INSERT INTO products (name, slug, description, price, compare_price, category, sizes, colors, images, stock, featured, active, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [p.name, p.slug, p.description, p.price, p.compare_price, p.category, p.sizes, p.colors, p.images, p.stock, p.featured, p.active, p.created_at]
      );
    }
    console.log('✅ ' + prods.rowCount + ' pwodwi kopye!');

    console.log('Ap kopye PIBLISITE yo soti Supabase ale Neon...');
    const ads = await oldPool.query('SELECT * FROM ads');
    for (let a of ads.rows) {
      await newPool.query(
        `INSERT INTO ads (title, type, media_url, thumb_url, link_url, position, active, sort_order, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [a.title, a.type, a.media_url, a.thumb_url, a.link_url, a.position, a.active, a.sort_order, a.created_at]
      );
    }
    console.log('✅ ' + ads.rowCount + ' piblisite kopye!');

    console.log('🎉 TOUT DONE YO TRANSFERE AK SIKSÈ!');
    process.exit(0);
  } catch (e) {
    console.error('❌ Erè:', e.message);
    process.exit(1);
  }
})();

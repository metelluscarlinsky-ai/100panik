// ============ ADS (PIBLISITE) ============
router.get('/ads', async (req, res) => {
  try {
    res.json(await db.all('SELECT * FROM ads ORDER BY sort_order ASC, created_at DESC'));
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});

router.post('/ads', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.media_url) return res.status(400).json({ error: 'Media obligatwa' });
    const info = await db.run(
      `INSERT INTO ads (title, type, media_url, thumb_url, link_url, position, active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        b.title || '',
        b.type || 'image',
        b.media_url,
        b.thumb_url || null,
        b.link_url || null,
        b.position || 'home_footer',
        b.active === false ? 0 : 1,
        Number(b.sort_order) || 0
      ]
    );
    res.json({ id: info.lastInsertRowid });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erè' }); }
});

router.put('/ads/:id', async (req, res) => {
  try {
    const b = req.body || {};
    await db.run(
      `UPDATE ads SET title=$1, type=$2, media_url=$3, thumb_url=$4, link_url=$5, position=$6, active=$7, sort_order=$8 WHERE id=$9`,
      [
        b.title || '',
        b.type || 'image',
        b.media_url,
        b.thumb_url || null,
        b.link_url || null,
        b.position || 'home_footer',
        b.active === false ? 0 : 1,
        Number(b.sort_order) || 0,
        req.params.id
      ]
    );
    res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erè' }); }
});

router.delete('/ads/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM ads WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erè' }); }
});


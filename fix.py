import re

path = 'server/routes/admin.js'
with open(path, 'r') as f:
    src = f.read()

start = src.find("router.post('/upload'")
end = src.find("// ============ KOMAND")

if start == -1 or end == -1:
    print("❌ Pa jwenn blòk la.")
    exit(1)

new_code = """router.post('/upload', upload.array('images', 10), async (req, res) => {
  try {
    const files = req.files || [];
    if (files.length === 0) return res.json({ files: [] });
    const urls = [];
    for (let i = 0; i < files.length; i++) {
      const url = await uploadToSupabase(files[i]);
      urls.push(url);
    }
    res.json({ files: urls });
  } catch (e) {
    console.error('Erè upload:', e);
    res.status(500).json({ error: e.message || 'Erè pandan upload la' });
  }
});

"""

src = src[:start] + new_code + src[end:]

if 'uploadToSupabase' not in src:
    src = src.replace(
        "const { upload } = require('../middleware/upload');",
        "const { upload, uploadToSupabase } = require('../middleware/upload');"
    )

with open(path, 'w') as f:
    f.write(src)

print("✅ Fichye a repare nèt ak Python.")

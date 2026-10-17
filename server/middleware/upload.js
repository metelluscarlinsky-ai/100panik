const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL oswa SUPABASE_SERVICE_KEY manke nan .env');
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');
const BUCKET = 'product-images';

const storage = multer.memoryStorage();

const ALLOWED = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'
];

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: function(req, file, cb) {
    if (ALLOWED.indexOf(file.mimetype) === -1) {
      return cb(new Error('Selman imaj (JPG/PNG/WEBP/GIF) oswa videyo (MP4/WEBM/MOV) aksepte'));
    }
    cb(null, true);
  }
});

async function uploadToSupabase(file) {
  const ext = path.extname(file.originalname).toLowerCase() || '.bin';
  const filename = Date.now() + '-' + Math.random().toString(36).slice(2, 9) + ext;

  const result = await supabase.storage
    .from(BUCKET)
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (result.error) throw new Error('Supabase upload: ' + result.error.message);

  const urlResult = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return urlResult.data.publicUrl;
}

module.exports = { upload, supabase, uploadToSupabase, BUCKET };

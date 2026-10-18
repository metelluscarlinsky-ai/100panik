const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('=== Upload config ===');
console.log('SUPABASE_URL:', SUPABASE_URL || 'MANKE');
console.log('SUPABASE_SERVICE_KEY:', SUPABASE_KEY ? 'PREZAN (' + SUPABASE_KEY.length + ' karaktè)' : 'MANKE');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL oswa SUPABASE_SERVICE_KEY manke');
}

const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_KEY || 'placeholder');
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
      return cb(new Error('Selman imaj oswa video aksepte'));
    }
    cb(null, true);
  }
});

async function uploadToSupabase(file) {
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const filename = Date.now() + '-' + Math.random().toString(36).slice(2, 9) + ext;

  console.log('=== Upload ap kòmanse ===');
  console.log('Fichye:', file.originalname, '(' + file.size + ' bytes, ' + file.mimetype + ')');
  console.log('Destinasyon:', BUCKET + '/' + filename);

  const result = await supabase.storage
    .from(BUCKET)
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (result.error) {
    console.error('❌ Supabase upload erè:', result.error);
    throw new Error('Supabase upload: ' + result.error.message);
  }

  console.log('✅ Upload siksè:', result.data);

  const urlResult = supabase.storage.from(BUCKET).getPublicUrl(filename);
  console.log('URL piblik:', urlResult.data.publicUrl);

  return urlResult.data.publicUrl;
}

module.exports = { upload, supabase, uploadToSupabase, BUCKET };

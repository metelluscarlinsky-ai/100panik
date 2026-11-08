const API = '/api';
let token = localStorage.getItem('panik_admin_token');
let currentSizes = [];
let currentColors = [];

function showToast(msg) {
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 3000);
}

function logout() {
  localStorage.removeItem('panik_admin_token');
  location.reload();
}

async function apiFetch(endpoint, opts) {
  opts = opts || {};
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const merged = Object.assign({}, opts, { headers: Object.assign(headers, opts.headers || {}) });
  const res = await fetch(API + endpoint, merged);
  if (res.status === 401) return logout();
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erè');
  return data;
}

var loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    try {
      const res = await fetch(API + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: document.getElementById('login-email').value, password: document.getElementById('login-pass').value })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      token = data.token;
      localStorage.setItem('panik_admin_token', token);
      initApp();
    } catch (err) { alert(err.message); }
  });
}

document.querySelectorAll('.nav-item').forEach(function(item) {
  item.addEventListener('click', function() {
    document.querySelectorAll('.nav-item').forEach(function(i) { i.classList.remove('active'); });
    item.classList.add('active');
    document.querySelectorAll('.page-content').forEach(function(p) { p.classList.add('hidden'); });
    document.getElementById('page-' + item.dataset.page).classList.remove('hidden');
    document.getElementById('current-page-title').textContent = item.textContent.trim();
    loadPageData(item.dataset.page);
  });
});

function loadPageData(page) {
  if (page === 'dashboard') loadStats();
  if (page === 'products') loadProducts();
  if (page === 'ads') loadAds();
  if (page === 'settings') loadSettings();
}

async function initApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-sidebar').style.display = 'block';
  document.getElementById('app-main').style.display = 'block';
  loadStats();
  loadProducts();

  document.getElementById('btn-add-prod').addEventListener('click', function() {
    document.getElementById('form-product').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-image-url').value = '';
    currentSizes = [];
    currentColors = [];
    document.querySelectorAll('#sizes-container .chip').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('#colors-container .chip').forEach(c => c.classList.remove('active'));
    document.getElementById('modal-product').classList.add('open');
  });

  document.getElementById('btn-add-ad').addEventListener('click', function() {
    document.getElementById('form-ad').reset();
    document.getElementById('ad-media-url').value = '';
    document.getElementById('modal-ad').classList.add('open');
  });

  document.querySelectorAll('#sizes-container .chip').forEach(chip => {
    chip.onclick = () => {
      const val = chip.dataset.val;
      if (currentSizes.includes(val)) { currentSizes = currentSizes.filter(v => v !== val); chip.classList.remove('active'); } 
      else { currentSizes.push(val); chip.classList.add('active'); }
    };
  });

  document.querySelectorAll('#colors-container .chip').forEach(chip => {
    chip.onclick = () => {
      const val = chip.dataset.val;
      if (currentColors.includes(val)) { currentColors = currentColors.filter(v => v !== val); chip.classList.remove('active'); } 
      else { currentColors.push(val); chip.classList.add('active'); }
    };
  });
}

async function uploadFile(input, targetId) {
  if (!input.files || !input.files[0]) return;
  const fd = new FormData();
  fd.append('images', input.files[0]);
  showToast('Ap telechaje...');
  try {
    const res = await fetch(API + '/admin/upload', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: fd
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    document.getElementById(targetId).value = data.files[0];
    showToast('Telechajman fèt!');
  } catch (err) { alert('Erè upload: ' + err.message); }
}

async function loadProducts() {
  try {
    const prods = await apiFetch('/admin/products');
    window.allProducts = prods;
    const container = document.getElementById('products-list');
    if (!container) return;
    
    if (prods.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px;">Pa gen pwodwi.</p>';
      return;
    }

    container.innerHTML = prods.map(function(p) {
      const imgUrl = (p.images && p.images.length > 0) ? p.images[0] : '/images/placeholder.jpg';
      return '<div class="product-card">' +
        '<img src="' + imgUrl + '">' +
        '<div class="p-info">' +
          '<h3>' + p.name + '</h3>' +
          '<div class="p-details">' + p.price + ' HTG | Stock: ' + (p.stock !== undefined ? p.stock : '-') + '</div>' +
        '</div>' +
        '<div class="p-actions">' +
          '<button class="btn btn-outline" onclick="window.editProduct(' + p.id + ')">Modifye</button>' +
          '<button class="btn btn-danger" onclick="window.deleteProduct(' + p.id + ')">Efase</button>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (err) { console.error(err); }
}

window.editProduct = function(id) {
  const p = window.allProducts.find(function(x) { return x.id === id; });
  document.getElementById('prod-id').value = p.id;
  document.getElementById('prod-name').value = p.name;
  document.getElementById('prod-price').value = p.price;
  document.getElementById('prod-stock').value = p.stock;
  document.getElementById('prod-cat').value = p.category || '';
  document.getElementById('prod-desc').value = p.description || '';
  document.getElementById('prod-image-url').value = (p.images && p.images.length) ? p.images[0] : '';

  currentSizes = p.sizes || [];
  document.querySelectorAll('#sizes-container .chip').forEach(c => { c.classList.toggle('active', currentSizes.includes(c.dataset.val)); });

  currentColors = p.colors || [];
  document.querySelectorAll('#colors-container .chip').forEach(c => { c.classList.toggle('active', currentColors.includes(c.dataset.val)); });

  document.getElementById('modal-product').classList.add('open');
};

window.deleteProduct = async function(id) {
  if (!confirm('Èske w sèten ou vle efase pwodwi sa a?')) return;
  try {
    await apiFetch('/admin/products/' + id, { method: 'DELETE' });
    showToast('Pwodwi efase');
    loadProducts();
  } catch (err) { alert('Erè: ' + err.message); }
};

async function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('prod-id').value;
  const imgVal = document.getElementById('prod-image-url').value;
  const body = {
    name: document.getElementById('prod-name').value,
    price: Number(document.getElementById('prod-price').value),
    compare_price: 0, category: document.getElementById('prod-cat').value || 'general',
    description: document.getElementById('prod-desc').value,
    images: imgVal ? [imgVal] : [], sizes: currentSizes, colors: currentColors,
    stock: Number(document.getElementById('prod-stock').value), featured: 0, active: 1
  };
  try {
    if (id) await apiFetch('/admin/products/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await apiFetch('/admin/products', { method: 'POST', body: JSON.stringify(body) });
    document.getElementById('modal-product').classList.remove('open');
    showToast('Pwodwi sove ak siksè');
    loadProducts();
  } catch (err) { alert('Erè: ' + err.message); }
}

async function loadAds() {
  try {
    const ads = await apiFetch('/admin/ads');
    const container = document.getElementById('ads-list');
    if(!container) return;
    container.innerHTML = ads.map(function(a) {
      return '<div class="product-card">' +
        '<div class="p-info"><h3>' + (a.title || 'Piblisite') + '</h3></div>' +
        '<div class="p-actions"><button class="btn btn-danger" onclick="window.deleteAd(' + a.id + ')">Efase</button></div>' +
      '</div>';
    }).join('');
  } catch (err) { console.error(err); }
}

window.deleteAd = async function(id) {
  if (!confirm('Efase piblisite sa a?')) return;
  try {
    await apiFetch('/admin/ads/' + id, { method: 'DELETE' });
    showToast('Piblisite efase');
    loadAds();
  } catch (err) { alert(err.message); }
};

async function saveAd(e) {
  e.preventDefault();
  const body = { title: document.getElementById('ad-title').value, type: 'image', media_url: document.getElementById('ad-media-url').value, active: 1 };
  try {
    await apiFetch('/admin/ads', { method: 'POST', body: JSON.stringify(body) });
    document.getElementById('modal-ad').classList.remove('open');
    showToast('Piblisite sove');
    loadAds();
  } catch (err) { alert(err.message); }
}

async function loadStats() {
  try {
    const s = await apiFetch('/admin/stats');
    document.getElementById('stats-container').innerHTML =
      '<div class="stat-card"><div class="stat-title">Revni</div><div class="stat-value">' + s.revenue + ' HTG</div></div>' +
      '<div class="stat-card"><div class="stat-title">Kòmand</div><div class="stat-value">' + s.totalOrders + '</div></div>' +
      '<div class="stat-card"><div class="stat-title">Pwodwi</div><div class="stat-value">' + s.totalProducts + '</div></div>' +
      '<div class="stat-card"><div class="stat-title">Kliyan</div><div class="stat-value">' + s.totalCustomers + '</div></div>';
  } catch (err) { console.error(err); }
}

async function loadSettings() {
  try {
    const s = await apiFetch('/admin/settings');
    document.getElementById('set-brand').value = s.brand_name || '';
    document.getElementById('set-color').value = s.primary_color || '';
    document.getElementById('set-email').value = s.contact_email || '';
    document.getElementById('set-phone').value = s.contact_phone || '';
  } catch (err) { console.error(err); }
}

async function saveSettings(e) {
  e.preventDefault();
  const body = { brand_name: document.getElementById('set-brand').value, primary_color: document.getElementById('set-color').value, contact_email: document.getElementById('set-email').value, contact_phone: document.getElementById('set-phone').value };
  try {
    await apiFetch('/admin/settings', { method: 'PUT', body: JSON.stringify(body) });
    showToast('Konfigirasyon sove');
  } catch (err) { alert(err.message); }
}

if (token) initApp(); else document.getElementById('login-screen').style.display = 'flex';

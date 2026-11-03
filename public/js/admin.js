const API = '/api';
let token = localStorage.getItem('panik_admin_token');

function showToast(msg) {
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function logout() {
  localStorage.removeItem('panik_admin_token');
  location.reload();
}

async function apiFetch(endpoint, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  
  const res = await fetch(API + endpoint, { ...opts, headers: { ...headers, ...opts.headers } });
  if (res.status === 401) return logout();
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erè');
  return data;
}

document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const res = await fetch(API + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('login-email').value,
        password: document.getElementById('login-pass').value
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    token = data.token;
    localStorage.setItem('panik_admin_token', token);
    initApp();
  } catch (err) {
    alert(err.message);
  }
});

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${item.dataset.page}`).classList.remove('hidden');
    document.getElementById('current-page-title').textContent = item.textContent.trim();
    loadPageData(item.dataset.page);
  });
});

function loadPageData(page) {
  if (page === 'dashboard') loadStats();
  if (page === 'products') loadProducts();
  if (page === 'orders') loadOrders();
  if (page === 'customers') loadCustomers();
  if (page === 'ads') loadAds();
}

async function initApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-sidebar').style.display = 'block';
  document.getElementById('app-main').style.display = 'block';
  loadStats();
}

async function uploadFile(input, targetId) {
  if (!input.files || !input.files[0]) return;
  const fd = new FormData();
  fd.append('images', input.files[0]);
  showToast('Ap telechaje...');
  try {
    const res = await fetch(API + '/admin/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    document.getElementById(targetId).value = data.files[0];
    showToast('Telechajman fèt!');
  } catch (err) { alert('Erè upload: ' + err.message); }
}

async function loadStats() {
  try {
    const s = await apiFetch('/admin/stats');
    document.getElementById('stats-container').innerHTML = `
      <div class="stat-card"><div class="stat-title">Revni</div><div class="stat-value">${s.revenue} HTG</div></div>
      <div class="stat-card"><div class="stat-title">Kòmand</div><div class="stat-value">${s.totalOrders}</div></div>
      <div class="stat-card"><div class="stat-title">Pwodwi</div><div class="stat-value">${s.totalProducts}</div></div>
      <div class="stat-card"><div class="stat-title">Kliyan</div><div class="stat-value">${s.totalCustomers}</div></div>
    `;
  } catch (err) { console.error(err); }
}

async function loadProducts() {
  try {
    const prods = await apiFetch('/admin/products');
    document.getElementById('products-body').innerHTML = prods.map(p => {
      const imgUrl = (p.images && p.images.length > 0) ? p.images[0] : '/images/placeholder.jpg';
      return `
      <tr>
        <td><img src="${imgUrl}" class="table-img" onerror="this.src='/images/placeholder.jpg'"></td>
        <td>${p.name}</td>
        <td>${p.price} HTG</td>
        <td><span style="color:${p.active ? '#00ff88' : '#ff0040'}">${p.active ? 'Aktif' : 'Inaktif'}</span></td>
        <td><button class="btn btn-outline" onclick="editProduct(${p.id})">Modifye</button></td>
      </tr>
    `}).join('');
    window.allProducts = prods;
  } catch (err) { console.error(err); }
}

function openProductModal() {
  document.getElementById('form-product').reset();
  document.getElementById('prod-id').value = '';
  document.getElementById('prod-image-url').value = '';
  document.getElementById('modal-product').classList.add('open');
}

function editProduct(id) {
  const p = window.allProducts.find(x => x.id === id);
  document.getElementById('prod-id').value = p.id;
  document.getElementById('prod-name').value = p.name;
  document.getElementById('prod-price').value = p.price;
  document.getElementById('prod-cat').value = p.category;
  document.getElementById('prod-desc').value = p.description;
  document.getElementById('prod-image-url').value = (p.images && p.images.length) ? p.images[0] : '';
  document.getElementById('modal-product').classList.add('open');
}

async function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('prod-id').value;
  const body = {
    name: document.getElementById('prod-name').value,
    price: document.getElementById('prod-price').value,
    category: document.getElementById('prod-cat').value,
    description: document.getElementById('prod-desc').value,
    images: [document.getElementById('prod-image-url').value]
  };
  try {
    if (id) await apiFetch('/admin/products/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await apiFetch('/admin/products', { method: 'POST', body: JSON.stringify(body) });
    document.getElementById('modal-product').classList.remove('open');
    showToast('Sove ak siksè');
    loadProducts();
  } catch (err) { alert(err.message); }
}

async function loadOrders() {
  try {
    const ords = await apiFetch('/admin/orders');
    document.getElementById('orders-body').innerHTML = ords.map(o => `
      <tr>
        <td>${o.order_number}</td>
        <td>${o.customer_name}</td>
        <td>${o.total} HTG</td>
        <td>${o.status}</td>
        <td><button class="btn btn-outline">Wè</button></td>
      </tr>
    `).join('');
  } catch (err) { console.error(err); }
}

async function loadCustomers() {
  try {
    const custs = await apiFetch('/admin/registered-customers');
    document.getElementById('customers-body').innerHTML = custs.map(c => `
      <tr>
        <td>${c.full_name}</td>
        <td>${c.email}</td>
        <td>${c.phone || '-'}</td>
        <td>${new Date(c.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('');
  } catch (err) { console.error(err); }
}

async function loadAds() {
  try {
    const ads = await apiFetch('/admin/ads');
    document.getElementById('ads-body').innerHTML = ads.map(a => `
      <tr>
        <td>${a.type === 'image' ? `<img src="${a.media_url}" class="table-img">` : 'Video'}</td>
        <td>${a.title || '-'}</td>
        <td><span style="color:${a.active ? '#00ff88' : '#ff0040'}">${a.active ? 'Aktif' : 'Inaktif'}</span></td>
        <td><button class="btn btn-outline" onclick="editAd(${a.id})">Modifye</button></td>
      </tr>
    `).join('');
    window.allAds = ads;
  } catch (err) { console.error(err); }
}

function openAdModal() {
  document.getElementById('form-ad').reset();
  document.getElementById('ad-media-url').value = '';
  document.getElementById('modal-ad').classList.add('open');
}

function editAd(id) {
  const a = window.allAds.find(x => x.id === id);
  document.getElementById('ad-title').value = a.title;
  document.getElementById('ad-type').value = a.type;
  document.getElementById('ad-media-url').value = a.media_url;
  document.getElementById('modal-ad').classList.add('open');
}

async function saveAd(e) {
  e.preventDefault();
  const body = {
    title: document.getElementById('ad-title').value,
    type: document.getElementById('ad-type').value,
    media_url: document.getElementById('ad-media-url').value,
    active: 1
  };
  try {
    await apiFetch('/admin/ads', { method: 'POST', body: JSON.stringify(body) });
    document.getElementById('modal-ad').classList.remove('open');
    showToast('Piblisite sove');
    loadAds();
  } catch (err) { alert(err.message); }
}

if (token) initApp(); else document.getElementById('login-screen').style.display = 'flex';

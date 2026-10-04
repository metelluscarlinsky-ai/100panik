// ============================================
// 100PANIK - Admin Panel Logic
// ============================================

const TOKEN_KEY = 'panik_admin_token';

const ALL_CATEGORIES = [
  // Rad anlè
  't-shirt','chemise','blouse','polo','hoodie','sweatshirt','pull','cardigan',
  'veste','manteau','blazer','kimono','crop-top','debardeur','maillot','body',
  // Rad anba
  'pantalon','jeans','jogger','short','jupe','robe','salopette','legging','chino','cargo',
  // Sou-vètman
  'kalson','slip','boxer','chòt','soutien-gorge','brassiere','marcel',
  'chemise-nwi','pyjama','chanday-len','chaussette',
  // Rad espesyal
  'rad-maryaj','rad-fèt','rad-sport','rad-plaj','rad-travay','rad-lise',
  'rad-tradisyonèl','rad-militaire','uniforme',
  // Akseswa
  'bonn','chapè','kas','echap','sentì','sak','valiz','gant','foular',
  'linèt','mont','bijou','soulye','sandal','bòt','tennis',
  // Timoun
  'rad-timoun','rad-bebe',
  // Lòt
  'general','nouvo','promo','exclusive'
];

const SIZES_LIST = ['XS','S','M','L','XL','XXL','3XL','4XL','36','37','38','39','40','41','42','43','44','45','46','One Size'];
const COLORS_LIST = ['Nwa','Blan','Wouj','Ble','Vèt','Jòn','Zoranj','Violet','Woz','Mawon','Bej','Gri','Cyan','Ò'];

const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtPrice = (n) => new Intl.NumberFormat('fr-HT', { maximumFractionDigits: 0 }).format(n) + ' HTG';

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const t = getToken();
  if (t) headers.Authorization = 'Bearer ' + t;
  const opts = { ...options, headers };
  if (opts.body && typeof opts.body === 'object') opts.body = JSON.stringify(opts.body);

  const res = await fetch('/api' + path, opts);
  if (res.status === 401) {
    clearToken();
    showLogin();
    throw new Error('Sesyon ekspire');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erè' }));
    throw new Error(err.error || `Erè ${res.status}`);
  }
  return res.json();
}

// ---------- TOAST ----------
function toast(msg, type = 'info') {
  let c = $('.toast-container');
  if (!c) {
    c = document.createElement('div');
    c.className = 'toast-container';
    document.body.appendChild(c);
  }
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'all 0.3s';
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

// ---------- MODAL ----------
function modal(html, onMount) {
  const mount = $('#modal-mount');
  mount.innerHTML = `<div class="admin-modal-backdrop"><div class="modal">${html}</div></div>`;
  const backdrop = $('.admin-modal-backdrop', mount);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) mount.innerHTML = '';
  });
  if (onMount) onMount($('.modal', mount));
}

function closeModal() { $('#modal-mount').innerHTML = ''; }

// ---------- LOGIN ----------
function showLogin() {
  $('#login-screen').classList.remove('hidden');
  $('#admin-app').classList.add('hidden');
}

function showApp() {
  $('#login-screen').classList.add('hidden');
  $('#admin-app').classList.remove('hidden');
  loadDashboard();
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const errEl = $('#login-error');
  errEl.textContent = '';
  const btn = $('button[type=submit]', e.target);
  btn.disabled = true;
  btn.textContent = 'Ap konekte...';
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: fd.get('username').trim().toLowerCase(),
        password: fd.get('password')
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erè');
    setToken(data.token);
    showApp();
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Konekte';
  }
});

$('#logout-btn').onclick = () => {
  clearToken();
  location.reload();
};

// ---------- NAVIGASYON ----------
$$('.admin-nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const page = item.dataset.page;
    $$('.admin-nav-item').forEach(i => i.classList.toggle('active', i === item));
    $$('.admin-section').forEach(s => s.classList.toggle('active', s.dataset.section === page));
    $('#admin-sidebar').classList.remove('open');
    const loaders = {
      dashboard: loadDashboard,
      products: loadProducts,
      orders: loadOrders,
      customers: loadCustomers,
      shipping: loadShipping,
      promos: loadPromos,
      settings: loadSettings
    };
    if (loaders[page]) loaders[page]();
  });
});

$('#menu-toggle').onclick = () => {
  $('#admin-sidebar').classList.toggle('open');
};

// ============ DASHBOARD ============
async function loadDashboard() {
  try {
    const s = await api('/admin/stats');
    const cards = [
      { label: 'Revni Total', value: fmtPrice(s.revenue), color: 'var(--neon)' },
      { label: 'Kòmand', value: s.totalOrders, color: 'var(--text)' },
      { label: 'Kliyan', value: s.totalCustomers, color: 'var(--text)' },
      { label: 'Pwodwi', value: s.totalProducts, color: 'var(--text)' },
      { label: 'An Atant', value: s.pendingOrders, color: 'var(--warning)' },
      { label: 'Stock Ba', value: s.lowStock, color: 'var(--danger)' }
    ];
    $('#stats-grid').innerHTML = cards.map(c => `
      <div class="admin-stat">
        <div class="admin-stat-label">${c.label}</div>
        <div class="admin-stat-value" style="color:${c.color};">${c.value}</div>
      </div>
    `).join('');

    $('#recent-orders').innerHTML = s.recentOrders.length === 0
      ? '<div style="padding:20px;color:var(--text-3);text-align:center;font-size:13px;">Pa gen kòmand</div>'
      : `<table>${s.recentOrders.map(o => `
        <tr>
          <td style="font-family:monospace;font-size:12px;">${esc(o.order_number)}</td>
          <td>${esc(o.customer_name)}</td>
          <td style="color:var(--neon);font-weight:600;">${fmtPrice(o.total)}</td>
          <td><span class="status status-${o.status}">${o.status}</span></td>
        </tr>
      `).join('')}</table>`;

    $('#top-products').innerHTML = s.topProducts.length === 0
      ? '<div style="padding:20px;color:var(--text-3);text-align:center;font-size:13px;">Pa gen done</div>'
      : `<table>${s.topProducts.map(p => `
        <tr>
          <td>${esc(p.name)}</td>
          <td style="text-align:right;font-weight:600;">${p.qty}</td>
          <td style="text-align:right;color:var(--neon);">${fmtPrice(p.rev)}</td>
        </tr>
      `).join('')}</table>`;
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ============ PWODWI ============
async function loadProducts() {
  try {
    const products = await api('/admin/products');
    const tbody = $('#products-table tbody');
    if (products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-3);">Pa gen pwodwi. Klike "+ Ajoute Pwodwi".</td></tr>';
      return;
    }
    tbody.innerHTML = products.map(p => `
      <tr>
        <td>
          <div style="width:48px;height:48px;border-radius:8px;overflow:hidden;background:var(--bg-3);">
            <img src="${esc(p.images[0] || '/images/placeholder.jpg')}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
          </div>
        </td>
        <td style="font-weight:600;">${esc(p.name)}</td>
        <td style="font-size:12px;color:var(--text-2);">${esc(p.category)}</td>
        <td style="color:var(--neon);font-weight:600;">${fmtPrice(p.price)}</td>
        <td>${p.stock < 5 ? `<span style="color:var(--danger);font-weight:600;">${p.stock}</span>` : p.stock}</td>
        <td>${p.active ? '<span class="status status-delivered">Aktif</span>' : '<span class="status status-cancelled">Inaktif</span>'}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-outline btn-sm" data-edit="${p.id}">Modifye</button>
          <button class="btn btn-sm" style="color:var(--danger);border-color:var(--danger);" data-del="${p.id}">Efase</button>
        </td>
      </tr>
    `).join('');

    $$('[data-edit]', tbody).forEach(b => b.onclick = () => editProduct(products.find(p => p.id == b.dataset.edit)));
    $$('[data-del]', tbody).forEach(b => b.onclick = async () => {
      if (!confirm('Efase pwodwi sa a?')) return;
      try {
        await api('/admin/products/' + b.dataset.del, { method: 'DELETE' });
        toast('Pwodwi efase', 'success');
        loadProducts();
      } catch (e) { toast(e.message, 'error'); }
    });
  } catch (e) {
    toast(e.message, 'error');
  }
}

$('#add-product-btn').onclick = () => editProduct(null);

function editProduct(p) {
  const isNew = !p;
  p = p || { name: '', description: '', price: 0, compare_price: 0, category: 'general', sizes: [], colors: [], images: [], stock: 0, featured: 0, active: 1 };
  let selectedSizes = [...(p.sizes || [])];
  let selectedColors = [...(p.colors || [])];
  let images = [...(p.images || [])];

  modal(`
    <h2 style="margin-bottom:24px;">${isNew ? 'Ajoute Pwodwi' : 'Modifye Pwodwi'}</h2>
    <form id="product-form">
      <div class="form-group">
        <label class="form-label">Non *</label>
        <input class="form-input" name="name" required value="${esc(p.name)}">
      </div>
      <div class="form-group">
        <label class="form-label">Deskripsyon</label>
        <textarea class="form-textarea" name="description">${esc(p.description)}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Pri *</label>
          <input type="number" class="form-input" name="price" required min="0" step="1" value="${p.price}">
        </div>
        <div class="form-group">
          <label class="form-label">Pri Anvan (opsyonèl)</label>
          <input type="number" class="form-input" name="compare_price" min="0" step="1" value="${p.compare_price || 0}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Kategori *</label>
          <select class="form-select" name="category" required>
            ${ALL_CATEGORIES.map(c => `<option value="${c}" ${c === p.category ? 'selected' : ''}>${c.replace(/-/g, ' ')}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Stock</label>
          <input type="number" class="form-input" name="stock" min="0" value="${p.stock}">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Gwosè</label>
        <div id="sizes-wrap">
          ${SIZES_LIST.map(s => `<span class="size-picker-item ${selectedSizes.includes(s) ? 'on' : ''}" data-val="${s}">${s}</span>`).join('')}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Koulè</label>
        <div id="colors-wrap">
          ${COLORS_LIST.map(c => `<span class="color-picker-item ${selectedColors.includes(c) ? 'on' : ''}" data-val="${c}">${c}</span>`).join('')}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Foto</label>
        <input type="file" id="upload-input" accept="image/*" multiple style="display:none;">
        <button type="button" class="btn btn-outline btn-sm" id="upload-btn">+ Chwazi Foto</button>
        <div class="upload-preview" id="upload-preview"></div>
      </div>

      <div class="form-row">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
          <input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}> <span style="font-size:14px;">Afiche sou Akèy</span>
        </label>
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
          <input type="checkbox" name="active" ${p.active ? 'checked' : ''}> <span style="font-size:14px;">Aktif</span>
        </label>
      </div>

      <div style="display:flex;gap:12px;margin-top:24px;">
        <button type="button" class="btn btn-outline" onclick="document.getElementById('modal-mount').innerHTML='';">Anile</button>
        <button type="submit" class="btn btn-primary" style="flex:1;">${isNew ? 'Kreye' : 'Anrejistre'}</button>
      </div>
    </form>
  `, (m) => {
    // Gwosè
    $$('.size-picker-item', m).forEach(el => {
      el.onclick = () => {
        const v = el.dataset.val;
        if (selectedSizes.includes(v)) selectedSizes = selectedSizes.filter(x => x !== v);
        else selectedSizes.push(v);
        el.classList.toggle('on');
      };
    });
    // Koulè
    $$('.color-picker-item', m).forEach(el => {
      el.onclick = () => {
        const v = el.dataset.val;
        if (selectedColors.includes(v)) selectedColors = selectedColors.filter(x => x !== v);
        else selectedColors.push(v);
        el.classList.toggle('on');
      };
    });
    // Upload
    const preview = $('#upload-preview', m);
    function renderPreview() {
      preview.innerHTML = images.map((src, i) => `
        <div class="thumb">
          <img src="${esc(src)}">
          <button type="button" data-rm="${i}">x</button>
        </div>
      `).join('');
      $$('[data-rm]', preview).forEach(b => b.onclick = () => {
        images.splice(Number(b.dataset.rm), 1);
        renderPreview();
      });
    }
    renderPreview();

    $('#upload-btn', m).onclick = () => $('#upload-input', m).click();
    $('#upload-input', m).onchange = async (e) => {
      const files = [...e.target.files];
      if (!files.length) return;
      const fd = new FormData();
      files.forEach(f => fd.append('images', f));
      try {
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + getToken() },
          body: fd
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erè upload');
        images.push(...data.files);
        renderPreview();
        toast(`${data.files.length} foto ajoute`, 'success');
      } catch (e) {
        toast(e.message, 'error');
      }
      e.target.value = '';
    };

    // Soumèt
    $('#product-form', m).onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = {
        name: fd.get('name'),
        description: fd.get('description'),
        price: Number(fd.get('price')),
        compare_price: Number(fd.get('compare_price')),
        category: fd.get('category'),
        stock: Number(fd.get('stock')),
        sizes: selectedSizes,
        colors: selectedColors,
        images,
        featured: fd.get('featured') ? 1 : 0,
        active: fd.get('active') ? 1 : 0
      };
      try {
        if (isNew) await api('/admin/products', { method: 'POST', body });
        else await api('/admin/products/' + p.id, { method: 'PUT', body });
        toast(isNew ? 'Pwodwi kreye' : 'Pwodwi aktyalize', 'success');
        closeModal();
        loadProducts();
      } catch (err) {
        toast(err.message, 'error');
      }
    };
  });
}

// ============ KÒMAND ============
async function loadOrders() {
  try {
    const status = $('#order-status-filter').value;
    const orders = await api('/admin/orders' + (status ? '?status=' + status : ''));
    const tbody = $('#orders-table tbody');
    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-3);">Pa gen kòmand</td></tr>';
      return;
    }
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td style="font-family:monospace;font-size:12px;">${esc(o.order_number)}</td>
        <td style="font-weight:600;">${esc(o.customer_name)}</td>
        <td>${esc(o.phone)}</td>
        <td style="color:var(--neon);font-weight:600;">${fmtPrice(o.total)}</td>
        <td><span class="status status-${o.status}">${o.status}</span></td>
        <td style="font-size:12px;color:var(--text-2);">${new Date(o.created_at).toLocaleDateString('fr-FR')}</td>
        <td><button class="btn btn-outline btn-sm" data-view="${o.id}">Wè</button></td>
      </tr>
    `).join('');
    $$('[data-view]', tbody).forEach(b => b.onclick = () => viewOrder(b.dataset.view));
  } catch (e) {
    toast(e.message, 'error');
  }
}

$('#order-status-filter').onchange = loadOrders;

async function viewOrder(id) {
  try {
    const o = await api('/admin/orders/' + id);
    modal(`
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:20px;">
        <div>
          <h2 style="font-family:monospace;font-size:20px;">${esc(o.order_number)}</h2>
          <p class="text-muted" style="font-size:12px;">Tracking: ${esc(o.tracking)}</p>
        </div>
        <span class="status status-${o.status}">${o.status}</span>
      </div>

      <div style="background:var(--bg-3);border-radius:12px;padding:16px;margin-bottom:20px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">
          <div><div class="text-muted" style="font-size:11px;">Kliyan</div><strong>${esc(o.customer_name)}</strong></div>
          <div><div class="text-muted" style="font-size:11px;">Telefòn</div><strong>${esc(o.phone)}</strong></div>
          <div><div class="text-muted" style="font-size:11px;">Imèl</div>${esc(o.email || '-')}</div>
          <div><div class="text-muted" style="font-size:11px;">Depatman</div>${esc(o.department)}</div>
          <div style="grid-column:1/-1;"><div class="text-muted" style="font-size:11px;">Adrès</div>${esc(o.address)} ${o.city ? ', ' + esc(o.city) : ''}</div>
          ${o.notes ? `<div style="grid-column:1/-1;"><div class="text-muted" style="font-size:11px;">Nòt</div>${esc(o.notes)}</div>` : ''}
        </div>
      </div>

      <h4 style="margin-bottom:12px;">Atik</h4>
      ${o.items.map(i => `
        <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);align-items:center;">
          ${i.image ? `<img src="${esc(i.image)}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;">` : ''}
          <div style="flex:1;">
            <div style="font-weight:600;font-size:13px;">${esc(i.name)}</div>
            <div class="text-muted" style="font-size:11px;">x${i.quantity}${i.size ? ' - ' + esc(i.size) : ''}${i.color ? ' / ' + esc(i.color) : ''}</div>
          </div>
          <div style="font-weight:600;color:var(--neon);font-size:13px;">${fmtPrice(i.price * i.quantity)}</div>
        </div>
      `).join('')}

      <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);font-size:13px;">
        <div style="display:flex;justify-content:space-between;"><span class="text-muted">Sou-total</span><span>${fmtPrice(o.subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between;"><span class="text-muted">Livrezon</span><span>${fmtPrice(o.shipping_cost)}</span></div>
        ${o.discount > 0 ? `<div style="display:flex;justify-content:space-between;color:var(--success);"><span>Rabè (${esc(o.promo_code)})</span><span>-${fmtPrice(o.discount)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:16px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);"><span>Total</span><span style="color:var(--neon);">${fmtPrice(o.total)}</span></div>
      </div>

      <div class="form-group" style="margin-top:24px;">
        <label class="form-label">Chanje Estati</label>
        <select class="form-select" id="order-status-sel">
          <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>An atant</option>
          <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>Konfime</option>
          <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>An kous</option>
          <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Livre</option>
          <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Anile</option>
        </select>
      </div>

      <div style="display:flex;gap:12px;">
        <button class="btn btn-outline" onclick="document.getElementById('modal-mount').innerHTML='';">Fèmen</button>
        <button class="btn btn-primary" style="flex:1;" id="save-status-btn">Anrejistre Estati</button>
      </div>
    `, (m) => {
      $('#save-status-btn', m).onclick = async () => {
        const status = $('#order-status-sel', m).value;
        try {
          await api('/admin/orders/' + o.id + '/status', { method: 'PUT', body: { status } });
          toast('Estati aktyalize', 'success');
          closeModal();
          loadOrders();
        } catch (e) {
          toast(e.message, 'error');
        }
      };
    });
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ============ KLIYAN ============
async function loadCustomers() {
  try {
    const customers = await api('/admin/customers');
    const tbody = $('#customers-table tbody');
    if (customers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-3);">Pa gen kliyan</td></tr>';
      return;
    }
    tbody.innerHTML = customers.map(c => `
      <tr>
        <td style="font-weight:600;">${esc(c.customer_name)}</td>
        <td>${esc(c.phone)}</td>
        <td>${esc(c.email || '-')}</td>
        <td>${c.orders_count}</td>
        <td style="color:var(--neon);font-weight:600;">${fmtPrice(c.total_spent)}</td>
        <td style="font-size:12px;color:var(--text-2);">${new Date(c.last_order).toLocaleDateString('fr-FR')}</td>
      </tr>
    `).join('');
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ============ LIVREZON ============
async function loadShipping() {
  try {
    const zones = await api('/admin/shipping');
    const tbody = $('#shipping-table tbody');
    tbody.innerHTML = zones.map(z => `
      <tr>
        <td style="font-weight:600;">${esc(z.name)}</td>
        <td>${fmtPrice(z.price)}</td>
        <td>${fmtPrice(z.express_price)}</td>
        <td>${esc(z.estimated_days)} jou</td>
        <td>${z.active ? '<span class="status status-delivered">Aktif</span>' : '<span class="status status-cancelled">Inaktif</span>'}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-outline btn-sm" data-edit="${z.id}">Modifye</button>
          <button class="btn btn-sm" style="color:var(--danger);border-color:var(--danger);" data-del="${z.id}">Efase</button>
        </td>
      </tr>
    `).join('');
    $$('[data-edit]', tbody).forEach(b => b.onclick = () => editZone(zones.find(z => z.id == b.dataset.edit)));
    $$('[data-del]', tbody).forEach(b => b.onclick = async () => {
      if (!confirm('Efase zòn sa a?')) return;
      try {
        await api('/admin/shipping/' + b.dataset.del, { method: 'DELETE' });
        toast('Zòn efase', 'success');
        loadShipping();
      } catch (e) { toast(e.message, 'error'); }
    });
  } catch (e) { toast(e.message, 'error'); }
}

$('#add-zone-btn').onclick = () => editZone(null);

function editZone(z) {
  const isNew = !z;
  z = z || { name: '', price: 0, express_price: 0, estimated_days: '3-5', active: 1 };
  modal(`
    <h2 style="margin-bottom:24px;">${isNew ? 'Ajoute Zòn' : 'Modifye Zòn'}</h2>
    <form id="zone-form">
      <div class="form-group">
        <label class="form-label">Non Zòn *</label>
        <input class="form-input" name="name" required value="${esc(z.name)}" placeholder="Ouest (Port-au-Prince)">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Pri Estanda (HTG)</label>
          <input type="number" class="form-input" name="price" min="0" value="${z.price}">
        </div>
        <div class="form-group">
          <label class="form-label">Pri Eksprime (HTG)</label>
          <input type="number" class="form-input" name="express_price" min="0" value="${z.express_price}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Estime (jou)</label>
          <input class="form-input" name="estimated_days" value="${esc(z.estimated_days)}" placeholder="3-5">
        </div>
        <div class="form-group">
          <label class="form-label">Estati</label>
          <select class="form-select" name="active">
            <option value="1" ${z.active ? 'selected' : ''}>Aktif</option>
            <option value="0" ${!z.active ? 'selected' : ''}>Inaktif</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-top:24px;">
        <button type="button" class="btn btn-outline" onclick="document.getElementById('modal-mount').innerHTML='';">Anile</button>
        <button type="submit" class="btn btn-primary" style="flex:1;">Anrejistre</button>
      </div>
    </form>
  `, (m) => {
    $('#zone-form', m).onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = {
        name: fd.get('name'),
        price: Number(fd.get('price')),
        express_price: Number(fd.get('express_price')),
        estimated_days: fd.get('estimated_days'),
        active: fd.get('active') === '1' ? 1 : 0
      };
      try {
        if (isNew) await api('/admin/shipping', { method: 'POST', body });
        else await api('/admin/shipping/' + z.id, { method: 'PUT', body });
        toast('Zòn anrejistre', 'success');
        closeModal();
        loadShipping();
      } catch (err) { toast(err.message, 'error'); }
    };
  });
}

// ============ PWOMO ============
async function loadPromos() {
  try {
    const promos = await api('/admin/promos');
    const tbody = $('#promos-table tbody');
    if (promos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-3);">Pa gen kòd pwomo</td></tr>';
      return;
    }
    tbody.innerHTML = promos.map(p => `
      <tr>
        <td style="font-weight:700;font-family:monospace;">${esc(p.code)}</td>
        <td>${p.type === 'percent' ? 'Pousantaj' : 'Fiks'}</td>
        <td style="color:var(--neon);font-weight:600;">${p.type === 'percent' ? p.value + '%' : fmtPrice(p.value)}</td>
        <td>${p.min_total ? fmtPrice(p.min_total) : '-'}</td>
        <td>${p.uses}${p.max_uses ? '/' + p.max_uses : ''}</td>
        <td>${p.active ? '<span class="status status-delivered">Aktif</span>' : '<span class="status status-cancelled">Enaktif</span>'}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-outline btn-sm" data-edit="${p.id}">Modifye</button>
          <button class="btn btn-sm" style="color:var(--danger);border-color:var(--danger);" data-del="${p.id}">Efase</button>
        </td>
      </tr>
    `).join('');
    $$('[data-edit]', tbody).forEach(b => b.onclick = () => editPromo(promos.find(p => p.id == b.dataset.edit)));
    $$('[data-del]', tbody).forEach(b => b.onclick = async () => {
      if (!confirm('Efase kòd sa a?')) return;
      try {
        await api('/admin/promos/' + b.dataset.del, { method: 'DELETE' });
        toast('Kòd efase', 'success');
        loadPromos();
      } catch (e) { toast(e.message, 'error'); }
    });
  } catch (e) { toast(e.message, 'error'); }
}

$('#add-promo-btn').onclick = () => editPromo(null);

function editPromo(p) {
  const isNew = !p;
  p = p || { code: '', type: 'percent', value: 0, min_total: 0, max_uses: 0, active: 1, expires_at: null };
  modal(`
    <h2 style="margin-bottom:24px;">${isNew ? 'Ajoute Kòd Pwomo' : 'Modifye Kòd'}</h2>
    <form id="promo-form">
      <div class="form-group">
        <label class="form-label">Kòd *</label>
        <input class="form-input" name="code" required value="${esc(p.code)}" style="text-transform:uppercase;" placeholder="PANIK10">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tip</label>
          <select class="form-select" name="type">
            <option value="percent" ${p.type === 'percent' ? 'selected' : ''}>Pousantaj (%)</option>
            <option value="fixed" ${p.type === 'fixed' ? 'selected' : ''}>Fiks (HTG)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Valè *</label>
          <input type="number" class="form-input" name="value" required min="0" value="${p.value}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Achte Minimòm (HTG)</label>
          <input type="number" class="form-input" name="min_total" min="0" value="${p.min_total}">
        </div>
        <div class="form-group">
          <label class="form-label">Itilizasyon Maks (0 = san limit)</label>
          <input type="number" class="form-input" name="max_uses" min="0" value="${p.max_uses}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Dat Ekspirasyon</label>
          <input type="date" class="form-input" name="expires_at" value="${p.expires_at ? p.expires_at.slice(0, 10) : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Estati</label>
          <select class="form-select" name="active">
            <option value="1" ${p.active ? 'selected' : ''}>Aktif</option>
            <option value="0" ${!p.active ? 'selected' : ''}>Enaktif</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-top:24px;">
        <button type="button" class="btn btn-outline" onclick="document.getElementById('modal-mount').innerHTML='';">Anile</button>
        <button type="submit" class="btn btn-primary" style="flex:1;">Anrejistre</button>
      </div>
    </form>
  `, (m) => {
    $('#promo-form', m).onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = {
        code: fd.get('code').toUpperCase(),
        type: fd.get('type'),
        value: Number(fd.get('value')),
        min_total: Number(fd.get('min_total')),
        max_uses: Number(fd.get('max_uses')),
        expires_at: fd.get('expires_at') || null,
        active: fd.get('active') === '1' ? 1 : 0
      };
      try {
        if (isNew) await api('/admin/promos', { method: 'POST', body });
        else await api('/admin/promos/' + p.id, { method: 'PUT', body });
        toast('Kòd anrejistre', 'success');
        closeModal();
        loadPromos();
      } catch (err) { toast(err.message, 'error'); }
    };
  });
}

// ============ KONFIGIRASYON ============
async function loadSettings() {
  try {
    const s = await api('/admin/settings');
    const form = $('#settings-form');
    Object.entries(s).forEach(([k, v]) => {
      const el = form.elements[k];
      if (el) el.value = v;
    });
  } catch (e) { toast(e.message, 'error'); }
}

$('#settings-form').onsubmit = async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = {};
  for (const [k, v] of fd.entries()) body[k] = v;
  try {
    await api('/admin/settings', { method: 'PUT', body });
    toast('Konfigirasyon anrejistre', 'success');
  } catch (err) { toast(err.message, 'error'); }
};

$('#password-form').onsubmit = async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await api('/admin/change-password', {
      method: 'POST',
      body: { current: fd.get('current'), next: fd.get('next') }
    });
    toast('Modpas chanje. Rekonekte.', 'success');
    setTimeout(() => { clearToken(); location.reload(); }, 1200);
  } catch (err) { toast(err.message, 'error'); }
};

// ============ INIT ============
if (getToken()) {
  // Verifye token valid
  api('/admin/stats').then(showApp).catch(() => showLogin());
} else {
  showLogin();
}

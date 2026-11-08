var API = '/api';
var token = localStorage.getItem('panik_admin_token');

function logout() {
  localStorage.removeItem('panik_admin_token');
  window.location.reload();
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// KONEKSYON
document.getElementById('login-form').addEventListener('submit', function(e) {
  e.preventDefault();
  fetch(API + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      username: document.getElementById('login-email').value, 
      password: document.getElementById('login-pass').value 
    })
  })
  .then(function(res) { return res.json().then(function(data) { if (!res.ok) throw new Error(data.error); return data; }); })
  .then(function(data) {
    token = data.token;
    localStorage.setItem('panik_admin_token', token);
    initApp();
  })
  .catch(function(err) { alert(err.message); });
});

// NAVIGASYON
document.querySelectorAll('.nav-item').forEach(function(item) {
  item.onclick = function() {
    document.querySelectorAll('.nav-item').forEach(function(i) { i.classList.remove('active'); });
    item.classList.add('active');
    document.querySelectorAll('.page-content').forEach(function(p) { p.classList.add('hidden'); });
    document.getElementById('page-' + item.dataset.page).classList.remove('hidden');
    document.getElementById('page-title').textContent = item.textContent;
    
    if (item.dataset.page === 'products') loadProds();
    if (item.dataset.page === 'ads') loadAds();
    if (item.dataset.page === 'dashboard') loadStats();
    if (item.dataset.page === 'settings') loadSettings();
  };
});

function initApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-main').classList.remove('hidden');
  loadStats();
}

// API HELPER
function apiCall(path, method, body) {
  return fetch(API + path, {
    method: method || 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: body ? JSON.stringify(body) : null
  })
  .then(function(res) { 
    if (res.status === 401) logout();
    return res.json().then(function(data) { if (!res.ok) throw new Error(data.error); return data; }); 
  });
}

// UPLOAD IMAGE
function uploadImage(file, targetId) {
  var fd = new FormData();
  fd.append('images', file);
  alert('Ap telechaje imaj la... tanpri tann.');
  fetch(API + '/admin/upload', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: fd
  })
  .then(function(res) { return res.json().then(function(data) { if (!res.ok) throw new Error(data.error); return data; }); })
  .then(function(data) {
    document.getElementById(targetId).value = data.files[0];
    alert('Imaj la sove byen!');
  })
  .catch(function(err) { alert('Erè Upload: ' + err.message); });
}

// DASHBOARD
function loadStats() {
  apiCall('/admin/stats').then(function(s) {
    document.getElementById('stats').innerHTML = 
      '<div class="card"><h3>Revni</h3><p style="font-size:24px; color:var(--cyan);">' + s.revenue + ' HTG</p></div>' +
      '<div class="card"><h3>Kòmand</h3><p style="font-size:24px; color:var(--cyan);">' + s.totalOrders + '</p></div>' +
      '<div class="card"><h3>Pwodwi</h3><p style="font-size:24px; color:var(--cyan);">' + s.totalProducts + '</p></div>' +
      '<div class="card"><h3>Kliyan</h3><p style="font-size:24px; color:var(--cyan);">' + s.totalCustomers + '</p></div>';
  }).catch(function(err) { console.log(err); });
}

// PWODWI
function loadProds() {
  apiCall('/admin/products').then(function(prods) {
    window.prodsList = prods;
    if (!prods.length) { document.getElementById('prod-list').innerHTML = '<p>Pa gen pwodwi.</p>'; return; }
    
    var html = '';
    prods.forEach(function(p) {
      var img = (p.images && p.images.length > 0) ? p.images[0] : '/images/placeholder.jpg';
      html += 
        '<div class="card">' +
          '<img src="' + img + '">' +
          '<h3>' + p.name + '</h3>' +
          '<p>Pri: ' + p.price + ' HTG | Stock: ' + (p.stock || 0) + '</p>' +
          '<div class="actions">' +
            '<button class="btn btn-primary" onclick="editProd(' + p.id + ')">Modifye</button>' +
            '<button class="btn btn-danger" onclick="deleteProd(' + p.id + ')">Efase</button>' +
          '</div>' +
        '</div>';
    });
    document.getElementById('prod-list').innerHTML = html;
  });
}

document.getElementById('form-prod').addEventListener('submit', function(e) {
  e.preventDefault();
  var id = document.getElementById('p-id').value;
  var body = {
    name: document.getElementById('p-name').value,
    price: Number(document.getElementById('p-price').value),
    stock: Number(document.getElementById('p-stock').value),
    category: document.getElementById('p-cat').value || 'general',
    images: document.getElementById('p-img-url').value ? [document.getElementById('p-img-url').value] : [],
    compare_price: 0, sizes: [], colors: [], featured: 0, active: 1
  };
  
  var url = id ? '/admin/products/' + id : '/admin/products';
  var method = id ? 'PUT' : 'POST';
  
  apiCall(url, method, body).then(function() {
    closeModal('modal-prod');
    loadProds();
  }).catch(function(err) { alert(err.message); });
});

document.getElementById('p-file').addEventListener('change', function() {
  if (this.files[0]) uploadImage(this.files[0], 'p-img-url');
});

function editProd(id) {
  var p = window.prodsList.find(function(x) { return x.id === id; });
  document.getElementById('p-id').value = p.id;
  document.getElementById('p-name').value = p.name;
  document.getElementById('p-price').value = p.price;
  document.getElementById('p-stock').value = p.stock;
  document.getElementById('p-cat').value = p.category || '';
  document.getElementById('p-img-url').value = (p.images && p.images.length) ? p.images[0] : '';
  openModal('modal-prod');
}

function deleteProd(id) {
  if (confirm('Efase pwodwi sa a nèt?')) {
    apiCall('/admin/products/' + id, 'DELETE').then(function() { loadProds(); });
  }
}

// PIBLISITE
function loadAds() {
  apiCall('/admin/ads').then(function(ads) {
    if (!ads.length) { document.getElementById('ad-list').innerHTML = '<p>Pa gen piblisite.</p>'; return; }
    var html = '';
    ads.forEach(function(a) {
      html += 
        '<div class="card">' +
          '<img src="' + a.media_url + '">' +
          '<h3>' + (a.title || 'Piblisite') + '</h3>' +
          '<div class="actions">' +
            '<button class="btn btn-danger" onclick="deleteAd(' + a.id + ')">Efase</button>' +
          '</div>' +
        '</div>';
    });
    document.getElementById('ad-list').innerHTML = html;
  });
}

document.getElementById('form-ad').addEventListener('submit', function(e) {
  e.preventDefault();
  var body = {
    title: document.getElementById('a-title').value,
    type: 'image',
    media_url: document.getElementById('a-img-url').value,
    active: 1
  };
  apiCall('/admin/ads', 'POST', body).then(function() {
    closeModal('modal-ad');
    loadAds();
  }).catch(function(err) { alert(err.message); });
});

document.getElementById('a-file').addEventListener('change', function() {
  if (this.files[0]) uploadImage(this.files[0], 'a-img-url');
});

function deleteAd(id) {
  if (confirm('Efase piblisite sa a?')) {
    apiCall('/admin/ads/' + id, 'DELETE').then(function() { loadAds(); });
  }
}

// KONFIGIRASYON
function loadSettings() {
  apiCall('/admin/settings').then(function(s) {
    document.getElementById('set-brand').value = s.brand_name || '';
    document.getElementById('set-email').value = s.contact_email || '';
  });
}

document.getElementById('settings-form').addEventListener('submit', function(e) {
  e.preventDefault();
  var body = {
    brand_name: document.getElementById('set-brand').value,
    contact_email: document.getElementById('set-email').value
  };
  apiCall('/admin/settings', 'PUT', body).then(function() { alert('Sove ak siksè!'); });
});

if (token) { initApp(); }

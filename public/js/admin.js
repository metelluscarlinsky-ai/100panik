var API = '/api';
var token = localStorage.getItem('panik_admin_token');
var currentSizes = [];
var currentColors = [];

function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 3000);
}

function logout() {
  localStorage.removeItem('panik_admin_token');
  window.location.reload();
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ============ KONEKSYON ============
document.getElementById('login-form').addEventListener('submit', function(e) {
  e.preventDefault();
  var email = document.getElementById('login-email').value.trim();
  var pass = document.getElementById('login-pass').value;

  if (!email || !pass) {
    alert('Please fill in both fields.');
    return;
  }

  showToast('Logging in...');

  fetch(API + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, password: pass })
  })
  .then(function(res) {
    return res.json().then(function(data) {
      if (!res.ok) throw new Error(data.error || 'Login failed');
      return data;
    });
  })
  .then(function(data) {
    if (!data.token) throw new Error('No token received from server');
    token = data.token;
    localStorage.setItem('panik_admin_token', token);
    console.log('Login success. Token saved.');
    initApp();
  })
  .catch(function(err) {
    console.error('Login error:', err);
    alert('Login error: ' + err.message);
  });
});

// ============ NAVIGASYON ============
function setupNav(selector) {
  document.querySelectorAll(selector).forEach(function(item) {
    item.onclick = function() {
      document.querySelectorAll('.nav-chip').forEach(function(i) { i.classList.remove('active'); });
      document.querySelectorAll('[data-page="'+item.dataset.page+'"]').forEach(function(i) { i.classList.add('active'); });
      document.querySelectorAll('.page-content').forEach(function(p) { p.classList.add('hidden'); });
      document.getElementById('page-' + item.dataset.page).classList.remove('hidden');

      if (item.dataset.page === 'products') loadProds();
      if (item.dataset.page === 'ads') loadAds();
      if (item.dataset.page === 'dashboard') loadStats();
      if (item.dataset.page === 'settings') loadSettings();
    };
  });
}

// ============ API HELPER ============
function apiCall(path, method, body) {
  return fetch(API + path, {
    method: method || 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: body ? JSON.stringify(body) : null
  })
  .then(function(res) {
    if (res.status === 401) {
      alert('Your session expired. Please login again.');
      logout();
      throw new Error('Session expired');
    }
    return res.json().then(function(data) {
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    });
  });
}

// ============ INIT APP ============
function initApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-wrapper').classList.remove('hidden');
  if(window.innerWidth >= 768) {
    var sb = document.getElementById('desktop-sidebar');
    if (sb) sb.classList.remove('hidden');
  }
  setupNav('#mobile-nav .nav-chip');
  setupNav('#desktop-sidebar .nav-chip');
  setupSizesAndColors();
  setupSettingsForms();
  loadStats();
  loadProds();
}

function setupSizesAndColors() {
  document.querySelectorAll('#sizes-container .chip').forEach(function(chip) {
    chip.onclick = function() {
      var val = chip.dataset.val;
      if (currentSizes.indexOf(val) > -1) { currentSizes = currentSizes.filter(function(v) { return v !== val; }); chip.classList.remove('active'); }
      else { currentSizes.push(val); chip.classList.add('active'); }
    };
  });

  document.querySelectorAll('#colors-container .chip').forEach(function(chip) {
    chip.onclick = function() {
      var val = chip.dataset.val;
      if (currentColors.indexOf(val) > -1) { currentColors = currentColors.filter(function(v) { return v !== val; }); chip.classList.remove('active'); }
      else { currentColors.push(val); chip.classList.add('active'); }
    };
  });
}

function setupSettingsForms() {
  var sf = document.getElementById('settings-form');
  if (sf) {
    sf.addEventListener('submit', function(e) {
      e.preventDefault();
      var body = {
        instagram: document.getElementById('set-ig').value,
        tiktok: document.getElementById('set-tiktok').value,
        youtube: document.getElementById('set-yt').value,
        contact_email: document.getElementById('set-email').value
      };
      apiCall('/admin/settings', 'PUT', body).then(function() { showToast('Settings saved!'); })
        .catch(function(err) { alert(err.message); });
    });
  }

  var pf = document.getElementById('pass-form');
  if (pf) {
    pf.addEventListener('submit', function(e) {
      e.preventDefault();
      var body = {
        current: document.getElementById('pass-current').value,
        next: document.getElementById('pass-new').value
      };
      apiCall('/admin/change-password', 'POST', body).then(function() {
        showToast('Password updated!');
        pf.reset();
      }).catch(function(err) { alert(err.message); });
    });
  }
}

// ============ UPLOAD ============
function uploadImg(input, targetId) {
  if (!input.files || !input.files[0]) return;
  var fd = new FormData();
  fd.append('images', input.files[0]);
  showToast('Uploading...');
  fetch(API + '/admin/upload', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: fd
  })
  .then(function(res) { return res.json().then(function(data) { if (!res.ok) throw new Error(data.error); return data; }); })
  .then(function(data) {
    document.getElementById(targetId).value = data.files[0];
    showToast('Upload complete!');
  })
  .catch(function(err) { alert('Upload Error: ' + err.message); });
}

// ============ DASHBOARD ============
function loadStats() {
  apiCall('/admin/stats').then(function(s) {
    document.getElementById('stats-container').innerHTML =
      '<div class="stat-card"><div class="stat-title">Revenue</div><div class="stat-value">' + s.revenue + ' HTG</div></div>' +
      '<div class="stat-card"><div class="stat-title">Orders</div><div class="stat-value">' + s.totalOrders + '</div></div>' +
      '<div class="stat-card"><div class="stat-title">Products</div><div class="stat-value">' + s.totalProducts + '</div></div>' +
      '<div class="stat-card"><div class="stat-title">Customers</div><div class="stat-value">' + s.totalCustomers + '</div></div>';
  }).catch(function(err) { console.error('Stats error:', err); });
}

// ============ PWODWI ============
function loadProds() {
  apiCall('/admin/products').then(function(prods) {
    window.prodsList = prods;
    var list = document.getElementById('products-list');
    if (!list) return;
    if (!prods.length) { list.innerHTML = '<p style="color:#888; text-align:center;">No products found.</p>'; return; }

    var html = '';
    prods.forEach(function(p) {
      var img = (p.images && p.images.length > 0) ? p.images[0] : '/images/placeholder.jpg';
      html += '<div class="product-card">' +
        '<img src="' + img + '">' +
        '<div class="product-info"><h3>' + p.name + '</h3><p>Price: ' + p.price + ' HTG | Stock: ' + (p.stock || 0) + '</p></div>' +
        '<div class="product-actions">' +
          '<button class="btn btn-outline" onclick="editProd(' + p.id + ')">Edit</button>' +
          '<button class="btn btn-danger" onclick="deleteProd(' + p.id + ')">Delete</button>' +
        '</div></div>';
    });
    list.innerHTML = html;
  }).catch(function(err) { console.error('Products error:', err); });
}

document.getElementById('form-prod').addEventListener('submit', function(e) {
  e.preventDefault();
  var id = document.getElementById('p-id').value;
  var body = {
    name: document.getElementById('p-name').value,
    price: Number(document.getElementById('p-price').value),
    stock: Number(document.getElementById('p-stock').value),
    category: document.getElementById('p-cat').value || 'general',
    description: document.getElementById('p-desc').value,
    images: document.getElementById('p-img-url').value ? [document.getElementById('p-img-url').value] : [],
    sizes: currentSizes, colors: currentColors,
    compare_price: 0, featured: 0, active: 1
  };
  var url = id ? '/admin/products/' + id : '/admin/products';
  var method = id ? 'PUT' : 'POST';
  apiCall(url, method, body).then(function() {
    closeModal('modal-prod');
    showToast('Product saved!');
    loadProds();
  }).catch(function(err) { alert(err.message); });
});

function editProd(id) {
  var p = window.prodsList.find(function(x) { return x.id === id; });
  document.getElementById('p-id').value = p.id;
  document.getElementById('p-name').value = p.name;
  document.getElementById('p-price').value = p.price;
  document.getElementById('p-stock').value = p.stock;
  document.getElementById('p-cat').value = p.category || '';
  document.getElementById('p-desc').value = p.description || '';
  document.getElementById('p-img-url').value = (p.images && p.images.length) ? p.images[0] : '';
  currentSizes = p.sizes || [];
  document.querySelectorAll('#sizes-container .chip').forEach(function(c) {
    if (currentSizes.indexOf(c.dataset.val) > -1) c.classList.add('active'); else c.classList.remove('active');
  });
  currentColors = p.colors || [];
  document.querySelectorAll('#colors-container .chip').forEach(function(c) {
    if (currentColors.indexOf(c.dataset.val) > -1) c.classList.add('active'); else c.classList.remove('active');
  });
  openModal('modal-prod');
}

function deleteProd(id) {
  if (confirm('Delete this product?')) {
    apiCall('/admin/products/' + id, 'DELETE').then(function() { showToast('Product deleted'); loadProds(); })
      .catch(function(err) { alert(err.message); });
  }
}

// ============ PIBLISITE ============
function loadAds() {
  apiCall('/admin/ads').then(function(ads) {
    var list = document.getElementById('ads-list');
    if (!list) return;
    if (!ads.length) { list.innerHTML = '<p style="color:#888; text-align:center;">No ads found.</p>'; return; }
    var html = '';
    ads.forEach(function(a) {
      var media = a.type === 'image' ? '<img src="' + a.media_url + '">' : '<div style="width:80px; height:80px; background:#222; display:flex; align-items:center; justify-content:center; color:#888; border-radius:12px; font-size:12px;">Video</div>';
      html += '<div class="product-card">' + media +
        '<div class="product-info"><h3>' + (a.title || 'Ad') + '</h3></div>' +
        '<div class="product-actions"><button class="btn btn-danger" onclick="deleteAd(' + a.id + ')">Delete</button></div></div>';
    });
    list.innerHTML = html;
  }).catch(function(err) { console.error('Ads error:', err); });
}

document.getElementById('form-ad').addEventListener('submit', function(e) {
  e.preventDefault();
  var imgUrl = document.getElementById('a-img-url').value;
  var isVideo = imgUrl.toLowerCase().match(/\.(mp4|webm|mov|ogg)$/);
  var body = {
    title: document.getElementById('a-title').value,
    type: isVideo ? 'video' : 'image',
    media_url: imgUrl,
    active: 1
  };
  apiCall('/admin/ads', 'POST', body).then(function() {
    closeModal('modal-ad');
    showToast('Ad saved!');
    loadAds();
  }).catch(function(err) { alert(err.message); });
});

function deleteAd(id) {
  if (confirm('Delete this ad?')) {
    apiCall('/admin/ads/' + id, 'DELETE').then(function() { showToast('Ad deleted'); loadAds(); })
      .catch(function(err) { alert(err.message); });
  }
}

// ============ KONFIGIRASYON ============
function loadSettings() {
  apiCall('/admin/settings').then(function(s) {
    document.getElementById('set-ig').value = s.instagram || '';
    document.getElementById('set-tiktok').value = s.tiktok || '';
    document.getElementById('set-yt').value = s.youtube || '';
    document.getElementById('set-email').value = s.contact_email || '';
  }).catch(function(err) { console.error('Settings error:', err); });
}

// ============ BOOT ============
if (token) {
  // Verifye token an toujou valid
  apiCall('/admin/stats').then(function() {
    initApp();
  }).catch(function() {
    // Token pa valid, montre ekran koneksyon an
    localStorage.removeItem('panik_admin_token');
    token = null;
    document.getElementById('login-screen').style.display = 'flex';
  });
} else {
  document.getElementById('login-screen').style.display = 'flex';
}

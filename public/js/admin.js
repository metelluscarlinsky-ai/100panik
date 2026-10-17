// 100PANIK - Admin Panel Logic
(function() {
'use strict';

var TOKEN_KEY = 'panik_admin_token';

var ALL_CATEGORIES = [
  't-shirt','chemise','chemizit','blouse','polo','hoodie','sweatshirt','pull',
  'cardigan','veste','manteau','blazer','kimono','crop-top','debardeur',
  'maillot','body','kòsaj','tank-top','sweater',
  'pantalon','jeans','jogger','short','jupe','robe','salopette','legging',
  'chino','cargo','kilt','jip','jip-long','jip-kout',
  'kalson','kilot','slip','chòt','soutien-gorge','brassiere','ganntwa',
  'kòsèl','tanga','string','culotte','bikini','tankini','monokini',
  'ba-personalize','ba-soutien-gorge','ba-kòsèl',
  'boxer','slip-gason','chemiz-nwi','marcel','kamisòl','chanday-len',
  'pyjama','pyjama-fanm','pyjama-gason','wòb-de-chambre','chaussette',
  'rad-maryaj','rad-fèt','rad-sport','rad-plaj','rad-travay','rad-lise',
  'rad-tradisyonèl','rad-militaire','uniforme','karabela','kostim',
  'sweat-sport','short-sport','brassiere-sport','legging-sport',
  'jogging','maillot-de-bain','maillot-foutbòl',
  'bonn','chapè','kas','echap','sentì','sak','valiz','gant','foular',
  'linèt','mont','bijou','kolye','bwè','zanno','soulye','sandal',
  'bòt','tennis','espadril','mokasen','kle',
  'rad-timoun','rad-bebe','body-bebe','kimono-bebe',
  'general','nouvo','promo','exclusive','lot','paket','kado'
];

var SIZES_LIST = ['XS','S','M','L','XL','XXL','3XL','4XL',
  '36','37','38','39','40','41','42','43','44','45','46','One Size'];
var COLORS_LIST = ['Nwa','Blan','Wouj','Ble','Vèt','Jòn','Zoranj','Violet',
  'Woz','Mawon','Bej','Gri','Cyan','Ò','Ajan'];

function $(sel, ctx) { return (ctx || document).querySelector(sel); }
function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}
function fmtPrice(n) {
  return new Intl.NumberFormat('fr-HT', { maximumFractionDigits: 0 }).format(n || 0) + ' HTG';
}

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

function api(path, opts) {
  opts = opts || {};
  var headers = { 'Content-Type': 'application/json' };
  var t = getToken();
  if (t) headers.Authorization = 'Bearer ' + t;
  if (opts.headers) {
    for (var k in opts.headers) headers[k] = opts.headers[k];
  }
  var o = { method: opts.method || 'GET', headers: headers };
  if (opts.body) o.body = JSON.stringify(opts.body);
  return fetch('/api' + path, o).then(function(res) {
    if (res.status === 401) {
      clearToken();
      showLogin();
      throw new Error('Sesyon ekspire');
    }
    return res.json().then(function(data) {
      if (!res.ok) throw new Error(data.error || ('Erè ' + res.status));
      return data;
    });
  });
}

function toast(msg, type) {
  var wrap = $('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  var t = document.createElement('div');
  t.className = 'toast-x' + (type === 'error' ? ' err' : type === 'success' ? ' ok' : '');
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(function() {
    t.style.opacity = '0';
    t.style.transition = 'all .3s';
    setTimeout(function() { t.remove(); }, 300);
  }, 3000);
}

function modal(html, cb) {
  var mount = $('#modal-mount');
  mount.innerHTML = '<div class="mod-bg"><div class="mod-cnt">' + html + '</div></div>';
  var bg = $('.mod-bg', mount);
  bg.addEventListener('click', function(e) {
    if (e.target === bg) mount.innerHTML = '';
  });
  if (cb) cb($('.mod-cnt', mount));
}
function closeModal() { $('#modal-mount').innerHTML = ''; }
window.closeModal = closeModal;

function showLogin() {
  $('#login-wrap').style.display = 'flex';
  $('#adm-wrap').classList.remove('on');
}
function showApp() {
  $('#login-wrap').style.display = 'none';
  $('#adm-wrap').classList.add('on');
  loadDashboard();
}

// LOGIN
$('#login-form').addEventListener('submit', function(e) {
  e.preventDefault();
  var fd = new FormData(e.target);
  var err = $('#login-err');
  var btn = $('button[type=submit]', e.target);
  err.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Ap konekte...';
  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: String(fd.get('username')).trim().toLowerCase(),
      password: fd.get('password')
    })
  }).then(function(res) {
    return res.json().then(function(data) {
      if (!res.ok) throw new Error(data.error || 'Erè');
      return data;
    });
  }).then(function(data) {
    setToken(data.token);
    showApp();
  }).catch(function(e) {
    err.textContent = e.message;
  }).finally(function() {
    btn.disabled = false;
    btn.textContent = 'Konekte';
  });
});

$('#logout-btn').addEventListener('click', function() {
  clearToken();
  location.reload();
});

$('#menu-btn').addEventListener('click', function() {
  $('#sidebar').classList.toggle('on');
});

// NAVIGASYON
$$('.adm-nav-item').forEach(function(item) {
  item.addEventListener('click', function() {
    var page = item.dataset.page;
    $$('.adm-nav-item').forEach(function(i) { i.classList.toggle('on', i === item); });
    $$('.adm-sec').forEach(function(s) { s.classList.toggle('on', s.dataset.sec === page); });
    $('#sidebar').classList.remove('on');
    var loaders = {
      dashboard: loadDashboard,
      products: loadProducts,
      orders: loadOrders,
      customers: loadCustomers,
      shipping: loadShipping,
      promos: loadPromos,
      settings: loadSettings
    };
    if (page === "ads") loadAds();
    if (loaders[page]) loaders[page]();
  });
});

// DASHBOARD
function loadDashboard() {
  api('/admin/stats').then(function(s) {
    var cards = [
      { lbl: 'Revni Total', v: fmtPrice(s.revenue) },
      { lbl: 'Kòmand', v: s.totalOrders },
      { lbl: 'Kliyan', v: s.totalCustomers },
      { lbl: 'Pwodwi', v: s.totalProducts },
      { lbl: 'An Atant', v: s.pendingOrders },
      { lbl: 'Stock Ba', v: s.lowStock }
    ];
    $('#stat-grid').innerHTML = cards.map(function(c) {
      return '<div class="stat-card"><div class="stat-lbl">' + c.lbl + '</div><div class="stat-val">' + c.v + '</div></div>';
    }).join('');

    $('#recent-orders').innerHTML = s.recentOrders.length === 0
      ? '<div style="padding:20px;color:var(--text-3);text-align:center;font-size:13px;">Pa gen kòmand</div>'
      : '<div class="tbl-scroll"><table>' + s.recentOrders.map(function(o) {
          return '<tr><td style="font-family:monospace;font-size:12px;">' + esc(o.order_number) + '</td>' +
            '<td>' + esc(o.customer_name) + '</td>' +
            '<td style="color:#00f0ff;font-weight:600;">' + fmtPrice(o.total) + '</td>' +
            '<td><span class="badge ' + o.status + '">' + o.status + '</span></td></tr>';
        }).join('') + '</table></div>';

    $('#top-products').innerHTML = s.topProducts.length === 0
      ? '<div style="padding:20px;color:var(--text-3);text-align:center;font-size:13px;">Pa gen done</div>'
      : '<div class="tbl-scroll"><table>' + s.topProducts.map(function(p) {
          return '<tr><td>' + esc(p.name) + '</td><td style="text-align:right;font-weight:600;">' + p.qty + '</td>' +
            '<td style="text-align:right;color:#00f0ff;">' + fmtPrice(p.rev) + '</td></tr>';
        }).join('') + '</table></div>';
  }).catch(function(e) { toast(e.message, 'error'); });
}

// PWODWI
function loadProducts() {
  api('/admin/products').then(function(products) {
    var tb = $('#prod-table tbody');
    if (!products.length) {
      tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-3);">Pa gen pwodwi. Klike + Ajoute Pwodwi.</td></tr>';
      return;
    }
    tb.innerHTML = products.map(function(p) {
      var img = (p.images && p.images[0]) || '/images/placeholder.jpg';
      return '<tr>' +
        '<td><div class="img-cell"><img src="' + esc(img) + '" onerror="this.style.display=\'none\'"></div></td>' +
        '<td style="font-weight:600;">' + esc(p.name) + '</td>' +
        '<td style="font-size:12px;color:var(--text-2);">' + esc(p.category) + '</td>' +
        '<td style="color:#00f0ff;font-weight:600;">' + fmtPrice(p.price) + '</td>' +
        '<td>' + (p.stock < 5 ? '<span style="color:#ff0040;font-weight:600;">' + p.stock + '</span>' : p.stock) + '</td>' +
        '<td>' + (p.active ? '<span class="badge active">Aktif</span>' : '<span class="badge inactive">Inaktif</span>') + '</td>' +
        '<td style="white-space:nowrap;">' +
          '<button class="btn btn-outline btn-sm" data-edit="' + p.id + '" style="margin-right:6px;">Modifye</button>' +
          '<button class="btn btn-sm" data-del="' + p.id + '" style="color:#ff0040;border:1px solid #ff0040;">Efase</button>' +
        '</td></tr>';
    }).join('');

    $$('[data-edit]', tb).forEach(function(b) {
      b.onclick = function() {
        var p = products.find(function(x) { return x.id == b.dataset.edit; });
        editProduct(p);
      };
    });
    $$('[data-del]', tb).forEach(function(b) {
      b.onclick = function() {
        if (!confirm('Efase pwodwi sa a?')) return;
        api('/admin/products/' + b.dataset.del, { method: 'DELETE' }).then(function() {
          toast('Pwodwi efase', 'success');
          loadProducts();
        }).catch(function(e) { toast(e.message, 'error'); });
      };
    });
  }).catch(function(e) { toast(e.message, 'error'); });
}

$('#add-prod').onclick = function() { editProduct(null); };

function editProduct(p) {
  var isNew = !p;
  p = p || { name: '', description: '', price: 0, compare_price: 0, category: 'general', sizes: [], colors: [], images: [], stock: 0, featured: 0, active: 1 };
  var selectedSizes = (p.sizes || []).slice();
  var selectedColors = (p.colors || []).slice();
  var images = (p.images || []).slice();

  var html = '<h2>' + (isNew ? 'Ajoute Pwodwi' : 'Modifye Pwodwi') + '</h2>' +
    '<form id="prod-form">' +
      '<div class="form-group"><label class="form-label">Non *</label>' +
        '<input class="form-input" name="name" required value="' + esc(p.name) + '"></div>' +
      '<div class="form-group"><label class="form-label">Deskripsyon</label>' +
        '<textarea class="form-textarea" name="description">' + esc(p.description) + '</textarea></div>' +
      '<div class="form-row">' +
        '<div class="form-group"><label class="form-label">Pri *</label>' +
          '<input type="number" class="form-input" name="price" required min="0" value="' + p.price + '"></div>' +
        '<div class="form-group"><label class="form-label">Pri Anvan</label>' +
          '<input type="number" class="form-input" name="compare_price" min="0" value="' + (p.compare_price || 0) + '"></div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group"><label class="form-label">Kategori *</label>' +
          '<select class="form-select" name="category" required>' +
            ALL_CATEGORIES.map(function(c) {
              return '<option value="' + c + '"' + (c === p.category ? ' selected' : '') + '>' + c.replace(/-/g, ' ') + '</option>';
            }).join('') +
          '</select></div>' +
        '<div class="form-group"><label class="form-label">Stock</label>' +
          '<input type="number" class="form-input" name="stock" min="0" value="' + p.stock + '"></div>' +
      '</div>' +
      '<div class="form-group"><label class="form-label">Gwose</label>' +
        '<div id="sizes-wrap" class="chip-wrap">' +
          SIZES_LIST.map(function(s) {
            return '<span class="chip' + (selectedSizes.indexOf(s) >= 0 ? ' on' : '') + '" data-val="' + s + '">' + s + '</span>';
          }).join('') +
        '</div></div>' +
      '<div class="form-group"><label class="form-label">Koule</label>' +
        '<div id="colors-wrap" class="chip-wrap">' +
          COLORS_LIST.map(function(c) {
            return '<span class="chip' + (selectedColors.indexOf(c) >= 0 ? ' on' : '') + '" data-val="' + c + '">' + c + '</span>';
          }).join('') +
        '</div></div>' +
      '<div class="form-group"><label class="form-label">Foto</label>' +
        '<input type="file" id="up-input" accept="image/*" multiple style="display:none;">' +
        '<button type="button" class="btn btn-outline btn-sm" id="up-btn">+ Chwazi Foto</button>' +
        '<div class="up-preview" id="up-preview"></div></div>' +
      '<div class="form-row">' +
        '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;">' +
          '<input type="checkbox" name="featured"' + (p.featured ? ' checked' : '') + '> <span style="font-size:14px;">Afiche sou Akey</span></label>' +
        '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;">' +
          '<input type="checkbox" name="active"' + (p.active ? ' checked' : '') + '> <span style="font-size:14px;">Aktif</span></label>' +
      '</div>' +
      '<div style="display:flex;gap:12px;margin-top:24px;">' +
        '<button type="button" class="btn btn-outline" id="cancel-btn">Anile</button>' +
        '<button type="submit" class="btn btn-primary" style="flex:1;">' + (isNew ? 'Kreye' : 'Anrejistre') + '</button>' +
      '</div>' +
    '</form>';

  modal(html, function(m) {
    $$('.chip', $('#sizes-wrap', m)).forEach(function(el) {
      el.onclick = function() {
        var v = el.dataset.val;
        var idx = selectedSizes.indexOf(v);
        if (idx >= 0) selectedSizes.splice(idx, 1); else selectedSizes.push(v);
        el.classList.toggle('on');
      };
    });
    $$('.chip', $('#colors-wrap', m)).forEach(function(el) {
      el.onclick = function() {
        var v = el.dataset.val;
        var idx = selectedColors.indexOf(v);
        if (idx >= 0) selectedColors.splice(idx, 1); else selectedColors.push(v);
        el.classList.toggle('on');
      };
    });

    var prev = $('#up-preview', m);
    function renderPrev() {
      prev.innerHTML = images.map(function(src, i) {
        return '<div class="up-thumb"><img src="' + esc(src) + '"><button type="button" data-rm="' + i + '">x</button></div>';
      }).join('');
      $$('[data-rm]', prev).forEach(function(b) {
        b.onclick = function() {
          images.splice(Number(b.dataset.rm), 1);
          renderPrev();
        };
      });
    }
    renderPrev();

    $('#up-btn', m).onclick = function() { $('#up-input', m).click(); };
    $('#up-input', m).onchange = function(e) {
      var files = Array.prototype.slice.call(e.target.files);
      if (!files.length) return;
      var fd = new FormData();
      files.forEach(function(f) { fd.append('images', f); });
      fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + getToken() },
        body: fd
      }).then(function(res) {
        return res.json().then(function(data) {
          if (!res.ok) throw new Error(data.error || 'Erè upload');
          return data;
        });
      }).then(function(data) {
        images.push.apply(images, data.files);
        renderPrev();
        toast(data.files.length + ' foto ajoute', 'success');
      }).catch(function(err) { toast(err.message, 'error'); });
      e.target.value = '';
    };

    $('#cancel-btn', m).onclick = closeModal;

    $('#prod-form', m).onsubmit = function(e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      var body = {
        name: fd.get('name'),
        description: fd.get('description'),
        price: Number(fd.get('price')),
        compare_price: Number(fd.get('compare_price')),
        category: fd.get('category'),
        stock: Number(fd.get('stock')),
        sizes: selectedSizes,
        colors: selectedColors,
        images: images,
        featured: fd.get('featured') ? 1 : 0,
        active: fd.get('active') ? 1 : 0
      };
      var req = isNew
        ? api('/admin/products', { method: 'POST', body: body })
        : api('/admin/products/' + p.id, { method: 'PUT', body: body });
      req.then(function() {
        toast(isNew ? 'Pwodwi kreye' : 'Pwodwi aktyalize', 'success');
        closeModal();
        loadProducts();
      }).catch(function(err) { toast(err.message, 'error'); });
    };
  });
}

// KOMAND
function loadOrders() {
  var status = $('#order-filter').value;
  api('/admin/orders' + (status ? '?status=' + status : '')).then(function(orders) {
    var tb = $('#ord-table tbody');
    if (!orders.length) {
      tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-3);">Pa gen kòmand</td></tr>';
      return;
    }
    tb.innerHTML = orders.map(function(o) {
      return '<tr>' +
        '<td style="font-family:monospace;font-size:12px;">' + esc(o.order_number) + '</td>' +
        '<td style="font-weight:600;">' + esc(o.customer_name) + '</td>' +
        '<td>' + esc(o.phone) + '</td>' +
        '<td style="color:#00f0ff;font-weight:600;">' + fmtPrice(o.total) + '</td>' +
        '<td><span class="badge ' + o.status + '">' + o.status + '</span></td>' +
        '<td style="font-size:12px;color:var(--text-2);">' + new Date(o.created_at).toLocaleDateString('fr-FR') + '</td>' +
        '<td><button class="btn btn-outline btn-sm" data-view="' + o.id + '">We</button></td>' +
      '</tr>';
    }).join('');
    $$('[data-view]', tb).forEach(function(b) { b.onclick = function() { viewOrder(b.dataset.view); }; });
  }).catch(function(e) { toast(e.message, 'error'); });
}

$('#order-filter').onchange = loadOrders;

function viewOrder(id) {
  api('/admin/orders/' + id).then(function(o) {
    var html = '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:20px;">' +
      '<div><h2 style="font-family:monospace;font-size:20px;">' + esc(o.order_number) + '</h2>' +
      '<p style="font-size:12px;color:var(--text-2);">Tracking: ' + esc(o.tracking) + '</p></div>' +
      '<span class="badge ' + o.status + '">' + o.status + '</span></div>' +
      '<div style="background:rgba(30,30,30,0.6);border-radius:12px;padding:16px;margin-bottom:20px;">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">' +
      '<div><div style="font-size:11px;color:var(--text-2);">Kliyan</div><strong>' + esc(o.customer_name) + '</strong></div>' +
      '<div><div style="font-size:11px;color:var(--text-2);">Telefòn</div><strong>' + esc(o.phone) + '</strong></div>' +
      '<div><div style="font-size:11px;color:var(--text-2);">Imel</div>' + esc(o.email || '-') + '</div>' +
      '<div><div style="font-size:11px;color:var(--text-2);">Depatman</div>' + esc(o.department || '-') + '</div>' +
      '<div style="grid-column:1/-1;"><div style="font-size:11px;color:var(--text-2);">Adrès</div>' + esc(o.address) + '</div>' +
      '</div></div>' +
      '<h4 style="margin-bottom:12px;">Atik</h4>' +
      o.items.map(function(i) {
        return '<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);align-items:center;">' +
          (i.image ? '<img src="' + esc(i.image) + '" style="width:48px;height:48px;border-radius:8px;object-fit:cover;">' : '') +
          '<div style="flex:1;"><div style="font-weight:600;font-size:13px;">' + esc(i.name) + '</div>' +
          '<div style="font-size:11px;color:var(--text-2);">x' + i.quantity + (i.size ? ' - ' + esc(i.size) : '') + (i.color ? ' / ' + esc(i.color) : '') + '</div></div>' +
          '<div style="font-weight:600;color:#00f0ff;font-size:13px;">' + fmtPrice(i.price * i.quantity) + '</div></div>';
      }).join('') +
      '<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);font-size:13px;">' +
      '<div style="display:flex;justify-content:space-between;"><span style="color:var(--text-2);">Sou-total</span><span>' + fmtPrice(o.subtotal) + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;"><span style="color:var(--text-2);">Livrezon</span><span>' + fmtPrice(o.shipping_cost) + '</span></div>' +
      (o.discount > 0 ? '<div style="display:flex;justify-content:space-between;color:#00ff88;"><span>Rabè</span><span>-' + fmtPrice(o.discount) + '</span></div>' : '') +
      '<div style="display:flex;justify-content:space-between;font-weight:700;font-size:16px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);"><span>Total</span><span style="color:#00f0ff;">' + fmtPrice(o.total) + '</span></div></div>' +
      '<div class="form-group" style="margin-top:24px;"><label class="form-label">Chanje Estati</label>' +
      '<select class="form-select" id="status-sel">' +
      ['pending','confirmed','shipped','delivered','cancelled'].map(function(s) {
        return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + s + '</option>';
      }).join('') + '</select></div>' +
      '<div style="display:flex;gap:12px;">' +
      '<button class="btn btn-outline" id="close-mod">Fèmen</button>' +
      '<button class="btn btn-primary" style="flex:1;" id="save-stat">Anrejistre Estati</button></div>';

    modal(html, function(m) {
      $('#close-mod', m).onclick = closeModal;
      $('#save-stat', m).onclick = function() {
        var st = $('#status-sel', m).value;
        api('/admin/orders/' + o.id + '/status', { method: 'PUT', body: { status: st } })
          .then(function() {
            toast('Estati aktyalize', 'success');
            closeModal();
            loadOrders();
          }).catch(function(e) { toast(e.message, 'error'); });
      };
    });
  }).catch(function(e) { toast(e.message, 'error'); });
}

// ============ ADS ============
function loadAds() {
  api('/admin/ads').then(function(ads) {
    var tb = $('#ads-table tbody');
    if (!ads.length) {
      tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-3);">Pa gen piblisite</td></tr>';
      return;
    }
    tb.innerHTML = ads.map(function(a) {
      var preview = '';
      if (a.type === 'video') {
        preview = '<div class="img-cell" style="background:#000;display:flex;align-items:center;justify-content:center;color:#00f0ff;font-size:20px;">&#9654;</div>';
      } else {
        preview = '<div class="img-cell"><img src="' + esc(a.media_url) + '" onerror="this.style.display=\'none\'"></div>';
      }
      return '<tr>' +
        '<td>' + preview + '</td>' +
        '<td style="font-weight:600;">' + esc(a.title || '-') + '</td>' +
        '<td><span class="badge ' + (a.type === 'video' ? 'active' : 'inactive') + '">' + a.type + '</span></td>' +
        '<td style="font-size:12px;color:var(--text-2);">' + esc(a.position) + '</td>' +
        '<td>' + (a.active ? '<span class="badge active">Aktif</span>' : '<span class="badge inactive">Inaktif</span>') + '</td>' +
        '<td style="white-space:nowrap;">' +
          '<button class="btn btn-outline btn-sm" data-edit="' + a.id + '" style="margin-right:6px;">Modifye</button>' +
          '<button class="btn btn-sm" data-del="' + a.id + '" style="color:#ff0040;border:1px solid #ff0040;">Efase</button>' +
        '</td></tr>';
    }).join('');
    $$('[data-edit]', tb).forEach(function(b) {
      b.onclick = function() { editAd(ads.find(function(x) { return x.id == b.dataset.edit; })); };
    });
    $$('[data-del]', tb).forEach(function(b) {
      b.onclick = function() {
        if (!confirm('Efase piblisite sa a?')) return;
        api('/admin/ads/' + b.dataset.del, { method: 'DELETE' })
          .then(function() { toast('Piblisite efase', 'success'); loadAds(); })
          .catch(function(e) { toast(e.message, 'error'); });
      };
    });
  }).catch(function(e) { toast(e.message, 'error'); });
}

$('#add-ad').onclick = function() { editAd(null); };

function editAd(a) {
  var isNew = !a;
  a = a || { title: '', type: 'image', media_url: '', link_url: '', position: 'home_footer', active: 1, sort_order: 0 };

  var html = '<h2>' + (isNew ? 'Ajoute Piblisite' : 'Modifye Piblisite') + '</h2>' +
    '<form id="ad-form">' +
    '<div class="form-group"><label class="form-label">Tit (opsyonel)</label>' +
    '<input class="form-input" name="title" value="' + esc(a.title) + '"></div>' +

    '<div class="form-group"><label class="form-label">Tip</label>' +
    '<select class="form-select" name="type" id="ad-type">' +
    '<option value="image"' + (a.type === 'image' ? ' selected' : '') + '>Imaj</option>' +
    '<option value="video"' + (a.type === 'video' ? ' selected' : '') + '>Video</option>' +
    '</select></div>' +

    '<div class="form-group"><label class="form-label">Media (URL oswa Upload)</label>' +
    '<input class="form-input" name="media_url" id="ad-media-url" required value="' + esc(a.media_url) + '" placeholder="https://...">' +
    '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">' +
    '<input type="file" id="ad-file" accept="image/*,video/*" style="display:none;">' +
    '<button type="button" class="btn btn-outline btn-sm" id="ad-upload-btn">+ Upload Fichye</button>' +
    '<span style="font-size:11px;color:var(--text-3);align-self:center;">Imaj: JPG/PNG/WEBP  •  Video: MP4/WEBM (max 50MB)</span>' +
    '</div>' +
    '<div id="ad-preview" style="margin-top:12px;"></div></div>' +

    '<div class="form-group"><label class="form-label">Lyen (klik sou piblisite a)</label>' +
    '<input class="form-input" name="link_url" value="' + esc(a.link_url || '') + '" placeholder="https://..."></div>' +

    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Pozisyon</label>' +
    '<select class="form-select" name="position">' +
    '<option value="home_footer"' + (a.position === 'home_footer' ? ' selected' : '') + '>Akey - Anba</option>' +
    '<option value="home_top"' + (a.position === 'home_top' ? ' selected' : '') + '>Akey - Anwo</option>' +
    '</select></div>' +
    '<div class="form-group"><label class="form-label">Lod</label>' +
    '<input type="number" class="form-input" name="sort_order" min="0" value="' + (a.sort_order || 0) + '"></div>' +
    '</div>' +

    '<div class="form-group"><label style="display:flex;align-items:center;gap:10px;cursor:pointer;">' +
    '<input type="checkbox" name="active"' + (a.active ? ' checked' : '') + '> <span style="font-size:14px;">Aktif</span></label></div>' +

    '<div style="display:flex;gap:12px;margin-top:24px;">' +
    '<button type="button" class="btn btn-outline" id="ad-cancel">Anile</button>' +
    '<button type="submit" class="btn btn-primary" style="flex:1;">' + (isNew ? 'Kreye' : 'Anrejistre') + '</button>' +
    '</div></form>';

  modal(html, function(m) {
    $('#ad-cancel', m).onclick = closeModal;

    function renderPreview() {
      var url = $('#ad-media-url', m).value.trim();
      var type = $('#ad-type', m).value;
      var prev = $('#ad-preview', m);
      if (!url) { prev.innerHTML = ''; return; }
      if (type === 'video') {
        if (url.indexOf('youtube.com') !== -1 || url.indexOf('youtu.be') !== -1) {
          var ytId = url.split(/[\/\?=]/).filter(function(p) { return p.length === 11; })[0];
          prev.innerHTML = '<iframe src="https://www.youtube.com/embed/' + ytId + '" style="width:100%;max-width:400px;aspect-ratio:16/9;border:0;border-radius:12px;" allowfullscreen></iframe>';
        } else {
          prev.innerHTML = '<video src="' + esc(url) + '" controls muted style="width:100%;max-width:400px;border-radius:12px;"></video>';
        }
      } else {
        prev.innerHTML = '<img src="' + esc(url) + '" style="width:100%;max-width:400px;border-radius:12px;" onerror="this.style.display=\'none\'">';
      }
    }
    renderPreview();
    $('#ad-media-url', m).addEventListener('input', renderPreview);
    $('#ad-type', m).addEventListener('change', renderPreview);

    $('#ad-upload-btn', m).onclick = function() { $('#ad-file', m).click(); };
    $('#ad-file', m).onchange = function(e) {
      var files = Array.prototype.slice.call(e.target.files);
      if (!files.length) return;
      var fd = new FormData();
      files.forEach(function(f) { fd.append('images', f); });
      var btn = $('#ad-upload-btn', m);
      btn.disabled = true;
      btn.textContent = 'Ap upload...';
      fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + getToken() },
        body: fd
      }).then(function(res) {
        return res.json().then(function(data) {
          if (!res.ok) throw new Error(data.error || 'Erè');
          return data;
        });
      }).then(function(data) {
        if (data.files && data.files[0]) {
          $('#ad-media-url', m).value = data.files[0];
          renderPreview();
          toast('Fichye telechaje', 'success');
        }
      }).catch(function(err) { toast(err.message, 'error'); })
        .finally(function() { btn.disabled = false; btn.textContent = '+ Upload Fichye'; });
      e.target.value = '';
    };

    $('#ad-form', m).onsubmit = function(e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      var body = {
        title: fd.get('title'),
        type: fd.get('type'),
        media_url: fd.get('media_url'),
        link_url: fd.get('link_url'),
        position: fd.get('position'),
        sort_order: Number(fd.get('sort_order')) || 0,
        active: fd.get('active') ? 1 : 0
      };
      var req = isNew
        ? api('/admin/ads', { method: 'POST', body: body })
        : api('/admin/ads/' + a.id, { method: 'PUT', body: body });
      req.then(function() {
        toast(isNew ? 'Piblisite kreye' : 'Piblisite aktyalize', 'success');
        closeModal();
        loadAds();
      }).catch(function(err) { toast(err.message, 'error'); });
    };
  });
}
// KLIYAN
function loadCustomers() {
  api('/admin/customers').then(function(customers) {
    var tb = $('#cust-table tbody');
    if (!customers.length) {
      tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-3);">Pa gen kliyan</td></tr>';
      return;
    }
    tb.innerHTML = customers.map(function(c) {
      return '<tr><td style="font-weight:600;">' + esc(c.customer_name) + '</td>' +
        '<td>' + esc(c.phone) + '</td><td>' + esc(c.email || '-') + '</td>' +
        '<td>' + c.orders_count + '</td>' +
        '<td style="color:#00f0ff;font-weight:600;">' + fmtPrice(c.total_spent) + '</td>' +
        '<td style="font-size:12px;color:var(--text-2);">' + new Date(c.last_order).toLocaleDateString('fr-FR') + '</td></tr>';
    }).join('');
  }).catch(function(e) { toast(e.message, 'error'); });
}

// LIVREZON
function loadShipping() {
  api('/admin/shipping').then(function(zones) {
    var tb = $('#ship-table tbody');
    tb.innerHTML = zones.map(function(z) {
      return '<tr><td style="font-weight:600;">' + esc(z.name) + '</td>' +
        '<td>' + fmtPrice(z.price) + '</td><td>' + fmtPrice(z.express_price) + '</td>' +
        '<td>' + esc(z.estimated_days) + ' jou</td>' +
        '<td>' + (z.active ? '<span class="badge active">Aktif</span>' : '<span class="badge inactive">Inaktif</span>') + '</td>' +
        '<td style="white-space:nowrap;">' +
          '<button class="btn btn-outline btn-sm" data-edit="' + z.id + '" style="margin-right:6px;">Modifye</button>' +
          '<button class="btn btn-sm" data-del="' + z.id + '" style="color:#ff0040;border:1px solid #ff0040;">Efase</button></td></tr>';
    }).join('');
    $$('[data-edit]', tb).forEach(function(b) {
      b.onclick = function() { editZone(zones.find(function(z) { return z.id == b.dataset.edit; })); };
    });
    $$('[data-del]', tb).forEach(function(b) {
      b.onclick = function() {
        if (!confirm('Efase zòn sa a?')) return;
        api('/admin/shipping/' + b.dataset.del, { method: 'DELETE' })
          .then(function() { toast('Zòn efase', 'success'); loadShipping(); })
          .catch(function(e) { toast(e.message, 'error'); });
      };
    });
  }).catch(function(e) { toast(e.message, 'error'); });
}

$('#add-zone').onclick = function() { editZone(null); };

function editZone(z) {
  var isNew = !z;
  z = z || { name: '', price: 0, express_price: 0, estimated_days: '3-5', active: 1 };
  modal('<h2>' + (isNew ? 'Ajoute Zòn' : 'Modifye Zòn') + '</h2>' +
    '<form id="zone-form">' +
    '<div class="form-group"><label class="form-label">Non Zòn *</label>' +
    '<input class="form-input" name="name" required value="' + esc(z.name) + '"></div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Pri Estanda (HTG)</label>' +
    '<input type="number" class="form-input" name="price" min="0" value="' + z.price + '"></div>' +
    '<div class="form-group"><label class="form-label">Pri Eksprime (HTG)</label>' +
    '<input type="number" class="form-input" name="express_price" min="0" value="' + z.express_price + '"></div></div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Estime (jou)</label>' +
    '<input class="form-input" name="estimated_days" value="' + esc(z.estimated_days) + '"></div>' +
    '<div class="form-group"><label class="form-label">Estati</label>' +
    '<select class="form-select" name="active">' +
    '<option value="1"' + (z.active ? ' selected' : '') + '>Aktif</option>' +
    '<option value="0"' + (!z.active ? ' selected' : '') + '>Inaktif</option></select></div></div>' +
    '<div style="display:flex;gap:12px;margin-top:24px;">' +
    '<button type="button" class="btn btn-outline" id="cancel">Anile</button>' +
    '<button type="submit" class="btn btn-primary" style="flex:1;">Anrejistre</button></div>' +
    '</form>', function(m) {
    $('#cancel', m).onclick = closeModal;
    $('#zone-form', m).onsubmit = function(e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      var body = {
        name: fd.get('name'),
        price: Number(fd.get('price')),
        express_price: Number(fd.get('express_price')),
        estimated_days: fd.get('estimated_days'),
        active: fd.get('active') === '1' ? 1 : 0
      };
      var req = isNew
        ? api('/admin/shipping', { method: 'POST', body: body })
        : api('/admin/shipping/' + z.id, { method: 'PUT', body: body });
      req.then(function() { toast('Zòn anrejistre', 'success'); closeModal(); loadShipping(); })
        .catch(function(err) { toast(err.message, 'error'); });
    };
  });
}

// PWOMO
function loadPromos() {
  api('/admin/promos').then(function(promos) {
    var tb = $('#promo-table tbody');
    if (!promos.length) {
      tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-3);">Pa gen kòd pwomo</td></tr>';
      return;
    }
    tb.innerHTML = promos.map(function(p) {
      return '<tr><td style="font-weight:700;font-family:monospace;">' + esc(p.code) + '</td>' +
        '<td>' + (p.type === 'percent' ? 'Pousantaj' : 'Fiks') + '</td>' +
        '<td style="color:#00f0ff;font-weight:600;">' + (p.type === 'percent' ? p.value + '%' : fmtPrice(p.value)) + '</td>' +
        '<td>' + (p.min_total ? fmtPrice(p.min_total) : '-') + '</td>' +
        '<td>' + p.uses + (p.max_uses ? '/' + p.max_uses : '') + '</td>' +
        '<td>' + (p.active ? '<span class="badge active">Aktif</span>' : '<span class="badge inactive">Enaktif</span>') + '</td>' +
        '<td style="white-space:nowrap;">' +
        '<button class="btn btn-outline btn-sm" data-edit="' + p.id + '" style="margin-right:6px;">Modifye</button>' +
        '<button class="btn btn-sm" data-del="' + p.id + '" style="color:#ff0040;border:1px solid #ff0040;">Efase</button></td></tr>';
    }).join('');
    $$('[data-edit]', tb).forEach(function(b) {
      b.onclick = function() { editPromo(promos.find(function(p) { return p.id == b.dataset.edit; })); };
    });
    $$('[data-del]', tb).forEach(function(b) {
      b.onclick = function() {
        if (!confirm('Efase kòd sa a?')) return;
        api('/admin/promos/' + b.dataset.del, { method: 'DELETE' })
          .then(function() { toast('Kòd efase', 'success'); loadPromos(); })
          .catch(function(e) { toast(e.message, 'error'); });
      };
    });
  }).catch(function(e) { toast(e.message, 'error'); });
}

$('#add-promo').onclick = function() { editPromo(null); };

function editPromo(p) {
  var isNew = !p;
  p = p || { code: '', type: 'percent', value: 0, min_total: 0, max_uses: 0, active: 1, expires_at: null };
  modal('<h2>' + (isNew ? 'Ajoute Kòd' : 'Modifye Kòd') + '</h2>' +
    '<form id="promo-form">' +
    '<div class="form-group"><label class="form-label">Kòd *</label>' +
    '<input class="form-input" name="code" required value="' + esc(p.code) + '" style="text-transform:uppercase;"></div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Tip</label>' +
    '<select class="form-select" name="type">' +
    '<option value="percent"' + (p.type === 'percent' ? ' selected' : '') + '>Pousantaj (%)</option>' +
    '<option value="fixed"' + (p.type === 'fixed' ? ' selected' : '') + '>Fiks (HTG)</option></select></div>' +
    '<div class="form-group"><label class="form-label">Valè *</label>' +
    '<input type="number" class="form-input" name="value" required min="0" value="' + p.value + '"></div></div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Minimòm (HTG)</label>' +
    '<input type="number" class="form-input" name="min_total" min="0" value="' + p.min_total + '"></div>' +
    '<div class="form-group"><label class="form-label">Itilizasyon Maks</label>' +
    '<input type="number" class="form-input" name="max_uses" min="0" value="' + p.max_uses + '"></div></div>' +
    '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Dat Ekspirasyon</label>' +
    '<input type="date" class="form-input" name="expires_at" value="' + (p.expires_at ? p.expires_at.slice(0,10) : '') + '"></div>' +
    '<div class="form-group"><label class="form-label">Estati</label>' +
    '<select class="form-select" name="active">' +
    '<option value="1"' + (p.active ? ' selected' : '') + '>Aktif</option>' +
    '<option value="0"' + (!p.active ? ' selected' : '') + '>Enaktif</option></select></div></div>' +
    '<div style="display:flex;gap:12px;margin-top:24px;">' +
    '<button type="button" class="btn btn-outline" id="cancel">Anile</button>' +
    '<button type="submit" class="btn btn-primary" style="flex:1;">Anrejistre</button></div>' +
    '</form>', function(m) {
    $('#cancel', m).onclick = closeModal;
    $('#promo-form', m).onsubmit = function(e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      var body = {
        code: String(fd.get('code')).toUpperCase(),
        type: fd.get('type'),
        value: Number(fd.get('value')),
        min_total: Number(fd.get('min_total')),
        max_uses: Number(fd.get('max_uses')),
        expires_at: fd.get('expires_at') || null,
        active: fd.get('active') === '1' ? 1 : 0
      };
      var req = isNew
        ? api('/admin/promos', { method: 'POST', body: body })
        : api('/admin/promos/' + p.id, { method: 'PUT', body: body });
      req.then(function() { toast('Kòd anrejistre', 'success'); closeModal(); loadPromos(); })
        .catch(function(err) { toast(err.message, 'error'); });
    };
  });
}

// KONFIGIRASYON
function loadSettings() {
  api('/admin/settings').then(function(s) {
    var form = $('#settings-form');
    Object.keys(s).forEach(function(k) {
      if (form.elements[k]) form.elements[k].value = s[k];
    });
  }).catch(function(e) { toast(e.message, 'error'); });
}

$('#settings-form').onsubmit = function(e) {
  e.preventDefault();
  var fd = new FormData(e.target);
  var body = {};
  fd.forEach(function(v, k) { body[k] = v; });
  api('/admin/settings', { method: 'PUT', body: body })
    .then(function() { toast('Konfigirasyon anrejistre', 'success'); })
    .catch(function(err) { toast(err.message, 'error'); });
};

$('#pass-form').onsubmit = function(e) {
  e.preventDefault();
  var fd = new FormData(e.target);
  api('/admin/change-password', {
    method: 'POST',
    body: { current: fd.get('current'), next: fd.get('next') }
  }).then(function() {
    toast('Modpas chanje. Rekonekte.', 'success');
    setTimeout(function() { clearToken(); location.reload(); }, 1200);
  }).catch(function(err) { toast(err.message, 'error'); });
};

// INIT
if (getToken()) {
  api('/admin/stats').then(showApp).catch(showLogin);
} else {
  showLogin();
}

})();

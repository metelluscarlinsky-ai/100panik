// 100PANIK - Panier
(function() {
'use strict';

function getPanik() {
  if (!window.Panik) {
    console.error('Panik pa chaje');
    return null;
  }
  return window.Panik;
}

// ATANN PANIK PRET
function whenReady(cb) {
  if (window.Panik) return cb();
  var tries = 0;
  var t = setInterval(function() {
    tries++;
    if (window.Panik) {
      clearInterval(t);
      cb();
    } else if (tries > 50) {
      clearInterval(t);
      console.error('Panik pa janm chaje');
    }
  }, 50);
}

// AJOUTE NAN PANYE
function addToCart(product, quantity, size, color) {
  var P = getPanik();
  if (!P) return;
  quantity = quantity || 1;
  size = size || null;
  color = color || null;

  var key = product.id + '-' + (size || '') + '-' + (color || '');
  var existing = P.Store.cart.find(function(i) { return i.key === key; });
  if (existing) {
    existing.quantity += quantity;
  } else {
    P.Store.cart.push({
      key: key,
      product_id: product.id,
      name: product.name,
      price: product.price,
      image: (product.images && product.images[0]) || null,
      size: size,
      color: color,
      quantity: quantity,
      slug: product.slug
    });
  }
  P.saveCart();
  P.toast('Ajoute nan panye: ' + product.name, 'success');
}

function removeFromCart(key) {
  var P = getPanik();
  if (!P) return;
  P.Store.cart = P.Store.cart.filter(function(i) { return i.key !== key; });
  P.saveCart();
}

function updateQty(key, delta) {
  var P = getPanik();
  if (!P) return;
  var item = P.Store.cart.find(function(i) { return i.key === key; });
  if (!item) return;
  item.quantity = Math.max(1, item.quantity + delta);
  P.saveCart();
}

function cartSubtotal() {
  var P = getPanik();
  if (!P) return 0;
  return P.Store.cart.reduce(function(s, i) { return s + i.price * i.quantity; }, 0);
}

// AFICHE PAJ PANYE
function renderCartPage() {
  var P = getPanik();
  if (!P) return;
  var container = document.getElementById('cart-content');
  var summaryEl = document.getElementById('cart-summary');
  if (!container) return;

  if (P.Store.cart.length === 0) {
    container.innerHTML = '<div class="card text-center" style="padding:60px 20px;">' +
      '<h3>Panye ou vid</h3>' +
      '<p class="text-muted" style="margin:12px 0 24px;">Ajoute kek bagay pou komanse.</p>' +
      '<a href="/collection.html" class="btn btn-primary">We Koleksyon</a></div>';
    if (summaryEl) summaryEl.style.display = 'none';
    return;
  }

  container.innerHTML = P.Store.cart.map(function(item) {
    return '<div class="cart-item" data-key="' + P.escapeHTML(item.key) + '">' +
      '<div class="cart-item-image">' +
        '<img src="' + (item.image || '/images/placeholder.jpg') + '" alt="' + P.escapeHTML(item.name) + '" loading="lazy">' +
      '</div>' +
      '<div>' +
        '<div style="font-weight:600;font-size:14px;margin-bottom:6px;">' + P.escapeHTML(item.name) + '</div>' +
        '<div class="text-muted" style="font-size:12px;margin-bottom:8px;">' +
          (item.size ? 'Gwose: ' + P.escapeHTML(item.size) + ' - ' : '') +
          (item.color ? 'Koule: ' + P.escapeHTML(item.color) : '') +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
          '<div class="qty-selector">' +
            '<button data-act="minus" aria-label="Diminye">-</button>' +
            '<span>' + item.quantity + '</span>' +
            '<button data-act="plus" aria-label="Ogmante">+</button>' +
          '</div>' +
          '<button class="btn btn-sm" data-act="remove" style="color:var(--danger);">Efase</button>' +
        '</div>' +
      '</div>' +
      '<div style="text-align:right;">' +
        '<div style="font-weight:700;color:var(--neon);">' + P.formatPrice(item.price * item.quantity) + '</div>' +
        '<div class="text-muted" style="font-size:12px;">' + P.formatPrice(item.price) + ' / inite</div>' +
      '</div></div>';
  }).join('');

  container.querySelectorAll('.cart-item').forEach(function(el) {
    var key = el.dataset.key;
    el.querySelectorAll('[data-act]').forEach(function(btn) {
      btn.onclick = function() {
        var act = btn.dataset.act;
        if (act === 'plus') updateQty(key, 1);
        else if (act === 'minus') updateQty(key, -1);
        else if (act === 'remove') removeFromCart(key);
        renderCartPage();
      };
    });
  });

  if (summaryEl) {
    var sub = cartSubtotal();
    summaryEl.style.display = 'block';
    summaryEl.innerHTML = '<div class="card">' +
      '<h3 style="margin-bottom:20px;">Rezime</h3>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:10px;">' +
        '<span class="text-muted">Sou-total</span><span>' + P.formatPrice(sub) + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:10px;">' +
        '<span class="text-muted">Livrezon</span><span class="text-muted">Kalkile nan checkout</span></div>' +
      '<div style="border-top:1px solid var(--border);margin:16px 0;padding-top:16px;display:flex;justify-content:space-between;font-weight:700;font-size:18px;">' +
        '<span>Total</span><span style="color:var(--neon);">' + P.formatPrice(sub) + '</span></div>' +
      '<a href="/checkout.html" class="btn btn-primary btn-full" style="margin-top:16px;">Pase Komand</a></div>';
  }
}

// EKSPOTE
window.PanikCart = {
  addToCart: addToCart,
  removeFromCart: removeFromCart,
  cartSubtotal: cartSubtotal,
  renderCartPage: renderCartPage
};

// INIT
document.addEventListener('DOMContentLoaded', function() {
  whenReady(function() {
    if (document.getElementById('cart-content')) renderCartPage();
  });
});

})();

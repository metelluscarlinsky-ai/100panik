// ============================================
// 100PANIK - Panier
// ============================================

const { Store, saveCart, formatPrice, toast } = window.Panik;

// ---------- AJOUTE ----------
function addToCart(product, quantity = 1, size = null, color = null) {
  const key = `${product.id}-${size || ''}-${color || ''}`;
  const existing = Store.cart.find(i => i.key === key);
  if (existing) {
    existing.quantity += quantity;
  } else {
    Store.cart.push({
      key,
      product_id: product.id,
      name: product.name,
      price: product.price,
      image: (product.images && product.images[0]) || null,
      size, color,
      quantity,
      slug: product.slug
    });
  }
  saveCart();
  toast(`✅ ${product.name} ajoute nan panier`, 'success');
}

function removeFromCart(key) {
  Store.cart = Store.cart.filter(i => i.key !== key);
  saveCart();
}

function updateQty(key, delta) {
  const item = Store.cart.find(i => i.key === key);
  if (!item) return;
  item.quantity = Math.max(1, item.quantity + delta);
  saveCart();
}

function cartSubtotal() {
  return Store.cart.reduce((s, i) => s + i.price * i.quantity, 0);
}

// ---------- RENDER PANIER ----------
function renderCartPage() {
  const container = document.getElementById('cart-content');
  const summaryEl = document.getElementById('cart-summary');
  if (!container) return;

  if (Store.cart.length === 0) {
    container.innerHTML = `
      <div class="card text-center" style="padding:60px 20px;">
        <svg width="64" height="64" fill="none" stroke="var(--text-3)" stroke-width="1.5" viewBox="0 0 24 24" style="margin:0 auto 16px;">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <h3>Panier ou vid</h3>
        <p class="text-muted" style="margin:12px 0 24px;">Ajoute kèk bagay pou kòmanse.</p>
        <a href="/collection.html" class="btn btn-primary">Wè Koleksyon</a>
      </div>
    `;
    if (summaryEl) summaryEl.style.display = 'none';
    return;
  }

  container.innerHTML = Store.cart.map(item => `
    <div class="cart-item" data-key="${escapeHTML(item.key)}">
      <div class="cart-item-image">
        <img src="${item.image || '/images/placeholder.jpg'}" alt="${escapeHTML(item.name)}" loading="lazy">
      </div>
      <div>
        <div style="font-weight:600;font-size:14px;margin-bottom:6px;">${escapeHTML(item.name)}</div>
        <div class="text-muted" style="font-size:12px;margin-bottom:8px;">
          ${item.size ? `Gwosè: ${escapeHTML(item.size)} · ` : ''}${item.color ? `Koulè: ${escapeHTML(item.color)}` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="qty-selector">
            <button data-act="minus" aria-label="Diminye">−</button>
            <span>${item.quantity}</span>
            <button data-act="plus" aria-label="Ogmante">+</button>
          </div>
          <button class="btn btn-sm" data-act="remove" style="color:var(--danger);">Efase</button>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-weight:700;color:var(--neon);">${formatPrice(item.price * item.quantity)}</div>
        <div class="text-muted" style="font-size:12px;">${formatPrice(item.price)} / inite</div>
      </div>
    </div>
  `).join('');

  // Event listeners
  container.querySelectorAll('.cart-item').forEach(el => {
    const key = el.dataset.key;
    el.querySelectorAll('[data-act]').forEach(btn => {
      btn.onclick = () => {
        const act = btn.dataset.act;
        if (act === 'plus') updateQty(key, 1);
        else if (act === 'minus') updateQty(key, -1);
        else if (act === 'remove') removeFromCart(key);
        renderCartPage();
      };
    });
  });

  // Rezime
  if (summaryEl) {
    const sub = cartSubtotal();
    summaryEl.style.display = 'block';
    summaryEl.innerHTML = `
      <div class="card">
        <h3 style="margin-bottom:20px;">Rezime</h3>
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span class="text-muted">Sou-total</span>
          <span>${formatPrice(sub)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span class="text-muted">Livrezon</span>
          <span class="text-muted">Kalkile nan checkout</span>
        </div>
        <div style="border-top:1px solid var(--border);margin:16px 0;padding-top:16px;display:flex;justify-content:space-between;font-weight:700;font-size:18px;">
          <span>Total</span>
          <span style="color:var(--neon);">${formatPrice(sub)}</span>
        </div>
        <a href="/checkout.html" class="btn btn-primary btn-full" style="margin-top:16px;">Pase Kòmand</a>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('cart-content')) renderCartPage();
});

window.PanikCart = { addToCart, removeFromCart, cartSubtotal };

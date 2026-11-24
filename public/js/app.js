const API = '';

const Store = {
  cart: JSON.parse(localStorage.getItem('panik_cart') || '[]'),
  settings: {},
  products: []
};

function saveCart() {
  localStorage.setItem('panik_cart', JSON.stringify(Store.cart));
  updateCartBadge();
}

function updateCartBadge() {
  const count = Store.cart.reduce((s, i) => s + i.quantity, 0);
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

function formatPrice(n) {
  return new Intl.NumberFormat('fr-HT', { maximumFractionDigits: 0 }).format(n) + ' HTG';
}

function toast(msg, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'all 0.3s';
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

function initTheme() {
  const saved = localStorage.getItem('panik_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.innerHTML = saved === 'dark' ? sunIcon() : moonIcon();
    btn.onclick = () => {
      const cur = document.documentElement.getAttribute('data-theme');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('panik_theme', next);
      btn.innerHTML = next === 'dark' ? sunIcon() : moonIcon();
    };
  }
}

function sunIcon() { return `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`; }
function moonIcon() { return `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`; }

function renderHeader() {
  const el = document.getElementById('header-mount');
  if (!el) return;
  el.innerHTML = `
    <header class="header">
      <nav class="nav">
        <a href="/" class="logo"><span class="logo-dot"></span>100PANIK</a>
        <ul class="nav-links">
          <li><a href="/collection.html">Collection</a></li>
          <li><a href="/collection.html?category=hoodie">Hoodies</a></li>
          <li><a href="/collection.html?category=t-shirt">T-shirts</a></li>
          <li><a href="/track.html">Track Order</a></li>
        </ul>
        <div class="nav-actions">
          <a href="/affiliate.html" class="icon-btn" style="width:auto; padding: 0 12px; font-size: 12px; font-weight: bold; margin-right: 8px;">Affiliate</a>
          <a href="/account.html" class="icon-btn" id="account-btn" aria-label="My Account">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </a>
          <button class="icon-btn" id="theme-toggle" aria-label="Toggle theme"></button>
          <a href="/cart.html" class="icon-btn" aria-label="Cart">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/></svg>
            <span class="cart-count" style="display:none;">0</span>
          </a>
        </div>
      </nav>
    </header>
  `;
  initTheme();
  updateCartBadge();
}

function renderFooter() {
  const el = document.getElementById('footer-mount');
  if (!el) return;
  el.innerHTML = `
    <footer class="footer">
      <div class="footer-grid">
        <div>
          <div class="logo" style="margin-bottom:16px;"><span class="logo-dot"></span>100PANIK</div>
          <p class="text-muted" style="font-size:13px;">Clothes for people who never stop. Unique collection, fast delivery.</p>
        </div>
        <div>
          <h4>SHOP</h4>
          <a href="/collection.html">All Collections</a>
          <a href="/collection.html?category=hoodie">Hoodies</a>
          <a href="/collection.html?category=t-shirt">T-shirts</a>
          <a href="/collection.html?category=soulye">Shoes</a>
        </div>
        <div>
          <h4>CUSTOMERS</h4>
          <a href="/track.html">Track Order</a>
          <a href="/cart.html">Cart</a>
          <a href="/checkout.html">Checkout</a>
        </div>
        <div>
          <h4>CONTACT</h4>
          <a href="mailto:metalluscarlinsky@gmail.com">metalluscarlinsky@gmail.com</a>
          <a href="https://www.instagram.com/100panik?evlk=Zm56Z3EwaWtkcXFq" target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href="https://www.tiktok.com/@100panik_" target="_blank" rel="noopener noreferrer">TikTok</a>
        </div>
      </div>
      <div class="footer-bottom">© ${new Date().getFullYear()} 100PANIK. All rights reserved.</div>
    </footer>
  `;
}

function productCardHTML(p) {
  const img = (p.images && p.images[0]) || '';
  const onSale = p.compare_price > p.price;
  return `
    <a href="/product.html?slug=${encodeURIComponent(p.slug)}" class="product-card">
      <div class="product-image" style="background:#222; position:relative;">
        ${img ? `<img src="${img}" alt="${escapeHTML(p.name)}" loading="lazy" onerror="this.style.display='none'">` : ''}
        ${p.featured ? '<span class="product-badge">New</span>' : ''}
        ${onSale ? '<span class="product-badge sale" style="left:auto;right:12px;">SALE</span>' : ''}
      </div>
      <div class="product-info">
        <h3 class="product-name">${escapeHTML(p.name)}</h3>
        <div class="product-price">
          <span class="price-current">${formatPrice(p.price)}</span>
          ${onSale ? `<span class="price-old">${formatPrice(p.compare_price)}</span>` : ''}
        </div>
      </div>
    </a>
  `;
}

function escapeHTML(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function api(path, options = {}) {
  const opts = { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options };
  if (opts.body && typeof opts.body === 'object') opts.body = JSON.stringify(opts.body);
  const res = await fetch(API + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erè' }));
    throw new Error(err.error || `Erè ${res.status}`);
  }
  return res.json();
}

window.Panik = { Store, api, toast, formatPrice, productCardHTML, escapeHTML, saveCart, updateCartBadge };

document.addEventListener('DOMContentLoaded', () => {
  renderHeader();
  renderFooter();
  updateCartBadge();
});

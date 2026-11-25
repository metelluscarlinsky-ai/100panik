// Fichye sa a gen sèlman kòd pou Footer a ak kèk fonksyon debaz
document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('footer-mount');
  if (el) {
    el.innerHTML = `
      <footer style="background:#0a0a0a; padding:50px 20px; border-top:1px solid #222;">
        <div style="max-width:1200px; margin:0 auto; display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:30px;">
          <div>
            <div style="font-family:'Orbitron'; font-size:20px; color:#00f0ff; margin-bottom:15px;">100PANIK</div>
            <p style="color:#888; font-size:13px; margin:0;">Clothes for people who never stop.</p>
          </div>
          <div>
            <h4 style="color:#fff; margin:0 0 15px 0; font-size:14px;">SHOP</h4>
            <a href="/collection.html" style="display:block; color:#888; text-decoration:none; margin-bottom:8px; font-size:14px;">All Collections</a>
            <a href="/collection.html?category=hoodie" style="display:block; color:#888; text-decoration:none; margin-bottom:8px; font-size:14px;">Hoodies</a>
          </div>
          <div>
            <h4 style="color:#fff; margin:0 0 15px 0; font-size:14px;">CUSTOMERS</h4>
            <a href="/track.html" style="display:block; color:#888; text-decoration:none; margin-bottom:8px; font-size:14px;">Track Order</a>
            <a href="/cart.html" style="display:block; color:#888; text-decoration:none; margin-bottom:8px; font-size:14px;">Cart</a>
          </div>
          <div>
            <h4 style="color:#fff; margin:0 0 15px 0; font-size:14px;">CONTACT</h4>
            <a href="mailto:metalluscarlinsky@gmail.com" style="display:block; color:#888; text-decoration:none; margin-bottom:8px; font-size:14px;">metalluscarlinsky@gmail.com</a>
            <a href="https://www.instagram.com/100panik?evlk=Zm56Z3EwaWtkcXFq" target="_blank" style="display:block; color:#888; text-decoration:none; margin-bottom:8px; font-size:14px;">Instagram</a>
            <a href="https://www.tiktok.com/@100panik_" target="_blank" style="display:block; color:#888; text-decoration:none; margin-bottom:8px; font-size:14px;">TikTok</a>
          </div>
        </div>
        <div style="text-align:center; color:#555; font-size:12px; margin-top:40px; border-top:1px solid #222; padding-top:20px;">
          © ${new Date().getFullYear()} 100PANIK. All rights reserved.
        </div>
      </footer>
    `;
  }
});

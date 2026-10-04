// ============================================
// 100PANIK - PWA Init (iOS + Android + Desktop)
// ============================================

(function() {
  'use strict';

  // ---------- 1) ENREJISTRE SERVICE WORKER ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
        .then(reg => console.log('✅ SW aktif:', reg.scope))
        .catch(err => console.warn('❌ SW echwe:', err));
    });
  }

  // ---------- 2) DETECTE PLATFORM ----------
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  // ---------- 3) ACHTE INSTALL PROMPT ----------
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!isStandalone) showInstallBanner('android');
  });

  window.addEventListener('appinstalled', () => {
    console.log('✅ App enstale');
    hideInstallBanner();
    localStorage.setItem('panik_installed', '1');
  });

  // ---------- 4) BANNER ENSTALASYON ----------
  function createBanner() {
    const div = document.createElement('div');
    div.id = 'pwa-install-banner';
    div.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: linear-gradient(135deg, #0a0a0a, #1a1a1a);
      border: 1px solid #00f0ff; border-radius: 16px;
      padding: 14px 18px; z-index: 99998; display: flex; gap: 12px;
      align-items: center; box-shadow: 0 8px 40px rgba(0,240,255,.35);
      max-width: 92%; width: 420px; font-family: Inter, sans-serif;
      animation: pwaSlideUp .4s ease;
    `;
    div.innerHTML = `
      <img src="/images/icons/icon-96.png" alt="100PANIK" style="width:42px;height:42px;border-radius:10px;">
      <div style="flex:1;color:#fff;font-size:13px;line-height:1.4;">
        <strong style="color:#00f0ff;">Enstale 100PANIK</strong><br>
        <span style="opacity:.75;">Aksè rapid sou telefòn ou.</span>
      </div>
      <button id="pwa-install-btn" style="background:#00f0ff;border:0;color:#0a0a0a;font-weight:700;padding:8px 14px;border-radius:10px;cursor:pointer;font-size:12px;">Enstale</button>
      <button id="pwa-close-btn" style="background:transparent;border:0;color:#666;font-size:20px;cursor:pointer;padding:0 4px;">×</button>
    `;
    document.body.appendChild(div);

    const style = document.createElement('style');
    style.textContent = `@keyframes pwaSlideUp{from{opacity:0;transform:translate(-50%,20px)}to{opacity:1;transform:translate(-50%,0)}}`;
    document.head.appendChild(style);

    document.getElementById('pwa-close-btn').onclick = () => {
      hideInstallBanner();
      localStorage.setItem('panik_install_dismissed', Date.now().toString());
    };
    return div;
  }

  function showInstallBanner(platform) {
    if (document.getElementById('pwa-install-banner')) return;
    // Pa montre si deja refize nan 3 jou
    const dismissed = localStorage.getItem('panik_install_dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 3 * 24 * 3600 * 1000) return;

    const banner = createBanner();
    const btn = document.getElementById('pwa-install-btn');

    if (platform === 'ios') {
      btn.onclick = () => showIOSInstructions();
    } else if (deferredPrompt) {
      btn.onclick = async () => {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('Chwa:', outcome);
        deferredPrompt = null;
        hideInstallBanner();
      };
    } else {
      btn.onclick = () => alert('Ouvri meni navigatè w (⋮) epi chwazi "Enstale aplikasyon an"');
    }
  }

  function hideInstallBanner() {
    const b = document.getElementById('pwa-install-banner');
    if (b) b.remove();
  }

  // ---------- 5) ENSTRIKSYON SPESYAL POU iOS ----------
  function showIOSInstructions() {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,.85); z-index: 99999;
      display: flex; align-items: center; justify-content: center; padding: 20px;
      font-family: Inter, sans-serif; backdrop-filter: blur(8px);
    `;
    modal.innerHTML = `
      <div style="background:#111;border:1px solid #00f0ff;border-radius:20px;padding:28px 24px;max-width:400px;width:100%;color:#fff;text-align:center;">
        <h3 style="margin:0 0 8px;color:#00f0ff;font-size:20px;">Enstale sou iPhone</h3>
        <p style="opacity:.7;font-size:13px;margin:0 0 20px;">3 etap senp:</p>
        <div style="text-align:left;font-size:14px;line-height:2.2;">
          <div style="display:flex;gap:12px;align-items:center;">
            <span style="background:#00f0ff;color:#000;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;">1</span>
            <span>Tape ikòn <strong>Share</strong> <svg style="vertical-align:middle;width:18px;height:18px;" fill="#00f0ff" viewBox="0 0 24 24"><path d="M12 2L8 6h3v9h2V6h3zm-6 8v10h12V10h-3v2h1v6H7v-6h1v-2z"/></svg> anba a</span>
          </div>
          <div style="display:flex;gap:12px;align-items:center;margin-top:8px;">
            <span style="background:#00f0ff;color:#000;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;">2</span>
            <span>Desann epi chwazi <strong>« Ajoute nan ekran akèy »</strong></span>
          </div>
          <div style="display:flex;gap:12px;align-items:center;margin-top:8px;">
            <span style="background:#00f0ff;color:#000;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;">3</span>
            <span>Tape <strong>« Ajoute »</strong> anlè a</span>
          </div>
        </div>
        <button id="ios-close" style="margin-top:24px;background:#00f0ff;border:0;color:#000;font-weight:700;padding:12px 28px;border-radius:12px;font-size:14px;cursor:pointer;width:100%;">Konprann</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('ios-close').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  }

  // ---------- 6) DETEKTE SI I0S EPI PA ENSTALE ----------
  window.addEventListener('load', () => {
    if (isStandalone) return;
    if (localStorage.getItem('panik_installed')) return;

    if (isIOS && isSafari) {
      setTimeout(() => showInstallBanner('ios'), 3000);
    } else if (!isIOS && !isStandalone) {
      // Android/Desktop: tann beforeinstallprompt
      // Si apre 6s nou poko gen prompt, montre yon not
      setTimeout(() => {
        if (!deferredPrompt && !isStandalone) {
          // pa fè anyen — gade si navigatè a sipòte
        }
      }, 6000);
    }
  });

  // ---------- 7) DETEKTE OFFLINE/ONLINE ----------
  window.addEventListener('offline', () => {
    showToast('📡 Ou offline — kontni ki an cache a ap parèt');
  });
  window.addEventListener('online', () => {
    showToast('✅ Rekonekte!');
  });

  function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `
      position:fixed;top:20px;left:50%;transform:translateX(-50%);
      background:#111;color:#fff;border:1px solid #00f0ff;
      padding:12px 20px;border-radius:12px;font-size:13px;z-index:99999;
      font-family:Inter,sans-serif;box-shadow:0 6px 24px rgba(0,240,255,.35);
    `;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }
})();

// 100PANIK - Bouton enstalasyon PWA (iPhone + Android + Desktop)
(function() {
  'use strict';

  var deferredPrompt = null;
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                     window.navigator.standalone === true;

  if (isStandalone) return;
  if (localStorage.getItem('panik_pwa_installed')) return;

  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;

  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    showButton();
  });

  window.addEventListener('appinstalled', function() {
    localStorage.setItem('panik_pwa_installed', '1');
    var b = document.getElementById('pwa-install-btn');
    if (b) b.remove();
  });

  function showButton() {
    if (document.getElementById('pwa-install-btn')) return;
    if (localStorage.getItem('panik_pwa_installed')) return;

    var btn = document.createElement('button');
    btn.id = 'pwa-install-btn';
    btn.setAttribute('aria-label', 'Enstale App 100PANIK');
    btn.innerHTML =
      '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;">' +
        '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>' +
      '</svg>' +
      '<span>Enstale App la</span>';

    btn.style.cssText =
      'position:fixed;bottom:20px;right:20px;z-index:99997;' +
      'display:flex;align-items:center;gap:10px;' +
      'padding:14px 22px;border-radius:100px;border:0;cursor:pointer;' +
      'background:linear-gradient(135deg,#00f0ff,#0080ff);color:#000;' +
      'font-family:Inter,sans-serif;font-weight:700;font-size:14px;' +
      'box-shadow:0 8px 32px rgba(0,240,255,0.5);' +
      'animation:pwaBtnIn 0.4s ease;' +
      'transition:transform 0.2s,box-shadow 0.2s;';

    var style = document.createElement('style');
    style.textContent =
      '@keyframes pwaBtnIn{from{opacity:0;transform:translateY(20px) scale(0.9)}to{opacity:1;transform:translateY(0) scale(1)}}' +
      '#pwa-install-btn:hover{transform:translateY(-2px) scale(1.03);box-shadow:0 12px 48px rgba(0,240,255,0.7)}' +
      '#pwa-install-btn:active{transform:translateY(0) scale(0.97)}' +
      '@media(max-width:600px){#pwa-install-btn{bottom:16px;right:16px;padding:12px 18px;font-size:13px}}';

    document.head.appendChild(style);
    document.body.appendChild(btn);

    btn.addEventListener('click', handleInstall);
  }

  function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function(choice) {
        if (choice.outcome === 'accepted') {
          localStorage.setItem('panik_pwa_installed', '1');
        }
        deferredPrompt = null;
      });
    } else if (isIOS) {
      showIOSInstructions();
    } else {
      showGenericInstructions();
    }
  }

  function showIOSInstructions() {
    var modal = document.createElement('div');
    modal.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.88);backdrop-filter:blur(8px);' +
      'z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;' +
      'font-family:Inter,sans-serif;';

    modal.innerHTML =
      '<div style="background:#111;border:1px solid #00f0ff;border-radius:24px;padding:32px 28px;max-width:420px;width:100%;color:#fff;box-shadow:0 24px 80px rgba(0,240,255,0.3);">' +
        '<div style="text-align:center;margin-bottom:24px;">' +
          '<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:20px;letter-spacing:0.15em;background:linear-gradient(135deg,#00f0ff,#0080ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px;">100PANIK</div>' +
          '<h3 style="margin:0;font-size:22px;color:#00f0ff;">Enstale sou iPhone</h3>' +
          '<p style="opacity:0.7;font-size:13px;margin:8px 0 0;">3 etap senp</p>' +
        '</div>' +
        '<div style="text-align:left;font-size:14px;line-height:1.7;">' +
          '<div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:16px;padding:14px;background:rgba(0,240,255,0.06);border-radius:12px;">' +
            '<span style="background:#00f0ff;color:#000;min-width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">1</span>' +
            '<div style="flex:1;"><div style="font-weight:600;margin-bottom:4px;">Tape bouton Share</div>' +
            '<div style="opacity:0.7;font-size:12px;">Kare ak flèch monte anba a</div></div>' +
          '</div>' +
          '<div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:16px;padding:14px;background:rgba(0,240,255,0.06);border-radius:12px;">' +
            '<span style="background:#00f0ff;color:#000;min-width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">2</span>' +
            '<div style="flex:1;"><div style="font-weight:600;margin-bottom:4px;">Desann epi chwazi</div>' +
            '<div style="opacity:0.7;font-size:12px;">« Ajoute nan ekran akèy »</div></div>' +
          '</div>' +
          '<div style="display:flex;gap:14px;align-items:flex-start;padding:14px;background:rgba(0,240,255,0.06);border-radius:12px;">' +
            '<span style="background:#00f0ff;color:#000;min-width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">3</span>' +
            '<div style="flex:1;"><div style="font-weight:600;margin-bottom:4px;">Tape « Ajoute »</div>' +
            '<div style="opacity:0.7;font-size:12px;">Ikòn 100PANIK ap parèt</div></div>' +
          '</div>' +
        '</div>' +
        '<button id="pwa-ios-close" style="margin-top:24px;width:100%;padding:14px;border-radius:12px;border:0;cursor:pointer;background:linear-gradient(135deg,#00f0ff,#0080ff);color:#000;font-weight:700;font-size:15px;font-family:inherit;">Konprann</button>' +
      '</div>';

    document.body.appendChild(modal);
    document.getElementById('pwa-ios-close').onclick = function() { modal.remove(); };
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  }

  function showGenericInstructions() {
    var modal = document.createElement('div');
    modal.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.88);backdrop-filter:blur(8px);' +
      'z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Inter,sans-serif;';

    modal.innerHTML =
      '<div style="background:#111;border:1px solid #00f0ff;border-radius:20px;padding:28px;max-width:400px;width:100%;color:#fff;">' +
        '<h3 style="margin:0 0 12px;color:#00f0ff;">Enstale 100PANIK</h3>' +
        '<p style="opacity:0.8;font-size:14px;line-height:1.6;margin:0 0 20px;">Ouvri meni navigatè w la (⋮ oswa ≡) epi chwazi <strong>« Enstale aplikasyon »</strong> oswa <strong>« Ajoute nan ekran akèy »</strong>.</p>' +
        '<button id="pwa-gen-close" style="width:100%;padding:12px;border-radius:12px;border:0;cursor:pointer;background:#00f0ff;color:#000;font-weight:700;font-family:inherit;">Konprann</button>' +
      '</div>';

    document.body.appendChild(modal);
    document.getElementById('pwa-gen-close').onclick = function() { modal.remove(); };
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(showButton, 1500); });
  } else {
    setTimeout(showButton, 1500);
  }
})();

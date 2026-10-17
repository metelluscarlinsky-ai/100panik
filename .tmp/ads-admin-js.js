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

/* BoutiqueFlow — UI core: routing helpers, event delegation, dialogs, shared view helpers. */
(function (root) {
  'use strict';

  const { api, money, fmtDate, fmtDateTime } = root.BF;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));

  const ICON = {
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c1.2-4 4-5.5 7.5-5.5s6.3 1.5 7.5 5.5"/></svg>',
    bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6.5a3 3 0 016 0V8"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    zoom: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5M10.5 8v5M8 10.5h5"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0112 7.3a4.2 4.2 0 017.5 2.5C19.5 15.4 12 20 12 20z"/></svg>',
    sliders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><circle cx="17" cy="7" r=".6"/></svg>',
    pinterest: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M11 9.5c2.5-1 4 .8 3.5 2.8-.4 1.8-1.7 2.7-2.8 2.2M11.3 11.5L9.8 17"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="6" width="16" height="12" rx="1.5"/><path d="M4.5 7l7.5 6 7.5-6"/></svg>',
    // admin
    dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="8" rx="1"/><rect x="13" y="4" width="7" height="5" rx="1"/><rect x="13" y="11" width="7" height="9" rx="1"/><rect x="4" y="14" width="7" height="6" rx="1"/></svg>',
    orders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg>',
    products: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5V5h7.5L20 13.5 13.5 20z"/><circle cx="8.5" cy="9" r="1.2"/></svg>',
    inventory: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v9"/></svg>',
    customers: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.8-3.2 3-4.6 5.5-4.6s4.7 1.4 5.5 4.6"/><path d="M15.5 5.6a3 3 0 010 5.8M17 14.6c1.8.5 3 1.9 3.5 4.4"/></svg>',
    staff: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="1.5"/><circle cx="9.5" cy="11" r="2"/><path d="M6.5 16c.6-1.6 1.7-2.2 3-2.2s2.4.6 3 2.2M14.5 10h3M14.5 13h3"/></svg>',
    reports: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17h12l-1.5-2V11a4.5 4.5 0 00-9 0v4z"/><path d="M10 19.5a2 2 0 004 0"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4L18 18M18 6l-1.6 1.6M7.6 16.4L6 18"/></svg>',
    store: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9l1.5-4.5h13L20 9M4 9v10.5h16V9M4 9c0 1.7 1.3 2.5 2.7 2.5S9.3 10.7 9.3 9c0 1.7 1.3 2.5 2.7 2.5s2.7-.8 2.7-2.5c0 1.7 1.3 2.5 2.7 2.5S20 10.7 20 9"/></svg>'
  };

  /* ---------- routing ---------- */
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const i = h.indexOf('?');
    const pathPart = i < 0 ? h : h.slice(0, i);
    const query = {};
    new URLSearchParams(i < 0 ? '' : h.slice(i + 1)).forEach((v, k) => { query[k] = v; });
    return { segs: pathPart.split('/').filter(Boolean).map(decodeURIComponent), query, path: pathPart };
  }
  function qs(obj) {
    const p = new URLSearchParams();
    Object.keys(obj).forEach((k) => { if (obj[k] !== '' && obj[k] != null && obj[k] !== false) p.set(k, obj[k]); });
    const s = p.toString();
    return s ? '?' + s : '';
  }
  function nav(hash) { if (location.hash === hash) UI.rerender(); else location.hash = hash; }

  /* ---------- toasts ---------- */
  function toast(msg, type) {
    const host = $('#toasts');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast toast--' + (type || 'ok');
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, type === 'error' ? 5500 : 3200);
  }
  function errMsg(e) { return e && e.name === 'BFError' ? e.message : 'Something went wrong. Please try again.'; }
  function fail(e) {
    if (!(e && e.name === 'BFError')) console.error(e);
    toast(errMsg(e), 'error');
  }

  /* ---------- modal + drawer ---------- */
  let modalState = { open: false, onClose: null, lastFocus: null };
  function openModal(opts) {
    closeModal(true);
    modalState = { open: true, onClose: opts.onClose || null, lastFocus: document.activeElement };
    const cls = opts.size === 'wide' ? ' modal__dialog--wide' : opts.size === 'sm' ? ' modal__dialog--sm' : '';
    $('#modal-root').innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal__backdrop" data-action="modal-close"></div>' +
      '<div class="modal__dialog' + cls + '"><button type="button" class="icon-btn modal__close" data-action="modal-close" aria-label="Close dialog">' + ICON.close + '</button>' +
      '<h2 id="modal-title">' + esc(opts.title || '') + '</h2>' + opts.html + '</div></div>';
    document.body.style.overflow = 'hidden';
    const first = $('#modal-root input:not([type=hidden]):not([disabled]), #modal-root select, #modal-root textarea') || $('#modal-root .modal__dialog .btn');
    if (first) first.focus(); else $('#modal-root .modal__close').focus();
    if (opts.onOpen) opts.onOpen($('#modal-root'));
  }
  function closeModal(silent) {
    if (!modalState.open) return;
    const cb = modalState.onClose, lf = modalState.lastFocus;
    modalState = { open: false, onClose: null, lastFocus: null };
    $('#modal-root').innerHTML = '';
    if (!drawerOpen()) document.body.style.overflow = '';
    if (!silent && lf && lf.focus && document.contains(lf)) lf.focus();
    if (cb) cb();
  }
  function confirmDialog(o) {
    return new Promise((resolve) => {
      let settled = false;
      const done = (v) => { if (!settled) { settled = true; resolve(v); } };
      openModal({
        title: o.title, size: 'sm', onClose: () => done(null),
        html: '<p class="muted">' + o.message + '</p>' +
          (o.reasons ? '<div class="field" style="margin-top:16px"><label class="field__label" for="confirm-reason">' + esc(o.reasonLabel || 'Reason') + '</label><select class="select" id="confirm-reason">' + o.reasons.map((r) => '<option>' + esc(r) + '</option>').join('') + '</select></div>' : '') +
          '<div class="modal__actions"><button type="button" class="btn btn--secondary" data-action="modal-close">' + esc(o.cancelLabel || 'Keep it') + '</button>' +
          '<button type="button" class="btn ' + (o.danger ? 'btn--danger-solid' : 'btn--primary') + '" data-action="confirm-yes">' + esc(o.confirmLabel || 'Confirm') + '</button></div>',
        onOpen: (rootEl) => {
          rootEl.querySelector('[data-action="confirm-yes"]').addEventListener('click', () => {
            const sel = rootEl.querySelector('#confirm-reason');
            done({ reason: sel ? sel.value : '' });
            closeModal();
          });
        }
      });
    });
  }
  function drawerOpen() { const d = $('#bag-drawer'); return !!(d && d.classList.contains('is-open')); }
  function openDrawer() {
    const d = $('#bag-drawer');
    d.innerHTML = UI.drawerHtml();
    d.classList.add('is-open'); d.setAttribute('aria-hidden', 'false');
    $('#overlay').classList.add('is-open');
    document.body.style.overflow = 'hidden';
    UI._drawerFocus = document.activeElement;
    const c = $('.drawer__head button', d); if (c) c.focus();
  }
  function closeDrawer() {
    const d = $('#bag-drawer');
    if (!d || !d.classList.contains('is-open')) return;
    d.classList.remove('is-open'); d.setAttribute('aria-hidden', 'true');
    $('#overlay').classList.remove('is-open');
    if (!modalState.open) document.body.style.overflow = '';
    if (UI._drawerFocus && document.contains(UI._drawerFocus)) UI._drawerFocus.focus();
  }
  function refreshDrawer() { if (drawerOpen()) $('#bag-drawer').innerHTML = UI.drawerHtml(); }

  /* ---------- event delegation ---------- */
  const actions = {}, forms = {}, changes = {}, inputs = {};
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const name = el.dataset.action;
    if (name === 'modal-close') { closeModal(); return; }
    if (name === 'drawer-close') { closeDrawer(); return; }
    const fn = actions[name];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    const fn = forms[f.dataset.form];
    if (fn) fn(f, e);
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (el && changes[el.dataset.change]) changes[el.dataset.change](el, e);
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-input]');
    if (el && inputs[el.dataset.input]) inputs[el.dataset.input](el, e);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalState.open) { closeModal(); return; }
      if (drawerOpen()) closeDrawer();
      return;
    }
    if (e.key !== 'Tab') return;
    const container = modalState.open ? $('#modal-root .modal__dialog') : drawerOpen() ? $('#bag-drawer') : null;
    if (!container) return;
    const f = $$('a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', container).filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------- shared view helpers ---------- */
  function field(o) {
    const id = o.id, v = o.value == null ? '' : o.value;
    const common = 'id="f-' + id + '" name="' + id + '"' + (o.required ? ' required' : '') + (o.autocomplete ? ' autocomplete="' + o.autocomplete + '"' : '') + ' aria-describedby="err-' + id + '"' + (o.attrs ? ' ' + o.attrs : '');
    let control;
    if (o.as === 'select') control = '<select class="select" ' + common + '>' + o.options.map((op) => { const val = typeof op === 'string' ? op : op.value, lab = typeof op === 'string' ? op : op.label; return '<option value="' + esc(val) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + esc(lab) + '</option>'; }).join('') + '</select>';
    else if (o.as === 'textarea') control = '<textarea class="textarea" ' + common + (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + '>' + esc(v) + '</textarea>';
    else control = '<input class="input" type="' + (o.type || 'text') + '" ' + common + ' value="' + esc(v) + '"' + (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + (o.inputmode ? ' inputmode="' + o.inputmode + '"' : '') + '>';
    return '<div class="field' + (o.span ? ' span-2' : '') + '"><label class="field__label" for="f-' + id + '">' + esc(o.label) + (o.opt ? ' <span class="opt">(optional)</span>' : '') + '</label>' + control +
      (o.hint ? '<div class="field__hint">' + o.hint + '</div>' : '') + '<div class="field__error" id="err-' + id + '" data-err="' + id + '"></div></div>';
  }
  function showFieldErrors(form, fields) {
    $$('[data-err]', form).forEach((el) => { el.textContent = ''; });
    $$('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'));
    let first = null;
    Object.keys(fields || {}).forEach((k) => {
      const err = $('[data-err="' + k + '"]', form);
      const input = $('[name="' + k + '"]', form);
      if (err) err.textContent = fields[k];
      if (input) { input.setAttribute('aria-invalid', 'true'); if (!first) first = input; }
    });
    if (first) first.focus();
  }
  function formValues(form) {
    const out = {};
    new FormData(form).forEach((v, k) => { out[k] = typeof v === 'string' ? v : ''; });
    $$('input[type=checkbox]', form).forEach((c) => { if (c.name) out[c.name] = c.checked; });
    return out;
  }
  function setBusy(btn, busy, label) {
    if (!btn) return;
    if (busy) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> ' + esc(label || 'Working'); }
    else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
  }

  const STATUS_CLASS = { 'Pending Payment': 'pending', Confirmed: 'confirmed', Packed: 'packed', Shipped: 'shipped', Delivered: 'delivered', Cancelled: 'cancelled' };
  const PAY_CLASS = { Paid: 'paid', Pending: 'pending', 'Refund Pending': 'refund', Refunded: 'paid', Failed: 'failed', Cancelled: 'cancelled' };
  const statusBadge = (s) => '<span class="badge badge--' + (STATUS_CLASS[s] || 'inactive') + '">' + esc(s) + '</span>';
  const payBadge = (s) => '<span class="badge badge--' + (PAY_CLASS[s] || 'inactive') + '">' + esc(s) + '</span>';

  /* Which photographs to show for a product + colour. Records are { src, color, alt, sample }.
       - photos tagged with the chosen colour come first, then photos for every colour (color = '');
       - if the product only has photos of other colours, those are shown and flagged exact:false so the
         page can say which colour was photographed (the shopper is never told it is the chosen colour);
       - no photos at all -> list is empty and callers show the neutral placeholder (never an illustration).
     With no colour given (catalogue cards) the first colour that has photos is used, so the card, the
     product page and the bag agree. */
  const asImage = (i) => (typeof i === 'string' ? { src: i, color: '', alt: '', sample: false } : i);
  function photoSet(p, color) {
    const imgs = (p.images || []).map(asImage).filter((i) => i && i.src);
    if (!imgs.length) return { list: [], exact: true, shownColor: '' };
    const names = (p.colors || []).map((c) => c.name);
    if (!color) color = names.find((n) => imgs.some((i) => i.color === n)) || '';
    const own = imgs.filter((i) => i.color && i.color === color);
    const shared = imgs.filter((i) => !i.color);
    if (own.length || shared.length) return { list: own.concat(shared), exact: true, shownColor: color };
    const other = imgs[0].color;
    return { list: imgs.filter((i) => i.color === other), exact: false, shownColor: other };
  }
  const photosFor = (p, color) => photoSet(p, color).list.map((i) => i.src);
  const hasPhotos = (p, color) => (p.images || []).map(asImage).some((i) => i.color === color);

  function placeholder(text) {
    return '<div class="ph" role="img" aria-label="Photograph coming soon"><span class="ph__mark" aria-hidden="true">B</span><span class="ph__text">' + (text || 'Photograph<br>coming soon') + '</span></div>';
  }
  /* an <img> whose file fails to load turns into the same neutral placeholder */
  function imgFail(img) {
    const t = document.createElement('template');
    t.innerHTML = placeholder();
    img.replaceWith(t.content.firstChild);
  }
  function productMedia(p, o) {
    o = o || {};
    const set = photoSet(p, o.color);
    if (!set.list.length) return placeholder();
    const im = set.list[(o.view || 0) % set.list.length];
    const alt = o.label == null ? (im.alt || p.name + (set.shownColor ? ' in ' + set.shownColor : '')) : o.label;
    return '<img src="' + esc(im.src) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async" onerror="UI.imgFail(this)">';
  }
  function priceHtml(p, lg) {
    const eff = p.salePrice || p.price;
    return '<span class="price' + (p.salePrice ? ' price--sale' : '') + (lg ? ' price--lg' : '') + '">' + money(eff) + '</span>' +
      (p.salePrice ? '<span class="price__was"><span class="sr-only">Was </span>' + money(p.price) + '</span>' : '');
  }
  function dots(colors, max) {
    max = max || 5;
    return '<span class="dots" aria-label="' + esc(colors.map((c) => c.name).join(', ')) + '">' + colors.slice(0, max).map((c) => '<span class="dot-swatch" style="background:' + esc(c.hex) + '"></span>').join('') + (colors.length > max ? '<span class="xs muted">+' + (colors.length - max) + '</span>' : '') + '</span>';
  }
  function etaRange(order) {
    const s = api.settingsPublic();
    const fmt = (d) => d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
    let a, b;
    if (order && order.etaFrom) { a = new Date(order.etaFrom); b = new Date(order.etaTo); }
    else { const t = Date.now(); a = new Date(t + s.etaMinDays * 86400000); b = new Date(t + s.etaMaxDays * 86400000); }
    return fmt(a) + ' – ' + fmt(b);
  }

  const recent = {
    key: 'bf_recent_v1',
    get() { try { return JSON.parse(localStorage.getItem(this.key)) || []; } catch (e) { return []; } },
    push(slug) { try { const l = this.get().filter((s) => s !== slug); l.unshift(slug); localStorage.setItem(this.key, JSON.stringify(l.slice(0, 8))); } catch (e) { /* storage unavailable */ } }
  };

  function downloadCsv(name, rows) {
    const csv = rows.map((r) => r.map((c) => { const s = String(c == null ? '' : c); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function resizeImage(file, maxSide) {
    return new Promise((resolve, reject) => {
      if (!/^image\//.test(file.type)) { reject(new root.BF.BFError('VALIDATION', 'Please choose an image file.')); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(new root.BF.BFError('VALIDATION', 'Could not read that image.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new root.BF.BFError('VALIDATION', 'That image could not be opened.'));
        img.onload = () => {
          const k = Math.min(1, maxSide / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  const UI = {
    esc, $, $$, ICON, parseHash, qs, nav, toast, fail, errMsg, openModal, closeModal, confirmDialog, openDrawer, closeDrawer, refreshDrawer, drawerOpen,
    actions, forms, changes, inputs, field, showFieldErrors, formValues, setBusy, statusBadge, payBadge, productMedia, photosFor, photoSet, hasPhotos, placeholder, imgFail, priceHtml, dots, etaRange, recent, downloadCsv, resizeImage,
    views: {}, rerender() { /* replaced by app.js */ }, drawerHtml() { return ''; }, fmtDate, fmtDateTime, money
  };
  root.UI = UI;
})(window);

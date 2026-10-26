/* BoutiqueFlow — data layer and business rules.

   This file plays the role of the Zoho Creator back end in the prototype:
   tables mirror the Creator forms, every mutating function re-validates its
   input and re-checks the caller's role (never trusting the UI), and stock
   changes go through one idempotent path. Persistence is localStorage, so this
   is a demo: real enforcement comes from Creator profiles/permissions (see
   zoho-creator/). Nothing here talks to a payment gateway or sends email. */
(function (root) {
  'use strict';

  const Seed = root.BFSeed;
  const DB_KEY = 'bf_db_v1';
  const SESSION_KEY = 'bf_session_v1';
  const DAY = 86400000;

  const STATUS_FLOW = ['Confirmed', 'Packed', 'Shipped', 'Delivered'];
  const CANCELLABLE = ['Pending Payment', 'Confirmed', 'Packed'];
  const PAYMENT_METHODS = { COD: 'Cash on Delivery', SIMULATED: 'Card / UPI (simulated)' };

  class BFError extends Error {
    constructor(code, message, extra) {
      super(message);
      this.name = 'BFError';
      this.code = code;
      if (extra) Object.assign(this, extra);
    }
  }

  /* ---------- storage ---------- */
  const memStore = {};
  function lsGet(k) {
    try { if (root.localStorage) return root.localStorage.getItem(k); } catch (e) { /* fall through */ }
    return memStore[k] === undefined ? null : memStore[k];
  }
  function lsSet(k, v) {
    let ls = null;
    try { ls = root.localStorage; } catch (e) { /* unavailable */ }
    if (!ls) { memStore[k] = v; return; }
    try { ls.setItem(k, v); } catch (e) {
      throw new BFError('STORAGE_FULL', 'Browser storage is full. Remove large product images and try again.');
    }
  }

  /* ---------- helpers ---------- */
  let db = null;
  let session = { userId: null, cartId: null, guestOrders: [] };

  const nowIso = () => new Date().toISOString();
  const round = (n) => Math.round(n);
  const nextId = (prefix) => { db.counters.seq += 1; return prefix + db.counters.seq; };
  const lc = (s) => String(s || '').trim().toLowerCase();
  const byId = (arr, id) => arr.find((x) => x.id === id) || null;
  const pad = (n, w) => String(n).padStart(w, '0');
  const dkey = (d) => { const x = new Date(d); return x.getFullYear() + '-' + pad(x.getMonth() + 1, 2) + '-' + pad(x.getDate(), 2); };
  const mkey = (d) => { const x = new Date(d); return x.getFullYear() + '-' + pad(x.getMonth() + 1, 2); };
  const slugify = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const money = (n) => '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtDate = (iso) => { const d = new Date(iso); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };
  const fmtTime = (iso) => { const d = new Date(iso); return pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2); };
  const fmtDateTime = (iso) => fmtDate(iso) + ', ' + fmtTime(iso);

  function rng(seed) {
    let s = seed >>> 0;
    return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }

  const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());
  const normPhone = (s) => String(s || '').replace(/[\s-]/g, '').replace(/^\+?91/, '');
  const isPhone = (s) => /^[6-9]\d{9}$/.test(normPhone(s));
  const isPin = (s) => /^\d{6}$/.test(String(s || '').trim());

  function save() { lsSet(DB_KEY, JSON.stringify(db)); }
  function saveSession() { lsSet(SESSION_KEY, JSON.stringify(session)); }

  /* ---------- seeding ---------- */
  function emptyDb() {
    return {
      v: 5, // 5: Lehengas and Ethnic Sets categories, wishlist; 4: filter attributes (style, material, pattern…); 3: photo set updated; 2: images are records ({src,color,alt,sample})
      counters: { seq: 0, order: 1000 },
      settings: { lowStockThreshold: 5, deliveryFee: 150, freeDeliveryOver: 3000, etaMinDays: 3, etaMaxDays: 6 },
      users: [], addresses: [], categories: [], products: [], variants: [], carts: [],
      orders: [], orderItems: [], payments: [], movements: [], notifications: [], promos: []
    };
  }

  function buildSeed() {
    db = emptyDb();
    const rand = rng(26102026);
    const nowMs = Date.now();
    const iso = (ms) => new Date(ms).toISOString();

    // users
    const addUser = (u) => {
      const user = Object.assign({ id: nextId('u'), password: 'demo1234', active: true, permissions: { products: false, fulfilment: false }, created: iso(nowMs - 60 * DAY) }, u);
      db.users.push(user);
      return user;
    };
    addUser({ name: 'Anjali Rao', email: 'admin@boutiqueflow.demo', phone: '9840011223', role: 'Admin', permissions: { products: true, fulfilment: true } });
    addUser({ name: 'Karthik Menon', email: 'staff@boutiqueflow.demo', phone: '9840022334', role: 'Staff', permissions: { products: true, fulfilment: true } });
    addUser({ name: 'Divya Nair', email: 'fulfilment@boutiqueflow.demo', phone: '9840033445', role: 'Staff', permissions: { products: false, fulfilment: true } });
    Seed.CUSTOMERS.forEach((c) => {
      const u = addUser({ name: c.name, email: c.email, phone: c.phone, role: 'Customer' });
      db.addresses.push({ id: nextId('a'), userId: u.id, label: 'Home', name: c.name, phone: c.phone, line1: c.line1, line2: '', city: c.city, state: c.state, pincode: c.pin, isDefault: true });
    });

    Seed.PROMOS.forEach((p) => db.promos.push(Object.assign({ id: nextId('pr') }, p)));

    // categories + products + variants
    Seed.CATEGORIES.forEach((c) => db.categories.push({ id: nextId('c'), slug: c.slug, name: c.name, tagline: c.tagline }));
    const catPrefix = { sarees: 'SAR', kurtis: 'KUR', dresses: 'DRS', lehengas: 'LEH', 'ethnic-sets': 'ESE', tops: 'TOP', accessories: 'ACC' };
    const catCount = {};
    Seed.PRODUCTS.forEach((s) => {
      const cat = db.categories.find((c) => c.slug === s.cat);
      catCount[s.cat] = (catCount[s.cat] || 0) + 1;
      const created = nowMs - s.ageDays * DAY;
      const product = {
        id: nextId('p'), slug: s.slug, name: s.name, categoryId: cat.id, description: s.desc, fabric: s.fabric,
        care: Seed.CARE[s.care].slice(), price: s.price, salePrice: s.sale, active: true, created: iso(created),
        popularityBase: s.pop, featured: !!s.featured,
        colors: s.colors.map((n) => ({ name: n, hex: Seed.COLORS[n] })), sizes: s.sizes.slice(), images: seedImages(s.slug)
      };
      Object.assign(product, seedAttrs(s.slug));
      db.products.push(product);
      const base = catPrefix[s.cat] + pad(catCount[s.cat], 2);
      product.colors.forEach((c) => product.sizes.forEach((size) => {
        const stock = 8 + Math.floor(rand() * 13);
        const v = { id: nextId('v'), productId: product.id, color: c.name, size, sku: skuFor(base, c.name, size), stock: 0, active: true, lowStockAlerted: false };
        db.variants.push(v);
        recordMovement(v, product, 'Opening Stock', stock, 'Initial inventory', null, 'System', iso(created));
        v.stock = stock;
      }));
    });

    // historical orders — pushed through the same code paths as live checkout
    const customers = db.users.filter((u) => u.role === 'Customer');
    const demo = customers[0];
    const weights = db.products.map((p) => p.popularityBase);
    const totalW = weights.reduce((a, b) => a + b, 0);
    const pickProduct = () => { let r = rand() * totalW; for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return db.products[i]; } return db.products[0]; };
    const ages = [];
    for (let i = 0; i < 64; i++) ages.push((0.15 + rand() * 29.7) * DAY);
    ages.sort((a, b) => b - a);
    ages.forEach((age, idx) => {
      const at = nowMs - age;
      const ageDays = age / DAY;
      const user = rand() < 0.3 ? demo : customers[Math.floor(rand() * customers.length)];
      const addr = db.addresses.find((a) => a.userId === user.id);
      const lines = [];
      const nItems = rand() < 0.65 ? 1 : rand() < 0.7 ? 2 : 3;
      for (let k = 0; k < nItems; k++) {
        const p = pickProduct();
        const vs = db.variants.filter((v) => v.productId === p.id && v.active && v.stock > 3);
        if (!vs.length) continue;
        const v = vs[Math.floor(rand() * vs.length)];
        if (lines.some((l) => l.variant.id === v.id)) continue;
        lines.push({ variant: v, product: p, qty: rand() < 0.85 ? 1 : 2, unitPrice: effectivePrice(p) });
      }
      if (!lines.length) return;
      const method = rand() < 0.6 ? 'COD' : 'SIMULATED';
      const promo = rand() < 0.15 ? 'WELCOME10' : '';
      const recent = ageDays < 0.6 && method === 'SIMULATED' && idx === ages.length - 1;
      const order = buildOrder({ user, contact: { name: user.name, email: user.email, phone: user.phone }, address: addr, lines, method, promoCode: promo, at });
      if (recent) return; // leave the newest simulated order awaiting payment

      let t = at + 4 * 60000;
      if (method === 'SIMULATED') markPaid(order, t, 'SIM-' + (100000 + Math.floor(rand() * 899999)), 'System');
      confirmOrder(order, { at: t, by: 'System', silent: ageDays > 2 });
      const r = rand();
      let target;
      if (ageDays > 14) target = r < 0.88 ? 'Delivered' : 'Cancelled';
      else if (ageDays > 8) target = r < 0.55 ? 'Delivered' : r < 0.9 ? 'Shipped' : 'Cancelled';
      else if (ageDays > 4) target = r < 0.3 ? 'Delivered' : r < 0.65 ? 'Shipped' : r < 0.92 ? 'Packed' : 'Cancelled';
      else if (ageDays > 1.5) target = r < 0.4 ? 'Packed' : r < 0.95 ? 'Confirmed' : 'Cancelled';
      else target = 'Confirmed';
      const clamp = (x) => Math.min(x, nowMs - 60000);
      if (target === 'Cancelled') {
        t = clamp(at + (0.4 + rand()) * DAY);
        cancelRecord(order, { at: t, by: user.name, reason: ['Changed my mind', 'Ordered the wrong size', 'Found a better price elsewhere'][Math.floor(rand() * 3)], silent: true });
        return;
      }
      const steps = { Packed: 1, Shipped: 2, Delivered: 4.5 };
      STATUS_FLOW.slice(1).forEach((st) => {
        if (STATUS_FLOW.indexOf(st) > STATUS_FLOW.indexOf(target)) return;
        t = clamp(Math.max(t + 60000, at + steps[st] * DAY));
        applyStatus(order, st, { at: t, by: 'Karthik Menon', trackingNo: st === 'Shipped' ? 'BD' + (700000000 + Math.floor(rand() * 99999999)) : '', courier: 'BlueDart', silent: ageDays > 2 });
      });
    });

    // force a few low / sold-out variants so those states are visible
    const force = [['mahika-kanchipuram-silk-saree', 'Emerald', 'Free Size', 0], ['soiree-satin-midi-dress', 'Midnight', 'M', 0],
      ['anaya-chikankari-kurti', 'Blush', 'S', 2], ['gold-plated-jhumka-earrings', 'Rose Gold', 'One Size', 3],
      ['crepe-wrap-dress', 'Plum', 'XS', 1], ['silk-charmeuse-camisole', 'Champagne', 'L', 0]];
    force.forEach(([slug, color, size, qty]) => {
      const p = db.products.find((x) => x.slug === slug);
      const v = db.variants.find((x) => x.productId === p.id && x.color === color && x.size === size);
      if (!v) return;
      setStock(v, p, qty, 'Adjustment', 'Cycle count correction', 'Karthik Menon', iso(nowMs - 3600000));
    });
    // a mature database has no stale unread alerts for old low-stock events beyond these
    db.notifications = db.notifications.filter((n) => n.type !== 'Low stock' || n.at > iso(nowMs - 2 * DAY));
    save();
  }

  /* Image records live on each product: [{ src, color, alt, sample }].
     src = uploaded data URL, https link, or a file under assets/. color = '' (every colour) or a colour name.
     sample = true marks a stand-in photograph that does NOT show the actual item (shown with a label).
     Seed photographs come from assets/products/manifest.js (built by tools/build-photo-manifest.js). */
  const ATTR_KEYS = ['style', 'length', 'silhouette', 'pattern', 'material', 'neckline', 'sleeve', 'embellishment'];
  function seedAttrs(slug) {
    const a = (Seed.ATTRS || {})[slug] || {}, o = {};
    ATTR_KEYS.forEach((k) => { o[k] = a[k] || ''; });
    o.features = (a.features || []).slice();
    return o;
  }
  function seedImages(slug) {
    const m = root.BF_PHOTOS && root.BF_PHOTOS[slug];
    if (!m) return [];
    const out = [];
    Object.keys(m.colors || {}).forEach((c) => m.colors[c].forEach((src) => out.push({ src, color: c, alt: '', sample: true })));
    (m.shared || []).forEach((src) => out.push({ src, color: '', alt: '', sample: true }));
    return out;
  }

  function skuFor(base, color, size) {
    const c = color.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
    const s = size === 'One Size' ? 'OS' : size === 'Free Size' ? 'FS' : size.toUpperCase();
    return base + '-' + c + '-' + s;
  }

  function load() {
    let parsed = null;
    try { const raw = lsGet(DB_KEY); if (raw) parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    if (parsed && parsed.v === 5) db = parsed; else buildSeed();
    try { const s = lsGet(SESSION_KEY); if (s) session = Object.assign({ userId: null, cartId: null, guestOrders: [] }, JSON.parse(s)); } catch (e) { /* ignore */ }
    if (session.userId && !byId(db.users, session.userId)) session.userId = null;
  }

  /* ---------- pricing ---------- */
  function effectivePrice(p) { return p.salePrice && p.salePrice < p.price ? p.salePrice : p.price; }

  function findPromo(code) { return db.promos.find((p) => lc(p.code) === lc(code)) || null; }

  function computeTotals(lines, promoCode) {
    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
    let discount = 0;
    const promo = { code: '', applied: false, message: '' };
    if (promoCode) {
      const p = findPromo(promoCode);
      if (!p || !p.active) promo.message = 'That code is not valid.';
      else if (subtotal < p.min) promo.message = 'This code needs a minimum order of ' + money(p.min) + '.';
      else {
        discount = p.type === 'percent' ? round(subtotal * p.value / 100) : p.value;
        if (p.cap) discount = Math.min(discount, p.cap);
        discount = Math.min(discount, subtotal);
        promo.code = p.code; promo.applied = true; promo.message = p.code + ' applied.';
      }
    }
    const after = subtotal - discount;
    const delivery = subtotal === 0 || after >= db.settings.freeDeliveryOver ? 0 : db.settings.deliveryFee;
    return { subtotal, discount, delivery, total: after + delivery, promo, count: lines.reduce((s, l) => s + l.qty, 0) };
  }

  /* ---------- inventory ---------- */
  function recordMovement(v, product, type, qty, reason, orderNo, by, at) {
    db.movements.push({
      id: nextId('m'), variantId: v.id, productId: product.id, productName: product.name, sku: v.sku,
      variantLabel: v.color + ' / ' + v.size, type, qty, balance: (v.stock || 0) + qty, reason: reason || '', orderNo: orderNo || '', by: by || 'System', at: at || nowIso()
    });
  }

  function setStock(v, product, newQty, type, reason, by, at) {
    const delta = newQty - v.stock;
    if (delta === 0) return;
    recordMovement(v, product, type, delta, reason, '', by, at);
    v.stock = newQty;
    checkLowStock(v, product, { at });
  }

  function checkLowStock(v, product, ctx) {
    const th = db.settings.lowStockThreshold;
    if (v.stock <= th && v.active) {
      if (!v.lowStockAlerted) {
        v.lowStockAlerted = true;
        notify({
          audience: 'Staff', type: 'Low stock', at: ctx && ctx.at,
          title: v.stock === 0 ? 'Sold out: ' + product.name : 'Low stock: ' + product.name,
          body: v.color + ' / ' + v.size + ' (' + v.sku + ') has ' + v.stock + ' left. Threshold is ' + th + '.'
        });
      }
    } else if (v.stock > th) v.lowStockAlerted = false;
  }

  function notify(n) {
    db.notifications.push(Object.assign({ id: nextId('n'), userId: null, email: '', orderNo: '', read: false, channel: 'In-app', at: nowIso() }, n, { at: n.at || nowIso() }));
  }

  /* ---------- orders (internal) ---------- */
  function nextOrderNo(at) {
    let no;
    do {
      db.counters.order += 1;
      const d = new Date(at);
      no = 'BF-' + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1, 2) + pad(d.getDate(), 2) + '-' + db.counters.order;
    } while (db.orders.some((o) => o.orderNo === no));
    return no;
  }

  function logHistory(order, status, at, by, note) {
    order.history.push({ status, at: typeof at === 'number' ? new Date(at).toISOString() : at, by: by || 'System', note: note || '' });
  }

  function buildOrder({ user, contact, address, lines, method, promoCode, at }) {
    const atIso = typeof at === 'number' ? new Date(at).toISOString() : at;
    const totals = computeTotals(lines, promoCode);
    const order = {
      id: nextId('o'), orderNo: nextOrderNo(at), userId: user ? user.id : null,
      customerName: contact.name, email: lc(contact.email), phone: normPhone(contact.phone),
      address: { name: contact.name, phone: normPhone(contact.phone), line1: address.line1, line2: address.line2 || '', city: address.city, state: address.state, pincode: address.pincode },
      status: 'Pending Payment', paymentMethod: method, paymentStatus: 'Pending',
      subtotal: totals.subtotal, discount: totals.discount, promoCode: totals.promo.applied ? totals.promo.code : '',
      deliveryFee: totals.delivery, total: totals.total, created: atIso,
      stockDeducted: false, stockRestored: false, cancelReason: '', trackingNo: '', courier: '', etaFrom: '', etaTo: '', history: []
    };
    logHistory(order, 'Order placed', atIso, contact.name);
    db.orders.push(order);
    lines.forEach((l) => {
      const cat = byId(db.categories, l.product.categoryId);
      db.orderItems.push({
        id: nextId('oi'), orderId: order.id, productId: l.product.id, variantId: l.variant.id,
        productName: l.product.name, categoryName: cat ? cat.name : '', size: l.variant.size, color: l.variant.color, sku: l.variant.sku,
        listPrice: l.product.price, unitPrice: l.unitPrice, qty: l.qty, lineTotal: l.unitPrice * l.qty
      });
    });
    db.payments.push({ id: nextId('pay'), orderId: order.id, orderNo: order.orderNo, method, amount: order.total, status: 'Pending', reference: '', at: atIso });
    return order;
  }

  function paymentOf(order) { return db.payments.find((p) => p.orderId === order.id) || null; }
  function itemsOf(order) { return db.orderItems.filter((i) => i.orderId === order.id); }

  function markPaid(order, at, reference, by) {
    const pay = paymentOf(order);
    if (pay && pay.status === 'Paid') return;
    order.paymentStatus = 'Paid';
    if (pay) { pay.status = 'Paid'; pay.reference = reference || pay.reference; pay.at = typeof at === 'number' ? new Date(at).toISOString() : (at || nowIso()); }
    logHistory(order, 'Payment received', at || nowIso(), by || 'System', reference ? 'Ref ' + reference : '');
  }

  /* Idempotent: running this twice for the same order deducts stock once. */
  function confirmOrder(order, ctx) {
    ctx = ctx || {};
    if (order.stockDeducted) return order;
    if (order.status === 'Cancelled') throw new BFError('INVALID_STATE', 'This order has been cancelled.');
    const items = itemsOf(order);
    const issues = [];
    items.forEach((it) => {
      const v = byId(db.variants, it.variantId);
      if (!v || !v.active || v.stock < it.qty) issues.push(it.productName + ' (' + it.color + ' / ' + it.size + ') ' + (v && v.stock > 0 ? 'only ' + v.stock + ' left' : 'is sold out'));
    });
    if (issues.length) throw new BFError('STOCK', 'Some items are no longer available: ' + issues.join('; ') + '.', { issues });
    const at = ctx.at || nowIso();
    items.forEach((it) => {
      const v = byId(db.variants, it.variantId);
      const p = byId(db.products, it.productId);
      recordMovement(v, p, 'Sale', -it.qty, 'Order confirmed', order.orderNo, 'System', typeof at === 'number' ? new Date(at).toISOString() : at);
      v.stock -= it.qty;
      checkLowStock(v, p, { at: typeof at === 'number' ? new Date(at).toISOString() : at });
    });
    order.stockDeducted = true;
    order.status = 'Confirmed';
    const base = typeof at === 'number' ? at : new Date(at).getTime();
    order.etaFrom = new Date(base + db.settings.etaMinDays * DAY).toISOString();
    order.etaTo = new Date(base + db.settings.etaMaxDays * DAY).toISOString();
    logHistory(order, 'Confirmed', at, ctx.by || 'System');
    if (!ctx.silent) {
      notify({ audience: 'Customer', userId: order.userId, email: order.email, orderNo: order.orderNo, type: 'Order confirmed', channel: 'Email (simulated)', at: typeof at === 'number' ? new Date(at).toISOString() : at,
        title: 'Order ' + order.orderNo + ' confirmed', body: 'Thank you, ' + order.customerName.split(' ')[0] + '. We will let you know when it ships.' });
      notify({ audience: 'Staff', orderNo: order.orderNo, type: 'New order', at: typeof at === 'number' ? new Date(at).toISOString() : at,
        title: 'New order ' + order.orderNo, body: order.customerName + ' · ' + money(order.total) + ' · ' + PAYMENT_METHODS[order.paymentMethod] });
    }
    return order;
  }

  /* Idempotent: restores stock once, and only if it was deducted. */
  function cancelRecord(order, ctx) {
    if (order.status === 'Cancelled') return order;
    let restored = false;
    if (order.stockDeducted && !order.stockRestored) {
      const at = ctx.at ? (typeof ctx.at === 'number' ? new Date(ctx.at).toISOString() : ctx.at) : nowIso();
      itemsOf(order).forEach((it) => {
        const v = byId(db.variants, it.variantId);
        const p = byId(db.products, it.productId);
        if (!v) return;
        recordMovement(v, p, 'Cancellation Restock', it.qty, 'Order cancelled', order.orderNo, ctx.by || 'System', at);
        v.stock += it.qty;
        checkLowStock(v, p, { at });
      });
      order.stockRestored = true;
      restored = true;
    }
    const pay = paymentOf(order);
    if (order.paymentStatus === 'Paid') { order.paymentStatus = 'Refund Pending'; if (pay) pay.status = 'Refund Pending'; }
    else { order.paymentStatus = 'Cancelled'; if (pay) pay.status = 'Cancelled'; }
    order.status = 'Cancelled';
    order.cancelReason = ctx.reason || '';
    logHistory(order, 'Cancelled', ctx.at || nowIso(), ctx.by, (ctx.reason || '') + (restored ? ' · stock restored' : ''));
    if (!ctx.silent) {
      notify({ audience: 'Customer', userId: order.userId, email: order.email, orderNo: order.orderNo, type: 'Order cancelled', channel: 'Email (simulated)',
        title: 'Order ' + order.orderNo + ' cancelled', body: order.paymentStatus === 'Refund Pending' ? 'Your refund will be processed to the original payment method.' : 'No payment was taken.' });
      notify({ audience: 'Staff', orderNo: order.orderNo, type: 'Order cancelled', title: 'Order ' + order.orderNo + ' cancelled', body: (ctx.reason || 'No reason given') + (restored ? ' · stock restored' : '') });
    }
    return order;
  }

  function applyStatus(order, status, ctx) {
    const idx = STATUS_FLOW.indexOf(status);
    const cur = STATUS_FLOW.indexOf(order.status);
    if (idx < 0 || cur < 0 || idx !== cur + 1) throw new BFError('INVALID_TRANSITION', 'An order in "' + order.status + '" cannot move to "' + status + '".');
    order.status = status;
    if (status === 'Shipped') { order.trackingNo = ctx.trackingNo || ''; order.courier = ctx.courier || ''; }
    let note = '';
    if (status === 'Shipped' && order.trackingNo) note = (order.courier || 'Courier') + ' · ' + order.trackingNo;
    logHistory(order, status, ctx.at || nowIso(), ctx.by, note);
    if (status === 'Delivered' && order.paymentMethod === 'COD' && order.paymentStatus !== 'Paid') markPaid(order, ctx.at || nowIso(), 'COD cash collected', ctx.by);
    if (!ctx.silent && (status === 'Shipped' || status === 'Delivered' || status === 'Packed')) {
      const msg = { Packed: 'Your order has been packed and will be handed to the courier shortly.',
        Shipped: 'Your order is on its way' + (order.trackingNo ? ' with ' + (order.courier || 'our courier') + ' (tracking ' + order.trackingNo + ').' : '.'),
        Delivered: 'Your order has been delivered. We hope you love it.' }[status];
      notify({ audience: 'Customer', userId: order.userId, email: order.email, orderNo: order.orderNo, type: 'Order ' + status.toLowerCase(), channel: status === 'Packed' ? 'In-app' : 'Email (simulated)',
        title: 'Order ' + order.orderNo + ' ' + status.toLowerCase(), body: msg, at: ctx.at ? (typeof ctx.at === 'number' ? new Date(ctx.at).toISOString() : ctx.at) : undefined });
    }
    return order;
  }

  /* ---------- auth / permissions ---------- */
  function me() {
    const u = session.userId ? byId(db.users, session.userId) : null;
    return u && u.active ? u : null;
  }
  function publicUser(u) {
    if (!u) return null;
    return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, permissions: Object.assign({}, u.permissions), active: u.active };
  }
  function requireUser() { const u = me(); if (!u) throw new BFError('UNAUTHENTICATED', 'Please sign in to continue.'); return u; }
  function requireStaff(perm) {
    const u = requireUser();
    if (u.role === 'Admin') return u;
    if (u.role === 'Staff' && (!perm || (u.permissions && u.permissions[perm]))) return u;
    throw new BFError('FORBIDDEN', 'You do not have permission to do that.');
  }
  function requireAdmin() {
    const u = requireUser();
    if (u.role !== 'Admin') throw new BFError('FORBIDDEN', 'Only administrators can do that.');
    return u;
  }
  function canAccessOrder(order) {
    const u = me();
    if (u && (u.role === 'Admin' || (u.role === 'Staff' && u.permissions.fulfilment))) return true;
    if (u && order.userId && order.userId === u.id) return true;
    return (session.guestOrders || []).includes(order.id);
  }
  function remember(order) {
    if (!order.userId || !me() || order.userId !== me().id) {
      session.guestOrders = session.guestOrders || [];
      if (!session.guestOrders.includes(order.id)) { session.guestOrders.push(order.id); saveSession(); }
    }
  }

  function decorateOrder(o) {
    return Object.assign({}, o, { items: itemsOf(o), payment: paymentOf(o), history: o.history.slice() });
  }

  /* ---------- cart (internal) ---------- */
  function getCart(create) {
    let cart = session.cartId ? byId(db.carts, session.cartId) : null;
    if (!cart && create) {
      cart = { id: nextId('cart'), userId: session.userId || null, items: [], promo: '', updated: nowIso() };
      db.carts.push(cart);
      session.cartId = cart.id;
      saveSession();
    }
    return cart;
  }
  function cartLines(cart) {
    if (!cart) return [];
    return cart.items.map((it) => {
      const v = byId(db.variants, it.variantId);
      const p = v ? byId(db.products, v.productId) : null;
      const available = v && p && v.active && p.active ? v.stock : 0;
      let issue = '';
      if (!v || !p || !v.active || !p.active) issue = 'No longer available';
      else if (v.stock === 0) issue = 'Sold out';
      else if (it.qty > v.stock) issue = 'Only ' + v.stock + ' left';
      return { variantId: it.variantId, qty: it.qty, variant: v, product: p, unitPrice: p ? effectivePrice(p) : 0, listPrice: p ? p.price : 0, available, issue };
    }).filter((l) => l.variant && l.product);
  }

  /* ---------- public API ---------- */
  const api = {
    /* auth */
    currentUser() { return publicUser(me()); },
    login(email, password) {
      const u = db.users.find((x) => lc(x.email) === lc(email));
      if (!u || u.password !== password) throw new BFError('AUTH', 'That email and password do not match.');
      if (!u.active) throw new BFError('AUTH', 'This account has been deactivated. Please contact the boutique.');
      const guestCart = getCart(false);
      session.userId = u.id;
      // wishlist: merge what this browser saved as a guest into the account's list
      const merged = Array.from(new Set((u.wishlist || []).concat(session.wishlist || [])));
      u.wishlist = merged; session.wishlist = merged.slice();
      const own = db.carts.find((c) => c.userId === u.id && (!guestCart || c.id !== guestCart.id));
      if (guestCart && own) {
        guestCart.items.forEach((gi) => {
          const ex = own.items.find((i) => i.variantId === gi.variantId);
          const v = byId(db.variants, gi.variantId);
          const cap = v ? v.stock : 0;
          if (ex) ex.qty = Math.min(cap, ex.qty + gi.qty); else if (cap > 0) own.items.push({ variantId: gi.variantId, qty: Math.min(cap, gi.qty) });
        });
        db.carts = db.carts.filter((c) => c.id !== guestCart.id);
        session.cartId = own.id;
      } else if (guestCart) guestCart.userId = u.id;
      else if (own) session.cartId = own.id;
      saveSession(); save();
      return publicUser(u);
    },
    logout() { session.userId = null; session.cartId = null; session.wishlist = []; saveSession(); },
    register({ name, email, phone, password }) {
      const fields = {};
      if (String(name || '').trim().length < 2) fields.name = 'Please enter your full name.';
      if (!isEmail(email)) fields.email = 'Enter a valid email address.';
      if (phone && !isPhone(phone)) fields.phone = 'Enter a valid 10-digit mobile number.';
      if (String(password || '').length < 8) fields.password = 'Use at least 8 characters.';
      if (!fields.email && db.users.some((u) => lc(u.email) === lc(email))) fields.email = 'An account with this email already exists.';
      if (Object.keys(fields).length) throw new BFError('VALIDATION', 'Please correct the highlighted fields.', { fields });
      const u = { id: nextId('u'), name: name.trim(), email: lc(email), phone: normPhone(phone), password, role: 'Customer', active: true, permissions: { products: false, fulfilment: false }, created: nowIso() };
      db.users.push(u);
      save();
      return api.login(email, password);
    },

    /* catalogue (public) */
    categories() { return db.categories.map((c) => Object.assign({}, c, { count: db.products.filter((p) => p.categoryId === c.id && p.active).length })); },
    products(f) {
      f = f || {};
      const cats = db.categories;
      const sold = {};
      db.orderItems.forEach((it) => { const o = byId(db.orders, it.orderId); if (o && o.status !== 'Cancelled') sold[it.productId] = (sold[it.productId] || 0) + it.qty; });
      const q = lc(f.q);
      let list = db.products.filter((p) => p.active).map((p) => {
        const vs = db.variants.filter((v) => v.productId === p.id && v.active);
        const cat = byId(cats, p.categoryId);
        return {
          id: p.id, slug: p.slug, name: p.name, category: cat ? cat.slug : '', categoryName: cat ? cat.name : '', price: p.price, salePrice: p.salePrice && p.salePrice < p.price ? p.salePrice : null,
          effective: effectivePrice(p), colors: p.colors, sizes: p.sizes, created: p.created, featured: p.featured, images: p.images, description: p.description, fabric: p.fabric,
          totalStock: vs.reduce((s, v) => s + v.stock, 0), inStock: vs.some((v) => v.stock > 0), availableSizes: Array.from(new Set(vs.filter((v) => v.stock > 0).map((v) => v.size))), popularity: p.popularityBase + (sold[p.id] || 0) * 3, _vs: vs,
          style: p.style || '', length: p.length || '', silhouette: p.silhouette || '', pattern: p.pattern || '', material: p.material || '', neckline: p.neckline || '',
          sleeve: p.sleeve || '', embellishment: p.embellishment || '', features: p.features || []
        };
      });
      if (f.cat) list = list.filter((p) => p.category === f.cat);
      if (f.edit === 'featured') list = list.filter((p) => p.featured);
      if (q) list = list.filter((p) => (p.name + ' ' + p.categoryName + ' ' + p.fabric + ' ' + p.description + ' ' + p.style + ' ' + p.material + ' ' + p.pattern + ' ' + p.neckline + ' ' + p.features.join(' ') + ' ' + p.colors.map((c) => c.name).join(' ')).toLowerCase().includes(q));
      // attribute groups: any-of within a group, AND across groups (features: the piece must have every ticked feature)
      ATTR_KEYS.forEach((k) => { const want = String(f[k] || '').split(',').filter(Boolean); if (want.length) list = list.filter((p) => want.includes(p[k])); });
      const feats = String(f.feature || '').split(',').filter(Boolean);
      if (feats.length) list = list.filter((p) => feats.every((x) => p.features.includes(x)));
      const needStock = f.avail === 'in';
      // size / color accept one value or a comma-separated list (any of them); the two groups combine with AND
      const sizes = String(f.size || '').split(',').filter(Boolean), colors = String(f.color || '').split(',').filter(Boolean);
      if (f.sale) list = list.filter((p) => p.salePrice);
      if (sizes.length || colors.length) {
        list = list.filter((p) => p._vs.some((v) => (!sizes.length || sizes.includes(v.size)) && (!colors.length || colors.includes(v.color)) && (!needStock || v.stock > 0)));
      } else if (needStock) list = list.filter((p) => p.inStock);
      if (f.min) list = list.filter((p) => p.effective >= Number(f.min));
      if (f.max) list = list.filter((p) => p.effective <= Number(f.max));
      const sorters = {
        newest: (a, b) => new Date(b.created) - new Date(a.created),
        'price-asc': (a, b) => a.effective - b.effective,
        'price-desc': (a, b) => b.effective - a.effective,
        popular: (a, b) => b.popularity - a.popularity,
        // relevance: pieces matching the search words in their name/category first, then the most popular
        relevance: (a, b) => score(b) - score(a) || b.popularity - a.popularity
      };
      const score = (p) => (q ? (lc(p.name).includes(q) ? 4 : 0) + (lc(p.categoryName).includes(q) ? 2 : 0) + (lc(p.material + ' ' + p.pattern + ' ' + p.style).includes(q) ? 1 : 0) : 0);
      list.sort(sorters[f.sort] || sorters.newest);
      return list.map((p) => { const { _vs, ...rest } = p; return rest; });
    },
    product(slug) {
      const p = db.products.find((x) => x.slug === slug || x.id === slug);
      const staff = me() && (me().role === 'Admin' || (me().role === 'Staff' && me().permissions.products));
      if (!p || (!p.active && !staff)) return null;
      const cat = byId(db.categories, p.categoryId);
      const variants = db.variants.filter((v) => v.productId === p.id && v.active).map((v) => ({ id: v.id, size: v.size, color: v.color, sku: v.sku, stock: v.stock }));
      return Object.assign({}, p, { category: cat ? cat.slug : '', categoryName: cat ? cat.name : '', effective: effectivePrice(p), salePrice: p.salePrice && p.salePrice < p.price ? p.salePrice : null, variants,
        inStock: variants.some((v) => v.stock > 0), lowStockThreshold: db.settings.lowStockThreshold });
    },
    /* wishlist: product ids saved in this browser; mirrored onto a signed-in customer's account so it follows them */
    wishlistIds() {
      session.wishlist = (session.wishlist || []).filter((id) => byId(db.products, id) && byId(db.products, id).active);
      return session.wishlist.slice();
    },
    wishlistToggle(productId) {
      const p = byId(db.products, productId);
      if (!p) throw new BFError('NOT_FOUND', 'Product not found.');
      const list = session.wishlist || [];
      const saved = !list.includes(productId);
      session.wishlist = saved ? list.concat(productId) : list.filter((id) => id !== productId);
      const u = me();
      if (u) { u.wishlist = session.wishlist.slice(); save(); }
      saveSession();
      return { saved, count: session.wishlist.length };
    },
    wishlistProducts() {
      const ids = api.wishlistIds();
      const all = api.products({});
      return ids.map((id) => all.find((p) => p.id === id)).filter(Boolean);
    },
    settingsPublic() { return { deliveryFee: db.settings.deliveryFee, freeDeliveryOver: db.settings.freeDeliveryOver, etaMinDays: db.settings.etaMinDays, etaMaxDays: db.settings.etaMaxDays }; },

    /* cart */
    cart() {
      const cart = getCart(false);
      const lines = cartLines(cart);
      const totals = computeTotals(lines, cart ? cart.promo : '');
      return { lines, totals, promo: cart ? cart.promo : '', hasIssues: lines.some((l) => l.issue) };
    },
    cartCount() { const c = getCart(false); return c ? c.items.reduce((s, i) => s + i.qty, 0) : 0; },
    cartAdd(variantId, qty) {
      qty = Math.floor(Number(qty) || 1);
      if (qty < 1) throw new BFError('VALIDATION', 'Quantity must be at least 1.');
      const v = byId(db.variants, variantId);
      const p = v ? byId(db.products, v.productId) : null;
      if (!v || !v.active || !p || !p.active) throw new BFError('UNAVAILABLE', 'This item is no longer available.');
      if (v.stock === 0) throw new BFError('STOCK', 'Sorry, this size and colour is sold out.');
      const cart = getCart(true);
      const ex = cart.items.find((i) => i.variantId === variantId);
      const want = (ex ? ex.qty : 0) + qty;
      if (want > v.stock) throw new BFError('STOCK', ex ? 'You already have ' + ex.qty + ' in your bag and only ' + v.stock + ' are available.' : 'Only ' + v.stock + ' available.');
      if (ex) ex.qty = want; else cart.items.push({ variantId, qty });
      cart.updated = nowIso();
      save();
      return api.cart();
    },
    cartSetQty(variantId, qty) {
      const cart = getCart(false);
      if (!cart) return api.cart();
      const it = cart.items.find((i) => i.variantId === variantId);
      if (!it) return api.cart();
      qty = Math.floor(Number(qty));
      if (!(qty >= 1)) throw new BFError('VALIDATION', 'Quantity must be at least 1.');
      const v = byId(db.variants, variantId);
      if (!v || qty > v.stock) throw new BFError('STOCK', v && v.stock ? 'Only ' + v.stock + ' available.' : 'This item is sold out.', { max: v ? v.stock : 0 });
      it.qty = qty; save();
      return api.cart();
    },
    cartRemove(variantId) {
      const cart = getCart(false);
      if (cart) { cart.items = cart.items.filter((i) => i.variantId !== variantId); save(); }
      return api.cart();
    },
    cartFixStock() {
      const cart = getCart(false);
      if (cart) {
        cart.items = cart.items.map((i) => { const v = byId(db.variants, i.variantId); return { variantId: i.variantId, qty: v ? Math.min(i.qty, v.stock) : 0 }; }).filter((i) => i.qty > 0);
        save();
      }
      return api.cart();
    },
    applyPromo(code) {
      const cart = getCart(true);
      const lines = cartLines(cart);
      if (!code) { cart.promo = ''; save(); return api.cart(); }
      const t = computeTotals(lines, code);
      if (!t.promo.applied) throw new BFError('PROMO', t.promo.message);
      cart.promo = t.promo.code; save();
      return api.cart();
    },

    /* checkout */
    /* Same rules placeOrder enforces; lets the Delivery step show errors before Review. */
    validateCheckout({ contact, address, method }) {
      contact = contact || {}; address = address || {};
      const fields = {};
      if (String(contact.name || '').trim().length < 2) fields.name = 'Please enter your full name.';
      if (!isEmail(contact.email)) fields.email = 'Enter a valid email address.';
      if (!isPhone(contact.phone)) fields.phone = 'Enter a valid 10-digit mobile number.';
      if (String(address.line1 || '').trim().length < 4) fields.line1 = 'Enter your street address.';
      if (String(address.city || '').trim().length < 2) fields.city = 'Enter your city.';
      if (String(address.state || '').trim().length < 2) fields.state = 'Enter your state.';
      if (!isPin(address.pincode)) fields.pincode = 'Enter a valid 6-digit PIN code.';
      if (!PAYMENT_METHODS[method]) fields.method = 'Choose a payment method.';
      return fields;
    },
    placeOrder({ contact, address, method, saveAddress }) {
      contact = contact || {}; address = address || {};
      const fields = api.validateCheckout({ contact, address, method });
      if (Object.keys(fields).length) throw new BFError('VALIDATION', 'Please correct the highlighted fields.', { fields });

      const cart = getCart(false);
      const lines = cartLines(cart);
      if (!lines.length) throw new BFError('EMPTY', 'Your bag is empty.');
      const issues = lines.filter((l) => l.issue).map((l) => l.product.name + ' (' + l.variant.color + ' / ' + l.variant.size + '): ' + l.issue.toLowerCase());
      if (issues.length) throw new BFError('STOCK', 'Please update your bag: ' + issues.join('; ') + '.', { issues });

      const user = me();
      const order = buildOrder({ user: user && user.role === 'Customer' ? user : null, contact: { name: contact.name.trim(), email: contact.email, phone: contact.phone }, address: {
        line1: address.line1.trim(), line2: (address.line2 || '').trim(), city: address.city.trim(), state: address.state.trim(), pincode: address.pincode.trim() }, lines, method, promoCode: cart.promo, at: Date.now() });
      try {
        if (method === 'COD') confirmOrder(order, { by: order.customerName });
      } catch (e) {
        // roll back the half-created order so no ghost record remains
        db.orders = db.orders.filter((o) => o.id !== order.id);
        db.orderItems = db.orderItems.filter((i) => i.orderId !== order.id);
        db.payments = db.payments.filter((p) => p.orderId !== order.id);
        throw e;
      }
      if (user && user.role === 'Customer' && saveAddress && !db.addresses.some((a) => a.userId === user.id && a.line1 === order.address.line1 && a.pincode === order.address.pincode)) {
        db.addresses.push({ id: nextId('a'), userId: user.id, label: 'Saved', name: order.customerName, phone: order.phone, line1: order.address.line1, line2: order.address.line2, city: order.address.city, state: order.address.state, pincode: order.address.pincode, isDefault: !db.addresses.some((a) => a.userId === user.id) });
      }
      cart.items = []; cart.promo = '';
      remember(order);
      save();
      return { order: decorateOrder(order), needsPayment: method === 'SIMULATED' };
    },
    completeSimulatedPayment(orderId, outcome) {
      const order = byId(db.orders, orderId);
      if (!order || !canAccessOrder(order)) throw new BFError('FORBIDDEN', 'Order not found.');
      if (order.paymentMethod !== 'SIMULATED') throw new BFError('INVALID_STATE', 'This order is not awaiting an online payment.');
      if (order.paymentStatus === 'Paid' && order.stockDeducted) return decorateOrder(order); // duplicate callback: no second deduction
      if (order.status === 'Cancelled') throw new BFError('INVALID_STATE', 'This order has been cancelled.');
      if (outcome === 'failed') {
        order.paymentStatus = 'Failed';
        const pay = paymentOf(order); if (pay) pay.status = 'Failed';
        logHistory(order, 'Payment failed', nowIso(), 'Simulated gateway');
        save();
        throw new BFError('PAYMENT', 'The simulated payment did not go through. You can try again.');
      }
      try {
        confirmOrder(order, { by: 'Simulated gateway' });
      } catch (e) {
        if (e.code === 'STOCK') { cancelRecord(order, { by: 'System', reason: 'Items sold out before payment completed', silent: false }); save(); }
        throw e;
      }
      markPaid(order, nowIso(), 'SIM-' + (100000 + Math.floor(Math.random() * 899999)), 'Simulated gateway');
      save();
      return decorateOrder(order);
    },

    /* customer orders / account */
    myOrders() {
      const u = requireUser();
      return db.orders.filter((o) => o.userId === u.id).sort((a, b) => new Date(b.created) - new Date(a.created)).map(decorateOrder);
    },
    order(orderNo) {
      const o = db.orders.find((x) => x.orderNo === orderNo);
      if (!o || !canAccessOrder(o)) return null;
      return decorateOrder(o);
    },
    trackOrder(orderNo, email) {
      const o = db.orders.find((x) => lc(x.orderNo) === lc(orderNo));
      if (!o || lc(o.email) !== lc(email)) throw new BFError('NOT_FOUND', 'We could not find an order with those details.');
      remember(o); save();
      return decorateOrder(o);
    },
    cancelOrder(orderId, reason) {
      const o = byId(db.orders, orderId);
      if (!o || !canAccessOrder(o)) throw new BFError('FORBIDDEN', 'Order not found.');
      if (!CANCELLABLE.includes(o.status)) throw new BFError('INVALID_STATE', o.status === 'Cancelled' ? 'This order is already cancelled.' : 'This order can no longer be cancelled because it has been ' + o.status.toLowerCase() + '.');
      const u = me();
      cancelRecord(o, { by: u ? u.name : o.customerName, reason: String(reason || '').trim() || 'No reason given' });
      save();
      return decorateOrder(o);
    },
    profile() { const u = requireUser(); return publicUser(u); },
    updateProfile({ name, phone }) {
      const u = requireUser();
      const fields = {};
      if (String(name || '').trim().length < 2) fields.name = 'Please enter your full name.';
      if (phone && !isPhone(phone)) fields.phone = 'Enter a valid 10-digit mobile number.';
      if (Object.keys(fields).length) throw new BFError('VALIDATION', 'Please correct the highlighted fields.', { fields });
      u.name = name.trim(); u.phone = normPhone(phone); save();
      return publicUser(u);
    },
    addresses() { const u = requireUser(); return db.addresses.filter((a) => a.userId === u.id); },
    saveAddress(a) {
      const u = requireUser();
      const fields = {};
      if (String(a.name || '').trim().length < 2) fields.name = 'Enter a name.';
      if (!isPhone(a.phone)) fields.phone = 'Enter a valid 10-digit mobile number.';
      if (String(a.line1 || '').trim().length < 4) fields.line1 = 'Enter your street address.';
      if (String(a.city || '').trim().length < 2) fields.city = 'Enter your city.';
      if (String(a.state || '').trim().length < 2) fields.state = 'Enter your state.';
      if (!isPin(a.pincode)) fields.pincode = 'Enter a valid 6-digit PIN code.';
      if (Object.keys(fields).length) throw new BFError('VALIDATION', 'Please correct the highlighted fields.', { fields });
      let rec = a.id ? db.addresses.find((x) => x.id === a.id) : null;
      if (a.id && (!rec || rec.userId !== u.id)) throw new BFError('FORBIDDEN', 'Address not found.');
      if (!rec) { rec = { id: nextId('a'), userId: u.id }; db.addresses.push(rec); }
      Object.assign(rec, { label: String(a.label || 'Home').trim() || 'Home', name: a.name.trim(), phone: normPhone(a.phone), line1: a.line1.trim(), line2: (a.line2 || '').trim(), city: a.city.trim(), state: a.state.trim(), pincode: a.pincode.trim() });
      const mine = db.addresses.filter((x) => x.userId === u.id);
      if (a.isDefault || mine.length === 1) mine.forEach((x) => { x.isDefault = x.id === rec.id; });
      save();
      return rec;
    },
    deleteAddress(id) {
      const u = requireUser();
      const rec = db.addresses.find((x) => x.id === id);
      if (!rec || rec.userId !== u.id) throw new BFError('FORBIDDEN', 'Address not found.');
      db.addresses = db.addresses.filter((x) => x.id !== id);
      const mine = db.addresses.filter((x) => x.userId === u.id);
      if (mine.length && !mine.some((x) => x.isDefault)) mine[0].isDefault = true;
      save();
    },
    myNotifications() {
      const u = requireUser();
      return db.notifications.filter((n) => n.audience === 'Customer' && n.userId === u.id).sort((a, b) => b.at.localeCompare(a.at));
    },

    /* staff: dashboard + orders */
    dashboard() {
      const u = requireStaff();
      const active = db.orders.filter((o) => o.status !== 'Cancelled');
      const today = dkey(new Date());
      const th = db.settings.lowStockThreshold;
      const low = db.variants.filter((v) => v.active && byId(db.products, v.productId).active && v.stock <= th).length;
      const out = {
        role: u.role,
        orders: db.orders.length, todayOrders: db.orders.filter((o) => dkey(o.created) === today).length,
        pending: db.orders.filter((o) => ['Confirmed', 'Packed'].includes(o.status)).length,
        awaitingPayment: db.orders.filter((o) => o.status === 'Pending Payment').length,
        lowStock: low, sales: null, monthSales: null
      };
      if (u.role === 'Admin') {
        out.sales = active.reduce((s, o) => s + o.total, 0);
        const m = mkey(new Date());
        out.monthSales = active.filter((o) => mkey(o.created) === m).reduce((s, o) => s + o.total, 0);
      }
      if (u.role === 'Admin' || u.permissions.fulfilment) out.recent = db.orders.slice().sort((a, b) => new Date(b.created) - new Date(a.created)).slice(0, 6).map(decorateOrder);
      return out;
    },
    adminOrders() {
      requireStaff('fulfilment');
      return db.orders.slice().sort((a, b) => new Date(b.created) - new Date(a.created)).map(decorateOrder);
    },
    updateOrderStatus(orderId, status, extra) {
      const u = requireStaff('fulfilment');
      const o = byId(db.orders, orderId);
      if (!o) throw new BFError('NOT_FOUND', 'Order not found.');
      applyStatus(o, status, { by: u.name, trackingNo: extra && extra.trackingNo, courier: extra && extra.courier });
      save();
      return decorateOrder(o);
    },
    markOrderPaid(orderId, reference) {
      const u = requireStaff('fulfilment');
      const o = byId(db.orders, orderId);
      if (!o) throw new BFError('NOT_FOUND', 'Order not found.');
      if (o.status === 'Cancelled') throw new BFError('INVALID_STATE', 'This order is cancelled.');
      if (o.paymentStatus === 'Paid') return decorateOrder(o);
      markPaid(o, nowIso(), reference || 'Manual', u.name);
      save();
      return decorateOrder(o);
    },

    /* staff: catalogue + inventory */
    adminProducts() {
      requireStaff('products');
      return db.products.map((p) => {
        const vs = db.variants.filter((v) => v.productId === p.id && v.active);
        const cat = byId(db.categories, p.categoryId);
        return { id: p.id, slug: p.slug, name: p.name, category: cat ? cat.name : '', price: p.price, salePrice: p.salePrice, active: p.active, stock: vs.reduce((s, v) => s + v.stock, 0),
          variants: vs.length, low: vs.filter((v) => v.stock <= db.settings.lowStockThreshold).length, images: p.images, colors: p.colors, created: p.created };
      }).sort((a, b) => new Date(b.created) - new Date(a.created));
    },
    adminProduct(id) {
      requireStaff('products');
      const p = byId(db.products, id);
      if (!p) return null;
      return Object.assign({}, p, { variants: db.variants.filter((v) => v.productId === id).map((v) => Object.assign({}, v)) });
    },
    saveProduct(input) {
      const u = requireStaff('products');
      const fields = {};
      const name = String(input.name || '').trim();
      const price = Number(input.price);
      const sale = input.salePrice === '' || input.salePrice == null ? null : Number(input.salePrice);
      if (name.length < 2) fields.name = 'Enter a product name.';
      if (!byId(db.categories, input.categoryId)) fields.categoryId = 'Choose a category.';
      if (!(price > 0)) fields.price = 'Enter a price above zero.';
      if (sale !== null && !(sale > 0 && sale < price)) fields.salePrice = 'Sale price must be above zero and below the regular price.';
      const colors = (input.colors || []).map((c) => ({ name: String(c.name || '').trim(), hex: /^#[0-9a-f]{6}$/i.test(c.hex) ? c.hex : '#B49A72' })).filter((c) => c.name);
      const sizes = Array.from(new Set((input.sizes || []).map((s) => String(s).trim()).filter(Boolean)));
      if (!colors.length) fields.colors = 'Add at least one colour.';
      if (new Set(colors.map((c) => lc(c.name))).size !== colors.length) fields.colors = 'Colour names must be unique.';
      if (!sizes.length) fields.sizes = 'Add at least one size.';
      const stock = input.stock || {};
      for (const c of colors) for (const s of sizes) {
        const n = Number(stock[c.name + '|' + s] || 0);
        if (!Number.isInteger(n) || n < 0) fields.stock = 'Stock must be a whole number, zero or more.';
      }
      let images = null;
      if (Array.isArray(input.images)) {
        images = [];
        for (const im of input.images.slice(0, 12)) {
          const o = typeof im === 'string' ? { src: im } : (im || {});
          const src = String(o.src || '').trim();
          if (!/^(data:image\/(jpeg|png|webp);base64,|https:\/\/|assets\/)/i.test(src)) { fields.images = 'Images must be uploaded files or https:// links.'; break; }
          images.push({ src, color: colors.some((c) => c.name === o.color) ? o.color : '', alt: String(o.alt || '').slice(0, 140), sample: !!o.sample });
        }
      }
      if (Object.keys(fields).length) throw new BFError('VALIDATION', 'Please correct the highlighted fields.', { fields });

      let p = input.id ? byId(db.products, input.id) : null;
      if (input.id && !p) throw new BFError('NOT_FOUND', 'Product not found.');
      const cat = byId(db.categories, input.categoryId);
      if (!p) {
        let slug = slugify(name), n = 2;
        while (db.products.some((x) => x.slug === slug)) slug = slugify(name) + '-' + n++;
        p = { id: nextId('p'), slug, created: nowIso(), popularityBase: 10, active: true, images: [] };
        db.products.push(p);
      }
      Object.assign(p, {
        name, categoryId: input.categoryId, description: String(input.description || '').trim(), fabric: String(input.fabric || '').trim(),
        care: String(input.care || '').split('\n').map((s) => s.trim()).filter(Boolean), price, salePrice: sale, featured: !!input.featured,
        colors, sizes, images: images || p.images
      });
      // filter attributes: only touched when the caller supplies them
      ATTR_KEYS.forEach((k) => { if (input[k] !== undefined) p[k] = String(input[k] || '').trim().slice(0, 40); else if (p[k] === undefined) p[k] = ''; });
      if (input.features !== undefined) p.features = (Array.isArray(input.features) ? input.features : String(input.features || '').split(',')).map((x) => String(x).trim()).filter(Boolean).slice(0, 12);
      else if (!Array.isArray(p.features)) p.features = [];
      if (input.active !== undefined) p.active = !!input.active;

      const known = db.variants.find((x) => x.productId === p.id);
      const base = known ? known.sku.split('-')[0] : catCodes(cat.slug) + pad(db.products.filter((x) => x.categoryId === p.categoryId).length, 2);
      const keep = new Set();
      colors.forEach((c) => sizes.forEach((s) => {
        let v = db.variants.find((x) => x.productId === p.id && x.color === c.name && x.size === s);
        const qty = Number(stock[c.name + '|' + s] || 0);
        if (!v) {
          let sku = skuFor(base, c.name, s), n = 2;
          while (db.variants.some((x) => x.sku === sku)) sku = skuFor(base, c.name, s) + n++;
          v = { id: nextId('v'), productId: p.id, color: c.name, size: s, sku, stock: 0, active: true, lowStockAlerted: false };
          db.variants.push(v);
          if (qty > 0) { recordMovement(v, p, 'Opening Stock', qty, 'Initial inventory', '', u.name); v.stock = qty; }
        } else {
          v.active = true;
          if (qty !== v.stock) setStock(v, p, qty, 'Adjustment', 'Edited in product form', u.name);
        }
        checkLowStock(v, p);
        keep.add(v.id);
      }));
      db.variants.filter((v) => v.productId === p.id && !keep.has(v.id)).forEach((v) => { v.active = false; });
      save();
      return api.adminProduct(p.id);
    },
    setProductActive(id, active) {
      requireStaff('products');
      const p = byId(db.products, id);
      if (!p) throw new BFError('NOT_FOUND', 'Product not found.');
      p.active = !!active; // carts keep their lines; cartLines() flags them as unavailable
      save();
      return true;
    },
    saveCategory({ id, name, tagline }) {
      requireStaff('products');
      name = String(name || '').trim();
      if (name.length < 2) throw new BFError('VALIDATION', 'Enter a category name.', { fields: { name: 'Enter a category name.' } });
      if (db.categories.some((c) => c.id !== id && lc(c.name) === lc(name))) throw new BFError('VALIDATION', 'That category already exists.', { fields: { name: 'That category already exists.' } });
      let c = id ? byId(db.categories, id) : null;
      if (!c) { c = { id: nextId('c'), slug: slugify(name) }; db.categories.push(c); }
      c.name = name; c.tagline = String(tagline || '').trim();
      save();
      return c;
    },
    inventory() {
      requireStaff('products');
      const th = db.settings.lowStockThreshold;
      return db.variants.filter((v) => v.active).map((v) => {
        const p = byId(db.products, v.productId);
        const cat = byId(db.categories, p.categoryId);
        return { id: v.id, productId: p.id, productName: p.name, productActive: p.active, category: cat ? cat.name : '', sku: v.sku, color: v.color, size: v.size, stock: v.stock, low: v.stock <= th, out: v.stock === 0 };
      }).sort((a, b) => a.stock - b.stock || a.productName.localeCompare(b.productName));
    },
    adjustStock(variantId, { mode, value, type, reason }) {
      const u = requireStaff('products');
      const v = byId(db.variants, variantId);
      if (!v) throw new BFError('NOT_FOUND', 'Variant not found.');
      const p = byId(db.products, v.productId);
      const n = Number(value);
      if (!Number.isInteger(n)) throw new BFError('VALIDATION', 'Enter a whole number.');
      const target = mode === 'set' ? n : v.stock + n;
      if (target < 0) throw new BFError('VALIDATION', 'Stock cannot go below zero.');
      if (target === v.stock) throw new BFError('VALIDATION', 'That is already the current stock level.');
      if (!['Restock', 'Adjustment', 'Damaged / Write-off'].includes(type)) type = 'Adjustment';
      setStock(v, p, target, type, String(reason || '').trim(), u.name);
      save();
      return v.stock;
    },
    movements(variantId) {
      requireStaff('products');
      return db.movements.filter((m) => !variantId || m.variantId === variantId).sort((a, b) => b.at.localeCompare(a.at) || (b.id > a.id ? 1 : -1));
    },

    /* staff: people + notifications */
    customers() {
      const u = requireStaff('fulfilment');
      const map = {};
      db.orders.forEach((o) => {
        const key = lc(o.email);
        const c = map[key] || (map[key] = { email: o.email, name: o.customerName, phone: o.phone, city: o.address.city, orders: 0, active: 0, lifetime: 0, last: o.created, guest: true });
        c.orders += 1;
        if (o.status !== 'Cancelled') { c.active += 1; c.lifetime += o.total; }
        if (o.created > c.last) { c.last = o.created; c.city = o.address.city; }
        if (o.userId) c.guest = false;
      });
      db.users.filter((x) => x.role === 'Customer').forEach((x) => {
        const c = map[lc(x.email)] || (map[lc(x.email)] = { email: x.email, name: x.name, phone: x.phone, city: '', orders: 0, active: 0, lifetime: 0, last: x.created, guest: false });
        c.name = x.name; c.guest = false;
      });
      return Object.values(map).map((c) => { if (u.role !== 'Admin') c.lifetime = null; return c; }).sort((a, b) => b.last.localeCompare(a.last));
    },
    staffList() {
      requireAdmin();
      return db.users.filter((u) => u.role !== 'Customer').map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, active: u.active, permissions: Object.assign({}, u.permissions) }));
    },
    saveStaff(s) {
      const admin = requireAdmin();
      const fields = {};
      if (String(s.name || '').trim().length < 2) fields.name = 'Enter a name.';
      if (!isEmail(s.email)) fields.email = 'Enter a valid email address.';
      if (db.users.some((u) => u.id !== s.id && lc(u.email) === lc(s.email))) fields.email = 'That email is already in use.';
      if (!s.id && String(s.password || '').length < 8) fields.password = 'Use at least 8 characters.';
      if (!['Staff', 'Admin'].includes(s.role)) fields.role = 'Choose a role.';
      if (Object.keys(fields).length) throw new BFError('VALIDATION', 'Please correct the highlighted fields.', { fields });
      let u = s.id ? byId(db.users, s.id) : null;
      if (s.id && (!u || u.role === 'Customer')) throw new BFError('NOT_FOUND', 'Staff member not found.');
      if (u && u.id === admin.id && (s.active === false || s.role !== 'Admin')) throw new BFError('INVALID_STATE', 'You cannot deactivate or demote your own account.');
      if (!u) { u = { id: nextId('u'), created: nowIso(), password: s.password }; db.users.push(u); }
      if (s.password) u.password = s.password;
      Object.assign(u, { name: s.name.trim(), email: lc(s.email), phone: normPhone(s.phone), role: s.role, active: s.active !== false,
        permissions: s.role === 'Admin' ? { products: true, fulfilment: true } : { products: !!(s.permissions && s.permissions.products), fulfilment: !!(s.permissions && s.permissions.fulfilment) } });
      save();
      return publicUser(u);
    },
    notifications() {
      requireStaff();
      return db.notifications.filter((n) => n.audience === 'Staff').sort((a, b) => b.at.localeCompare(a.at));
    },
    markNotificationsRead(ids) {
      const u = requireUser();
      db.notifications.forEach((n) => { if ((n.audience === 'Staff' && u.role !== 'Customer') || (n.audience === 'Customer' && n.userId === u.id)) { if (!ids || ids.includes(n.id)) n.read = true; } });
      save();
    },
    unreadCount() {
      const u = me();
      if (!u) return 0;
      return db.notifications.filter((n) => !n.read && ((u.role !== 'Customer' && n.audience === 'Staff') || (n.audience === 'Customer' && n.userId === u.id))).length;
    },

    /* admin: settings + reports */
    settings() { requireAdmin(); return Object.assign({}, db.settings, { promos: db.promos.map((p) => Object.assign({}, p)) }); },
    saveSettings(s) {
      requireAdmin();
      const n = (x) => Number(x);
      if (!(Number.isInteger(n(s.lowStockThreshold)) && n(s.lowStockThreshold) >= 0)) throw new BFError('VALIDATION', 'Low-stock threshold must be a whole number, zero or more.');
      if (!(n(s.deliveryFee) >= 0) || !(n(s.freeDeliveryOver) >= 0)) throw new BFError('VALIDATION', 'Delivery amounts cannot be negative.');
      Object.assign(db.settings, { lowStockThreshold: n(s.lowStockThreshold), deliveryFee: n(s.deliveryFee), freeDeliveryOver: n(s.freeDeliveryOver) });
      save();
    },
    savePromo(p) {
      requireAdmin();
      const code = String(p.code || '').trim().toUpperCase();
      if (!/^[A-Z0-9]{4,16}$/.test(code)) throw new BFError('VALIDATION', 'Codes use 4–16 letters or numbers.');
      let rec = p.id ? byId(db.promos, p.id) : null;
      if (!rec) {
        if (db.promos.some((x) => x.code === code)) throw new BFError('VALIDATION', 'That code already exists.');
        rec = { id: nextId('pr') }; db.promos.push(rec);
      }
      const value = Number(p.value);
      if (!(value > 0) || (p.type === 'percent' && value > 90)) throw new BFError('VALIDATION', 'Enter a valid discount value.');
      Object.assign(rec, { code, type: p.type === 'flat' ? 'flat' : 'percent', value, min: Number(p.min) || 0, cap: Number(p.cap) || 0, active: p.active !== false,
        note: p.type === 'flat' ? money(value) + ' off' + (p.min ? ' orders above ' + money(p.min) : '') : value + '% off' + (p.cap ? ', up to ' + money(p.cap) : '') });
      save();
    },
    reports() {
      requireAdmin();
      const live = db.orders.filter((o) => o.status !== 'Cancelled');
      const out = {};
      const days = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * DAY);
        const k = dkey(d);
        const os = live.filter((o) => dkey(o.created) === k);
        days.push({ key: k, label: d.getDate() + ' ' + MONTHS[d.getMonth()], orders: os.length, sales: os.reduce((s, o) => s + o.total, 0) });
      }
      out.daily = days;
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
        const k = mkey(d);
        const os = live.filter((o) => mkey(o.created) === k);
        months.push({ key: k, label: MONTHS[d.getMonth()] + ' ' + d.getFullYear(), orders: os.length, sales: os.reduce((s, o) => s + o.total, 0), avg: os.length ? round(os.reduce((s, o) => s + o.total, 0) / os.length) : 0 });
      }
      out.monthly = months;
      const statuses = ['Pending Payment', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
      out.status = statuses.map((s) => ({ status: s, count: db.orders.filter((o) => o.status === s).length }));
      const prod = {}, cats = {};
      db.orderItems.forEach((it) => {
        const o = byId(db.orders, it.orderId);
        if (!o || o.status === 'Cancelled') return;
        const p = prod[it.productId] || (prod[it.productId] = { name: it.productName, units: 0, revenue: 0 });
        p.units += it.qty; p.revenue += it.lineTotal;
        const c = cats[it.categoryName] || (cats[it.categoryName] = { name: it.categoryName, units: 0, revenue: 0 });
        c.units += it.qty; c.revenue += it.lineTotal;
      });
      out.best = Object.values(prod).sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 8);
      const totalRev = Object.values(cats).reduce((s, c) => s + c.revenue, 0) || 1;
      out.categories = Object.values(cats).sort((a, b) => b.revenue - a.revenue).map((c) => Object.assign(c, { share: round(c.revenue / totalRev * 100) }));
      out.lowStock = api.inventory().filter((v) => v.low);
      out.cancelled = db.orders.filter((o) => o.status === 'Cancelled').sort((a, b) => b.created.localeCompare(a.created)).map(decorateOrder);
      out.pendingPayments = db.orders.filter((o) => o.status !== 'Cancelled' && o.paymentStatus !== 'Paid').sort((a, b) => b.created.localeCompare(a.created)).map(decorateOrder);
      out.totals = { orders: db.orders.length, sales: live.reduce((s, o) => s + o.total, 0), avg: live.length ? round(live.reduce((s, o) => s + o.total, 0) / live.length) : 0,
        cancelRate: db.orders.length ? round(db.orders.filter((o) => o.status === 'Cancelled').length / db.orders.length * 100) : 0 };
      return out;
    },

    /* demo utilities */
    resetDemo() { requireAdmin(); const rec = lsGet(SESSION_KEY); buildSeed(); session = { userId: null, cartId: null, guestOrders: [] }; saveSession(); return !!rec; }
  };

  function catCodes(slug) { return { sarees: 'SAR', kurtis: 'KUR', dresses: 'DRS', lehengas: 'LEH', 'ethnic-sets': 'ESE', tops: 'TOP', accessories: 'ACC' }[slug] || String(slug).slice(0, 3).toUpperCase(); }

  load();

  root.BF = {
    api, BFError, STATUS_FLOW, CANCELLABLE, PAYMENT_METHODS, money, fmtDate, fmtTime, fmtDateTime, isEmail, isPhone, isPin,
    _internals: {
      get db() { return db; }, get session() { return session; }, confirmOrder, cancelRecord, buildOrder, itemsOf, paymentOf,
      reset() { buildSeed(); session = { userId: null, cartId: null, guestOrders: [] }; saveSession(); }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

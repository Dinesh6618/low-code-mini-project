/* BoutiqueFlow — boutique administration views (Staff and Admin).
   Every call below goes through BF.api, which re-checks the role. Hiding a nav item is
   convenience only; the API refuses the request regardless. */
(function (root) {
  'use strict';

  const { api, money, fmtDate, fmtDateTime, STATUS_FLOW, CANCELLABLE, PAYMENT_METHODS } = root.BF;
  const UI = root.UI;
  const { esc, $, $$, ICON, actions, forms, changes, inputs, views } = UI;

  const METHOD_SHORT = { COD: 'COD', SIMULATED: 'Card/UPI (sim.)' };
  const NEXT = { Confirmed: ['Packed', 'Mark as packed'], Packed: ['Shipped', 'Mark as shipped'], Shipped: ['Delivered', 'Mark as delivered'] };

  /* ===================== chrome ===================== */
  function navItems(u) {
    const p = u.permissions || {};
    const admin = u.role === 'Admin';
    const items = [['', 'Dashboard', 'dashboard', true]];
    items.push(['orders', 'Orders', 'orders', admin || p.fulfilment]);
    items.push(['products', 'Products', 'products', admin || p.products]);
    items.push(['inventory', 'Inventory', 'inventory', admin || p.products]);
    items.push(['customers', 'Customers', 'customers', admin || p.fulfilment]);
    items.push(['notifications', 'Notifications', 'bell', true]);
    items.push(['staff', 'Staff', 'staff', admin, true]);
    items.push(['reports', 'Reports', 'reports', admin]);
    items.push(['settings', 'Settings', 'settings', admin]);
    return items.filter((i) => i[3]);
  }

  UI.adminShell = function () {
    return '<div class="admin"><aside class="admin__side"><div class="admin__brand"><div><a class="logo" href="#/admin">Boutique<span>Flow</span></a><small>Boutique admin</small></div></div>' +
      '<nav class="side-nav" id="admin-nav" aria-label="Admin"></nav><div class="admin__user" id="admin-user"></div></aside><main class="admin__main" id="main" tabindex="-1"></main></div>';
  };

  UI.refreshAdminChrome = function () {
    const u = api.currentUser();
    if (!u) return;
    const { segs } = UI.parseHash();
    const cur = segs[1] || '';
    let unread = 0; try { unread = api.unreadCount(); } catch (e) { unread = 0; }
    const items = navItems(u);
    let html = '';
    items.forEach((i, idx) => {
      if (i[0] === 'staff') html += '<div class="sep"></div>';
      html += '<a href="#/admin' + (i[0] ? '/' + i[0] : '') + '"' + (cur === i[0] ? ' aria-current="page"' : '') + '>' + ICON[i[2]] + '<span>' + i[1] + '</span>' + (i[0] === 'notifications' && unread ? '<span class="count" aria-label="' + unread + ' unread">' + unread + '</span>' : '') + '</a>';
    });
    html += '<div class="sep"></div><a href="#/">' + ICON.store + '<span>View storefront</span></a>';
    $('#admin-nav').innerHTML = html;
    $('#admin-user').innerHTML = '<strong>' + esc(u.name) + '</strong><span>' + esc(u.role) + (u.role === 'Staff' ? ' &middot; ' + [u.permissions.products ? 'products' : '', u.permissions.fulfilment ? 'fulfilment' : ''].filter(Boolean).join(' + ') : '') + '</span><a class="btn btn--secondary btn--sm btn--block" href="#/logout">Sign out</a>';
  };

  function forbidden(msg) {
    return { title: 'No access', html: '<div class="empty empty--box" style="margin-top:24px"><p class="eyebrow">Access restricted</p><h1 class="h2">You don’t have permission to view this area</h1><p>' + esc(msg || 'Your role does not include this section. Ask an administrator if you need access.') + '</p><a class="btn btn--primary" href="#/admin">Back to dashboard</a></div>' };
  }
  const head = (title, sub, right) => '<div class="admin__head"><div><h1>' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (right ? '<div style="display:flex;gap:8px;flex-wrap:wrap">' + right + '</div>' : '') + '</div>';
  const emptyBox = (title, text, action) => '<div class="empty"><h3 class="h3">' + title + '</h3><p>' + text + '</p>' + (action || '') + '</div>';

  /* dispatcher with guards */
  views.admin = (ctx) => {
    const u = api.currentUser();
    if (!u) return { redirect: '#/login?next=' + encodeURIComponent('#/' + (UI.parseHash().path)) };
    if (u.role === 'Customer') return forbidden('Admin tools are for boutique staff. Your account can view and manage your own orders.');
    const sec = ctx.segs[1] || 'dashboard';
    const p = u.permissions || {}, admin = u.role === 'Admin';
    const gate = { dashboard: true, notifications: true, orders: admin || p.fulfilment, customers: admin || p.fulfilment, products: admin || p.products, inventory: admin || p.products, staff: admin, reports: admin, settings: admin };
    if (!(sec in gate)) return UI.notFoundView('Page not found', 'That admin page does not exist.');
    if (!gate[sec]) return forbidden();
    const v = sections[sec](ctx, u);
    if (v && !v.redirect) v.admin = true;
    return v;
  };

  const sections = {};

  /* ===================== dashboard ===================== */
  sections.dashboard = (ctx, u) => {
    const d = api.dashboard();
    const admin = u.role === 'Admin', p = u.permissions;
    const stat = (label, value, sub, href, alert) => '<a class="stat' + (alert ? ' stat--alert' : '') + '" href="' + href + '"><span class="stat__label">' + label + '</span><span class="stat__value">' + value + '</span><span class="stat__sub">' + sub + '</span></a>';
    const cards = '<div class="stat-grid">' +
      stat('Orders', d.orders, d.todayOrders + ' placed today', '#/admin/orders') +
      (admin ? stat('Sales', money(d.sales), money(d.monthSales) + ' this month', '#/admin/reports') : stat('Placed today', d.todayOrders, 'new orders', '#/admin/orders')) +
      stat('Pending fulfilment', d.pending, d.awaitingPayment ? d.awaitingPayment + ' awaiting payment' : 'confirmed or packed', '#/admin/orders?status=open', d.pending > 0) +
      stat('Low stock', d.lowStock, 'variants at or below threshold', p.products || admin ? '#/admin/inventory?f=low' : '#/admin', d.lowStock > 0) + '</div>';
    let recent = '';
    if (d.recent) {
      recent = '<section class="panel"><div class="panel__head"><h2>Latest orders</h2><a class="link small link--plain" href="#/admin/orders">View all</a></div><div class="table-wrap"><table class="table"><thead><tr><th>Order</th><th>Customer</th><th class="num">Total</th><th>Payment</th><th>Status</th></tr></thead><tbody>' +
        d.recent.map((o) => '<tr><td><button type="button" class="row-link" data-action="admin-order" data-no="' + esc(o.orderNo) + '">' + esc(o.orderNo) + '</button><br><span class="xs muted">' + fmtDate(o.created) + '</span></td><td>' + esc(o.customerName) + '</td><td class="num">' + money(o.total) + '</td><td>' + UI.payBadge(o.paymentStatus) + '</td><td>' + UI.statusBadge(o.status) + '</td></tr>').join('') + '</tbody></table></div></section>';
    }
    let low = '';
    if (admin || p.products) {
      const items = api.inventory().filter((v) => v.low).slice(0, 7);
      low = '<section class="panel"><div class="panel__head"><h2>Low stock</h2><a class="link small link--plain" href="#/admin/inventory?f=low">Open inventory</a></div>' +
        (items.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Product</th><th>Variant</th><th class="num">Left</th></tr></thead><tbody>' + items.map((v) => '<tr><td>' + esc(v.productName) + '</td><td>' + esc(v.color) + ' / ' + esc(v.size) + '</td><td class="num"><span class="stock-num ' + (v.out ? 'stock-num--out' : 'stock-num--low') + '">' + v.stock + '</span></td></tr>').join('') + '</tbody></table></div>' : emptyBox('Everything is well stocked', 'No variants are at or below the alert threshold.')) + '</section>';
    }
    const notes = api.notifications().filter((n) => !n.read).slice(0, 4);
    const note = '<section class="panel"><div class="panel__head"><h2>Unread notifications</h2><a class="link small link--plain" href="#/admin/notifications">View all</a></div><div class="panel__body">' +
      (notes.length ? notes.map(noticeHtml).join('') : '<p class="muted">You are all caught up.</p>') + '</div></section>';
    const first = u.name.split(' ')[0], hr = new Date().getHours();
    return { title: 'Dashboard — BoutiqueFlow admin', html: head((hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening') + ', ' + esc(first), fmtDate(new Date().toISOString()) + ' &middot; ' + esc(u.role)) + cards + '<div class="cols-2 cols-2--wide">' + (recent || '<div></div>') + '<div>' + low + note + '</div></div>' };
  };
  function noticeHtml(n) {
    return '<div class="notice' + (n.read ? '' : ' notice--unread') + '"><div class="notice__body"><strong style="font-weight:500">' + esc(n.title) + '</strong>' + (n.read ? '' : '<span class="badge badge--confirmed">New</span>') + '<div class="muted small">' + esc(n.body) + '</div><time>' + fmtDateTime(n.at) + ' &middot; in-app</time></div>' +
      (n.orderNo ? '<button type="button" class="btn btn--secondary btn--sm" data-action="admin-order" data-no="' + esc(n.orderNo) + '">Open order</button>' : '') + '</div>';
  }

  /* ===================== orders ===================== */
  const ordersUI = { q: '', status: '', pay: '' };
  sections.orders = (ctx) => {
    if (ctx.query.status !== undefined) ordersUI.status = ctx.query.status;
    const opts = (arr, cur) => arr.map((a) => '<option value="' + esc(a[0]) + '"' + (a[0] === cur ? ' selected' : '') + '>' + esc(a[1]) + '</option>').join('');
    const html = head('Orders', 'Search, filter and move orders through fulfilment.', '<button type="button" class="btn btn--secondary btn--sm" data-action="export-orders">Export CSV</button>') +
      '<section class="panel"><div class="toolbar"><div class="grow"><label class="sr-only" for="o-q">Search orders</label><input class="input input--sm" style="width:100%" id="o-q" data-input="orders-q" placeholder="Search order no, name, email or phone" value="' + esc(ordersUI.q) + '"></div>' +
      '<label class="sr-only" for="o-status">Status</label><select class="select select--sm" id="o-status" data-change="orders-status">' + opts([['', 'All statuses'], ['open', 'Needs fulfilment'], ['Pending Payment', 'Pending payment'], ['Confirmed', 'Confirmed'], ['Packed', 'Packed'], ['Shipped', 'Shipped'], ['Delivered', 'Delivered'], ['Cancelled', 'Cancelled']], ordersUI.status) + '</select>' +
      '<label class="sr-only" for="o-pay">Payment</label><select class="select select--sm" id="o-pay" data-change="orders-pay">' + opts([['', 'All payments'], ['Paid', 'Paid'], ['Pending', 'Pending'], ['Refund Pending', 'Refund pending'], ['Failed', 'Failed']], ordersUI.pay) + '</select></div>' +
      '<div class="table-wrap" id="orders-table">' + ordersTable() + '</div></section>';
    return { title: 'Orders — BoutiqueFlow admin', html, keepScroll: true };
  };
  function filteredOrders() {
    const q = ordersUI.q.trim().toLowerCase();
    return api.adminOrders().filter((o) => {
      if (ordersUI.status === 'open' ? !['Confirmed', 'Packed'].includes(o.status) : ordersUI.status && o.status !== ordersUI.status) return false;
      if (ordersUI.pay && o.paymentStatus !== ordersUI.pay) return false;
      return !q || (o.orderNo + ' ' + o.customerName + ' ' + o.email + ' ' + o.phone).toLowerCase().includes(q);
    });
  }
  function ordersTable() {
    const list = filteredOrders();
    if (!list.length) return emptyBox('No orders match', 'Try a different search or clear the filters.', '<button type="button" class="btn btn--secondary btn--sm" data-action="clear-order-filters">Clear filters</button>');
    return '<table class="table"><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th class="num">Items</th><th class="num">Total</th><th>Payment</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
      list.map((o) => {
        const nx = NEXT[o.status];
        return '<tr><td><button type="button" class="row-link" data-action="admin-order" data-no="' + esc(o.orderNo) + '">' + esc(o.orderNo) + '</button></td><td class="nowrap">' + fmtDate(o.created) + '</td><td>' + esc(o.customerName) + '<br><span class="xs muted">' + esc(o.email) + '</span></td><td class="num">' + o.items.reduce((s, i) => s + i.qty, 0) + '</td><td class="num">' + money(o.total) + '</td>' +
          '<td>' + esc(METHOD_SHORT[o.paymentMethod]) + '<br>' + UI.payBadge(o.paymentStatus) + '</td><td>' + UI.statusBadge(o.status) + '</td>' +
          '<td class="actions">' + (nx ? '<button type="button" class="btn btn--primary btn--sm" data-action="advance-order" data-id="' + o.id + '" data-no="' + esc(o.orderNo) + '" data-to="' + nx[0] + '">' + nx[0] + '</button> ' : '') + '<button type="button" class="btn btn--secondary btn--sm" data-action="admin-order" data-no="' + esc(o.orderNo) + '">View</button></td></tr>';
      }).join('') + '</tbody></table>';
  }
  const redrawOrders = () => { const t = $('#orders-table'); if (t) t.innerHTML = ordersTable(); };
  inputs['orders-q'] = (el) => { ordersUI.q = el.value; redrawOrders(); };
  changes['orders-status'] = (el) => { ordersUI.status = el.value; redrawOrders(); };
  changes['orders-pay'] = (el) => { ordersUI.pay = el.value; redrawOrders(); };
  actions['clear-order-filters'] = () => { ordersUI.q = ordersUI.status = ordersUI.pay = ''; UI.rerender(); };
  actions['export-orders'] = () => {
    const rows = [['Order', 'Date', 'Customer', 'Email', 'Phone', 'City', 'Items', 'Subtotal', 'Discount', 'Delivery', 'Total', 'Payment method', 'Payment status', 'Status']];
    filteredOrders().forEach((o) => rows.push([o.orderNo, o.created.slice(0, 10), o.customerName, o.email, o.phone, o.address.city, o.items.reduce((s, i) => s + i.qty, 0), o.subtotal, o.discount, o.deliveryFee, o.total, PAYMENT_METHODS[o.paymentMethod], o.paymentStatus, o.status]));
    UI.downloadCsv('boutiqueflow-orders.csv', rows);
  };

  function orderModal(no) {
    const o = api.adminOrders().find((x) => x.orderNo === no);
    if (!o) { UI.toast('Order not found.', 'error'); return; }
    const A = o.address, nx = NEXT[o.status];
    const canPay = o.status !== 'Cancelled' && o.paymentStatus !== 'Paid' && o.paymentStatus !== 'Refund Pending';
    const html =
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:-4px 0 16px">' + UI.statusBadge(o.status) + UI.payBadge(o.paymentStatus) + '<span class="muted small">Placed ' + fmtDateTime(o.created) + '</span></div>' +
      UI.timeline(o) +
      '<div class="table-wrap"><table class="table-plain"><thead><tr><th>Item</th><th>SKU</th><th class="right">Qty</th><th class="right">Unit</th><th class="right">Total</th></tr></thead><tbody>' +
      o.items.map((i) => '<tr><td>' + esc(i.productName) + '<br><span class="muted small">' + esc(i.color) + ' &middot; ' + esc(i.size) + '</span></td><td class="small">' + esc(i.sku) + '</td><td class="right">' + i.qty + '</td><td class="right">' + money(i.unitPrice) + '</td><td class="right">' + money(i.lineTotal) + '</td></tr>').join('') + '</tbody></table></div>' +
      '<div style="max-width:300px;margin:12px 0 0 auto"><div class="totals"><div><span>Subtotal</span><span>' + money(o.subtotal) + '</span></div>' + (o.discount ? '<div class="discount"><span>Discount (' + esc(o.promoCode) + ')</span><span>&minus;' + money(o.discount) + '</span></div>' : '') + '<div><span>Delivery</span><span>' + (o.deliveryFee ? money(o.deliveryFee) : 'Free') + '</span></div><div class="grand"><span>Total</span><span>' + money(o.total) + '</span></div></div></div>' +
      '<hr class="rule"><dl class="kv"><div><dt>Customer</dt><dd>' + esc(o.customerName) + '<br><span class="muted">' + esc(o.email) + '<br>' + esc(o.phone) + '</span></dd></div><div><dt>Deliver to</dt><dd><span class="muted">' + esc(A.line1) + (A.line2 ? ', ' + esc(A.line2) : '') + '<br>' + esc(A.city) + ', ' + esc(A.state) + ' ' + esc(A.pincode) + '</span></dd></div>' +
      '<div><dt>Payment &amp; stock</dt><dd>' + esc(PAYMENT_METHODS[o.paymentMethod]) + '<br><span class="muted small">Stock ' + (o.stockRestored ? 'restored after cancellation' : o.stockDeducted ? 'deducted' : 'not yet deducted') + '</span>' + (o.trackingNo ? '<br><span class="muted small">' + esc(o.courier) + ' &middot; ' + esc(o.trackingNo) + '</span>' : '') + '</dd></div></dl>' +
      '<h3 class="h3" style="margin-top:20px">History</h3><ol class="history">' + o.history.slice().reverse().map((h) => '<li>' + esc(h.status) + (h.note ? ' <span class="muted">&middot; ' + esc(h.note) + '</span>' : '') + ' <span class="muted">by ' + esc(h.by) + '</span><time>' + fmtDateTime(h.at) + '</time></li>').join('') + '</ol>' +
      '<div class="modal__actions" style="justify-content:space-between"><div>' + (CANCELLABLE.includes(o.status) ? '<button type="button" class="btn btn--danger btn--sm" data-action="admin-cancel" data-id="' + o.id + '" data-no="' + esc(o.orderNo) + '">Cancel order</button>' : '') + '</div><div class="status-actions">' +
      (canPay ? '<button type="button" class="btn btn--secondary btn--sm" data-action="mark-paid" data-id="' + o.id + '" data-no="' + esc(o.orderNo) + '">Mark payment received</button>' : '') +
      (nx ? '<button type="button" class="btn btn--primary btn--sm" data-action="advance-order" data-id="' + o.id + '" data-no="' + esc(o.orderNo) + '" data-to="' + nx[0] + '" data-modal="1">' + nx[1] + '</button>' : '') + '</div></div>';
    UI.openModal({ title: 'Order ' + o.orderNo, size: 'wide', html });
  }
  actions['admin-order'] = (el) => orderModal(el.dataset.no);
  function afterOrderChange(no, reopen) { UI.refreshAdminChrome(); UI.rerender(); if (reopen) orderModal(no); else UI.closeModal(); }
  actions['advance-order'] = (el) => {
    const to = el.dataset.to, no = el.dataset.no, reopen = !!el.dataset.modal;
    if (to === 'Shipped') {
      UI.openModal({
        title: 'Ship order ' + no, size: 'sm',
        html: '<p class="muted small">The customer is notified (simulated email) with these tracking details.</p><form data-form="ship" novalidate data-id="' + el.dataset.id + '" data-no="' + esc(no) + '" data-reopen="' + (reopen ? 1 : '') + '" style="margin-top:16px">' +
          UI.field({ id: 'courier', label: 'Courier', as: 'select', options: ['BlueDart', 'Delhivery', 'DTDC', 'India Post', 'Other'] }) + UI.field({ id: 'trackingNo', label: 'Tracking number', required: true }) +
          '<div class="modal__actions"><button type="button" class="btn btn--secondary" data-action="modal-close">Cancel</button><button type="submit" class="btn btn--primary">Mark as shipped</button></div></form>'
      });
      return;
    }
    try { api.updateOrderStatus(el.dataset.id, to); UI.toast('Order ' + no + ' marked ' + to.toLowerCase() + '.'); afterOrderChange(no, reopen); }
    catch (e) { UI.fail(e); UI.rerender(); }
  };
  forms.ship = (f) => {
    const tracking = f.trackingNo.value.trim();
    if (tracking.length < 4) { UI.showFieldErrors(f, { trackingNo: 'Enter the courier tracking number.' }); return; }
    try { api.updateOrderStatus(f.dataset.id, 'Shipped', { courier: f.courier.value, trackingNo: tracking }); UI.toast('Order ' + f.dataset.no + ' marked shipped.'); afterOrderChange(f.dataset.no, !!f.dataset.reopen); }
    catch (e) { UI.fail(e); }
  };
  actions['mark-paid'] = (el) => {
    try { api.markOrderPaid(el.dataset.id); UI.toast('Payment recorded.'); afterOrderChange(el.dataset.no, true); } catch (e) { UI.fail(e); }
  };
  actions['admin-cancel'] = async (el) => {
    const no = el.dataset.no;
    UI.closeModal(true);
    const r = await UI.confirmDialog({ title: 'Cancel order ' + no + '?', message: 'The customer is notified and the items return to stock. This cannot be undone.', reasons: ['Customer requested cancellation', 'Item out of stock or damaged', 'Payment issue', 'Unable to deliver to address', 'Other'], reasonLabel: 'Reason', confirmLabel: 'Cancel order', cancelLabel: 'Keep order', danger: true });
    if (!r) { orderModal(no); return; }
    try { api.cancelOrder(el.dataset.id, r.reason); UI.toast('Order ' + no + ' cancelled and stock restored.'); afterOrderChange(no, false); } catch (e) { UI.fail(e); UI.rerender(); }
  };

  /* ===================== products ===================== */
  const prodUI = { q: '', cat: '', status: '' };
  sections.products = () => {
    const cats = api.categories();
    const html = head('Products', 'Create and maintain the catalogue. Deactivating a product hides it without touching past orders.',
      '<button type="button" class="btn btn--secondary btn--sm" data-action="manage-categories">Categories</button><a class="btn btn--primary btn--sm" href="#/admin/products/new">Add product</a>') +
      '<section class="panel"><div class="toolbar"><div class="grow"><label class="sr-only" for="p-q">Search products</label><input class="input input--sm" style="width:100%" id="p-q" data-input="prod-q" placeholder="Search products" value="' + esc(prodUI.q) + '"></div>' +
      '<label class="sr-only" for="p-cat">Category</label><select class="select select--sm" id="p-cat" data-change="prod-cat"><option value="">All categories</option>' + cats.map((c) => '<option' + (prodUI.cat === c.name ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select>' +
      '<label class="sr-only" for="p-st">Status</label><select class="select select--sm" id="p-st" data-change="prod-status"><option value="">All statuses</option><option value="active"' + (prodUI.status === 'active' ? ' selected' : '') + '>Active</option><option value="inactive"' + (prodUI.status === 'inactive' ? ' selected' : '') + '>Inactive</option></select></div>' +
      '<div class="table-wrap" id="prod-table">' + productsTable() + '</div></section>';
    return { title: 'Products — BoutiqueFlow admin', html, keepScroll: true };
  };
  function productsTable() {
    const q = prodUI.q.trim().toLowerCase();
    const list = api.adminProducts().filter((p) => (!prodUI.cat || p.category === prodUI.cat) && (!prodUI.status || (prodUI.status === 'active') === p.active) && (!q || p.name.toLowerCase().includes(q)));
    if (!list.length) return emptyBox('No products found', 'Adjust your search, or add your first product.', '<a class="btn btn--primary btn--sm" href="#/admin/products/new">Add product</a>');
    return '<table class="table"><thead><tr><th>Product</th><th>Category</th><th class="num">Price</th><th class="num">Stock</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
      list.map((p) => '<tr><td><div class="cell-prod"><div class="thumb-sm">' + UI.productMedia(p, { label: '' }) + '</div><div><strong>' + esc(p.name) + '</strong><small>' + p.variants + ' variants</small></div></div></td><td>' + esc(p.category) + '</td>' +
        '<td class="num">' + (p.salePrice ? '<span style="color:var(--burgundy)">' + money(p.salePrice) + '</span><br><span class="xs muted" style="text-decoration:line-through">' + money(p.price) + '</span>' : money(p.price)) + '</td>' +
        '<td class="num"><span class="stock-num">' + p.stock + '</span>' + (p.low ? '<br><span class="badge badge--low">' + p.low + ' low</span>' : '') + '</td><td>' + (p.active ? '<span class="badge badge--active">Active</span>' : '<span class="badge badge--inactive">Inactive</span>') + '</td>' +
        '<td class="actions"><a class="btn btn--secondary btn--sm" href="#/admin/products/' + p.id + '">Edit</a> <button type="button" class="btn ' + (p.active ? 'btn--danger' : 'btn--secondary') + ' btn--sm" data-action="toggle-product" data-id="' + p.id + '" data-name="' + esc(p.name) + '" data-active="' + p.active + '">' + (p.active ? 'Deactivate' : 'Activate') + '</button></td></tr>').join('') + '</tbody></table>';
  }
  const redrawProducts = () => { const t = $('#prod-table'); if (t) t.innerHTML = productsTable(); };
  inputs['prod-q'] = (el) => { prodUI.q = el.value; redrawProducts(); };
  changes['prod-cat'] = (el) => { prodUI.cat = el.value; redrawProducts(); };
  changes['prod-status'] = (el) => { prodUI.status = el.value; redrawProducts(); };
  actions['toggle-product'] = async (el) => {
    const active = el.dataset.active === 'true';
    if (active) {
      const r = await UI.confirmDialog({ title: 'Deactivate ' + el.dataset.name + '?', message: 'It will be hidden from the storefront and flagged as unavailable in any bags. Past orders keep their original name, variant and price.', confirmLabel: 'Deactivate', cancelLabel: 'Keep active', danger: true });
      if (!r) return;
    }
    try { api.setProductActive(el.dataset.id, !active); UI.toast(el.dataset.name + (active ? ' deactivated.' : ' is active again.')); UI.rerender(); } catch (e) { UI.fail(e); }
  };

  actions['manage-categories'] = () => openCategories();
  function openCategories(edit) {
    const cats = api.categories();
    UI.openModal({
      title: 'Categories',
      html: '<div class="table-wrap"><table class="table-plain"><thead><tr><th>Name</th><th>Tagline</th><th class="right">Products</th><th></th></tr></thead><tbody>' + cats.map((c) => '<tr><td>' + esc(c.name) + '</td><td class="muted small">' + esc(c.tagline) + '</td><td class="right">' + c.count + '</td><td class="right"><button type="button" class="link small" data-action="edit-category" data-id="' + c.id + '">Edit</button></td></tr>').join('') + '</tbody></table></div>' +
        '<form data-form="category" novalidate style="margin-top:20px"><h3 class="h3" style="margin-bottom:12px">' + (edit ? 'Edit category' : 'Add a category') + '</h3><input type="hidden" name="id" value="' + (edit ? edit.id : '') + '"><div class="form-grid form-grid--2">' +
        UI.field({ id: 'name', label: 'Name', value: edit ? edit.name : '', required: true }) + UI.field({ id: 'tagline', label: 'Tagline', value: edit ? edit.tagline : '', opt: true }) + '</div><div class="modal__actions"><button type="button" class="btn btn--secondary" data-action="modal-close">Close</button><button type="submit" class="btn btn--primary">' + (edit ? 'Save category' : 'Add category') + '</button></div></form>'
    });
  }
  actions['edit-category'] = (el) => openCategories(api.categories().find((c) => c.id === el.dataset.id));
  forms.category = (f) => {
    try { api.saveCategory({ id: f.id.value, name: f.name.value, tagline: f.tagline.value }); UI.toast('Category saved.'); UI.rerender(); openCategories(); } catch (e) { if (e.fields) UI.showFieldErrors(f, e.fields); else UI.fail(e); }
  };

  /* ----- product editor ----- */
  let pe = null;
  const STD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size', 'Free Size'];
  // filter attributes shown in the storefront's "Refine results"; free text so new values appear automatically
  const ATTR_FIELDS = [['style', 'Style'], ['length', 'Length'], ['silhouette', 'Silhouette'], ['pattern', 'Pattern'], ['material', 'Material'], ['neckline', 'Neckline'], ['sleeve', 'Sleeve type'], ['embellishment', 'Embellishment']];
  const attrsOf = (p) => { const o = {}; ATTR_FIELDS.forEach(([k]) => { o[k] = p[k] || ''; }); o.features = (p.features || []).join(', '); return o; };
  function blankProduct() { return Object.assign({ style: '', length: '', silhouette: '', pattern: '', material: '', neckline: '', sleeve: '', embellishment: '', features: '' }, { key: 'new', id: '', name: '', categoryId: '', description: '', fabric: '', care: '', price: '', salePrice: '', featured: false, active: true, images: [], colors: [{ name: 'Ivory', hex: '#EFE6D8' }], sizes: ['S', 'M', 'L'], stock: {}, existing: {}, slug: '' }); }

  sections.products_edit = (ctx) => {
    const id = ctx.segs[2];
    if (!pe || pe.key !== id) {
      if (id === 'new') pe = blankProduct();
      else {
        const p = api.adminProduct(id);
        if (!p) return UI.notFoundView('Product not found', 'That product does not exist.');
        const existing = {}, stock = {};
        p.variants.filter((v) => v.active).forEach((v) => { existing[v.color + '|' + v.size] = true; stock[v.color + '|' + v.size] = v.stock; });
        pe = { key: id, id: p.id, name: p.name, categoryId: p.categoryId, description: p.description, fabric: p.fabric, care: (p.care || []).join('\n'), price: p.price, salePrice: p.salePrice || '', featured: !!p.featured, active: p.active, images: (p.images || []).map((i) => (typeof i === 'string' ? { src: i, color: '', alt: '', sample: false } : Object.assign({}, i))), colors: p.colors.map((c) => Object.assign({}, c)), sizes: p.sizes.slice(), stock, existing, slug: p.slug };
        Object.assign(pe, attrsOf(p));
      }
    }
    const cats = api.categories();
    if (!pe.categoryId && cats.length) pe.categoryId = cats[0].id;
    const html = '<p class="breadcrumb"><a href="#/admin/products">Products</a> / ' + (pe.id ? esc(pe.name || 'Edit') : 'New product') + '</p>' + head(pe.id ? 'Edit product' : 'Add product', pe.id ? 'Stock changes you make here are recorded as inventory adjustments.' : 'Add details, photographs and per-variant stock.') +
      '<form data-form="product" novalidate><div id="pe-error"></div><div class="cols-2 cols-2--wide"><div>' +
      '<section class="panel"><div class="panel__head"><h2>Details</h2></div><div class="panel__body"><div class="form-grid form-grid--2">' +
      UI.field({ id: 'name', label: 'Product name', value: pe.name, required: true, span: true }) +
      UI.field({ id: 'categoryId', label: 'Category', as: 'select', value: pe.categoryId, options: cats.map((c) => ({ value: c.id, label: c.name })) }) +
      UI.field({ id: 'fabric', label: 'Fabric', value: pe.fabric, opt: true }) +
      UI.field({ id: 'description', label: 'Description', as: 'textarea', value: pe.description, span: true }) +
      UI.field({ id: 'care', label: 'Care instructions', as: 'textarea', value: pe.care, hint: 'One instruction per line.', span: true }) + '</div></div></section>' +
      '<section class="panel"><div class="panel__head"><h2>Attributes for filters</h2></div><div class="panel__body"><p class="field__hint" style="margin-bottom:12px">Shoppers can filter by these in &ldquo;Refine results&rdquo;. Leave a field empty if it does not apply (for example, length for a saree). New values appear in the filters automatically.</p><div class="form-grid form-grid--2">' +
      ATTR_FIELDS.map(([k, label]) => UI.field({ id: k, label, value: pe[k], opt: true, attrs: 'list="dl-' + k + '" maxlength="40"' })).join('') +
      UI.field({ id: 'features', label: 'Features', value: pe.features, opt: true, span: true, hint: 'Comma-separated, e.g. With embroidery, For weddings, Handloom, Fully lined.' }) + '</div>' +
      ATTR_FIELDS.map(([k]) => '<datalist id="dl-' + k + '">' + Array.from(new Set(api.products({}).map((x) => x[k]).filter(Boolean))).map((v) => '<option value="' + esc(v) + '">').join('') + '</datalist>').join('') + '</div></section>' +
      '<section class="panel"><div class="panel__head"><h2>Photographs</h2></div><div class="panel__body"><div id="pe-images"></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn btn--secondary btn--sm" for="pe-file-main" style="cursor:pointer">Upload main image</label><input id="pe-file-main" type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" data-change="pe-upload-main">' +
      '<label class="btn btn--secondary btn--sm" for="pe-file-gallery" style="cursor:pointer">Add gallery images</label><input id="pe-file-gallery" type="file" accept="image/jpeg,image/png,image/webp" multiple class="sr-only" data-change="pe-upload-gallery"></div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;max-width:520px"><label class="sr-only" for="pe-url">Image link</label><input class="input input--sm" id="pe-url" type="url" placeholder="Or paste an https:// image link"><button type="button" class="btn btn--secondary btn--sm" data-action="pe-add-url">Add link</button></div>' +
      '<div class="field__error" data-err="images"></div>' +
      '<p class="field__hint" style="margin-top:10px">Up to 12 photographs; the first is the <strong>main image</strong> used in the catalogue, bag and checkout. Use genuine photographs of this product &mdash; full outfit, front, back, a fabric close-up, and border or embroidery detail. Tag a photograph with a colour to show it when that colour is chosen. Uploads are resized automatically. With no photograph the shop shows a neutral &ldquo;photograph coming soon&rdquo; placeholder.</p></div></section>' +
      '<section class="panel"><div class="panel__head"><h2>Colours, sizes &amp; stock</h2></div><div class="panel__body">' +
      '<h3 class="h3" style="margin-bottom:8px">Colours</h3><div id="pe-colors"></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px"><button type="button" class="btn btn--secondary btn--sm" data-action="pe-add-color">Add colour</button><label class="sr-only" for="pe-preset">Quick add a colour</label><select class="select select--sm" id="pe-preset" data-change="pe-color-preset" style="width:auto"><option value="">Quick add&hellip;</option>' + Object.keys(root.BFSeed.COLORS).map((n) => '<option>' + esc(n) + '</option>').join('') + '</select></div><div class="field__error" data-err="colors"></div>' +
      '<h3 class="h3" style="margin:20px 0 8px">Sizes</h3><div id="pe-sizes"></div><div class="field__error" data-err="sizes"></div>' +
      '<h3 class="h3" style="margin:20px 0 8px">Stock by variant</h3><div class="matrix-wrap" id="pe-matrix"></div><div class="field__error" data-err="stock"></div></div></section></div>' +
      '<div><section class="panel"><div class="panel__head"><h2>Pricing</h2></div><div class="panel__body">' +
      UI.field({ id: 'price', label: 'Price (₹)', type: 'number', value: pe.price, required: true, attrs: 'min="1" step="1" inputmode="numeric"' }) +
      UI.field({ id: 'salePrice', label: 'Sale price (₹)', type: 'number', value: pe.salePrice, opt: true, attrs: 'min="1" step="1" inputmode="numeric"', hint: 'Leave empty for no discount.' }) + '</div></section>' +
      '<section class="panel"><div class="panel__head"><h2>Visibility</h2></div><div class="panel__body"><label class="check" style="margin-bottom:12px"><input type="checkbox" name="active"' + (pe.active ? ' checked' : '') + '> Active on the storefront</label><label class="check"><input type="checkbox" name="featured"' + (pe.featured ? ' checked' : '') + '> Include in The Festive Edit</label></div></section>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn--primary" type="submit">Save product</button><a class="btn btn--secondary" href="#/admin/products">Cancel</a></div></div></div></form>';
    return { title: (pe.id ? 'Edit product' : 'Add product') + ' — BoutiqueFlow admin', html, after: renderPe };
  };

  function renderPe() {
    $('#pe-colors').innerHTML = pe.colors.map((c, i) => '<div class="color-row"><input type="color" value="' + esc(c.hex) + '" data-pe="hex" data-i="' + i + '" aria-label="Colour swatch for ' + esc(c.name || 'colour ' + (i + 1)) + '"><input class="input" data-pe="cname" data-i="' + i + '" value="' + esc(c.name) + '" placeholder="Colour name" aria-label="Colour name"><button type="button" class="btn btn--ghost btn--sm" data-action="pe-remove-color" data-i="' + i + '" aria-label="Remove colour ' + esc(c.name) + '">Remove</button></div>').join('');
    const all = Array.from(new Set(STD_SIZES.concat(pe.sizes)));
    $('#pe-sizes').innerHTML = '<div class="chip-row">' + all.map((s) => '<button type="button" class="chip" data-action="pe-toggle-size" data-size="' + esc(s) + '" aria-pressed="' + pe.sizes.includes(s) + '">' + esc(s) + '</button>').join('') + '</div><div style="display:flex;gap:8px;margin-top:10px;max-width:320px"><label class="sr-only" for="pe-size-new">Custom size</label><input class="input input--sm" id="pe-size-new" placeholder="Custom size (e.g. 3XL)"><button type="button" class="btn btn--secondary btn--sm" data-action="pe-add-size">Add</button></div>';
    renderMatrix();
    renderImages();
  }
  function renderMatrix() {
    const colors = pe.colors.filter((c) => c.name.trim());
    if (!colors.length || !pe.sizes.length) { $('#pe-matrix').innerHTML = '<p class="muted small">Add at least one colour and size to set stock.</p>'; return; }
    $('#pe-matrix').innerHTML = '<table class="matrix"><thead><tr><th></th>' + pe.sizes.map((s) => '<th scope="col">' + esc(s) + '</th>').join('') + '</tr></thead><tbody>' +
      colors.map((c) => '<tr><th scope="row" class="row-h"><span class="dot-swatch" style="background:' + esc(c.hex) + ';margin-right:8px"></span>' + esc(c.name) + '</th>' + pe.sizes.map((s) => { const k = c.name.trim() + '|' + s; return '<td><input class="input input--sm" type="number" min="0" step="1" inputmode="numeric" data-pe="stock" data-key="' + esc(k) + '" value="' + esc(pe.stock[k] == null ? 0 : pe.stock[k]) + '" aria-label="Stock for ' + esc(c.name) + ' ' + esc(s) + '"></td>'; }).join('') + '</tr>').join('') + '</tbody></table>';
  }
  function renderImages() {
    const names = pe.colors.map((c) => c.name.trim()).filter(Boolean);
    $('#pe-images').innerHTML = pe.images.length
      ? '<div class="upload-grid">' + pe.images.map((im, i) =>
        '<div class="upload-tile" data-src="' + esc(im.src) + '"><div class="upload-tile__img"><img src="' + esc(im.src) + '" alt="Photograph ' + (i + 1) + (i === 0 ? ' (main image)' : '') + '" onerror="UI.imgFail(this)">' +
        (i === 0 ? '<span class="upload-tile__badge">Main</span>' : '') + (im.sample ? '<span class="upload-tile__badge upload-tile__badge--sample">Sample</span>' : '') +
        '<button type="button" data-action="pe-remove-image" data-i="' + i + '" aria-label="Remove photograph ' + (i + 1) + '">&times;</button></div>' +
        '<label class="sr-only" for="pe-ic-' + i + '">Colour shown with photograph ' + (i + 1) + '</label><select class="select select--sm" id="pe-ic-' + i + '" data-change="pe-img-color" data-i="' + i + '"><option value="">All colours</option>' + names.map((n) => '<option' + (im.color === n ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select>' +
        (i > 0 ? '<button type="button" class="link small" data-action="pe-make-main" data-i="' + i + '">Make main</button>' : '') + '</div>').join('') + '</div>'
      : '<p class="muted small" style="margin-bottom:12px">No photographs yet &mdash; the shop will show a &ldquo;photograph coming soon&rdquo; placeholder.</p>';
  }
  function readPe() {
    const f = $('form[data-form="product"]');
    if (!f) return;
    const v = UI.formValues(f);
    ['name', 'categoryId', 'fabric', 'description', 'care', 'price', 'salePrice', 'features'].concat(ATTR_FIELDS.map((a) => a[0])).forEach((k) => { if (k in v) pe[k] = v[k]; });
    pe.active = !!v.active; pe.featured = !!v.featured;
    $$('[data-pe="cname"]', f).forEach((el) => { pe.colors[el.dataset.i].name = el.value; });
    $$('[data-pe="hex"]', f).forEach((el) => { pe.colors[el.dataset.i].hex = el.value; });
    $$('[data-pe="stock"]', f).forEach((el) => { pe.stock[el.dataset.key] = el.value; });
  }
  document.addEventListener('input', (e) => {
    if (!pe || !e.target.dataset || !e.target.dataset.pe) return;
    if (e.target.dataset.pe === 'cname' || e.target.dataset.pe === 'hex') { readPe(); renderMatrix(); }
    else if (e.target.dataset.pe === 'stock') pe.stock[e.target.dataset.key] = e.target.value;
  });
  actions['pe-add-color'] = () => { readPe(); pe.colors.push({ name: '', hex: '#B49A72' }); renderPe(); const r = $$('[data-pe="cname"]'); r[r.length - 1].focus(); };
  actions['pe-remove-color'] = (el) => { readPe(); pe.colors.splice(Number(el.dataset.i), 1); renderPe(); };
  changes['pe-color-preset'] = (el) => {
    if (!el.value) return;
    readPe();
    if (!pe.colors.some((c) => c.name.toLowerCase() === el.value.toLowerCase())) pe.colors.push({ name: el.value, hex: root.BFSeed.COLORS[el.value] });
    el.value = ''; renderPe();
  };
  actions['pe-toggle-size'] = (el) => { readPe(); const s = el.dataset.size; pe.sizes = pe.sizes.includes(s) ? pe.sizes.filter((x) => x !== s) : pe.sizes.concat(s); renderPe(); };
  actions['pe-add-size'] = () => { readPe(); const i = $('#pe-size-new'), s = i.value.trim(); if (s && !pe.sizes.includes(s)) pe.sizes.push(s); renderPe(); };
  actions['pe-remove-image'] = (el) => { readPe(); pe.images.splice(Number(el.dataset.i), 1); renderImages(); };
  const MAX_IMAGES = 12;
  const newImage = (src) => ({ src, color: '', alt: '', sample: false });
  changes['pe-upload-main'] = async (el) => {
    const file = (el.files || [])[0];
    readPe();
    if (file) { try { const src = await UI.resizeImage(file, 1200); if (pe.images.length) pe.images[0] = newImage(src); else pe.images.push(newImage(src)); } catch (e) { UI.fail(e); } }
    el.value = ''; renderImages();
  };
  changes['pe-upload-gallery'] = async (el) => {
    readPe();
    for (const file of Array.from(el.files || [])) {
      if (pe.images.length >= MAX_IMAGES) { UI.toast('A product can have up to ' + MAX_IMAGES + ' photographs.', 'error'); break; }
      try { pe.images.push(newImage(await UI.resizeImage(file, 1200))); } catch (e) { UI.fail(e); }
    }
    el.value = ''; renderImages();
  };
  actions['pe-add-url'] = () => {
    const input = $('#pe-url'), url = input.value.trim();
    if (!/^https:\/\/[^\s]+$/i.test(url)) { UI.toast('Paste a full https:// image link.', 'error'); return; }
    if (pe.images.length >= MAX_IMAGES) { UI.toast('A product can have up to ' + MAX_IMAGES + ' photographs.', 'error'); return; }
    readPe(); pe.images.push(newImage(url)); input.value = ''; renderImages();
  };
  actions['pe-make-main'] = (el) => { readPe(); const [im] = pe.images.splice(Number(el.dataset.i), 1); pe.images.unshift(im); renderImages(); };
  changes['pe-img-color'] = (el) => { pe.images[Number(el.dataset.i)].color = el.value; };
  forms.product = (f) => {
    readPe();
    const input = {
      id: pe.id, name: pe.name, categoryId: pe.categoryId, description: pe.description, fabric: pe.fabric, care: pe.care, price: pe.price, salePrice: pe.salePrice,
      featured: pe.featured, active: pe.active, images: pe.images, colors: pe.colors.filter((c) => c.name.trim()), sizes: pe.sizes, stock: pe.stock, features: pe.features,
      style: pe.style, length: pe.length, silhouette: pe.silhouette, pattern: pe.pattern, material: pe.material, neckline: pe.neckline, sleeve: pe.sleeve, embellishment: pe.embellishment
    };
    UI.showFieldErrors(f, {});
    try { api.saveProduct(input); pe = null; UI.toast('Product saved.'); UI.nav('#/admin/products'); }
    catch (e) {
      if (e.fields) { UI.showFieldErrors(f, e.fields); $('#pe-error').innerHTML = '<div class="form-error" role="alert">' + esc(e.message) + '</div>'; }
      else UI.fail(e);
    }
  };

  /* route: products/new and products/:id */
  const productsList = sections.products;
  sections.products = (ctx, u) => (ctx.segs[2] ? sections.products_edit(ctx, u) : (pe = null, productsList(ctx, u)));

  /* ===================== inventory ===================== */
  const invUI = { q: '', f: '' };
  sections.inventory = (ctx) => {
    if (ctx.query.f !== undefined) invUI.f = ctx.query.f;
    const html = head('Inventory', 'Stock is tracked per colour and size. Every change is logged below.') +
      '<section class="panel"><div class="toolbar"><div class="grow"><label class="sr-only" for="i-q">Search inventory</label><input class="input input--sm" style="width:100%" id="i-q" data-input="inv-q" placeholder="Search product, colour, size or SKU" value="' + esc(invUI.q) + '"></div>' +
      '<label class="sr-only" for="i-f">Filter</label><select class="select select--sm" id="i-f" data-change="inv-f"><option value="">All variants</option><option value="low"' + (invUI.f === 'low' ? ' selected' : '') + '>Low stock</option><option value="out"' + (invUI.f === 'out' ? ' selected' : '') + '>Sold out</option></select></div>' +
      '<div class="table-wrap" id="inv-table">' + invTable() + '</div></section>' +
      '<section class="panel"><div class="panel__head"><h2>Recent stock movements</h2></div><div class="table-wrap">' + movementsTable(api.movements().slice(0, 30)) + '</div></section>';
    return { title: 'Inventory — BoutiqueFlow admin', html, keepScroll: true };
  };
  function invTable() {
    const q = invUI.q.trim().toLowerCase();
    const list = api.inventory().filter((v) => (invUI.f === 'low' ? v.low : invUI.f === 'out' ? v.out : true) && (!q || (v.productName + ' ' + v.color + ' ' + v.size + ' ' + v.sku).toLowerCase().includes(q)));
    if (!list.length) return emptyBox('Nothing to show', invUI.f ? 'No variants match this filter.' : 'No variants found.', '<button type="button" class="btn btn--secondary btn--sm" data-action="clear-inv">Clear filters</button>');
    return '<table class="table"><thead><tr><th>Product</th><th>Variant</th><th>SKU</th><th class="num">In stock</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
      list.map((v) => '<tr><td>' + esc(v.productName) + (v.productActive ? '' : ' <span class="badge badge--inactive">Inactive</span>') + '<br><span class="xs muted">' + esc(v.category) + '</span></td><td>' + esc(v.color) + ' / ' + esc(v.size) + '</td><td class="small">' + esc(v.sku) + '</td><td class="num"><span class="stock-num ' + (v.out ? 'stock-num--out' : v.low ? 'stock-num--low' : '') + '">' + v.stock + '</span></td>' +
        '<td>' + (v.out ? '<span class="badge badge--out">Sold out</span>' : v.low ? '<span class="badge badge--low">Low stock</span>' : '<span class="badge badge--active">OK</span>') + '</td><td class="actions"><button type="button" class="btn btn--secondary btn--sm" data-action="adjust-stock" data-id="' + v.id + '">Adjust</button> <button type="button" class="btn btn--ghost btn--sm" data-action="stock-history" data-id="' + v.id + '">History</button></td></tr>').join('') + '</tbody></table>';
  }
  function movementsTable(list) {
    if (!list.length) return emptyBox('No movements yet', 'Stock changes will be listed here.');
    return '<table class="table"><thead><tr><th>When</th><th>Product</th><th>Variant</th><th>Type</th><th class="num">Change</th><th class="num">Balance</th><th>Reference</th><th>By</th></tr></thead><tbody>' +
      list.map((m) => '<tr><td class="nowrap">' + fmtDateTime(m.at) + '</td><td>' + esc(m.productName) + '</td><td class="small">' + esc(m.variantLabel) + '</td><td>' + esc(m.type) + (m.reason ? '<br><span class="xs muted">' + esc(m.reason) + '</span>' : '') + '</td><td class="num"><strong style="font-weight:500;color:' + (m.qty < 0 ? 'var(--bad-fg)' : 'var(--ok-fg)') + '">' + (m.qty > 0 ? '+' : '') + m.qty + '</strong></td><td class="num">' + m.balance + '</td><td class="small">' + esc(m.orderNo || '—') + '</td><td class="small">' + esc(m.by) + '</td></tr>').join('') + '</tbody></table>';
  }
  const redrawInv = () => { const t = $('#inv-table'); if (t) t.innerHTML = invTable(); };
  inputs['inv-q'] = (el) => { invUI.q = el.value; redrawInv(); };
  changes['inv-f'] = (el) => { invUI.f = el.value; redrawInv(); };
  actions['clear-inv'] = () => { invUI.q = invUI.f = ''; UI.rerender(); };
  actions['stock-history'] = (el) => {
    const v = api.inventory().find((x) => x.id === el.dataset.id);
    UI.openModal({ title: 'Stock history', size: 'wide', html: '<p class="muted small" style="margin-bottom:12px">' + esc(v.productName) + ' &middot; ' + esc(v.color) + ' / ' + esc(v.size) + ' &middot; ' + esc(v.sku) + '</p><div class="table-wrap">' + movementsTable(api.movements(v.id)) + '</div>' });
  };
  actions['adjust-stock'] = (el) => {
    const v = api.inventory().find((x) => x.id === el.dataset.id);
    UI.openModal({
      title: 'Adjust stock', size: 'sm',
      html: '<p class="muted small">' + esc(v.productName) + ' &middot; ' + esc(v.color) + ' / ' + esc(v.size) + '<br>Currently <strong>' + v.stock + '</strong> in stock.</p><form data-form="adjust" novalidate data-id="' + v.id + '" style="margin-top:16px">' +
        UI.field({ id: 'mode', label: 'Action', as: 'select', options: [{ value: 'add', label: 'Add stock (+)' }, { value: 'remove', label: 'Remove stock (−)' }, { value: 'set', label: 'Set exact count' }] }) +
        UI.field({ id: 'value', label: 'Quantity', type: 'number', required: true, attrs: 'min="0" step="1" inputmode="numeric"' }) +
        UI.field({ id: 'type', label: 'Reason type', as: 'select', options: ['Restock', 'Adjustment', 'Damaged / Write-off'] }) + UI.field({ id: 'reason', label: 'Note', opt: true, placeholder: 'e.g. Supplier delivery PO-1042' }) +
        '<div class="modal__actions"><button type="button" class="btn btn--secondary" data-action="modal-close">Cancel</button><button type="submit" class="btn btn--primary">Save adjustment</button></div></form>'
    });
  };
  forms.adjust = (f) => {
    const n = Number(f.value.value);
    if (f.value.value === '' || !Number.isInteger(n) || n < 0) { UI.showFieldErrors(f, { value: 'Enter a whole number, zero or more.' }); return; }
    const mode = f.mode.value;
    try {
      api.adjustStock(f.dataset.id, { mode: mode === 'set' ? 'set' : 'delta', value: mode === 'remove' ? -n : n, type: f.type.value, reason: f.reason.value });
      UI.closeModal(); UI.toast('Stock updated.'); UI.refreshAdminChrome(); UI.rerender();
    } catch (e) { if (e.code === 'VALIDATION') UI.showFieldErrors(f, { value: e.message }); else UI.fail(e); }
  };

  /* ===================== customers ===================== */
  const custUI = { q: '' };
  sections.customers = (ctx, u) => {
    const html = head('Customers', u.role === 'Admin' ? 'Everyone who has ordered or registered.' : 'Contact and delivery details for fulfilment.') +
      '<section class="panel"><div class="toolbar"><div class="grow"><label class="sr-only" for="c-q">Search customers</label><input class="input input--sm" style="width:100%" id="c-q" data-input="cust-q" placeholder="Search name, email or city" value="' + esc(custUI.q) + '"></div></div><div class="table-wrap" id="cust-table">' + custTable(u) + '</div></section>';
    return { title: 'Customers — BoutiqueFlow admin', html, keepScroll: true };
  };
  function custTable(u) {
    const q = custUI.q.trim().toLowerCase();
    const list = api.customers().filter((c) => !q || (c.name + ' ' + c.email + ' ' + c.city).toLowerCase().includes(q));
    if (!list.length) return emptyBox('No customers found', 'Try a different search.');
    const admin = u.role === 'Admin';
    return '<table class="table"><thead><tr><th>Customer</th><th>Phone</th><th>City</th><th class="num">Orders</th>' + (admin ? '<th class="num">Lifetime value</th>' : '') + '<th>Last order</th></tr></thead><tbody>' +
      list.map((c) => '<tr><td><strong style="font-weight:500">' + esc(c.name) + '</strong>' + (c.guest ? ' <span class="badge badge--inactive">Guest</span>' : '') + '<br><span class="xs muted">' + esc(c.email) + '</span></td><td>' + esc(c.phone || '—') + '</td><td>' + esc(c.city || '—') + '</td><td class="num">' + c.orders + '</td>' + (admin ? '<td class="num">' + money(c.lifetime) + '</td>' : '') + '<td>' + (c.orders ? fmtDate(c.last) : '—') + '</td></tr>').join('') + '</tbody></table>';
  }
  inputs['cust-q'] = (el) => { custUI.q = el.value; const t = $('#cust-table'); if (t) t.innerHTML = custTable(api.currentUser()); };

  /* ===================== staff ===================== */
  sections.staff = () => {
    const list = api.staffList();
    const html = head('Staff', 'Control who can manage products and fulfil orders.', '<button type="button" class="btn btn--primary btn--sm" data-action="staff-edit">Add staff member</button>') +
      '<section class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Role</th><th>Permissions</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
      list.map((s) => '<tr><td><strong style="font-weight:500">' + esc(s.name) + '</strong><br><span class="xs muted">' + esc(s.email) + '</span></td><td>' + esc(s.role) + '</td><td>' + (s.role === 'Admin' ? '<span class="muted small">Full access</span>' : [s.permissions.products ? '<span class="badge badge--confirmed">Products &amp; stock</span>' : '', s.permissions.fulfilment ? '<span class="badge badge--packed">Fulfilment</span>' : ''].filter(Boolean).join(' ') || '<span class="muted small">Dashboard only</span>') + '</td><td>' + (s.active ? '<span class="badge badge--active">Active</span>' : '<span class="badge badge--inactive">Deactivated</span>') + '</td><td class="actions"><button type="button" class="btn btn--secondary btn--sm" data-action="staff-edit" data-id="' + s.id + '">Edit</button></td></tr>').join('') + '</tbody></table></div></section>' +
      '<p class="form-note">Permissions are checked by the back end on every request, not just in the menu: a fulfilment-only member who opens a product URL directly is still refused.</p>';
    return { title: 'Staff — BoutiqueFlow admin', html };
  };
  actions['staff-edit'] = (el) => {
    const s = el.dataset.id ? api.staffList().find((x) => x.id === el.dataset.id) : null;
    const me = api.currentUser();
    UI.openModal({
      title: s ? 'Edit staff member' : 'Add staff member',
      html: '<form data-form="staff" novalidate><input type="hidden" name="id" value="' + (s ? s.id : '') + '"><div class="form-grid form-grid--2">' + UI.field({ id: 'name', label: 'Full name', value: s ? s.name : '', required: true }) + UI.field({ id: 'email', label: 'Email', type: 'email', value: s ? s.email : '', required: true }) +
        UI.field({ id: 'phone', label: 'Mobile', type: 'tel', value: s ? s.phone : '', opt: true }) + UI.field({ id: 'role', label: 'Role', as: 'select', value: s ? s.role : 'Staff', options: ['Staff', 'Admin'] }) +
        UI.field({ id: 'password', label: s ? 'New password' : 'Password', type: 'password', required: !s, opt: !!s, autocomplete: 'new-password', span: true, hint: s ? 'Leave blank to keep the current password.' : 'At least 8 characters.' }) + '</div>' +
        '<fieldset style="border:1px solid var(--line);padding:12px 16px;margin:0 0 16px"><legend class="field__label" style="padding:0 6px">Permissions (Staff role)</legend><div class="perm-grid"><label class="check"><input type="checkbox" name="p_products"' + (s && s.permissions.products ? ' checked' : '') + '> Products &amp; inventory</label><label class="check"><input type="checkbox" name="p_fulfilment"' + (s && s.permissions.fulfilment ? ' checked' : '') + '> Orders &amp; fulfilment</label></div><p class="field__hint" style="margin-top:6px">Admins always have full access.</p></fieldset>' +
        '<label class="check"><input type="checkbox" name="active"' + (!s || s.active ? ' checked' : '') + (s && me && s.id === me.id ? ' disabled' : '') + '> Account is active</label>' +
        '<div class="modal__actions"><button type="button" class="btn btn--secondary" data-action="modal-close">Cancel</button><button type="submit" class="btn btn--primary">Save</button></div></form>'
    });
  };
  forms.staff = (f) => {
    const v = UI.formValues(f);
    const id = v.id || undefined;
    try {
      api.saveStaff({ id, name: v.name, email: v.email, phone: v.phone, role: v.role, password: v.password, active: f.active.disabled ? true : v.active, permissions: { products: v.p_products, fulfilment: v.p_fulfilment } });
      UI.closeModal(); UI.toast('Staff member saved.'); UI.rerender();
    } catch (e) { if (e.fields) UI.showFieldErrors(f, e.fields); else UI.fail(e); }
  };

  /* ===================== reports ===================== */
  function barChart(rows, o) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    const peak = rows.reduce((a, r) => (r.value > a.value ? r : a), rows[0]);
    return '<div class="bars" role="group" aria-label="' + esc(o.label) + '">' + rows.map((r) => {
      const label = r.label + ': ' + o.fmt(r.value) + (r.extra ? ' · ' + r.extra : '');
      return '<div class="bars__col" tabindex="0" role="img" aria-label="' + esc(label) + '" data-tip="' + esc(label) + '"><div class="bars__wrap">' + (r === peak && r.value > 0 ? '<span class="bars__val">' + o.fmt(r.value) + '</span>' : '') + '<div class="bars__bar" style="height:' + Math.max(1, Math.round(r.value / max * 86)) + '%"></div></div><span class="bars__label">' + esc(r.short || r.label) + '</span></div>';
    }).join('') + '</div>';
  }
  const hbars = (rows, o) => rows.map((r) => '<div class="hbar"><span>' + esc(r.label) + '</span><div class="hbar__track"><div class="hbar__fill" style="width:' + Math.max(1, Math.round(r.value / Math.max(1, o.max) * 100)) + '%"></div></div><span class="hbar__pct">' + esc(o.fmt(r)) + '</span></div>').join('');

  sections.reports = () => {
    const r = api.reports();
    const t = r.totals;
    const daily = r.daily.map((d) => ({ label: d.label, short: d.label.split(' ')[0], value: d.sales, extra: d.orders + (d.orders === 1 ? ' order' : ' orders') }));
    const card = (l, v, s) => '<div class="stat"><span class="stat__label">' + l + '</span><span class="stat__value">' + v + '</span><span class="stat__sub">' + s + '</span></div>';
    const statusMax = Math.max(1, ...r.status.map((s) => s.count));
    const orderMini = (list, extra) => list.length ? '<table class="table"><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th class="num">Total</th><th>' + extra + '</th></tr></thead><tbody>' + list.slice(0, 8).map((o) => '<tr><td><button type="button" class="row-link" data-action="admin-order" data-no="' + esc(o.orderNo) + '">' + esc(o.orderNo) + '</button></td><td>' + fmtDate(o.created) + '</td><td>' + esc(o.customerName) + '</td><td class="num">' + money(o.total) + '</td><td>' + (extra === 'Reason' ? esc(o.cancelReason || '—') : UI.payBadge(o.paymentStatus) + ' ' + UI.statusBadge(o.status)) + '</td></tr>').join('') + '</tbody></table>' : emptyBox('None', extra === 'Reason' ? 'No cancelled orders.' : 'No payments are outstanding.');
    const html = head('Reports', 'Sales and operations at a glance. Cancelled orders are excluded from sales.', '<button type="button" class="btn btn--secondary btn--sm" data-action="export-sales">Export daily sales CSV</button>') +
      '<div class="stat-grid">' + card('Total sales', money(t.sales), 'all non-cancelled orders') + card('Orders', t.orders, 'all time') + card('Average order', money(t.avg), 'per non-cancelled order') + card('Cancellation rate', t.cancelRate + '%', r.cancelled.length + ' cancelled') + '</div>' +
      '<section class="panel"><div class="panel__head"><h2>Daily sales &middot; last 14 days</h2><span class="muted small">Hover a bar for the day&rsquo;s figures</span></div><div class="panel__body">' + barChart(daily, { label: 'Daily sales in rupees', fmt: money }) +
      '<details style="margin-top:16px"><summary class="link small" style="cursor:pointer">View as table</summary><div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th class="num">Orders</th><th class="num">Sales</th></tr></thead><tbody>' + r.daily.slice().reverse().map((d) => '<tr><td>' + d.label + '</td><td class="num">' + d.orders + '</td><td class="num">' + money(d.sales) + '</td></tr>').join('') + '</tbody></table></div></details></div></section>' +
      '<div class="cols-2"><section class="panel"><div class="panel__head"><h2>Monthly sales</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Month</th><th class="num">Orders</th><th class="num">Sales</th><th class="num">Avg order</th></tr></thead><tbody>' + r.monthly.slice().reverse().map((m) => '<tr><td>' + m.label + '</td><td class="num">' + m.orders + '</td><td class="num">' + money(m.sales) + '</td><td class="num">' + (m.avg ? money(m.avg) : '—') + '</td></tr>').join('') + '</tbody></table></div></section>' +
      '<section class="panel"><div class="panel__head"><h2>Order volume &amp; fulfilment</h2></div><div class="panel__body">' + hbars(r.status.map((s) => ({ label: s.status, value: s.count })), { max: statusMax, fmt: (x) => x.value }) + '</div></section></div>' +
      '<div class="cols-2" style="margin-top:20px"><section class="panel"><div class="panel__head"><h2>Best-selling products</h2><button type="button" class="link small" data-action="export-best">Export CSV</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Product</th><th class="num">Units</th><th class="num">Revenue</th></tr></thead><tbody>' + r.best.map((b) => '<tr><td>' + esc(b.name) + '</td><td class="num">' + b.units + '</td><td class="num">' + money(b.revenue) + '</td></tr>').join('') + '</tbody></table></div></section>' +
      '<section class="panel"><div class="panel__head"><h2>Category-wise sales</h2></div><div class="panel__body">' + hbars(r.categories.map((c) => ({ label: c.name, value: c.revenue, share: c.share })), { max: Math.max(1, ...r.categories.map((c) => c.revenue)), fmt: (x) => x.share + '%' }) +
      '<table class="table-plain" style="margin-top:12px"><tbody>' + r.categories.map((c) => '<tr><td>' + esc(c.name) + '</td><td class="right">' + c.units + ' units</td><td class="right">' + money(c.revenue) + '</td></tr>').join('') + '</tbody></table></div></section></div>' +
      '<section class="panel" style="margin-top:20px"><div class="panel__head"><h2>Low-stock inventory</h2><a class="link small link--plain" href="#/admin/inventory?f=low">Manage stock</a></div>' +
      (r.lowStock.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Product</th><th>Variant</th><th>SKU</th><th class="num">Left</th></tr></thead><tbody>' + r.lowStock.map((v) => '<tr><td>' + esc(v.productName) + '</td><td>' + esc(v.color) + ' / ' + esc(v.size) + '</td><td class="small">' + esc(v.sku) + '</td><td class="num"><span class="stock-num ' + (v.out ? 'stock-num--out' : 'stock-num--low') + '">' + v.stock + '</span></td></tr>').join('') + '</tbody></table></div>' : emptyBox('Well stocked', 'No variants are at or below the threshold.')) + '</section>' +
      '<div class="cols-2"><section class="panel"><div class="panel__head"><h2>Cancelled orders</h2><span class="muted small">' + r.cancelled.length + ' total</span></div><div class="table-wrap">' + orderMini(r.cancelled, 'Reason') + '</div></section>' +
      '<section class="panel"><div class="panel__head"><h2>Pending payments</h2><span class="muted small">' + r.pendingPayments.length + ' open</span></div><div class="table-wrap">' + orderMini(r.pendingPayments, 'Payment · status') + '</div></section></div>';
    return { title: 'Reports — BoutiqueFlow admin', html };
  };
  actions['export-sales'] = () => { const r = api.reports(); UI.downloadCsv('boutiqueflow-daily-sales.csv', [['Date', 'Orders', 'Sales (INR)']].concat(r.daily.map((d) => [d.key, d.orders, d.sales]))); };
  actions['export-best'] = () => { const r = api.reports(); UI.downloadCsv('boutiqueflow-best-sellers.csv', [['Product', 'Units', 'Revenue (INR)']].concat(r.best.map((b) => [b.name, b.units, b.revenue]))); };

  /* chart tooltip */
  let tip = null;
  const showTip = (el) => {
    if (!tip) { tip = document.createElement('div'); tip.setAttribute('role', 'tooltip'); tip.style.cssText = 'position:fixed;z-index:400;background:#29231F;color:#F8F5F0;padding:6px 10px;border-radius:2px;font-size:.8rem;pointer-events:none;white-space:nowrap'; document.body.appendChild(tip); }
    tip.textContent = el.dataset.tip; tip.hidden = false;
    const r = el.getBoundingClientRect(), w = tip.offsetWidth;
    tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    tip.style.top = Math.max(8, r.top - 36) + 'px';
  };
  const hideTip = () => { if (tip) tip.hidden = true; };
  document.addEventListener('mouseover', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) showTip(el); });
  document.addEventListener('mouseout', (e) => { if (e.target.closest && e.target.closest('[data-tip]')) hideTip(); });
  document.addEventListener('focusin', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) showTip(el); });
  document.addEventListener('focusout', hideTip);

  /* ===================== notifications ===================== */
  sections.notifications = () => {
    const list = api.notifications();
    const unread = list.filter((n) => !n.read).length;
    const html = head('Notifications', 'New orders, cancellations and low-stock alerts. Alerts are shown here; customer emails are simulated in this demonstration.', unread ? '<button type="button" class="btn btn--secondary btn--sm" data-action="mark-read">Mark all as read</button>' : '') +
      (list.length ? list.slice(0, 60).map(noticeHtml).join('') : '<div class="empty empty--box"><h3 class="h3">No notifications</h3><p>New orders and stock alerts will appear here.</p></div>');
    return { title: 'Notifications — BoutiqueFlow admin', html };
  };
  actions['mark-read'] = () => { api.markNotificationsRead(); UI.refreshAdminChrome(); UI.rerender(); };

  /* ===================== settings ===================== */
  sections.settings = () => {
    const s = api.settings();
    const row = (k, a, b) => '<tr><td>' + k + '</td><td>' + a + '</td><td class="small muted">' + b + '</td></tr>';
    const html = head('Settings', 'Store rules, promotions and integration status.') +
      '<div class="cols-2"><section class="panel"><div class="panel__head"><h2>Store rules</h2></div><div class="panel__body"><form data-form="settings" novalidate>' +
      UI.field({ id: 'lowStockThreshold', label: 'Low-stock alert threshold', type: 'number', value: s.lowStockThreshold, attrs: 'min="0" step="1"', hint: 'A variant at or below this number raises an alert.' }) +
      UI.field({ id: 'deliveryFee', label: 'Delivery fee (₹)', type: 'number', value: s.deliveryFee, attrs: 'min="0" step="1"' }) +
      UI.field({ id: 'freeDeliveryOver', label: 'Free delivery above (₹)', type: 'number', value: s.freeDeliveryOver, attrs: 'min="0" step="1"' }) +
      '<button class="btn btn--primary" type="submit">Save settings</button></form></div></section>' +
      '<section class="panel"><div class="panel__head"><h2>Integration status</h2></div><div class="table-wrap"><table class="table-plain"><thead><tr><th>Service</th><th>Status</th><th>Note</th></tr></thead><tbody>' +
      row('Payment gateway', '<span class="badge badge--pending">Simulated</span>', 'No gateway connected. Cash on Delivery works end to end.') + row('Email notifications', '<span class="badge badge--pending">Simulated</span>', 'Logged in-app only; nothing is sent.') + row('SMS / WhatsApp', '<span class="badge badge--inactive">Not configured</span>', 'Out of scope for this build.') + row('Courier tracking', '<span class="badge badge--inactive">Manual</span>', 'Tracking numbers are entered by staff.') + '</tbody></table></div></section></div>' +
      '<section class="panel"><div class="panel__head"><h2>Promo codes</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Code</th><th>Offer</th><th class="num">Minimum</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
      s.promos.map((p) => '<tr><td><strong style="font-weight:500">' + esc(p.code) + '</strong></td><td>' + esc(p.note) + '</td><td class="num">' + (p.min ? money(p.min) : '—') + '</td><td>' + (p.active ? '<span class="badge badge--active">Active</span>' : '<span class="badge badge--inactive">Paused</span>') + '</td><td class="actions"><button type="button" class="btn btn--secondary btn--sm" data-action="toggle-promo" data-id="' + p.id + '">' + (p.active ? 'Pause' : 'Activate') + '</button></td></tr>').join('') + '</tbody></table></div>' +
      '<div class="panel__body" style="border-top:1px solid var(--line)"><form data-form="promo-add" novalidate class="form-grid form-grid--3" style="align-items:end">' + UI.field({ id: 'code', label: 'New code', placeholder: 'AUTUMN15' }) + UI.field({ id: 'type', label: 'Type', as: 'select', options: [{ value: 'percent', label: 'Percent off' }, { value: 'flat', label: 'Flat amount off' }] }) + UI.field({ id: 'value', label: 'Value', type: 'number', attrs: 'min="1" step="1"' }) + UI.field({ id: 'min', label: 'Minimum order (₹)', type: 'number', opt: true, attrs: 'min="0" step="1"' }) + UI.field({ id: 'cap', label: 'Max discount (₹)', type: 'number', opt: true, attrs: 'min="0" step="1"' }) + '<div class="field"><button class="btn btn--secondary" type="submit">Add code</button></div></form></div></section>' +
      '<section class="panel"><div class="panel__head"><h2>Demo data</h2></div><div class="panel__body"><p class="muted small" style="margin-bottom:12px">Restores the original sample catalogue, customers and order history, and signs you out. This browser only.</p><button type="button" class="btn btn--danger btn--sm" data-action="reset-demo">Reset demo data</button></div></section>';
    return { title: 'Settings — BoutiqueFlow admin', html };
  };
  forms.settings = (f) => { try { api.saveSettings(UI.formValues(f)); UI.toast('Settings saved.'); } catch (e) { UI.fail(e); } };
  forms['promo-add'] = (f) => {
    try { api.savePromo(UI.formValues(f)); UI.toast('Promo code added.'); UI.rerender(); } catch (e) { UI.fail(e); }
  };
  actions['toggle-promo'] = (el) => {
    const p = api.settings().promos.find((x) => x.id === el.dataset.id);
    try { api.savePromo(Object.assign({}, p, { active: !p.active })); UI.rerender(); } catch (e) { UI.fail(e); }
  };
  actions['reset-demo'] = async () => {
    const r = await UI.confirmDialog({ title: 'Reset all demo data?', message: 'Every product, order and account change you have made in this browser will be replaced by the original sample data.', confirmLabel: 'Reset demo data', cancelLabel: 'Cancel', danger: true });
    if (!r) return;
    try { api.resetDemo(); try { sessionStorage.removeItem('bf_checkout'); } catch (e) { /* ignore */ } UI.toast('Demo data restored.'); UI.nav('#/'); location.reload(); } catch (e) { UI.fail(e); }
  };
})(window);

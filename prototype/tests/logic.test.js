/* Runs the BoutiqueFlow business rules headlessly:  node --test prototype/tests/logic.test.js
   Covers the QA journey from the brief: browse, variants, bag, checkout, stock, fulfilment,
   cancellation, permissions and notifications. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};
require('../js/seed.js');
require('../js/db.js');
const { api, _internals, BFError } = globalThis.BF;
const DEMO = 'demo1234';

const goodContact = { name: 'Test Buyer', email: 'buyer@example.com', phone: '9876543210' };
const goodAddress = { line1: '12 Temple Road', line2: '', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' };

function fresh() { _internals.reset(); }
function inStockVariant(slug, minStock) {
  const p = api.product(slug);
  return p.variants.find((v) => v.stock >= (minStock || 1));
}
function stockOf(variantId) { return _internals.db.variants.find((v) => v.id === variantId).stock; }
function throwsCode(fn, code) {
  assert.throws(fn, (e) => e instanceof BFError && e.code === code, 'expected BFError ' + code);
}

test('seed data is internally consistent', () => {
  fresh();
  const db = _internals.db;
  assert.equal(db.products.length, 25);
  assert.equal(db.categories.length, 7);
  assert.ok(db.orders.length > 50);
  assert.equal(new Set(db.orders.map((o) => o.orderNo)).size, db.orders.length, 'order numbers are unique');
  assert.equal(new Set(db.variants.map((v) => v.sku)).size, db.variants.length, 'SKUs are unique');
  db.variants.forEach((v) => {
    assert.ok(v.stock >= 0, 'no negative stock: ' + v.sku);
    const ledger = db.movements.filter((m) => m.variantId === v.id).reduce((s, m) => s + m.qty, 0);
    assert.equal(ledger, v.stock, 'inventory ledger matches stock for ' + v.sku);
  });
  db.orders.filter((o) => o.status === 'Cancelled').forEach((o) => {
    if (o.stockDeducted) assert.ok(o.stockRestored, 'cancelled order restored stock ' + o.orderNo);
  });
});

test('catalogue filters, availability and sorting', () => {
  fresh();
  assert.equal(api.products({ cat: 'sarees' }).length, 4);
  assert.ok(api.products({ cat: 'kurtis', size: 'XXL' }).length === 4);
  assert.equal(api.products({ cat: 'sarees', size: 'XXL' }).length, 0);
  const sage = api.products({ color: 'Sage' });
  assert.ok(sage.length > 0 && sage.every((p) => p.colors.some((c) => c.name === 'Sage')));
  const cheap = api.products({ max: 3000 });
  assert.ok(cheap.length > 0 && cheap.every((p) => p.effective <= 3000));
  const asc = api.products({ sort: 'price-asc' }).map((p) => p.effective);
  assert.deepEqual(asc, asc.slice().sort((a, b) => a - b));
  const desc = api.products({ sort: 'price-desc' }).map((p) => p.effective);
  assert.deepEqual(desc, desc.slice().sort((a, b) => b - a));
  const pop = api.products({ sort: 'popular' }).map((p) => p.popularity);
  assert.deepEqual(pop, pop.slice().sort((a, b) => b - a));
  const newest = api.products({ sort: 'newest' }).map((p) => +new Date(p.created));
  assert.deepEqual(newest, newest.slice().sort((a, b) => b - a));
  assert.ok(api.products({ q: 'chikankari' }).length >= 1);
  // sold-out variant is not offered when filtering to in-stock
  const emerald = api.products({ color: 'Emerald', cat: 'sarees', size: 'Free Size', avail: 'in' });
  const mahika = emerald.find((p) => p.slug === 'mahika-kanchipuram-silk-saree');
  assert.equal(mahika, undefined, 'Emerald Mahika is sold out so is excluded by availability filter');
  assert.ok(api.products({ cat: 'sarees', color: 'Emerald' }).some((p) => p.slug === 'mahika-kanchipuram-silk-saree'));
});

test('catalogue filters accept several sizes/colours (any-of) and an on-sale filter', () => {
  fresh();
  const sage = api.products({ color: 'Sage' }), blush = api.products({ color: 'Blush' });
  const both = api.products({ color: 'Sage,Blush' });
  assert.deepEqual(new Set(both.map((p) => p.slug)), new Set(sage.concat(blush).map((p) => p.slug)), 'Sage,Blush = Sage OR Blush');
  const ms = api.products({ size: 'S,M', cat: 'dresses' });
  assert.ok(ms.length > 0 && ms.every((p) => p.category === 'dresses'));
  assert.equal(api.products({ size: 'S,Free Size', cat: 'sarees' }).length, 4);
  assert.equal(api.products({ size: 'XXL,Free Size' }).length, 8, 'XXL kurtis (4) + Free Size sarees (4)');
  const sale = api.products({ sale: '1' });
  assert.equal(sale.length, 7);
  assert.ok(sale.every((p) => p.salePrice && p.salePrice < p.price));
  assert.equal(api.products({ sale: '1', cat: 'kurtis' }).length, 1);
  assert.equal(api.products({ color: 'Sage', size: 'XXL' }).every((p) => p.category === 'kurtis'), true, 'colour AND size combine');
});

test('attribute filters: any-of within a group, AND across groups, features need all ticked; relevance ranks name matches first', () => {
  fresh();
  const silk = api.products({ material: 'Silk' });
  assert.ok(silk.length >= 5 && silk.every((p) => p.material === 'Silk'));
  assert.ok(api.products({ material: 'Silk,Cotton' }).length > silk.length, 'two materials = union');
  const wedSilk = api.products({ material: 'Silk', style: 'Wedding' });
  assert.ok(wedSilk.length > 0 && wedSilk.every((p) => p.material === 'Silk' && p.style === 'Wedding'));
  assert.equal(api.products({ length: 'Midi' }).length, 3);
  assert.equal(api.products({ length: 'Maxi', silhouette: 'A-line' }).length, 1);
  assert.equal(api.products({ feature: 'For weddings' }).length, 8);
  assert.equal(api.products({ feature: 'For weddings,With embroidery' }).length, 3, 'features combine with AND (clutch + two lehengas)');
  assert.equal(api.products({ neckline: 'Collared', sleeve: 'Short' }).length, 1);
  assert.ok(api.products({ q: 'zari' }).length > 0, 'search also matches attributes (embellishment/pattern text)');
  const rel = api.products({ q: 'silk', sort: 'relevance' });
  assert.ok(rel.slice(0, 5).every((p) => /silk/i.test(p.name)), 'products with the search word in their name come first');
  // price range
  const mid = api.products({ min: '3000', max: '5000' });
  assert.ok(mid.length > 0 && mid.every((p) => p.effective >= 3000 && p.effective <= 5000));
});

test('staff can set filter attributes on a product and shoppers can then filter by them', () => {
  fresh();
  api.login('staff@boutiqueflow.demo', DEMO);
  const p = api.adminProducts().find((x) => x.slug === 'linen-boxy-shirt');
  const full = api.adminProduct(p.id);
  const stock = Object.fromEntries(full.variants.filter((v) => v.active).map((v) => [v.color + '|' + v.size, v.stock]));
  const base = { id: full.id, name: full.name, categoryId: full.categoryId, description: full.description, fabric: full.fabric, care: full.care.join('\n'), price: full.price, salePrice: full.salePrice || '', colors: full.colors, sizes: full.sizes, stock, active: true };
  api.saveProduct(Object.assign({}, base, { material: 'Organic linen', neckline: 'Camp collar', features: 'Handloom, With embroidery' }));
  api.logout();
  assert.equal(api.products({ material: 'Organic linen' }).map((x) => x.slug)[0], 'linen-boxy-shirt');
  assert.deepEqual(api.products({ neckline: 'Camp collar' })[0].features, ['Handloom', 'With embroidery']);
  // saving without attributes leaves them untouched
  api.login('staff@boutiqueflow.demo', DEMO);
  api.saveProduct(Object.assign({}, base, { price: full.price }));
  api.logout();
  assert.equal(api.products({ material: 'Organic linen' }).length, 1);
});

test('lehengas and ethnic sets are real categories with stock, sizes and prices', () => {
  fresh();
  const slugs = api.categories().map((c) => c.slug);
  assert.ok(slugs.includes('lehengas') && slugs.includes('ethnic-sets'));
  assert.equal(api.products({ cat: 'lehengas' }).length, 3);
  assert.equal(api.products({ cat: 'ethnic-sets' }).length, 2);
  const z = api.product('zardozi-bridal-lehenga');
  assert.equal(z.variants.length, 5);
  assert.ok(z.variants.every((v) => /^LEH0\d-CRI-/.test(v.sku) && v.stock > 0));
  assert.deepEqual(api.products({ cat: 'lehengas', sort: 'price-desc' }).map((p) => p.effective), [62000, 34900, 24500]);
  assert.ok(api.products({}).every((p) => Array.isArray(p.availableSizes) && p.availableSizes.every((s) => p.sizes.includes(s))), 'available sizes are a subset of the product sizes');
});

test('wishlist: save and remove, merge on sign-in, hidden on sign-out, drops deactivated products', () => {
  fresh();
  const z = api.product('zardozi-bridal-lehenga'), c = api.product('crepe-wrap-dress');
  assert.deepEqual(api.wishlistIds(), []);
  assert.deepEqual(api.wishlistToggle(z.id), { saved: true, count: 1 });
  assert.equal(api.wishlistProducts()[0].slug, 'zardozi-bridal-lehenga');
  assert.deepEqual(api.wishlistToggle(z.id), { saved: false, count: 0 });
  api.wishlistToggle(z.id);
  api.login('customer@boutiqueflow.demo', DEMO);
  assert.deepEqual(api.wishlistIds(), [z.id], 'the guest list merges into the account');
  api.wishlistToggle(c.id);
  api.logout();
  assert.deepEqual(api.wishlistIds(), [], 'a signed-out browser does not show the account list');
  api.login('customer@boutiqueflow.demo', DEMO);
  assert.deepEqual(api.wishlistIds().sort(), [z.id, c.id].sort(), 'the account list comes back');
  api.logout();
  api.login('staff@boutiqueflow.demo', DEMO);
  api.setProductActive(z.id, false);
  api.logout();
  api.login('customer@boutiqueflow.demo', DEMO);
  assert.deepEqual(api.wishlistIds(), [c.id], 'deactivated products drop out');
  assert.throws(() => api.wishlistToggle('nope'), (e) => e.code === 'NOT_FOUND');
});

test('sold-out variants cannot be added to the bag', () => {
  fresh();
  const p = api.product('mahika-kanchipuram-silk-saree');
  const sold = p.variants.find((v) => v.color === 'Emerald');
  assert.equal(sold.stock, 0);
  throwsCode(() => api.cartAdd(sold.id, 1), 'STOCK');
  assert.equal(api.cartCount(), 0);
});

test('bag respects available stock', () => {
  fresh();
  const v = inStockVariant('hand-painted-silk-scarf', 2);
  api.cartAdd(v.id, 1);
  const max = stockOf(v.id);
  throwsCode(() => api.cartAdd(v.id, max), 'STOCK'); // 1 + max exceeds stock
  throwsCode(() => api.cartSetQty(v.id, max + 1), 'STOCK');
  throwsCode(() => api.cartSetQty(v.id, 0), 'VALIDATION');
  const cart = api.cartSetQty(v.id, max);
  assert.equal(cart.lines[0].qty, max);
  assert.equal(api.cartRemove(v.id).lines.length, 0);
});

test('totals: delivery fee, free delivery threshold and promo codes', () => {
  fresh();
  const cheap = inStockVariant('block-print-cotton-kurti'); // 2100 on sale
  api.cartAdd(cheap.id, 1);
  let c = api.cart();
  assert.equal(c.totals.subtotal, 2100);
  assert.equal(c.totals.delivery, 150);
  assert.equal(c.totals.total, 2250);
  const big = inStockVariant('structured-leather-tote');
  api.cartAdd(big.id, 1);
  c = api.cart();
  assert.equal(c.totals.delivery, 0);
  throwsCode(() => api.applyPromo('NOPE'), 'PROMO');
  c = api.applyPromo('welcome10');
  assert.equal(c.totals.discount, Math.min(Math.round(c.totals.subtotal * 0.1), 1500));
  assert.equal(c.totals.total, c.totals.subtotal - c.totals.discount + c.totals.delivery);
  c = api.applyPromo('');
  assert.equal(c.totals.discount, 0);
});

test('checkout validates required fields', () => {
  fresh();
  const v = inStockVariant('linen-mandarin-collar-kurti');
  api.cartAdd(v.id, 1);
  assert.throws(() => api.placeOrder({ contact: { name: '', email: 'bad', phone: '123' }, address: {}, method: '' }), (e) => {
    return e.code === 'VALIDATION' && ['name', 'email', 'phone', 'line1', 'city', 'state', 'pincode', 'method'].every((f) => !!e.fields[f]);
  });
  assert.equal(api.cartCount(), 1, 'bag is untouched after failed validation');
});

test('COD checkout creates an order, deducts stock once, and snapshots the purchase', () => {
  fresh();
  const v = inStockVariant('anaya-chikankari-kurti', 3);
  const before = stockOf(v.id);
  api.cartAdd(v.id, 2);
  const { order, needsPayment } = api.placeOrder({ contact: goodContact, address: goodAddress, method: 'COD' });
  assert.equal(needsPayment, false);
  assert.match(order.orderNo, /^BF-\d{6}-\d+$/);
  assert.equal(order.status, 'Confirmed');
  assert.equal(order.paymentStatus, 'Pending');
  assert.equal(stockOf(v.id), before - 2);
  assert.equal(api.cartCount(), 0);
  assert.equal(order.items.length, 1);
  const it = order.items[0];
  assert.equal(it.productName, 'Anaya Chikankari Kurti');
  assert.equal(it.unitPrice, 3900);
  assert.equal(it.qty, 2);
  assert.ok(it.sku && it.size && it.color);
  assert.equal(order.total, 3900 * 2); // above free-delivery threshold
  const mv = _internals.db.movements.filter((m) => m.orderNo === order.orderNo);
  assert.equal(mv.length, 1);
  assert.equal(mv[0].qty, -2);
  assert.ok(order.etaFrom && order.etaTo);
  // repeating the confirmation step (a retried workflow) must not deduct again
  _internals.confirmOrder(_internals.db.orders.find((o) => o.id === order.id), {});
  _internals.confirmOrder(_internals.db.orders.find((o) => o.id === order.id), {});
  assert.equal(stockOf(v.id), before - 2);
  assert.equal(_internals.db.movements.filter((m) => m.orderNo === order.orderNo).length, 1);
  // guest can view their own order from this browser session, with the right email
  assert.equal(api.order(order.orderNo).orderNo, order.orderNo);
});

test('simulated payment: stock is deducted on payment, and not twice', () => {
  fresh();
  const v = inStockVariant('silk-charmeuse-camisole', 3);
  const before = stockOf(v.id);
  api.cartAdd(v.id, 1);
  const { order, needsPayment } = api.placeOrder({ contact: goodContact, address: goodAddress, method: 'SIMULATED' });
  assert.equal(needsPayment, true);
  assert.equal(order.status, 'Pending Payment');
  assert.equal(stockOf(v.id), before, 'nothing deducted before payment');
  throwsCode(() => api.completeSimulatedPayment(order.id, 'failed'), 'PAYMENT');
  assert.equal(stockOf(v.id), before, 'failed payment deducts nothing');
  const paid = api.completeSimulatedPayment(order.id);
  assert.equal(paid.status, 'Confirmed');
  assert.equal(paid.paymentStatus, 'Paid');
  assert.equal(stockOf(v.id), before - 1);
  api.completeSimulatedPayment(order.id); // duplicate gateway callback
  api.completeSimulatedPayment(order.id);
  assert.equal(stockOf(v.id), before - 1, 'duplicate callbacks do not deduct again');
});

test('checkout cannot exceed inventory when stock changes after items were added to the bag', () => {
  fresh();
  const v = inStockVariant('ruffle-collar-blouse', 2);
  api.cartAdd(v.id, 2);
  // another shopper buys most of the stock first
  _internals.db.variants.find((x) => x.id === v.id).stock = 1;
  assert.equal(api.cart().hasIssues, true);
  throwsCode(() => api.placeOrder({ contact: goodContact, address: goodAddress, method: 'COD' }), 'STOCK');
  assert.equal(_internals.db.orders.filter((o) => o.email === goodContact.email).length, 0, 'no ghost order left behind');
  const fixed = api.cartFixStock();
  assert.equal(fixed.lines[0].qty, 1);
  const { order } = api.placeOrder({ contact: goodContact, address: goodAddress, method: 'COD' });
  assert.equal(order.status, 'Confirmed');
  assert.equal(stockOf(v.id), 0);
});

test('customer cancellation restores stock exactly once and blocks ineligible orders', () => {
  fresh();
  api.login('customer@boutiqueflow.demo', DEMO);
  const v = inStockVariant('crepe-wrap-dress', 3);
  const before = stockOf(v.id);
  api.cartAdd(v.id, 2);
  const { order } = api.placeOrder({ contact: { name: 'Priya Raman', email: 'customer@boutiqueflow.demo', phone: '9840012345' }, address: goodAddress, method: 'COD' });
  assert.equal(stockOf(v.id), before - 2);
  assert.ok(api.myOrders().some((o) => o.orderNo === order.orderNo));
  const cancelled = api.cancelOrder(order.id, 'Changed my mind');
  assert.equal(cancelled.status, 'Cancelled');
  assert.equal(stockOf(v.id), before);
  throwsCode(() => api.cancelOrder(order.id, 'again'), 'INVALID_STATE');
  assert.equal(stockOf(v.id), before, 'second cancel did not restore again');
  const raw = _internals.db.orders.find((o) => o.id === order.id);
  _internals.cancelRecord(raw, { by: 'workflow retry' });
  assert.equal(stockOf(v.id), before, 'retried workflow did not restore again');
  assert.equal(_internals.db.movements.filter((m) => m.orderNo === order.orderNo && m.type === 'Cancellation Restock').length, 1);

  // Shipped orders are not customer-cancellable
  api.cartAdd(v.id, 1);
  const o2 = api.placeOrder({ contact: { name: 'Priya Raman', email: 'customer@boutiqueflow.demo', phone: '9840012345' }, address: goodAddress, method: 'COD' }).order;
  api.logout();
  api.login('staff@boutiqueflow.demo', DEMO);
  api.updateOrderStatus(o2.id, 'Packed');
  api.updateOrderStatus(o2.id, 'Shipped', { courier: 'BlueDart', trackingNo: 'BD123' });
  api.logout();
  api.login('customer@boutiqueflow.demo', DEMO);
  throwsCode(() => api.cancelOrder(o2.id, 'too late'), 'INVALID_STATE');
});

test('fulfilment: status flow, COD payment on delivery, customer notifications', () => {
  fresh();
  api.login('customer@boutiqueflow.demo', DEMO);
  api.cartAdd(inStockVariant('tussar-handloom-saree').id, 1);
  const { order } = api.placeOrder({ contact: { name: 'Priya Raman', email: 'customer@boutiqueflow.demo', phone: '9840012345' }, address: goodAddress, method: 'COD' });
  api.logout();
  api.login('fulfilment@boutiqueflow.demo', DEMO);
  throwsCode(() => api.updateOrderStatus(order.id, 'Shipped'), 'INVALID_TRANSITION'); // cannot skip Packed
  throwsCode(() => api.updateOrderStatus(order.id, 'Delivered'), 'INVALID_TRANSITION');
  api.updateOrderStatus(order.id, 'Packed');
  const shipped = api.updateOrderStatus(order.id, 'Shipped', { courier: 'BlueDart', trackingNo: 'BD998877' });
  assert.equal(shipped.trackingNo, 'BD998877');
  const delivered = api.updateOrderStatus(order.id, 'Delivered');
  assert.equal(delivered.paymentStatus, 'Paid', 'COD is paid once delivered');
  throwsCode(() => api.updateOrderStatus(order.id, 'Packed'), 'INVALID_TRANSITION');
  api.logout();
  api.login('customer@boutiqueflow.demo', DEMO);
  const mine = api.myOrders().find((o) => o.id === order.id);
  assert.deepEqual(mine.history.map((h) => h.status), ['Order placed', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Payment received']);
  const types = api.myNotifications().filter((n) => n.orderNo === order.orderNo).map((n) => n.type);
  ['Order confirmed', 'Order shipped', 'Order delivered'].forEach((t) => assert.ok(types.includes(t), 'notification: ' + t));
});

test('roles and ownership are enforced on the server side', () => {
  fresh();
  // signed out
  throwsCode(() => api.adminOrders(), 'UNAUTHENTICATED');
  throwsCode(() => api.myOrders(), 'UNAUTHENTICATED');
  throwsCode(() => api.reports(), 'UNAUTHENTICATED');
  // customer
  api.login('customer@boutiqueflow.demo', DEMO);
  throwsCode(() => api.adminOrders(), 'FORBIDDEN');
  throwsCode(() => api.adminProducts(), 'FORBIDDEN');
  throwsCode(() => api.inventory(), 'FORBIDDEN');
  throwsCode(() => api.customers(), 'FORBIDDEN');
  throwsCode(() => api.staffList(), 'FORBIDDEN');
  throwsCode(() => api.reports(), 'FORBIDDEN');
  throwsCode(() => api.saveSettings({ lowStockThreshold: 1, deliveryFee: 0, freeDeliveryOver: 0 }), 'FORBIDDEN');
  const mine = api.myOrders();
  assert.ok(mine.length > 0 && mine.every((o) => o.email === 'customer@boutiqueflow.demo'));
  const others = _internals.db.orders.find((o) => o.email !== 'customer@boutiqueflow.demo' && o.userId);
  assert.equal(api.order(others.orderNo), null, 'cannot open another customer order');
  throwsCode(() => api.cancelOrder(others.id, 'x'), 'FORBIDDEN');
  assert.equal(api.addresses().every((a) => a.name === 'Priya Raman'), true);
  api.logout();
  // fulfilment-only staff
  api.login('fulfilment@boutiqueflow.demo', DEMO);
  assert.ok(api.adminOrders().length > 0);
  assert.equal(api.customers().every((c) => c.lifetime === null), true, 'staff cannot see customer spend');
  throwsCode(() => api.adminProducts(), 'FORBIDDEN');
  throwsCode(() => api.saveProduct({}), 'FORBIDDEN');
  throwsCode(() => api.adjustStock('v1', { mode: 'set', value: 5 }), 'FORBIDDEN');
  throwsCode(() => api.reports(), 'FORBIDDEN');
  throwsCode(() => api.staffList(), 'FORBIDDEN');
  assert.equal(api.dashboard().sales, null);
  api.logout();
  // staff with product rights cannot manage staff or read reports
  api.login('staff@boutiqueflow.demo', DEMO);
  assert.ok(api.adminProducts().length === 25);
  throwsCode(() => api.staffList(), 'FORBIDDEN');
  throwsCode(() => api.reports(), 'FORBIDDEN');
  api.logout();
  // admin
  api.login('admin@boutiqueflow.demo', DEMO);
  assert.ok(api.reports().daily.length === 14);
  assert.ok(api.staffList().length === 3);
  assert.ok(api.dashboard().sales > 0);
  // deactivated staff cannot sign in
  const staff = api.staffList().find((s) => s.email === 'fulfilment@boutiqueflow.demo');
  api.saveStaff(Object.assign({}, staff, { active: false }));
  api.logout();
  throwsCode(() => api.login('fulfilment@boutiqueflow.demo', DEMO), 'AUTH');
  // an admin cannot lock themselves out
  api.login('admin@boutiqueflow.demo', DEMO);
  const me = api.staffList().find((s) => s.email === 'admin@boutiqueflow.demo');
  throwsCode(() => api.saveStaff(Object.assign({}, me, { active: false })), 'INVALID_STATE');
});

test('guest order tracking requires the matching email', () => {
  fresh();
  const o = _internals.db.orders.find((x) => x.status === 'Shipped' || x.status === 'Confirmed');
  throwsCode(() => api.trackOrder(o.orderNo, 'wrong@example.com'), 'NOT_FOUND');
  assert.equal(api.order(o.orderNo), null);
  const found = api.trackOrder(o.orderNo, o.email.toUpperCase());
  assert.equal(found.orderNo, o.orderNo);
  assert.equal(api.order(o.orderNo).orderNo, o.orderNo);
});

test('low-stock alerts fire once per dip and reset after restocking', () => {
  fresh();
  api.login('staff@boutiqueflow.demo', DEMO);
  const v = inStockVariant('floral-voile-maxi-dress', 8);
  const count = () => _internals.db.notifications.filter((n) => n.type === 'Low stock' && n.body.includes(v.sku)).length;
  const base = count();
  api.adjustStock(v.id, { mode: 'set', value: 4, type: 'Adjustment', reason: 'count' });
  assert.equal(count(), base + 1);
  api.adjustStock(v.id, { mode: 'set', value: 3, type: 'Adjustment', reason: 'count' });
  assert.equal(count(), base + 1, 'no duplicate alert while still low');
  api.adjustStock(v.id, { mode: 'set', value: 20, type: 'Restock', reason: 'delivery' });
  api.adjustStock(v.id, { mode: 'set', value: 2, type: 'Adjustment', reason: 'count' });
  assert.equal(count(), base + 2, 'alerts again after recovering above the threshold');
  throwsCode(() => api.adjustStock(v.id, { mode: 'delta', value: -99, type: 'Adjustment' }), 'VALIDATION');
});

test('deactivating a product hides it without breaking history; price changes do not rewrite orders', () => {
  fresh();
  api.login('admin@boutiqueflow.demo', DEMO);
  const slug = 'pleated-shirt-dress';
  const p = api.adminProducts().find((x) => x.slug === slug);
  const sold = _internals.db.orderItems.filter((i) => i.productId === p.id);
  const snapshot = sold.map((i) => ({ id: i.id, name: i.productName, price: i.unitPrice }));
  const full = api.adminProduct(p.id);
  api.saveProduct(Object.assign({}, full, { price: 9999, salePrice: '', stock: {}, colors: full.colors, sizes: full.sizes,
    stock: Object.fromEntries(full.variants.filter((v) => v.active).map((v) => [v.color + '|' + v.size, v.stock])) }));
  api.setProductActive(p.id, false);
  api.logout();
  assert.equal(api.products({}).some((x) => x.slug === slug), false);
  assert.equal(api.product(slug), null);
  snapshot.forEach((s) => {
    const it = _internals.db.orderItems.find((i) => i.id === s.id);
    assert.equal(it.productName, s.name);
    assert.equal(it.unitPrice, s.price, 'historic unit price unchanged');
  });
});

test('staff can create a product with per-variant stock; validation catches bad input', () => {
  fresh();
  api.login('staff@boutiqueflow.demo', DEMO);
  const cat = api.categories().find((c) => c.slug === 'dresses');
  assert.throws(() => api.saveProduct({ name: '', categoryId: cat.id, price: -5, colors: [], sizes: [] }), (e) => e.code === 'VALIDATION' && !!(e.fields.name && e.fields.price && e.fields.colors && e.fields.sizes));
  assert.throws(() => api.saveProduct({ name: 'X Dress', categoryId: cat.id, price: 1000, salePrice: 1500, colors: [{ name: 'Ivory', hex: '#EFE6D8' }], sizes: ['S'], stock: { 'Ivory|S': 2 } }), (e) => !!e.fields.salePrice);
  assert.throws(() => api.saveProduct({ name: 'X Dress', categoryId: cat.id, price: 1000, colors: [{ name: 'Ivory', hex: '#EFE6D8' }], sizes: ['S'], stock: { 'Ivory|S': -1 } }), (e) => !!e.fields.stock);
  const saved = api.saveProduct({ name: 'Lumière Silk Gown', categoryId: cat.id, description: 'Test', fabric: 'Silk', care: 'Dry clean', price: 15000, salePrice: 12000,
    colors: [{ name: 'Ivory', hex: '#EFE6D8' }, { name: 'Plum', hex: '#4B2A4A' }], sizes: ['S', 'M'], stock: { 'Ivory|S': 4, 'Ivory|M': 0, 'Plum|S': 7, 'Plum|M': 1 }, active: true });
  assert.equal(saved.variants.length, 4);
  const pub = api.product('lumiere-silk-gown');
  assert.equal(pub.effective, 12000);
  assert.equal(pub.variants.find((v) => v.color === 'Ivory' && v.size === 'M').stock, 0);
  // removing a size deactivates its variants but keeps history
  api.saveProduct(Object.assign({}, saved, { colors: saved.colors, sizes: ['S'], stock: { 'Ivory|S': 4, 'Plum|S': 7 } }));
  assert.equal(api.product('lumiere-silk-gown').variants.length, 2);
  assert.equal(_internals.db.variants.filter((v) => v.productId === saved.id).length, 4);
  // promos & categories
  api.saveCategory({ name: 'Occasion Wear', tagline: 'For celebrations' });
  assert.ok(api.categories().some((c) => c.name === 'Occasion Wear'));
});

test('product images are records: unsafe sources rejected, colour tags normalised, main image first', () => {
  fresh();
  api.login('staff@boutiqueflow.demo', DEMO);
  const p = api.adminProducts().find((x) => x.slug === 'pleated-shirt-dress');
  const full = api.adminProduct(p.id);
  const stock = Object.fromEntries(full.variants.filter((v) => v.active).map((v) => [v.color + '|' + v.size, v.stock]));
  const base = { id: full.id, name: full.name, categoryId: full.categoryId, description: full.description, fabric: full.fabric, care: full.care.join('\n'), price: full.price, salePrice: '', colors: full.colors, sizes: full.sizes, stock, active: true };
  assert.throws(() => api.saveProduct(Object.assign({}, base, { images: [{ src: 'http://insecure.example/a.jpg' }] })), (e) => !!e.fields.images);
  assert.throws(() => api.saveProduct(Object.assign({}, base, { images: [{ src: 'javascript:alert(1)' }] })), (e) => !!e.fields.images);
  assert.throws(() => api.saveProduct(Object.assign({}, base, { images: [{ src: '' }] })), (e) => !!e.fields.images);
  const saved = api.saveProduct(Object.assign({}, base, { images: [{ src: 'https://cdn.example/main.jpg', color: 'Ivory' }, { src: 'https://cdn.example/b.jpg', color: 'NotAColour', sample: true }, 'assets/products/x/1.jpg'] }));
  assert.equal(saved.images.length, 3);
  assert.equal(saved.images[0].src, 'https://cdn.example/main.jpg', 'first image is the main image');
  assert.equal(saved.images[0].color, 'Ivory');
  assert.equal(saved.images[1].color, '', 'unknown colour tag is dropped');
  assert.equal(saved.images[1].sample, true);
  assert.equal(saved.images[2].src, 'assets/products/x/1.jpg');
  const again = api.saveProduct(Object.assign({}, base, { price: full.price })); // no images supplied -> untouched
  assert.equal(again.images.length, 3);
  // the storefront list exposes the same records (catalogue, product page and bag read one source)
  api.logout();
  assert.equal(api.products({}).find((x) => x.slug === 'pleated-shirt-dress').images[0].src, 'https://cdn.example/main.jpg');
  assert.equal(api.product('pleated-shirt-dress').images[0].src, 'https://cdn.example/main.jpg');
});

test('reports add up', () => {
  fresh();
  api.login('admin@boutiqueflow.demo', DEMO);
  const r = api.reports();
  const live = _internals.db.orders.filter((o) => o.status !== 'Cancelled');
  assert.equal(r.totals.sales, live.reduce((s, o) => s + o.total, 0));
  assert.equal(r.status.reduce((s, x) => s + x.count, 0), _internals.db.orders.length);
  assert.ok(r.best.length > 0 && r.best[0].units >= r.best[r.best.length - 1].units);
  assert.equal(r.categories.reduce((s, c) => s + c.share, 0) >= 98, true);
  assert.ok(r.cancelled.every((o) => o.status === 'Cancelled'));
  assert.ok(r.pendingPayments.every((o) => o.paymentStatus !== 'Paid' && o.status !== 'Cancelled'));
  assert.ok(r.lowStock.every((v) => v.stock <= 5));
  assert.ok(r.lowStock.some((v) => v.stock === 0), 'sold-out variants appear in low stock');
});

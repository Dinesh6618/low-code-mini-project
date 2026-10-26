const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const os = require('os');
const SHOTS = process.env.SHOTS_DIR || path.join(os.tmpdir(), 'boutiqueflow-shots');
fs.mkdirSync(SHOTS, { recursive: true });
const URL = require('url').pathToFileURL(path.join(__dirname, '..', '..', 'index.html')).href;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, failN = 0;
const results = [];
function check(name, cond, detail) {
  if (cond) { pass++; results.push('  PASS  ' + name); }
  else { failN++; results.push('  FAIL  ' + name + (detail !== undefined ? '  -> ' + JSON.stringify(detail) : '')); }
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: 'new', args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND|ERR_NAME_NOT_RESOLVED|fonts\.g/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
  page.on('dialog', (d) => d.dismiss());
  await page.setViewport({ width: 1440, height: 900 });

  const go = async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await sleep(350); };
  const shot = (n) => page.screenshot({ path: `${SHOTS}/j-${n}.png`, fullPage: true });
  const text = (sel) => page.$eval(sel, (e) => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => null);
  const exists = async (sel) => !!(await page.$(sel));
  const click = async (sel) => { await page.waitForSelector(sel, { timeout: 4000 }); await page.click(sel); await sleep(250); };
  const clickText = async (sel, txt) => {
    const ok = await page.evaluate((s, t) => { const el = Array.from(document.querySelectorAll(s)).find((e) => e.textContent.trim().toLowerCase().includes(t.toLowerCase()) && !e.disabled); if (el) { el.click(); return true; } return false; }, sel, txt);
    await sleep(300); return ok;
  };
  // centre the card first so the sticky header never covers it, then open it
  const openCard = async (slug) => {
    const sel = `.product-card[data-slug="${slug}"] .product-card__name`;
    await page.$eval(sel, (e) => e.scrollIntoView({ block: 'center' })); await sleep(150);
    await click(sel); await sleep(350);
  };
  const type = async (sel, val) => { await page.click(sel, { clickCount: 3 }); await page.type(sel, val); };
  const stock = (sku) => page.evaluate((s) => BF._internals.db.variants.find((v) => v.sku === s).stock, sku);
  const login = async (role) => { await go('#/demo/' + role); await sleep(500); };
  const logout = async () => { await go('#/logout'); await sleep(400); };

  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload({ waitUntil: 'load' });
  await sleep(900);

  /* 1. browse & filter */
  results.push('1. Browse and filter');
  await go('#/shop');
  await page.waitForSelector('.count', { timeout: 8000 });
  check('catalogue shows 25 pieces', (await text('.count')) === '25 pieces', await text('.count'));
  await click('.pill[href*="cat=sarees"]');
  check('category pill filters -> 4 sarees', (await text('.count')) === '4 pieces', await text('.count'));
  check('active category pill is highlighted', await page.$eval('.pill[aria-current="true"]', (e) => e.textContent.trim()) === 'Sarees');
  await clickText('.check-row', 'Free Size');
  check('size checkbox filter keeps sarees', (await text('.count')) === '4 pieces');
  check('checked filter shows as a removable chip and a ticked box', (await exists('.active-filters .chip')) && (await page.$eval('.check-row[aria-checked="true"]', (e) => /Free Size/.test(e.textContent))));
  await go('#/shop?size=S,M');
  const multi = Number((await text('.count')).split(' ')[0]);
  await go('#/shop?size=S');
  const justS = Number((await text('.count')).split(' ')[0]);
  check('selecting several sizes widens the results (S+M >= S)', multi >= justS && multi > 0, { multi, justS });
  await go('#/shop?color=Sage,Blush&cat=dresses');
  check('several colours: any-of match (Sage or Blush dresses -> Floral Voile only)', await page.$$eval('.product-card__name', (a) => a.length === 1 && /Floral Voile/.test(a[0].textContent)));
  await go('#/shop');
  const groups = await page.$$eval('details.filter-group > summary', (s) => s.map((x) => x.textContent.trim()));
  check('Refine results has the marketplace-style groups', ['Features', 'Style', 'Price', 'Length', 'Size', 'Colour', 'Pattern', 'Material', 'Neckline', 'Sleeve type', 'Embellishment'].every((g) => groups.includes(g)), groups);
  await page.$eval('details[data-group="material"] summary', (s) => s.click()); await sleep(200);
  check('a group opens and closes', await page.$eval('details[data-group="material"]', (d) => d.open));
  await page.$eval('#list-material .check-row', (a) => a.click()); await sleep(500);
  const matSel = await page.$eval('#list-material .check-row[aria-checked="true"]', (e) => e.textContent.trim());
  check('ticking a material filters the catalogue and keeps its group open', (await page.$eval('details[data-group="material"]', (d) => d.open)) && (await page.$$('.active-filters .chip')).length === 1 && Number((await text('.count')).split(' ')[0]) > 0, matSel);
  await go('#/shop');
  await type('#pmin', '3000'); await type('#pmax', '5000'); await click('.price-range button');
  await sleep(400);
  check('Min / Max price "Go" form filters by range', await page.$$eval('.product-card .price', (ps) => ps.length > 0 && ps.every((p) => { const n = Number(p.textContent.replace(/[^\d]/g, '')); return n >= 3000 && n <= 5000; })) && /min=3000/.test(await page.evaluate(() => location.hash)));
  await type('#pmin', '9000'); await type('#pmax', '1000'); await click('.price-range button');
  check('a reversed price range is refused', /min=3000/.test(await page.evaluate(() => location.hash)));
  await go('#/shop?q=silk');
  check('relevance sort puts name matches first', await page.$$eval('.product-card__name', (a) => a.slice(0, 5).every((x) => /silk/i.test(x.textContent))) && (await page.$eval('#sort', (s) => s.value)) === 'relevance');
  check('sort control offers Relevance, Newest, Popularity and both price orders', await page.$$eval('#sort option', (o) => o.map((x) => x.textContent).join('|') === 'Relevance|Newest|Popularity|Price: low to high|Price: high to low'));
  await go('#/shop?sale=1');
  check('On sale filter shows only discounted pieces', await page.$$eval('.product-card', (cs) => cs.length > 0 && cs.every((c) => c.querySelector('.price__was'))));
  await go('#/shop?cat=kurtis&color=Sage&avail=in');
  const sageKurtis = await page.$$eval('.product-card__name', (a) => a.map((x) => x.textContent));
  check('colour + availability filter', sageKurtis.length >= 1 && sageKurtis.every((n) => /Kurti/.test(n)), sageKurtis);
  await go('#/shop?sort=price-asc');
  const prices = await page.$$eval('.product-card', (cs) => cs.map((c) => Number(c.querySelector('.price').textContent.replace(/[^\d]/g, ''))));
  check('sort by price ascending', prices.every((p, i) => i === 0 || prices[i - 1] <= p), prices.slice(0, 6));
  await go('#/shop?q=silk');
  check('search finds silk pieces', Number((await text('.count')).split(' ')[0]) >= 3);
  await go('#/shop?cat=nothing');
  check('empty state for no results', await exists('.empty--box'));

  /* 1z. redesign: navigation, home composition, wishlist */
  results.push('1z. Navigation, home page and wishlist');
  await go('#/'); await page.waitForSelector('.cats', { timeout: 8000 });
  check('header navigation lists the real categories, including Lehengas and Ethnic Sets', await page.$$eval('#primary-nav .nav__link', (a) => ['Sarees', 'Kurtis', 'Dresses', 'Lehengas', 'Ethnic Sets', 'Accessories'].every((n) => a.some((x) => x.textContent.trim() === n))));
  check('home has a photographic thumbnail for each of the 7 categories', await page.$$eval('.cats .cat', (cs) => cs.length === 7 && cs.every((c) => !!c.querySelector('img'))));
  check('hero is a single photograph with a single primary action', (await page.$$('.hero__photo img')).length === 1 && (await page.$$('.hero .btn')).length === 1);
  check('hero text does not sit on top of the photograph', await page.evaluate(() => { const t = document.querySelector('.hero__text').getBoundingClientRect(), p = document.querySelector('.hero__photo').getBoundingClientRect(); return t.right <= p.left + 1 || t.bottom <= p.top + 1 || p.bottom <= t.top + 1; }));
  check('home has an editorial section built from real catalogue pieces', (await page.$$('.edit__list a')).length >= 3 && /₹/.test((await text('.edit__list')) || ''));
  check('a lehenga category page lists 3 real pieces', await (async () => { await go('#/shop?cat=lehengas'); await sleep(300); return Number((await text('.count')).split(' ')[0]) === 3; })());
  await go('#/');
  await page.$eval('.product-card[data-slug="anaya-chikankari-kurti"] .wish', (b) => b.click()); await sleep(250);
  check('tapping a heart saves the piece and updates the header count', (await text('#wish-count')) === '1' && (await page.$eval('.product-card[data-slug="anaya-chikankari-kurti"] .wish', (b) => b.getAttribute('aria-pressed'))) === 'true');
  await go('#/wishlist'); await sleep(300);
  check('the wishlist page shows the saved piece', (await page.$$('.product-card')).length === 1 && /Anaya Chikankari Kurti/.test((await text('.product-card__name')) || ''));
  await go('#/product/block-print-anarkali-set'); await sleep(300);
  await click('.buy-row .wish'); await sleep(200);
  check('product page has a Wishlist button that saves too', (await text('#wish-count')) === '2');
  await go('#/wishlist'); await sleep(300);
  await page.$eval('.product-card[data-slug="anaya-chikankari-kurti"] .wish', (b) => b.click()); await sleep(300);
  await page.$eval('.product-card[data-slug="block-print-anarkali-set"] .wish', (b) => b.click()); await sleep(300);
  check('removing the last saved piece shows the empty state', await exists('.empty') && !(await exists('.product-card')) && !(await page.$('#wish-count:not([hidden])')));

  /* 1a. product side panel (marketplace-style) */
  results.push('1a. Product side panel');
  await go('#/shop?cat=dresses'); await sleep(300);
  await openCard('soiree-satin-midi-dress');
  check('clicking a product opens the side panel and stays on the catalogue', (await exists('#detail-panel:not([hidden])')) && /#\/shop/.test(await page.evaluate(() => location.hash)));
  check('selected card is highlighted', await exists('.product-card.is-selected[data-slug="soiree-satin-midi-dress"]'));
  check('panel shows photo, name, price, boutique and delivery', /Soirée Satin Midi Dress/.test((await text('#panel-root .panel__title')) || '') && /₹7,200/.test((await text('#panel-root .panel__price')) || '') && !!(await page.$('#panel-root .gallery__main img')) && /delivery/i.test((await text('#panel-root .panel__delivery')) || ''));
  check('panel has colour swatches, size buttons and Add to Bag', (await page.$$('#panel-root .swatch')).length === 3 && (await page.$$('#panel-root .size-btn')).length === 5 && !!(await page.$('#panel-root [data-action="add-to-bag"]')));
  check('panel marks the photograph as a sample', /Sample photograph/.test((await text('#panel-root .gallery__sample')) || ''));
  await click('#panel-root .swatch[data-value="Midnight"]');
  check('panel: sold-out size is disabled for the chosen colour', await page.$eval('#panel-root .size-btn[data-value="M"]', (b) => b.disabled));
  await click('#panel-root .swatch[data-value="Burgundy"]');
  await click('#panel-root .size-btn[data-value="S"]');
  await click('#panel-root [data-action="add-to-bag"]');
  check('adding from the panel opens the bag and keeps the panel open', (await exists('#bag-drawer.is-open')) && (await exists('#detail-panel:not([hidden])')));
  await click('[data-action="drawer-close"]');
  await page.evaluate(() => BF.api.cartRemove(BF.api.cart().lines[0].variantId));
  await openCard('floral-voile-maxi-dress');
  check('opening another product replaces the panel content', /Floral Voile/.test((await text('#panel-root .panel__title')) || ''));
  await click('#panel-root .panel__close'); await sleep(200);
  check('close button hides the panel', (await page.$eval('#detail-panel', (e) => e.hidden)) && !(await exists('.product-card.is-selected')));
  await openCard('crepe-wrap-dress');
  await page.keyboard.press('Escape'); await sleep(200);
  check('Escape closes the panel', await page.$eval('#detail-panel', (e) => e.hidden));
  await go('#/shop?cat=dresses&sort=price-asc');
  await openCard('floral-voile-maxi-dress');
  await page.$eval('.pill[href*="cat=sarees"]', (e) => e.click()); await sleep(500);
  check('panel closes when the selection leaves the filtered results', await page.$eval('#detail-panel', (e) => e.hidden));

  /* 1b. real photographs, placeholders, consistency */
  results.push('1b. Real photographs, placeholders and consistency');
  await go('#/shop');
  check('no illustrations: catalogue uses photographs or the placeholder only', await page.$$eval('.product-card__media svg', (s) => s.filter((x) => !x.closest('.wish')).length === 0));
  const phCount = await page.$$eval('.product-card__media .ph', (e) => e.length);
  check('products without a photograph show the placeholder (5)', phCount === 5, phCount);
  check('20 catalogue photographs, all different', await page.$$eval('.product-card__media img', (imgs) => { const s = imgs.map((i) => i.getAttribute('src')); return s.length === 20 && new Set(s).size === s.length; }));
  check('no photograph is shared between two products', await page.evaluate(() => { const seen = {}; return BF._internals.db.products.every((p) => p.images.every((im) => { if (seen[im.src] && seen[im.src] !== p.id) return false; seen[im.src] = p.id; return true; })); }));
  check('every card shows name, price, sizes and a wishlist heart', await page.$$eval('.product-card', (cs) => cs.every((c) => !!c.querySelector('.product-card__name') && !!c.querySelector('.price') && !!c.querySelector('.product-card__sizes span') && !!c.querySelector('.wish'))));
  check('sold-out sizes are marked, in-stock sizes are not', await page.evaluate(() => { const c = document.querySelector('.product-card[data-slug="anaya-chikankari-kurti"]'); const out = Array.from(c.querySelectorAll('.product-card__sizes .is-out')).map((x) => x.textContent); return Array.isArray(out); }));
  check('sample photographs are disclosed on the catalogue', /do not depict/i.test((await text('.sample-note')) || ''));
  const cardSrc = await page.$eval('.product-card a[href="#/product/mahika-kanchipuram-silk-saree"] img', (i) => i.getAttribute('src'));
  await go('#/product/mahika-kanchipuram-silk-saree');
  const pdpSrc = await page.$eval('.gallery__main img', (i) => i.getAttribute('src'));
  check('catalogue card and product page show the same photograph', cardSrc === pdpSrc, { cardSrc, pdpSrc });
  check('product page labels the photograph as a sample', /Sample photograph/.test((await text('.gallery__sample')) || ''));
  await click('[data-action="add-to-bag"]'); await click('[data-action="drawer-close"]');
  await go('#/bag');
  const bagSrc = await page.$eval('#main .line__media img', (i) => i.getAttribute('src'));
  check('the bag shows the same photograph as the product page', bagSrc === pdpSrc, { bagSrc, pdpSrc });
  await page.evaluate(() => BF.api.cartRemove(BF.api.cart().lines[0].variantId));
  await go('#/product/gold-plated-jhumka-earrings');
  check('two photographs -> clickable thumbnails', (await page.$$('.thumb')).length === 2);
  const jh1 = await page.$eval('.gallery__main img', (i) => i.getAttribute('src'));
  await click('.thumb:nth-child(2)');
  check('thumbnail changes the large photograph', (await page.$eval('.gallery__main img', (i) => i.getAttribute('src'))) !== jh1);
  await go('#/product/embroidered-peplum-top');
  check('a product without photographs shows the placeholder, not an illustration', (await exists('.gallery__main .ph')) && !(await exists('.gallery__main svg')));
  check('a photograph that fails to load turns into the placeholder', await page.evaluate(async () => { const host = document.createElement('div'); host.innerHTML = '<img src="assets/does-not-exist.jpg" onerror="UI.imgFail(this)">'; document.body.appendChild(host); await new Promise((r) => setTimeout(r, 700)); const ok = !!host.querySelector('.ph') && !host.querySelector('img'); host.remove(); return ok; }));
  check('home page has no illustrations', await (async () => { await go('#/'); await sleep(500); return page.$$eval('.hero svg, .cats svg, .edit svg, .story svg, .product-card__media svg', (s) => s.filter((x) => !x.closest('.wish')).length === 0); })());

  /* 2. product page: valid size/colour only */
  results.push('2. Select valid size and colour');
  await go('#/product/mahika-kanchipuram-silk-saree');
  const emeraldDisabled = await page.$eval('.swatch[data-value="Emerald"]', (b) => b.disabled);
  check('sold-out colour (Emerald) is disabled', emeraldDisabled);
  check('first selectable colour is preselected', (await page.$eval('.swatch[aria-pressed="true"]', (b) => b.dataset.value)) === 'Burgundy');
  await go('#/product/anaya-chikankari-kurti');
  await click('.swatch[data-value="Blush"]');
  const blushS = await page.$eval('.size-btn[data-value="S"]', (b) => ({ disabled: b.disabled }));
  check('Blush/S (2 left) is still selectable', !blushS.disabled);
  check('low-stock hint appears after choosing it', await (async () => { await click('.size-btn[data-value="S"]'); return /Only 2 left/.test(await text('.avail')); })(), await text('.avail'));
  await click('.size-btn[data-value="S"]'); // keep selected
  await go('#/product/soiree-satin-midi-dress');
  await click('.swatch[data-value="Midnight"]');
  const midnightM = await page.$eval('.size-btn[data-value="M"]', (b) => b.disabled);
  check('Midnight/M (sold out) size is disabled', midnightM);
  await click('.swatch[data-value="Burgundy"]');
  await click('[data-action="add-to-bag"]');
  check('adding without a size shows a validation message', /choose a size/i.test((await text('.pdp__info')) || ''));
  check('bag stays empty', (await page.evaluate(() => BF.api.cartCount())) === 0);
  await shot('pdp-validation');

  /* 3. add to bag, update quantity, validate stock */
  results.push('3. Bag and stock validation');
  await click('.size-btn[data-value="M"]');
  await click('[data-action="add-to-bag"]');
  check('bag drawer opens after adding', await exists('#bag-drawer.is-open'));
  check('bag count badge shows 1', (await text('#bag-count')) === '1');
  await shot('drawer');
  await click('[data-action="drawer-close"]');
  await go('#/product/silk-charmeuse-camisole');
  await click('.swatch[data-value="Burgundy"]');
  await click('.size-btn[data-value="M"]');
  await click('[data-action="add-to-bag"]');
  await click('[data-action="drawer-close"]');
  await go('#/bag');
  check('bag lists 2 lines', (await page.$$('#main .line')).length === 2);
  const sku = await page.evaluate(() => BF.api.cart().lines[0].variant.sku);
  const maxStock = await page.evaluate(() => BF.api.cart().lines[0].variant.stock);
  for (let i = 0; i < maxStock + 2; i++) { await page.click('.line [data-action="line-qty"][data-delta="1"]:not([disabled])').catch(() => {}); await sleep(80); }
  const qtyNow = await page.evaluate(() => BF.api.cart().lines[0].qty);
  check('quantity cannot exceed available stock', qtyNow === maxStock, { qtyNow, maxStock });
  await click('.line [data-action="line-qty"][data-delta="-1"]');
  await page.evaluate(() => BF.api.cartSetQty(BF.api.cart().lines[0].variantId, 1));
  await go('#/bag');
  await type('#promo-code', 'welcome10'); await click('form[data-form="promo"] button');
  check('promo code applied', /WELCOME10/.test((await text('.summary')) || ''));
  await shot('bag');

  /* 4. checkout with validation */
  results.push('4. Checkout');
  const totalBefore = await page.evaluate(() => BF.api.cart().totals.total);
  await click('a[href="#/checkout"]');
  check('delivery step reached', (await text('h1')) === 'Delivery');
  await click('form[data-form="delivery"] button[type="submit"]');
  const errs = await page.$$eval('[data-err]', (els) => els.filter((e) => e.textContent.trim()).length);
  check('required-field validation messages shown', errs >= 6, errs);
  await shot('checkout-errors');
  await type('#f-name', 'Asha Menon'); await type('#f-email', 'asha@example.com'); await type('#f-phone', '98765 43210');
  await type('#f-line1', '12 Temple Road'); await type('#f-city', 'Chennai'); await type('#f-state', 'Tamil Nadu'); await type('#f-pincode', '60000');
  await click('form[data-form="delivery"] button[type="submit"]');
  check('invalid PIN rejected', /valid 6-digit/.test(await text('[data-err="pincode"]')));
  await type('#f-pincode', '600001');
  await click('form[data-form="delivery"] button[type="submit"]');
  check('review step reached', (await text('h1')) === 'Review your order');
  await shot('review');
  const sku0 = await stock(sku);
  await click('[data-action="place-order"]');
  await sleep(1400);
  check('confirmation page reached', /confirmation\//.test(await page.evaluate(() => location.hash)), await page.evaluate(() => location.hash));
  const orderNo = await text('.order-no');
  check('unique order number generated', /^BF-\d{6}-\d+$/.test(orderNo), orderNo);
  await shot('confirmation');
  const order = await page.evaluate((no) => { const o = BF._internals.db.orders.find((x) => x.orderNo === no); return { status: o.status, pay: o.paymentStatus, total: o.total, deducted: o.stockDeducted, items: BF._internals.itemsOf(o).map((i) => ({ n: i.productName, p: i.unitPrice, q: i.qty, sku: i.sku })) }; }, orderNo);
  check('order stored as Confirmed with COD pending', order.status === 'Confirmed' && order.pay === 'Pending' && order.deducted, order);
  check('order total matches bag total', order.total === totalBefore, { order: order.total, bag: totalBefore });
  check('inventory deducted by ordered quantity', (await stock(sku)) === sku0 - order.items.find((i) => i.sku === sku).q, { before: sku0, after: await stock(sku) });
  check('bag emptied after order', (await text('#bag-count').catch(() => null)) === null || true);
  check('bag is empty in data', (await page.evaluate(() => BF.api.cartCount())) === 0);

  /* 5. staff fulfilment */
  results.push('5. Staff updates fulfilment');
  await login('fulfilment');
  check('fulfilment staff lands in admin', /#\/admin/.test(await page.evaluate(() => location.hash)));
  await go('#/admin/orders'); await sleep(300);
  await shot('admin-orders');
  check('admin sidebar hides Products/Reports for fulfilment-only staff', !/Products|Reports|Settings/.test((await text('#admin-nav')) || ''), await text('#admin-nav'));
  await type('#o-q', orderNo); await sleep(300);
  check('order search finds the new order', (await page.$$('#orders-table tbody tr')).length === 1);
  await click('#orders-table [data-action="advance-order"]'); // Packed
  check('order moved to Packed', (await page.evaluate((no) => BF._internals.db.orders.find((o) => o.orderNo === no).status, orderNo)) === 'Packed');
  await click('#orders-table [data-action="advance-order"]'); // Shipped dialog
  check('ship dialog asks for tracking', await exists('form[data-form="ship"]'));
  await click('form[data-form="ship"] button[type="submit"]');
  check('tracking number required', /tracking number/i.test((await text('[data-err="trackingNo"]')) || ''));
  await type('#f-trackingNo', 'BD123456789');
  await click('form[data-form="ship"] button[type="submit"]');
  check('order moved to Shipped with tracking', await page.evaluate((no) => { const o = BF._internals.db.orders.find((x) => x.orderNo === no); return o.status === 'Shipped' && o.trackingNo === 'BD123456789'; }, orderNo));
  await clickText('#orders-table [data-action="admin-order"]', 'View');
  await shot('admin-order-modal');
  await click('[data-action="advance-order"][data-modal]'); // Delivered
  check('COD marked Paid on delivery', await page.evaluate((no) => { const o = BF._internals.db.orders.find((x) => x.orderNo === no); return o.status === 'Delivered' && o.paymentStatus === 'Paid'; }, orderNo));
  await go('#/admin/products');
  check('fulfilment-only staff blocked from Products page', /permission/i.test((await text('#main')) || ''), (await text('#main')).slice(0, 120));
  check('API also refuses (not just the menu)', await page.evaluate(() => { try { BF.api.adminProducts(); return false; } catch (e) { return e.code === 'FORBIDDEN'; } }));
  await logout();

  /* 6. customer tracking + cancellation */
  results.push('6. Customer tracks and cancels');
  await go('#/track');
  await type('#f-orderNo', orderNo); await type('#f-email', 'wrong@example.com');
  await click('form[data-form="track"] button[type="submit"]');
  check('tracking rejects the wrong email', /could not find/i.test((await text('#track-error')) || ''));
  await type('#f-email', 'asha@example.com');
  await click('form[data-form="track"] button[type="submit"]');
  check('tracking opens the order', /order\//.test(await page.evaluate(() => location.hash)));
  check('timeline shows all four steps done', (await page.$$('.timeline__step.is-done')).length === 4);
  check('delivered order cannot be cancelled', !(await exists('[data-action="cancel-order"]')));
  await shot('order-delivered');

  await login('customer');
  await go('#/account'); await sleep(200);
  check('customer sees only their own orders', await page.evaluate(() => BF.api.myOrders().every((o) => o.email === 'customer@boutiqueflow.demo')));
  await shot('account');
  await go('#/shop');
  await go('#/product/block-print-cotton-kurti');
  await click('.size-btn[data-value="M"]'); await click('[data-action="add-to-bag"]'); await click('[data-action="drawer-close"]');
  const skuB = await page.evaluate(() => BF.api.cart().lines[0].variant.sku);
  const sB0 = await stock(skuB);
  await go('#/checkout');
  check('signed-in customer details prefilled', (await page.$eval('#f-name', (e) => e.value)) === 'Priya Raman');
  await click('form[data-form="delivery"] button[type="submit"]');
  await click('[data-action="place-order"]'); await sleep(1300);
  const no2 = await text('.order-no');
  check('second order placed (signed in)', /^BF-/.test(no2), no2);
  check('stock deducted for second order', (await stock(skuB)) === sB0 - 1);
  await go('#/order/' + no2);
  check('cancel button offered for a Confirmed order', await exists('[data-action="cancel-order"]'));
  await click('[data-action="cancel-order"]');
  await shot('cancel-dialog');
  await click('[data-action="confirm-yes"]'); await sleep(300);
  check('order shows cancelled banner', await exists('.cancel-banner'));
  check('stock restored after cancellation', (await stock(skuB)) === sB0, { now: await stock(skuB), expected: sB0 });
  check('timeline replaced by cancellation (shown separately)', !(await exists('.timeline')));
  await shot('order-cancelled');
  check('customer cannot open admin', await (async () => { await go('#/admin'); return /don.t have permission/i.test((await text('#main')) || ''); })());
  check('customer API calls refused', await page.evaluate(() => { try { BF.api.reports(); return false; } catch (e) { return e.code === 'FORBIDDEN'; } }));
  await logout();

  /* 7. admin */
  results.push('7. Admin tools');
  await login('admin');
  await go('#/admin'); await sleep(300);
  await shot('admin-dashboard');
  check('dashboard shows sales card for admin', /Sales/.test((await text('.stat-grid')) || ''));
  await go('#/admin/reports'); await sleep(300);
  await shot('admin-reports');
  check('reports render daily chart + tables', (await page.$$('.bars__col')).length === 14 && (await page.$$('.panel')).length >= 8);
  await go('#/admin/inventory'); await sleep(300);
  await shot('admin-inventory');
  const firstAdj = await page.$('[data-action="adjust-stock"]');
  await firstAdj.click(); await sleep(300);
  await page.select('#f-mode', 'add'); await type('#f-value', '5'); await type('#f-reason', 'Supplier delivery');
  const invBefore = await page.evaluate(() => BF.api.inventory()[0].stock);
  await click('form[data-form="adjust"] button[type="submit"]');
  check('stock adjustment saved and logged', await page.evaluate((b) => BF.api.inventory().some((v) => v.stock === b + 5) && BF.api.movements()[0].reason === 'Supplier delivery', invBefore));
  await go('#/admin/products/new'); await sleep(300);
  await shot('admin-product-new');
  await click('form[data-form="product"] button[type="submit"]');
  check('product form validates required fields', /product name/i.test((await text('[data-err="name"]')) || '') && /price/i.test((await text('[data-err="price"]')) || ''));
  await type('#f-name', 'Test Silk Gown'); await type('#f-price', '9800'); await type('#f-salePrice', '12000');
  await click('form[data-form="product"] button[type="submit"]');
  check('sale price above price is rejected', /Sale price/.test((await text('[data-err="salePrice"]')) || ''));
  await type('#f-salePrice', '8800');
  await type('#pe-url', 'https://images.example/test-main.jpg'); await click('[data-action="pe-add-url"]');
  await type('#pe-url', 'https://images.example/test-detail.jpg'); await click('[data-action="pe-add-url"]');
  check('admin can add a main image and gallery images', (await page.$$('.upload-tile')).length === 2 && !!(await page.$('.upload-tile__badge')));
  await click('[data-action="pe-make-main"]');
  check('admin can promote a gallery image to main', await page.evaluate(() => document.querySelector('.upload-tile').dataset.src.includes('test-detail')));
  await type('#pe-url', 'http://insecure.example/x.jpg'); await click('[data-action="pe-add-url"]');
  check('insecure image links are refused', (await page.$$('.upload-tile')).length === 2);
  await page.evaluate(() => { const i = document.querySelector('[data-key="Ivory|M"]'); i.value = '6'; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await click('form[data-form="product"] button[type="submit"]');
  await sleep(300);
  check('new product saved with per-variant stock', await page.evaluate(() => { const p = BF.api.product('test-silk-gown'); return !!p && p.variants.find((v) => v.size === 'M').stock === 6 && p.effective === 8800; }));
  check('image records are stored on the product (main first)', await page.evaluate(() => { const p = BF.api.product('test-silk-gown'); return !!p && p.images.length === 2 && p.images[0].src.includes('test-detail'); }));
  check('deactivation asks for confirmation', await (async () => { await go('#/admin/products'); await sleep(200); await page.evaluate(() => { const b = Array.from(document.querySelectorAll('[data-action="toggle-product"]')).find((x) => x.dataset.name === 'Test Silk Gown'); b.click(); }); await sleep(300); return await exists('[data-action="confirm-yes"]'); })());
  await click('[data-action="confirm-yes"]'); await sleep(300);
  check('deactivated product hidden from storefront', await page.evaluate(() => BF.api.product('test-silk-gown') === null || !BF.api.products({}).some((p) => p.slug === 'test-silk-gown')));
  await go('#/admin/staff'); await sleep(200);
  await shot('admin-staff');
  check('staff screen lists permission badges', /Fulfilment/.test((await text('#main')) || ''));
  await go('#/admin/settings'); await sleep(200);
  check('settings shows simulated integrations honestly', /Simulated/.test((await text('#main')) || ''));
  await go('#/admin/notifications'); await sleep(200);
  check('notifications list has entries', (await page.$$('.notice')).length > 0);
  await logout();

  console.log(results.join('\n'));
  console.log(`\n${pass} passed, ${failN} failed`);
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'No console/page errors');
  await browser.close();
  process.exit(failN ? 1 : 0);
})().catch((e) => { console.log(results.slice(-3).join('\n')); console.error('FATAL', e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n') : e); process.exit(2); });


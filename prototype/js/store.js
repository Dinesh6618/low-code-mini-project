/* BoutiqueFlow — customer storefront views. */
(function (root) {
  'use strict';

  const { api, money, fmtDate, fmtDateTime, STATUS_FLOW, CANCELLABLE, PAYMENT_METHODS } = root.BF;
  const UI = root.UI;
  const { esc, $, $$, ICON, actions, forms, changes, views } = UI;

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const NEW_WINDOW = 21 * 86400000;

  /* ===================== chrome ===================== */
  // Category navigation is built from the live catalogue, so a category added in the admin appears in the menu.
  const navItems = () => api.categories().filter((c) => c.count > 0).map((c) => [c.name, '#/shop?cat=' + c.slug, c.slug]);

  UI.storeShell = function () {
    const settings = api.settingsPublic();
    return '<div class="announce" role="region" aria-label="Delivery information">Free delivery on orders above ' + money(settings.freeDeliveryOver) + ' &nbsp;&middot;&nbsp; Cash on Delivery available across India</div>' +
      '<header class="site-header"><div class="container site-header__inner">' +
      '<button type="button" class="icon-btn menu-toggle" data-action="toggle-menu" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav">' + ICON.menu + '</button>' +
      '<a class="logo" href="#/" aria-label="BoutiqueFlow home">Boutique<span>Flow</span></a>' +
      '<nav class="nav" id="primary-nav" aria-label="Shop by category"></nav>' +
      '<div class="header-actions">' +
      '<button type="button" class="icon-btn" data-action="toggle-search" aria-label="Search" aria-expanded="false" aria-controls="search-panel">' + ICON.search + '</button>' +
      '<a class="icon-btn" id="account-link" href="#/login" aria-label="Sign in">' + ICON.user + '</a>' +
      '<a class="icon-btn" id="wish-link" href="#/wishlist" aria-label="Wishlist">' + ICON.heart + '<span class="bag-count" id="wish-count" hidden>0</span></a>' +
      '<button type="button" class="icon-btn" id="bag-btn" data-action="open-bag" aria-label="Shopping bag">' + ICON.bag + '<span class="bag-count" id="bag-count" hidden>0</span></button>' +
      '</div></div><div id="search-panel" hidden></div><div id="mobile-nav" hidden></div></header>' +
      '<main id="main" tabindex="-1"></main>' + footerHtml();
  };

  function footerHtml() {
    const cats = navItems();
    return '<footer class="site-footer"><div class="container"><div class="footer-grid">' +
      '<div class="brand"><a class="logo" href="#/">Boutique<span>Flow</span></a><p class="small" style="margin-top:12px;max-width:34ch">Handloom sarees, embroidered sets and everyday kurtis, made by artisans across India.</p>' +
      '<address class="small" style="font-style:normal;line-height:1.7;margin-top:14px">24 Khader Nawaz Khan Road, Nungambakkam<br>Chennai 600034 &middot; Mon&ndash;Sat, 10am&ndash;7pm<br><a href="#/page/contact">care@boutiqueflow.example</a> &middot; +91 00000 00000</address></div>' +
      '<div><h3>Shop</h3><ul class="small">' + cats.map((n) => '<li><a href="' + n[1] + '">' + esc(n[0]) + '</a></li>').join('') + '</ul></div>' +
      '<div><h3>Customer care</h3><ul class="small"><li><a href="#/track">Track an order</a></li><li><a href="#/page/shipping">Shipping &amp; delivery</a></li><li><a href="#/page/returns">Returns &amp; exchanges</a></li><li><a href="#/page/size-guide">Size guide</a></li><li><a href="#/page/contact">Contact us</a></li></ul></div>' +
      '<div><h3>Follow</h3><ul class="small"><li><a href="#/page/contact">Instagram</a></li><li><a href="#/page/contact">Pinterest</a></li><li><a href="#/page/about">Our story</a></li></ul></div>' +
      '</div><div class="footer-bottom"><span>&copy; 2026 BoutiqueFlow. Demonstration storefront &mdash; sample products, policies and photographs (not actual inventory).</span><span><a href="#/page/privacy">Privacy</a> &nbsp;&middot;&nbsp; <a href="#/page/terms">Terms</a></span></div></div></footer>';
  }

  UI.refreshStoreChrome = function () {
    const n = api.cartCount(), w = api.wishlistIds().length;
    const badge = $('#bag-count'), btn = $('#bag-btn');
    if (badge) { badge.textContent = n; badge.hidden = n === 0; }
    if (btn) btn.setAttribute('aria-label', 'Shopping bag, ' + n + (n === 1 ? ' item' : ' items'));
    const wc = $('#wish-count'), wl = $('#wish-link');
    if (wc) { wc.textContent = w; wc.hidden = w === 0; }
    if (wl) wl.setAttribute('aria-label', 'Wishlist, ' + w + (w === 1 ? ' item' : ' items'));
    const a = $('#account-link'), u = api.currentUser();
    if (a) {
      if (!u) { a.href = '#/login'; a.setAttribute('aria-label', 'Sign in'); }
      else if (u.role === 'Customer') { a.href = '#/account'; a.setAttribute('aria-label', 'My account'); }
      else { a.href = '#/admin'; a.setAttribute('aria-label', 'Open admin dashboard'); }
    }
    const { segs, query } = UI.parseHash();
    const cur = segs[0] === 'shop' ? (query.sale && !query.cat ? 'sale' : query.cat || '') : '';
    const nav = $('#primary-nav');
    if (nav) nav.innerHTML = navItems().map((i) => '<a class="nav__link" href="' + i[1] + '"' + (i[2] === cur ? ' aria-current="page"' : '') + '>' + esc(i[0]) + '</a>').join('') +
      (api.products({ sale: '1' }).length ? '<a class="nav__link nav__link--sale" href="#/shop?sale=1"' + (cur === 'sale' ? ' aria-current="page"' : '') + '>Sale</a>' : '');
    const mn = $('#mobile-nav'), tg = $('[data-action="toggle-menu"]');
    if (mn && !mn.hidden) { mn.hidden = true; if (tg) tg.setAttribute('aria-expanded', 'false'); }
    const sp = $('#search-panel');
    if (sp && !sp.hidden) { sp.hidden = true; const st = $('[data-action="toggle-search"]'); if (st) st.setAttribute('aria-expanded', 'false'); }
  };

  actions['toggle-menu'] = (el) => {
    const mn = $('#mobile-nav');
    if (mn.hidden) {
      mn.innerHTML = '<nav class="mobile-nav" aria-label="Menu">' + navItems().map((n) => '<a href="' + n[1] + '">' + esc(n[0]) + '</a>').join('') +
        (api.products({ sale: '1' }).length ? '<a href="#/shop?sale=1">Sale</a>' : '') + '<a href="#/wishlist" class="mobile-nav__minor">Wishlist</a><a href="#/track" class="mobile-nav__minor">Track an order</a></nav>';
    }
    mn.hidden = !mn.hidden; el.setAttribute('aria-expanded', String(!mn.hidden));
  };
  actions['toggle-search'] = (el) => {
    const sp = $('#search-panel');
    if (sp.hidden) {
      sp.innerHTML = '<div class="search-panel"><div class="container"><form data-form="search" role="search"><label class="sr-only" for="q-input">Search products</label><input id="q-input" class="input" type="search" name="q" placeholder="Search sarees, lehengas, silk, colours&hellip;" autocomplete="off"><button class="btn btn--primary" type="submit">Search</button></form></div></div>';
      sp.hidden = false; const i = $('#q-input'); if (i) i.focus();
    } else sp.hidden = true;
    el.setAttribute('aria-expanded', String(!sp.hidden));
  };
  forms.search = (f) => { const q = f.q.value.trim(); if (q) UI.nav('#/shop' + UI.qs({ q })); };
  actions['open-bag'] = () => UI.openDrawer();

  /* ===================== product pieces ===================== */
  /* A listing as a real shop shows it: photograph, name, price, the sizes that are actually in stock, a wishlist heart.
     panel = true on the catalogue: a click opens the side panel instead of leaving the page. */
  const wishButton = (p, text) => {
    const on = api.wishlistIds().includes(p.id);
    return '<button type="button" class="wish' + (text ? ' wish--text' : '') + (on ? ' is-on' : '') + '" data-action="wish" data-id="' + esc(p.id) + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Remove ' : 'Save ') + esc(p.name) + (on ? ' from' : ' to') + ' wishlist">' + ICON.heart + (text ? '<span>' + (text === true ? 'Wishlist' : text) + '</span>' : '') + '</button>';
  };
  function productCard(p, panel) {
    const tag = !p.inStock ? '<span class="tag tag--out">Sold out</span>' : p.salePrice ? '<span class="tag tag--sale">Sale</span>' : '';
    const cfg = api.settingsPublic();
    const open = panel ? ' data-action="open-panel" data-slug="' + esc(p.slug) + '"' : '';
    const sizes = p.sizes.length === 1 ? '<span>' + esc(p.sizes[0]) + '</span>' : p.sizes.map((s) => '<span' + (p.availableSizes.includes(s) ? '' : ' class="is-out" title="Sold out"') + '>' + esc(s) + '</span>').join('');
    return '<article class="product-card" data-slug="' + esc(p.slug) + '"><div class="product-card__media"><a href="#/product/' + esc(p.slug) + '"' + open + ' tabindex="-1" aria-hidden="true" style="display:block;width:100%;height:100%">' + UI.productMedia(p) + '</a>' + tag + wishButton(p) + '</div>' +
      '<div class="product-card__body"><a class="product-card__name" href="#/product/' + esc(p.slug) + '"' + open + '>' + esc(p.name) + '</a>' +
      '<div class="product-card__row"><span>' + UI.priceHtml(p) + '</span>' + UI.dots(p.colors) + '</div>' +
      '<div class="product-card__sizes" aria-label="Sizes">' + sizes + '</div>' +
      (p.effective >= cfg.freeDeliveryOver && p.inStock ? '<div class="product-card__delivery">Free delivery</div>' : '') + '</div></article>';
  }
  const grid = (list, four, panel) => '<div class="product-grid' + (four ? ' product-grid--4' : '') + '">' + list.map((p) => productCard(p, panel)).join('') + '</div>';

  function notFound(title, msg) {
    return { title: title || 'Not found', html: '<div class="container"><div class="empty"><p class="eyebrow">404</p><h1 class="h2">' + esc(title || 'We couldn’t find that page') + '</h1><p>' + esc(msg || 'It may have moved, or the link may be incorrect.') + '</p><a class="btn btn--primary" href="#/shop">Continue shopping</a></div></div>' };
  }
  UI.notFoundView = notFound;

  function steps(current) {
    const labels = ['Bag', 'Delivery', 'Review', 'Confirmation'];
    return '<nav class="steps" aria-label="Checkout progress">' + labels.map((l, i) => {
      const n = i + 1, cls = n < current ? ' is-done' : '';
      return (i ? '<span class="step__sep" aria-hidden="true"></span>' : '') + '<span class="step' + cls + '"' + (n === current ? ' aria-current="step"' : '') + '><span class="step__n">' + (n < current ? '&#10003;' : n) + '</span><span class="step__label">' + l + '</span></span>';
    }).join('') + '</nav>';
  }

  /* ===================== home ===================== */
  const sampleFig = (src, alt, cls) => src
    ? '<figure class="' + cls + '"><img src="' + esc(src) + '" alt="' + esc(alt) + '" decoding="async" onerror="UI.imgFail(this)"><figcaption>Sample photograph</figcaption></figure>'
    : '<figure class="' + cls + '">' + UI.placeholder('Photograph<br>coming soon') + '</figure>';
  const firstOf = (key) => ((root.BF_PHOTOS && root.BF_PHOTOS[key]) || [])[0];

  views.home = () => {
    const all = api.products({});
    const bySlug = (s) => all.find((p) => p.slug === s);
    const cats = api.categories().filter((c) => c.count > 0);
    const newest = api.products({ sort: 'newest' }).slice(0, 8);

    // category thumbnails: a chosen photograph per category where it exists, otherwise the category's first photographed piece
    const picks = { sarees: ['banarasi-georgette-saree', 'Dusty Rose'], kurtis: ['anaya-chikankari-kurti', 'Ivory'], dresses: ['soiree-satin-midi-dress', 'Burgundy'], lehengas: ['zardozi-bridal-lehenga', 'Crimson'], 'ethnic-sets': ['block-print-anarkali-set', 'Ivory'], tops: ['silk-charmeuse-camisole', 'Burgundy'], accessories: ['gold-plated-jhumka-earrings', 'Antique Gold'] };
    const catTile = (c) => {
      const pick = picks[c.slug] && bySlug(picks[c.slug][0]);
      const p = pick || all.find((x) => x.category === c.slug && UI.photosFor(x).length);
      return '<li><a class="cat" href="#/shop?cat=' + c.slug + '"><span class="cat__img">' + (p ? UI.productMedia(p, { color: pick ? picks[c.slug][1] : undefined, label: c.name }) : UI.placeholder()) + '</span><span class="cat__name">' + esc(c.name) + '</span><span class="cat__count">' + c.count + (c.count === 1 ? ' piece' : ' pieces') + '</span></a></li>';
    };

    // editorial: the wedding edit (pieces are read from the catalogue, so prices and names are always current)
    const weddingPieces = ['zardozi-bridal-lehenga', 'rose-embroidered-lehenga-set', 'marigold-mehendi-lehenga', 'mahika-kanchipuram-silk-saree'].map(bySlug).filter(Boolean);
    const lead = bySlug('rose-embroidered-lehenga-set');
    const editList = weddingPieces.map((p) => '<li><a href="#/product/' + esc(p.slug) + '"><span class="edit__thumb">' + UI.productMedia(p, { label: '' }) + '</span><span class="edit__name">' + esc(p.name) + '</span><span class="edit__price">' + UI.priceHtml(p) + '</span></a></li>').join('');

    const html =
      '<section class="hero" aria-labelledby="hero-title"><div class="hero__text"><h1 id="hero-title">Festive sarees, lehengas and everyday kurtis</h1>' +
      '<p>Handloom silks, embroidered sets and considered everyday wear, delivered across India.</p><a class="btn btn--primary" href="#/shop?edit=featured">Shop the festive edit</a></div>' +
      sampleFig(firstOf('__hero'), 'A woman in a green silk saree with a gold border, standing in a garden', 'hero__photo') + '</section>' +

      '<section class="section section--tight" aria-labelledby="cats-title"><div class="container"><h2 class="h2" id="cats-title">Shop by category</h2><ul class="cats">' + cats.map(catTile).join('') + '</ul></div></section>' +

      '<section class="section section--tight"><div class="container"><div class="section__head"><h2 class="h2">New arrivals</h2><a class="link link--plain" href="#/shop?sort=newest">View all &rarr;</a></div>' + grid(newest, true) + '</div></section>' +

      (weddingPieces.length ? '<section class="edit" aria-labelledby="edit-title"><div class="container edit__grid">' +
        '<div class="edit__figure">' + (lead ? sampleFig(UI.photosFor(lead, 'Rose Pink')[0], 'A woman in a rose-pink embroidered lehenga', 'edit__photo') : '') + '</div>' +
        '<div class="edit__body"><p class="eyebrow">The wedding edit</p><h2 class="h1" id="edit-title">Lehengas and silks for the wedding season</h2>' +
        '<p>From a zardozi bridal lehenga to a lighter marigold set for the mehendi, with a handwoven Kanchipuram saree for the ceremonies in between. Each piece is made to your measurements.</p>' +
        '<ul class="edit__list">' + editList + '</ul><a class="link" href="#/shop?feature=' + encodeURIComponent('For weddings') + '">See everything for weddings &rarr;</a></div></div></section>' : '') +

      '<section class="section"><div class="container story"><div class="story__text"><p class="eyebrow">Our story</p><h2 class="h1">Made slowly, worn for years</h2>' +
      '<p>BoutiqueFlow began in a small Chennai atelier with a simple belief: a garment should feel as good as it looks, and look better the longer it is worn.</p>' +
      '<p>We work directly with weavers and embroiderers across Kanchipuram, Lucknow and Jaipur, and make every piece in limited runs.</p><a class="link" href="#/page/about">Read more &rarr;</a></div>' +
      sampleFig(firstOf('__story'), 'A woman in a blue handloom sari against a patterned wall', 'story__photo') + '</div></section>';
    return { title: 'BoutiqueFlow — Indian sarees, lehengas and kurtis', html };
  };

  /* ===================== wishlist ===================== */
  views.wishlist = () => {
    const list = api.wishlistProducts();
    const html = '<div class="container wishlist"><div class="page-head"><h1 class="h1">Wishlist</h1><p class="lead">' + (list.length ? list.length + (list.length === 1 ? ' piece' : ' pieces') + ' saved on this device' + (api.currentUser() ? ' and to your account.' : '. Sign in to keep them on your account.') : 'Pieces you save appear here.') + '</p></div>' +
      (list.length ? grid(list, true, false) : '<div class="empty"><h2 class="h3">Nothing saved yet</h2><p>Tap the heart on any piece to keep it here for later.</p><a class="btn btn--primary" href="#/shop">Browse the collection</a></div>') + '</div>';
    return { title: 'Wishlist — BoutiqueFlow', html };
  };
  actions.wish = (el) => {
    let r;
    try { r = api.wishlistToggle(el.dataset.id); } catch (e) { UI.fail(e); return; }
    $$('[data-action="wish"][data-id="' + el.dataset.id + '"]').forEach((b) => {
      b.classList.toggle('is-on', r.saved); b.setAttribute('aria-pressed', String(r.saved));
      b.setAttribute('aria-label', (r.saved ? 'Remove ' : 'Save ') + (b.getAttribute('aria-label') || '').replace(/^(Remove|Save) /, '').replace(/ (from|to) wishlist$/, '') + (r.saved ? ' from' : ' to') + ' wishlist');
    });
    UI.refreshStoreChrome();
    if (UI.parseHash().segs[0] === 'wishlist') UI.rerender();
    else UI.toast(r.saved ? 'Saved to your wishlist.' : 'Removed from your wishlist.');
  };

  /* ===================== shop ===================== */
  const PRICE_BANDS = [['Under ' + money(3000), '', 3000], [money(3000) + ' – ' + money(5000), 3000, 5000], [money(5000) + ' – ' + money(10000), 5000, 10000], ['Over ' + money(10000), 10000, '']];
  // attribute filters: [query key, group title]; the product field has the same name
  const ATTR_GROUPS = [['style', 'Style'], ['length', 'Length'], ['silhouette', 'Silhouette'], ['pattern', 'Pattern'], ['material', 'Material'], ['neckline', 'Neckline'], ['sleeve', 'Sleeve type'], ['embellishment', 'Embellishment']];
  const csv = (s) => String(s || '').split(',').filter(Boolean);
  const wide = () => window.matchMedia('(min-width: 1200px)').matches;
  const desktop = () => window.matchMedia('(min-width: 960px)').matches;
  // remembered across re-renders (every filter click re-renders the page)
  const shopUI = { collapsed: false, open: { features: true, style: true, price: true, size: true, colour: true }, more: {}, panelSlug: '' };

  views.shop = ({ query }) => {
    const f = { cat: query.cat || '', q: query.q || '', size: query.size || '', color: query.color || '', min: query.min || '', max: query.max || '', avail: query.avail || '', sale: query.sale || '', feature: query.feature || '', sort: query.sort || 'relevance', edit: query.edit || '' };
    ATTR_GROUPS.forEach(([k]) => { f[k] = query[k] || ''; });
    const url = (o) => { const m = Object.assign({}, f, o); if (m.sort === 'relevance') m.sort = ''; return '#/shop' + UI.qs(m); };
    const toggled = (key, val) => { const cur = csv(f[key]); return (cur.includes(val) ? cur.filter((x) => x !== val) : cur.concat(val)).join(','); };
    const list = api.products(f);
    const cats = api.categories();
    // filter options describe what is available in the current view (category / search / edit / sale), not the whole shop
    const pool = api.products({ cat: f.cat, q: f.q, edit: f.edit, sale: f.sale });
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size', 'One Size'];
    const sizes = Array.from(new Set(pool.flatMap((p) => p.sizes))).sort((a, b) => (sizeOrder.indexOf(a) + 1 || 99) - (sizeOrder.indexOf(b) + 1 || 99));
    const colorMap = {};
    pool.forEach((p) => p.colors.forEach((c) => { colorMap[c.name] = c.hex; }));
    const colours = Object.keys(colorMap).sort();
    // facet values come from the live catalogue, most common first, so new admin-entered values appear automatically
    const facet = (get) => { const n = {}; pool.forEach((p) => [].concat(get(p)).filter(Boolean).forEach((v) => { n[v] = (n[v] || 0) + 1; })); return Object.keys(n).sort((a, b) => n[b] - n[a] || a.localeCompare(b)); };
    const cat = cats.find((c) => c.slug === f.cat);
    const selSizes = csv(f.size), selColours = csv(f.color), selFeatures = csv(f.feature);
    const heading = f.q ? 'Results for “' + f.q + '”' : f.edit ? 'The Festive Edit' : f.sale && !f.cat ? 'On sale' : cat ? cat.name : f.sort === 'newest' && query.sort ? 'New Arrivals' : 'All Collections';
    const blurb = f.q ? '' : f.edit ? 'Jewel tones, zari and softly structured silks for the festive weeks.' : f.sale && !f.cat ? 'Pieces from the collection at a reduced price.' : cat ? cat.tagline : 'Sarees, kurtis, dresses, tops and accessories.';
    const bandOn = (b) => !!(String(b[1]) === f.min && String(b[2]) === f.max && (f.min || f.max));
    const active = [];
    selSizes.forEach((s) => active.push(['Size: ' + s, url({ size: toggled('size', s) })]));
    selColours.forEach((c) => active.push([c, url({ color: toggled('color', c) })]));
    ATTR_GROUPS.forEach(([k, title]) => csv(f[k]).forEach((v) => active.push([title + ': ' + v, url({ [k]: toggled(k, v) })])));
    selFeatures.forEach((v) => active.push([v, url({ feature: toggled('feature', v) })]));
    const band = PRICE_BANDS.find(bandOn);
    if (band) active.push([band[0], url({ min: '', max: '' })]);
    else if (f.min || f.max) active.push([(f.min ? money(Number(f.min)) : 'Any') + ' – ' + (f.max ? money(Number(f.max)) : 'Any'), url({ min: '', max: '' })]);
    if (f.avail === 'in') active.push(['In stock', url({ avail: '' })]);
    if (f.sale && f.cat) active.push(['On sale', url({ sale: '' })]);
    if (f.q) active.push(['Search: ' + f.q, url({ q: '' })]);

    // checkbox-style rows: links, so every state is shareable and works without scripting
    const row = (label, href, on, lead, cls) => '<a class="check-row' + (cls || '') + '" href="' + href + '" role="checkbox" aria-checked="' + !!on + '"><span class="check-row__box" aria-hidden="true"></span>' + (lead || '') + '<span>' + label + '</span></a>';
    const group = (id, title, body, force) => { if (force) shopUI.open[id] = true; return '<details class="filter-group" data-group="' + id + '"' + (shopUI.open[id] ? ' open' : '') + '><summary>' + title + '<span class="chev" aria-hidden="true"></span></summary>' + body + '</details>'; };
    // a list of options, five visible and the rest behind "See more" (selected values always stay visible)
    const options = (id, title, found, selected, hrefFor, lead) => {
      const values = Array.from(new Set(found.concat(selected))); // ticked values stay visible even if this view has none
      if (!values.length) return '';
      const lid = 'list-' + id, more = !!shopUI.more[lid];
      const rows = values.map((v, i) => row(esc(v), hrefFor(v), selected.includes(v), lead ? lead(v) : '', i >= 5 && !selected.includes(v) ? ' is-extra' : '')).join('');
      return group(id, title, '<div class="filter-list' + (more ? ' show-all' : '') + '" id="' + lid + '">' + rows + '</div>' + (values.length > 5 ? '<button type="button" class="link small" data-action="filter-more" data-target="' + lid + '">' + (more ? 'See less' : 'See more') + '</button>' : ''), selected.length > 0);
    };
    const priceForm = '<form class="price-range" data-form="price-range" novalidate><label class="sr-only" for="pmin">Minimum price in rupees</label><span aria-hidden="true">₹</span><input class="input input--sm" id="pmin" name="min" inputmode="numeric" placeholder="Min" value="' + esc(band ? '' : f.min) + '"><label class="sr-only" for="pmax">Maximum price in rupees</label><span aria-hidden="true">₹</span><input class="input input--sm" id="pmax" name="max" inputmode="numeric" placeholder="Max" value="' + esc(band ? '' : f.max) + '"><button class="btn btn--secondary btn--sm" type="submit">Go</button></form>';
    const featureRows = row('In stock only', url({ avail: f.avail === 'in' ? '' : 'in' }), f.avail === 'in') + row('On sale', url({ sale: f.sale ? '' : '1' }), !!f.sale) +
      Array.from(new Set(facet((p) => p.features).concat(selFeatures))).map((v) => row(esc(v), url({ feature: toggled('feature', v) }), selFeatures.includes(v))).join('');
    const attr = (k) => { const g = ATTR_GROUPS.find((x) => x[0] === k); return options(k, g[1], facet((p) => p[k]), csv(f[k]), (v) => url({ [k]: toggled(k, v) })); };
    const filters = '<aside class="filters" id="filters" aria-label="Refine results"><h2 class="filters__title">Refine results</h2>' +
      group('features', 'Features', '<div class="filter-list">' + featureRows + '</div>', selFeatures.length > 0 || f.avail === 'in' || !!f.sale) +
      attr('style') +
      group('price', 'Price', '<div class="filter-list">' + PRICE_BANDS.map((b) => row(b[0], bandOn(b) ? url({ min: '', max: '' }) : url({ min: b[1], max: b[2] }), bandOn(b))).join('') + '</div>' + priceForm, !!(f.min || f.max)) +
      attr('length') + attr('silhouette') +
      options('size', 'Size', sizes, selSizes, (s) => url({ size: toggled('size', s) })) +
      options('colour', 'Colour', colours, selColours, (c) => url({ color: toggled('color', c) }), (c) => '<span class="swatch-sq" style="background:' + esc(colorMap[c] || '#ccc') + '"></span>') +
      attr('pattern') + attr('material') + attr('neckline') + attr('sleeve') + attr('embellishment') + '</aside>';

    const pills = [['All', url({ cat: '', edit: '', sale: '' }), !f.cat && !f.edit && !f.sale]]
      .concat(cats.map((c) => [c.name, url({ cat: c.slug, edit: '', sale: '' }), f.cat === c.slug && !f.edit && !f.sale]))
      .concat([['Festive Edit', url({ cat: '', edit: 'featured', sale: '' }), !!f.edit], ['On sale', url({ cat: '', edit: '', sale: '1' }), !!f.sale && !f.cat && !f.edit]]);
    const pillBar = '<div class="pill-bar"><button type="button" class="pill pill--filter" data-action="toggle-filters" aria-expanded="' + (desktop() ? !shopUI.collapsed : false) + '" aria-controls="filters"><span class="pill__icon">' + ICON.sliders + '</span><span class="sr-only">Filters</span></button>' +
      '<nav class="pill-row" id="pill-row" aria-label="Categories">' + pills.map((p) => '<a class="pill" href="' + p[1] + '"' + (p[2] ? ' aria-current="true"' : '') + '>' + esc(p[0]) + '</a>').join('') + '</nav>' +
      '<button type="button" class="pill-next" data-action="pills-next" aria-label="Scroll categories">' + ICON.chevron + '</button></div>';

    const body = list.length ? grid(list, true, true)
      : '<div class="empty empty--box"><h2 class="h3">No pieces match your selection</h2><p>Try removing a filter or searching for something else.</p><a class="btn btn--secondary" href="#/shop">Clear all filters</a></div>';
    const resultsTitle = f.sort === 'newest' ? 'New arrivals' : f.sort.startsWith('price') ? 'Sorted by price' : f.q ? 'Best matches' : 'Popular options';
    const sortOpt = (v, l) => '<option value="' + v + '"' + (f.sort === v ? ' selected' : '') + '>' + l + '</option>';
    const html = '<div class="container"><div class="page-head"><div class="breadcrumb"><a href="#/">Home</a> / ' + (cat ? '<a href="#/shop">Shop</a> / ' + esc(cat.name) : 'Shop') + '</div><h1 class="h1">' + esc(heading) + '</h1>' + (blurb ? '<p class="lead">' + esc(blurb) + '</p>' : '') +
      '<p class="sample-note">Photographs are licensed sample images shown for demonstration. They do not depict BoutiqueFlow&rsquo;s actual inventory.</p></div>' + pillBar +
      '<div class="shop-layout">' + filters + '<section aria-label="Products"><div class="results-head"><h2 class="h2">' + resultsTitle + '</h2><div class="results-tools"><span class="count" role="status">' + list.length + (list.length === 1 ? ' piece' : ' pieces') + '</span>' +
      '<label class="small muted" for="sort">Sort by</label><select class="select select--sm" id="sort" data-change="sort" style="width:auto">' + sortOpt('relevance', 'Relevance') + sortOpt('newest', 'Newest') + sortOpt('popular', 'Popularity') + sortOpt('price-asc', 'Price: low to high') + sortOpt('price-desc', 'Price: high to low') + '</select></div></div>' +
      (active.length ? '<div class="active-filters">' + active.map((a) => '<a class="chip" href="' + a[1] + '" aria-label="Remove filter ' + esc(a[0]) + '">' + esc(a[0]) + '</a>').join('') + '<a class="link small" href="#/shop' + (f.cat ? '?cat=' + f.cat : '') + '">Clear all</a></div>' : '') + body + '</section>' +
      '<aside class="detail-panel" id="detail-panel" aria-label="Product details" hidden><div id="panel-root"></div></aside></div></div>';
    return {
      title: heading + ' — BoutiqueFlow', html, keepScroll: true,
      after: () => {
        const r = $('#pill-row'), act = r && r.querySelector('[aria-current="true"]');
        if (act) r.scrollLeft = Math.max(0, act.offsetLeft - 80);
        if (shopUI.collapsed && desktop()) $('.shop-layout').classList.add('filters-collapsed');
        if (shopUI.panelSlug) { if (wide() && list.some((p) => p.slug === shopUI.panelSlug)) openPanel(shopUI.panelSlug, true); else shopUI.panelSlug = ''; }
      }
    };
  };
  actions['toggle-filters'] = (el) => {
    if (desktop()) { shopUI.collapsed = !shopUI.collapsed; $('.shop-layout').classList.toggle('filters-collapsed', shopUI.collapsed); el.setAttribute('aria-expanded', String(!shopUI.collapsed)); }
    else { const f = $('#filters'); f.classList.toggle('is-open'); el.setAttribute('aria-expanded', String(f.classList.contains('is-open'))); }
  };
  actions['pills-next'] = () => { const r = $('#pill-row'); r.scrollBy({ left: Math.max(200, r.clientWidth * 0.6), behavior: 'smooth' }); };
  actions['filter-more'] = (el) => { const id = el.dataset.target; shopUI.more[id] = !shopUI.more[id]; $('#' + id).classList.toggle('show-all', !!shopUI.more[id]); el.textContent = shopUI.more[id] ? 'See less' : 'See more'; };
  document.addEventListener('toggle', (e) => { const d = e.target; if (d && d.matches && d.matches('details.filter-group')) shopUI.open[d.dataset.group] = d.open; }, true);
  forms['price-range'] = (f) => {
    const clean = (v) => String(v || '').replace(/[,\s₹]/g, '');
    let min = clean(f.min.value), max = clean(f.max.value);
    if ((min && !/^\d+$/.test(min)) || (max && !/^\d+$/.test(max))) { UI.toast('Enter prices as whole numbers.', 'error'); return; }
    if (min && max && Number(min) > Number(max)) { UI.toast('The maximum price must be at least the minimum.', 'error'); return; }
    const q = UI.parseHash().query;
    q.min = min; q.max = max;
    UI.nav('#/shop' + UI.qs(q));
  };
  changes.sort = (el) => {
    const q = UI.parseHash().query;
    q.sort = el.value === 'relevance' ? '' : el.value;
    UI.nav('#/shop' + UI.qs(q));
  };

  /* ===================== product detail + quick view ===================== */
  // qv is shared by the quick-view dialog (home page) and the catalogue's side panel (panel: true)
  const scopes = { pdp: { p: null, st: null, root: '#pdp-root' }, qv: { p: null, st: null, root: '#qv-root', panel: false } };

  const variantFor = (p, color, size) => p.variants.find((v) => v.color === color && v.size === size) || null;
  const colorAvail = (p, color) => p.variants.some((v) => v.color === color && v.stock > 0);
  const sizeAvail = (p, color, size) => { const v = variantFor(p, color, size); return !!v && v.stock > 0; };
  function normalize(p, st) {
    if (!p.colors.some((c) => c.name === st.color) || !colorAvail(p, st.color)) { const c = p.colors.find((x) => colorAvail(p, x.name) && UI.hasPhotos(p, x.name)) || p.colors.find((x) => colorAvail(p, x.name)) || p.colors[0]; st.color = c ? c.name : ''; }
    if (st.size && !sizeAvail(p, st.color, st.size)) st.size = '';
    if (!st.size && p.sizes.length === 1 && sizeAvail(p, st.color, p.sizes[0])) st.size = p.sizes[0];
    const v = st.size ? variantFor(p, st.color, st.size) : null;
    st.qty = Math.max(1, Math.min(st.qty || 1, v ? Math.min(v.stock, 10) : 1));
  }

  function galleryHtml(p, st, scope) {
    const set = UI.photoSet(p, st.color);
    const n = set.list.length || 1;
    if (st.view >= n) st.view = 0;
    const cur = set.list[st.view];
    const label = p.name + (set.shownColor ? ' in ' + set.shownColor : '');
    const thumbs = set.list.length > 1 ? Array.from({ length: n }, (_, i) =>
      '<button type="button" class="thumb" data-action="gallery-thumb" data-scope="' + scope + '" data-view="' + i + '" aria-label="Show photograph ' + (i + 1) + ' of ' + n + '"' + (st.view === i ? ' aria-current="true"' : '') + '>' + UI.productMedia(p, { color: st.color, view: i, label: '' }) + '</button>').join('') : '';
    // honest labelling: stand-in photographs are not the actual item; other-colour photos say which colour they show
    const notes = [];
    if (cur && cur.sample) notes.push('Sample photograph');
    if (cur && !set.exact) notes.push('Photographed in ' + set.shownColor);
    const inPanel = scope === 'qv' && scopes.qv.panel;
    return '<div class="gallery' + (thumbs ? '' : ' gallery--single') + (inPanel ? ' gallery--stack' : '') + '"><div class="gallery__main" data-zoom="' + scope + '"' + (scope === 'pdp' && cur ? ' role="button" tabindex="0" aria-label="Zoom photograph"' : '') + '>' + UI.productMedia(p, { color: st.color, view: st.view, label }) +
      (notes.length ? '<span class="gallery__sample" title="Shown for demonstration. It does not depict the actual item or inventory.">' + notes.join(' &middot; ') + '</span>' : '') +
      (scope === 'pdp' && cur ? '<span class="gallery__hint">Hover to zoom</span>' : '') + (inPanel ? panelControls() : '') + '</div>' + (thumbs ? '<div class="gallery__thumbs">' + thumbs + '</div>' : '') + '</div>';
  }

  function optionsHtml(p, st, scope) {
    const v = st.size ? variantFor(p, st.color, st.size) : null;
    const th = p.lowStockThreshold;
    let avail;
    if (v && v.stock <= th) avail = '<span class="avail avail--low">Only ' + v.stock + ' left in this size</span>';
    else if (!p.inStock) avail = '<span class="avail avail--out">Currently sold out</span>';
    else avail = '<span class="avail">In stock</span>';
    const colors = p.colors.map((c) => {
      const ok = colorAvail(p, c.name);
      return '<button type="button" class="swatch" style="background:' + esc(c.hex) + '" data-action="opt-color" data-scope="' + scope + '" data-value="' + esc(c.name) + '" aria-pressed="' + (st.color === c.name) + '" aria-label="' + esc(c.name) + (ok ? '' : ' (sold out)') + '" title="' + esc(c.name) + (ok ? '' : ' — sold out') + '"' + (ok ? '' : ' disabled') + '></button>';
    }).join('');
    const sizes = p.sizes.map((s) => {
      const ok = sizeAvail(p, st.color, s);
      return '<button type="button" class="size-btn" data-action="opt-size" data-scope="' + scope + '" data-value="' + esc(s) + '" aria-pressed="' + (st.size === s) + '"' + (ok ? '' : ' disabled title="Sold out in ' + esc(st.color) + '" aria-label="' + esc(s) + ' — sold out"') + '>' + esc(s) + '</button>';
    }).join('');
    const max = v ? Math.min(v.stock, 10) : 1;
    const label = !p.inStock ? 'Sold out' : 'Add to Bag';
    return '<div>' + avail + '</div>' +
      '<div><div class="option-label"><span>Colour<span class="sel">' + esc(st.color) + '</span></span></div><div class="swatches" role="group" aria-label="Colour">' + colors + '</div></div>' +
      '<div><div class="option-label"><span>Size' + (st.size ? '<span class="sel">' + esc(st.size) + '</span>' : '') + '</span>' + (p.category === 'accessories' || p.category === 'sarees' ? '' : '<button type="button" class="link small" data-action="size-guide">Size guide</button>') + '</div><div class="sizes" role="group" aria-label="Size">' + sizes + '</div>' +
      (st.sizeError ? '<div class="field__error" role="alert" style="margin-top:8px">Please choose a size.</div>' : '') + '</div>' +
      '<div class="buy-row"><div class="qty" role="group" aria-label="Quantity"><button type="button" data-action="qty" data-scope="' + scope + '" data-delta="-1" aria-label="Decrease quantity"' + (st.qty <= 1 ? ' disabled' : '') + '>&minus;</button><span aria-live="polite">' + st.qty + '</span><button type="button" data-action="qty" data-scope="' + scope + '" data-delta="1" aria-label="Increase quantity"' + (st.qty >= max || !v ? ' disabled' : '') + '>+</button></div>' +
      '<button type="button" class="btn btn--primary" data-action="add-to-bag" data-scope="' + scope + '"' + (!p.inStock ? ' disabled' : '') + '>' + label + '</button>' + wishButton(p, true) + '</div>';
  }

  function pdpInner(p, st) {
    const care = (p.care || []).map((c) => '<li>' + esc(c) + '</li>').join('');
    const s = api.settingsPublic();
    return galleryHtml(p, st, 'pdp') +
      '<div class="pdp__info"><p class="eyebrow">' + esc(p.categoryName) + '</p><h1 class="pdp__title">' + esc(p.name) + '</h1><div>' + UI.priceHtml(p, true) + '<span class="xs muted" style="margin-left:10px">Inclusive of taxes</span></div>' +
      '<p class="muted">' + esc(p.description) + '</p>' + optionsHtml(p, st, 'pdp') +
      '<div class="delivery-note">' + ICON.truck + '<div><strong style="font-weight:500">Estimated delivery ' + UI.etaRange() + '</strong><div class="muted small">Complimentary above ' + money(s.freeDeliveryOver) + '; otherwise ' + money(s.deliveryFee) + '. Cash on Delivery available.</div></div></div>' +
      '<div class="info-list"><details open><summary>Details</summary><div class="body"><p><strong style="font-weight:500">Fabric:</strong> ' + esc(p.fabric) + '</p><p style="margin-top:6px">SKU: ' + esc(st.size && variantFor(p, st.color, st.size) ? variantFor(p, st.color, st.size).sku : 'select a size') + '</p></div></details>' +
      '<details><summary>Product care</summary><div class="body"><ul>' + care + '</ul></div></details>' +
      '<details><summary>Delivery &amp; returns</summary><div class="body"><p>Dispatched within 2 business days. Unworn items in original packaging can be exchanged within 7 days of delivery. See <a href="#/page/returns">returns</a>.</p></div></details></div></div>';
  }

  function renderScope(scope) {
    const s = scopes[scope], el = $(s.root);
    if (!el || !s.p) return;
    normalize(s.p, s.st);
    if (scope === 'pdp') { el.innerHTML = pdpInner(s.p, s.st); bindZoom(); }
    else if (s.panel) el.innerHTML = panelInner(s.p, s.st);
    else el.innerHTML = galleryHtml(s.p, s.st, 'qv') + '<div class="pdp__info" style="display:flex;flex-direction:column;gap:16px"><div>' + UI.priceHtml(s.p, true) + '</div><p class="muted small">' + esc(s.p.description) + '</p>' + optionsHtml(s.p, s.st, 'qv') + '<a class="link small" href="#/product/' + esc(s.p.slug) + '" data-action="modal-close">View full details</a></div>';
  }

  function openLightbox(s) {
    UI.openModal({ title: s.p.name, size: 'wide', html: '<div class="gallery__main" style="cursor:default;max-width:min(560px,100%);margin:0 auto">' + UI.productMedia(s.p, { color: s.st.color, view: s.st.view, label: s.p.name + ' in ' + s.st.color }) + '</div>' });
  }

  function bindZoom() {
    const m = $('.gallery__main[data-zoom="pdp"]');
    if (!m) return;
    m.addEventListener('mousemove', (e) => {
      const r = m.getBoundingClientRect();
      m.style.setProperty('--zx', ((e.clientX - r.left) / r.width * 100) + '%');
      m.style.setProperty('--zy', ((e.clientY - r.top) / r.height * 100) + '%');
      m.classList.add('is-zoomed');
    });
    m.addEventListener('mouseleave', () => m.classList.remove('is-zoomed'));
    const open = () => openLightbox(scopes.pdp);
    m.addEventListener('click', open);
    m.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  }

  actions['opt-color'] = (el) => { const s = scopes[el.dataset.scope]; s.st.color = el.dataset.value; s.st.sizeError = false; renderScope(el.dataset.scope); };
  actions['opt-size'] = (el) => { const s = scopes[el.dataset.scope]; s.st.size = el.dataset.value; s.st.sizeError = false; renderScope(el.dataset.scope); };
  actions.qty = (el) => { const s = scopes[el.dataset.scope]; s.st.qty += Number(el.dataset.delta); renderScope(el.dataset.scope); };
  actions['gallery-thumb'] = (el) => { const s = scopes[el.dataset.scope]; s.st.view = Number(el.dataset.view); renderScope(el.dataset.scope); };
  actions['add-to-bag'] = (el) => {
    const scope = el.dataset.scope, s = scopes[scope];
    if (!s.st.size) { s.st.sizeError = true; renderScope(scope); const b = $(s.root + ' .size-btn:not([disabled])'); if (b) b.focus(); return; }
    const v = variantFor(s.p, s.st.color, s.st.size);
    try { api.cartAdd(v.id, s.st.qty); }
    catch (e) { UI.fail(e); refreshProduct(scope); return; }
    if (scope === 'qv' && !s.panel) UI.closeModal(true);
    UI.refreshStoreChrome();
    UI.openDrawer();
  };
  function refreshProduct(scope) {
    const s = scopes[scope]; const fresh = api.product(s.p.slug);
    if (fresh) { s.p = fresh; renderScope(scope); }
  }
  actions['size-guide'] = () => {
    const rows = [['XS', 32, 26, 35], ['S', 34, 28, 37], ['M', 36, 30, 39], ['L', 38, 32, 41], ['XL', 40, 34, 43], ['XXL', 42, 36, 45]];
    UI.openModal({
      title: 'Size guide', size: 'wide',
      html: '<p class="muted small">Body measurements in inches. If you are between sizes, we suggest sizing up for a relaxed fit.</p><div class="table-wrap" style="margin-top:16px"><table class="table-plain"><thead><tr><th>Size</th><th>Bust</th><th>Waist</th><th>Hip</th></tr></thead><tbody>' +
        rows.map((r) => '<tr><td><strong style="font-weight:500">' + r[0] + '</strong></td><td>' + r[1] + '</td><td>' + r[2] + '</td><td>' + r[3] + '</td></tr>').join('') + '</tbody></table></div>' +
        '<h3 class="h3" style="margin-top:24px">How to measure</h3><p class="muted small" style="margin-top:6px"><strong style="font-weight:500">Bust:</strong> around the fullest part. <strong style="font-weight:500">Waist:</strong> around the narrowest part. <strong style="font-weight:500">Hip:</strong> around the fullest part of the hips. Sarees and accessories are one size.</p>'
    });
  };
  actions.quickview = (el) => {
    const p = api.product(el.dataset.slug);
    if (!p) return;
    scopes.qv.p = p; scopes.qv.st = { color: '', size: '', qty: 1, view: 0 };
    scopes.qv.panel = false; scopes.qv.root = '#qv-root';
    normalize(p, scopes.qv.st);
    UI.openModal({ title: p.name, size: 'wide', html: '<div class="quickview" id="qv-root"></div>', onOpen: () => renderScope('qv') });
  };

  /* ---- catalogue side panel: opens beside the grid (full-screen sheet on small screens) ---- */
  function panelControls() {
    return '<button type="button" class="panel__btn panel__close" data-action="panel-close" aria-label="Close product panel">' + ICON.close + '</button>' +
      '<button type="button" class="panel__btn panel__zoom" data-action="panel-zoom" aria-label="Enlarge photograph">' + ICON.zoom + '</button><span class="panel__seller">BoutiqueFlow</span>';
  }
  function panelInner(p, st) {
    const cfg = api.settingsPublic();
    const free = p.effective >= cfg.freeDeliveryOver;
    return galleryHtml(p, st, 'qv') +
      '<div class="panel__body"><p class="eyebrow">' + esc(p.categoryName) + '</p><h2 class="panel__title">' + esc(p.name) + '</h2>' +
      '<div class="panel__price">' + UI.priceHtml(p, true) + '<span class="xs muted" style="margin-left:10px">Inclusive of taxes</span></div>' +
      '<p class="panel__delivery">' + (free ? 'Free delivery' : 'Delivery ' + money(cfg.deliveryFee)) + ' &middot; arrives ' + UI.etaRange() + ' &middot; Cash on Delivery available</p>' +
      '<div class="panel__options">' + optionsHtml(p, st, 'qv') + '</div>' +
      '<p class="muted small" style="margin-top:16px">' + esc(p.description) + '</p>' +
      '<p style="margin-top:16px"><a class="link small" href="#/product/' + esc(p.slug) + '">View full details, care and size guide</a></p></div>';
  }
  function openPanel(slug, silent) {
    const p = api.product(slug), panel = $('#detail-panel');
    if (!p || !panel) return;
    const s = scopes.qv;
    s.p = p; s.panel = true; s.root = '#panel-root';
    if (!s.st || s.st.slug !== slug) s.st = { slug, color: '', size: '', qty: 1, view: 0 };
    normalize(p, s.st);
    shopUI.panelSlug = slug;
    panel.hidden = false;
    $('.shop-layout').classList.add('has-panel');
    $$('.product-card.is-selected').forEach((c) => c.classList.remove('is-selected'));
    const card = $('.product-card[data-slug="' + slug + '"]');
    if (card) card.classList.add('is-selected');
    renderScope('qv');
    if (!wide()) document.body.style.overflow = 'hidden';
    if (!silent) { panel.scrollTop = 0; const c = $('.panel__close', panel); if (c) c.focus(); }
  }
  function closePanel() {
    const panel = $('#detail-panel');
    if (!panel || panel.hidden) return;
    const slug = shopUI.panelSlug;
    panel.hidden = true; shopUI.panelSlug = '';
    const layout = $('.shop-layout'); if (layout) layout.classList.remove('has-panel');
    $$('.product-card.is-selected').forEach((c) => c.classList.remove('is-selected'));
    if (!UI.drawerOpen()) document.body.style.overflow = '';
    const card = slug && $('.product-card[data-slug="' + slug + '"] .product-card__name'); if (card) card.focus();
  }
  actions['open-panel'] = (el) => openPanel(el.dataset.slug);
  actions['panel-close'] = () => closePanel();
  actions['panel-zoom'] = () => openLightbox(scopes.qv);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && shopUI.panelSlug && !$('#modal-root').innerHTML && !UI.drawerOpen()) closePanel(); });
  UI.onLeaveShop = () => { if (shopUI.panelSlug) { shopUI.panelSlug = ''; document.body.style.overflow = ''; } };

  views.product = ({ segs }) => {
    const p = api.product(segs[1]);
    if (!p) return notFound('Product not found', 'This piece may no longer be available.');
    const prev = UI.recent.get().filter((s) => s !== p.slug);
    UI.recent.push(p.slug);
    scopes.pdp.p = p;
    if (!scopes.pdp.st || scopes.pdp.st.slug !== p.slug) scopes.pdp.st = { slug: p.slug, color: '', size: '', qty: 1, view: 0 };
    normalize(p, scopes.pdp.st);
    const pool = api.products({});
    const related = pool.filter((x) => x.category === p.category && x.slug !== p.slug).slice(0, 4);
    const viewed = prev.map((s) => pool.find((x) => x.slug === s)).filter(Boolean).slice(0, 4);
    const html = '<div class="container"><div class="breadcrumb" style="padding-top:24px"><a href="#/">Home</a> / <a href="#/shop?cat=' + esc(p.category) + '">' + esc(p.categoryName) + '</a> / ' + esc(p.name) + '</div><div class="pdp" id="pdp-root"></div></div>' +
      (related.length ? '<section class="section section--white section--tight"><div class="container"><div class="section__head"><h2 class="h2">You may also love</h2></div>' + grid(related, true) + '</div></section>' : '') +
      (viewed.length ? '<section class="section section--tight"><div class="container"><div class="section__head"><h2 class="h2">Recently viewed</h2></div>' + grid(viewed, true) + '</div></section>' : '');
    return { title: p.name + ' — BoutiqueFlow', html, after: () => renderScope('pdp') };
  };

  /* ===================== bag ===================== */
  function lineHtml(l, mode) {
    const controls = mode !== 'summary';
    const ctrl = controls
      ? '<div class="line__ctrl"><div class="qty qty--sm" role="group" aria-label="Quantity for ' + esc(l.product.name) + '"><button type="button" data-action="line-qty" data-variant="' + l.variantId + '" data-qty="' + l.qty + '" data-delta="-1" aria-label="Decrease quantity"' + (l.qty <= 1 ? ' disabled' : '') + '>&minus;</button><span>' + l.qty + '</span><button type="button" data-action="line-qty" data-variant="' + l.variantId + '" data-qty="' + l.qty + '" data-delta="1" aria-label="Increase quantity"' + (l.qty >= l.available ? ' disabled' : '') + '>+</button></div>' +
        '<button type="button" class="link small" data-action="line-remove" data-variant="' + l.variantId + '" aria-label="Remove ' + esc(l.product.name) + '">Remove</button></div>' : '';
    return '<li class="line"><a class="line__media" href="#/product/' + esc(l.product.slug) + '" tabindex="-1" aria-hidden="true">' + UI.productMedia(l.product, { color: l.variant.color, label: '' }) + '</a>' +
      '<div><a class="line__name" href="#/product/' + esc(l.product.slug) + '">' + esc(l.product.name) + '</a><div class="line__meta">' + esc(l.variant.color) + ' &middot; ' + esc(l.variant.size) + (mode === 'summary' ? ' &middot; Qty ' + l.qty : '') + '</div>' +
      (l.issue ? '<div class="line__issue" role="alert">' + esc(l.issue) + '</div>' : '') + ctrl + '</div>' +
      '<div class="line__total">' + money(l.unitPrice * l.qty) + (l.listPrice > l.unitPrice ? '<div class="xs muted" style="text-decoration:line-through;font-weight:400">' + money(l.listPrice * l.qty) + '</div>' : '') + '</div></li>';
  }
  function totalsHtml(t) {
    return '<div class="totals"><div><span>Subtotal</span><span>' + money(t.subtotal) + '</span></div>' +
      (t.discount ? '<div class="discount"><span>Discount (' + esc(t.promo.code) + ')</span><span>&minus;' + money(t.discount) + '</span></div>' : '') +
      '<div><span>Delivery</span><span>' + (t.delivery ? money(t.delivery) : 'Complimentary') + '</span></div>' +
      '<div class="grand"><span>Total</span><span>' + money(t.total) + '</span></div></div>';
  }
  const bagEmpty = '<div class="empty"><h2 class="h3">Your bag is empty</h2><p>When you find something you love, it will wait for you here.</p><a class="btn btn--primary" href="#/shop">Explore Collection</a></div>';

  UI.drawerHtml = () => {
    const c = api.cart();
    const head = '<div class="drawer__head"><h2 class="h3">Your bag <span class="muted small" style="font-family:var(--sans);font-weight:400">(' + c.totals.count + ')</span></h2><button type="button" class="icon-btn" data-action="drawer-close" aria-label="Close bag">' + ICON.close + '</button></div>';
    if (!c.lines.length) return head + '<div class="drawer__body">' + bagEmpty.replace('<a class="btn btn--primary" href="#/shop">', '<a class="btn btn--primary" data-action="drawer-close" href="#/shop">') + '</div>';
    return head + '<div class="drawer__body"><ul>' + c.lines.map((l) => lineHtml(l, 'drawer')).join('') + '</ul></div>' +
      '<div class="drawer__foot"><div class="totals"><div class="grand" style="border:0;padding:0;margin:0"><span>Subtotal</span><span>' + money(c.totals.subtotal) + '</span></div></div><p class="xs muted" style="margin:6px 0 16px">Delivery and discounts are calculated at checkout.</p>' +
      '<a class="btn btn--primary btn--block" data-action="drawer-close" href="#/bag">View bag &amp; checkout</a></div>';
  };

  function afterCartChange() {
    UI.refreshStoreChrome();
    UI.refreshDrawer();
    const r = UI.parseHash().segs[0];
    if (r === 'bag' || r === 'checkout' || r === 'review') UI.rerender();
  }
  actions['line-qty'] = (el) => {
    try { api.cartSetQty(el.dataset.variant, Number(el.dataset.qty) + Number(el.dataset.delta)); } catch (e) { UI.fail(e); }
    afterCartChange();
  };
  actions['line-remove'] = (el) => { api.cartRemove(el.dataset.variant); afterCartChange(); };
  actions['fix-bag'] = () => { api.cartFixStock(); afterCartChange(); UI.toast('Your bag has been updated.'); };
  actions['remove-promo'] = () => { api.applyPromo(''); afterCartChange(); };
  forms.promo = (f) => {
    const code = f.code.value.trim();
    if (!code) return;
    try { api.applyPromo(code); UI.toast('Code applied.'); } catch (e) { UI.fail(e); return; }
    afterCartChange();
  };
  const promoBlock = (c) => c.promo
    ? '<p class="small" style="margin:16px 0">Code <strong>' + esc(c.promo) + '</strong> applied &middot; <button type="button" class="link" data-action="remove-promo">Remove</button></p>'
    : '<form class="promo-row" data-form="promo"><label class="sr-only" for="promo-code">Promo code</label><input class="input" id="promo-code" name="code" placeholder="Promo code" autocomplete="off"><button class="btn btn--secondary btn--sm" type="submit" style="min-height:44px">Apply</button></form>';

  views.bag = () => {
    const c = api.cart();
    if (!c.lines.length) return { title: 'Your bag — BoutiqueFlow', html: '<div class="container">' + steps(1) + '<h1 class="h1 center">Your bag</h1>' + bagEmpty + '</div>' };
    const html = '<div class="container">' + steps(1) + '<h1 class="h1" style="margin-bottom:24px">Your bag</h1>' +
      (c.hasIssues ? '<div class="form-error" role="alert">Some items have changed since you added them. <button type="button" class="link" data-action="fix-bag">Update my bag</button></div>' : '') +
      '<div class="checkout-layout"><section aria-label="Items"><ul>' + c.lines.map((l) => lineHtml(l, 'bag')).join('') + '</ul><p style="margin-top:20px"><a class="link link--plain" href="#/shop">&larr; Continue shopping</a></p></section>' +
      '<aside class="summary"><h2>Order summary</h2>' + promoBlock(c) + totalsHtml(c.totals) +
      '<a class="btn btn--primary btn--block" style="margin-top:20px"' + (c.hasIssues ? ' aria-disabled="true"' : ' href="#/checkout"') + '>Continue to delivery</a>' +
      '<p class="xs muted center" style="margin-top:12px">No account needed. Complimentary delivery above ' + money(api.settingsPublic().freeDeliveryOver) + '.</p></aside></div></div>';
    return { title: 'Your bag — BoutiqueFlow', html };
  };

  /* ===================== checkout ===================== */
  let checkout = null;
  function loadCheckout() {
    if (checkout) return checkout;
    try { checkout = JSON.parse(sessionStorage.getItem('bf_checkout')); } catch (e) { checkout = null; }
    if (!checkout) checkout = { contact: { name: '', email: '', phone: '' }, address: { line1: '', line2: '', city: '', state: '', pincode: '' }, method: 'COD', saveAddress: true, ready: false };
    return checkout;
  }
  function saveCheckout() { try { sessionStorage.setItem('bf_checkout', JSON.stringify(checkout)); } catch (e) { /* ignore */ } }
  function resetCheckout() { checkout = null; try { sessionStorage.removeItem('bf_checkout'); } catch (e) { /* ignore */ } }

  function summaryAside(c) {
    return '<aside class="summary"><h2>Order summary</h2><ul>' + c.lines.map((l) => lineHtml(l, 'summary')).join('') + '</ul>' + totalsHtml(c.totals) + '</aside>';
  }
  function guardCart() {
    const c = api.cart();
    if (!c.lines.length) return { redirect: '#/bag' };
    if (c.hasIssues) return { redirect: '#/bag' };
    return { c };
  }

  views.checkout = () => {
    const g = guardCart();
    if (g.redirect) return g;
    const st = loadCheckout(), u = api.currentUser();
    let saved = [];
    if (u && u.role === 'Customer') {
      if (!st.contact.email && !st.contact.name) { st.contact = { name: u.name, email: u.email, phone: u.phone || '' }; }
      saved = api.addresses();
      if (saved.length && !st.address.line1) { const d = saved.find((a) => a.isDefault) || saved[0]; st.address = { line1: d.line1, line2: d.line2, city: d.city, state: d.state, pincode: d.pincode }; }
    }
    const C = st.contact, A = st.address;
    const html = '<div class="container container--wide">' + steps(2) + '<h1 class="h1" style="margin-bottom:24px">Delivery</h1><div class="checkout-layout"><form data-form="delivery" novalidate>' +
      (u ? '' : '<p class="form-note" style="margin-bottom:16px">Checking out as a guest. Already have an account? <a class="link" href="#/login?next=' + encodeURIComponent('#/checkout') + '">Sign in</a></p>') +
      '<div class="card"><h2 class="card__title">Contact</h2><div class="form-grid form-grid--2">' +
      UI.field({ id: 'name', label: 'Full name', value: C.name, required: true, autocomplete: 'name', span: true }) +
      UI.field({ id: 'email', label: 'Email', type: 'email', value: C.email, required: true, autocomplete: 'email' }) +
      UI.field({ id: 'phone', label: 'Mobile number', type: 'tel', value: C.phone, required: true, autocomplete: 'tel', inputmode: 'numeric', placeholder: '10-digit number' }) + '</div></div>' +
      '<div class="card"><h2 class="card__title">Delivery address</h2>' +
      (saved.length ? '<div class="field"><label class="field__label" for="saved">Saved addresses</label><select class="select" id="saved" data-change="saved-address"><option value="">Choose a saved address&hellip;</option>' + saved.map((a) => '<option value="' + a.id + '">' + esc(a.label + ' — ' + a.line1 + ', ' + a.city) + '</option>').join('') + '</select></div>' : '') +
      '<div class="form-grid form-grid--2">' +
      UI.field({ id: 'line1', label: 'Address', value: A.line1, required: true, autocomplete: 'address-line1', span: true }) +
      UI.field({ id: 'line2', label: 'Apartment, landmark', value: A.line2, opt: true, autocomplete: 'address-line2', span: true }) +
      UI.field({ id: 'city', label: 'City', value: A.city, required: true, autocomplete: 'address-level2' }) +
      UI.field({ id: 'state', label: 'State', value: A.state, required: true, autocomplete: 'address-level1' }) +
      UI.field({ id: 'pincode', label: 'PIN code', value: A.pincode, required: true, autocomplete: 'postal-code', inputmode: 'numeric', placeholder: '6 digits' }) + '</div>' +
      (u && u.role === 'Customer' ? '<label class="check"><input type="checkbox" name="saveAddress"' + (st.saveAddress ? ' checked' : '') + '> Save this address to my account</label>' : '') + '</div>' +
      '<div class="card"><h2 class="card__title">Payment</h2><div role="radiogroup" aria-label="Payment method">' +
      '<label class="pay-option"><input type="radio" name="method" value="COD"' + (st.method === 'COD' ? ' checked' : '') + '><span><strong>Cash on Delivery</strong><span>Pay in cash when your order arrives.</span></span></label>' +
      '<label class="pay-option"><input type="radio" name="method" value="SIMULATED"' + (st.method === 'SIMULATED' ? ' checked' : '') + '><span><strong>Card / UPI <span class="sim-label">Simulated</span></strong><span>Demonstration only &mdash; no real payment gateway is connected, no card details are collected and nothing is charged.</span></span></label></div>' +
      '<div class="field__error" data-err="method"></div></div>' +
      '<div style="display:flex;gap:12px;margin-top:24px;flex-wrap:wrap"><a class="btn btn--secondary" href="#/bag">Back to bag</a><button class="btn btn--primary" type="submit">Review order</button></div></form>' +
      summaryAside(g.c) + '</div></div>';
    return { title: 'Delivery — BoutiqueFlow', html };
  };
  changes['saved-address'] = (el) => {
    const a = api.addresses().find((x) => x.id === el.value);
    if (!a) return;
    const f = $('form[data-form="delivery"]');
    ['line1', 'line2', 'city', 'state', 'pincode'].forEach((k) => { f[k].value = a[k] || ''; });
    if (!f.name.value) f.name.value = a.name; if (!f.phone.value) f.phone.value = a.phone;
  };
  forms.delivery = (f) => {
    const v = UI.formValues(f);
    const st = loadCheckout();
    const contact = { name: v.name || '', email: v.email || '', phone: v.phone || '' };
    const address = { line1: v.line1 || '', line2: v.line2 || '', city: v.city || '', state: v.state || '', pincode: v.pincode || '' };
    const errs = api.validateCheckout({ contact, address, method: v.method });
    st.contact = contact; st.address = address; st.method = v.method || ''; if ('saveAddress' in v) st.saveAddress = v.saveAddress;
    UI.showFieldErrors(f, errs);
    if (Object.keys(errs).length) { saveCheckout(); return; }
    st.ready = true; saveCheckout();
    UI.nav('#/review');
  };

  views.review = () => {
    const g = guardCart();
    if (g.redirect) return g;
    const st = loadCheckout();
    if (!st.ready || Object.keys(api.validateCheckout(st)).length) return { redirect: '#/checkout' };
    const A = st.address, c = g.c;
    const html = '<div class="container container--wide">' + steps(3) + '<h1 class="h1" style="margin-bottom:24px">Review your order</h1><div class="checkout-layout"><div>' +
      '<div id="review-error"></div><div class="card"><div class="review-block"><div><div class="eyebrow">Contact</div><p style="margin-top:4px">' + esc(st.contact.name) + '<br><span class="muted">' + esc(st.contact.email) + ' &middot; ' + esc(st.contact.phone) + '</span></p></div><a class="link small" href="#/checkout">Edit</a></div>' +
      '<div class="review-block"><div><div class="eyebrow">Deliver to</div><address style="margin-top:4px">' + esc(A.line1) + (A.line2 ? ', ' + esc(A.line2) : '') + '<br>' + esc(A.city) + ', ' + esc(A.state) + ' ' + esc(A.pincode) + '</address></div><a class="link small" href="#/checkout">Edit</a></div>' +
      '<div class="review-block"><div><div class="eyebrow">Payment</div><p style="margin-top:4px">' + esc(PAYMENT_METHODS[st.method]) + (st.method === 'SIMULATED' ? ' <span class="sim-label">Simulated</span><br><span class="muted small">No real payment is taken in this demonstration.</span>' : '<br><span class="muted small">Pay in cash on delivery.</span>') + '</p></div><a class="link small" href="#/checkout">Edit</a></div>' +
      '<div class="review-block"><div><div class="eyebrow">Estimated delivery</div><p style="margin-top:4px">' + UI.etaRange() + '</p></div></div></div>' +
      '<div style="display:flex;gap:12px;margin-top:24px;flex-wrap:wrap"><a class="btn btn--secondary" href="#/checkout">Back</a><button type="button" class="btn btn--primary" data-action="place-order" style="flex:1 1 220px">Place order &middot; ' + money(c.totals.total) + '</button></div>' +
      '<p class="xs muted" style="margin-top:12px">By placing this order you agree to our <a class="link" href="#/page/terms">terms</a>. Stock is confirmed again at the moment of ordering.</p></div>' + summaryAside(c) + '</div></div>';
    return { title: 'Review — BoutiqueFlow', html };
  };

  actions['place-order'] = async (btn) => {
    const st = loadCheckout(), box = $('#review-error');
    box.innerHTML = '';
    UI.setBusy(btn, true, 'Placing order');
    try {
      await delay(450);
      const res = api.placeOrder({ contact: st.contact, address: st.address, method: st.method, saveAddress: st.saveAddress });
      let order = res.order;
      if (res.needsPayment) {
        btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Processing simulated payment';
        await delay(900);
        try { order = api.completeSimulatedPayment(order.id); }
        catch (e) { resetCheckout(); UI.refreshStoreChrome(); UI.nav('#/order/' + order.orderNo); UI.fail(e); return; }
      }
      resetCheckout();
      UI.refreshStoreChrome();
      UI.nav('#/confirmation/' + order.orderNo);
    } catch (e) {
      UI.setBusy(btn, false);
      if (e.code === 'VALIDATION') { UI.nav('#/checkout'); return; }
      box.innerHTML = '<div class="form-error" role="alert">' + esc(UI.errMsg(e)) + (e.code === 'STOCK' || e.code === 'EMPTY' ? ' <a class="link" href="#/bag">Review your bag</a>' : '') + '</div>';
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  views.confirmation = ({ segs }) => {
    const o = api.order(segs[1]);
    if (!o) return notFound('Order not found', 'We could not find that order in this browser. Use "Track an order" with your order number and email.');
    const first = o.customerName.split(' ')[0];
    const html = '<div class="container container--narrow">' + steps(4).replace('class="step"', 'class="step is-done"') + '<div class="confirm-hero"><span class="confirm-mark">' + ICON.check + '</span><p class="eyebrow">Order confirmed</p><h1 class="h1" style="margin:6px 0 10px">Thank you, ' + esc(first) + '</h1>' +
      '<p class="muted">Your order number</p><p class="order-no">' + esc(o.orderNo) + '</p>' +
      '<p class="muted small" style="margin-top:8px">' + (o.status === 'Pending Payment' ? 'Awaiting payment.' : 'A confirmation would be emailed to ' + esc(o.email) + ' &mdash; <em>email delivery is simulated in this demonstration.</em>') + '</p></div>' +
      '<div class="card">' + orderSummary(o) + '</div>' +
      '<ul class="next-steps"><li><strong>1. We prepare it</strong>Your order is packed by hand within 2 business days.</li><li><strong>2. It ships</strong>You will see tracking details on your order page.</li><li><strong>3. It arrives</strong>Estimated delivery ' + UI.etaRange(o) + '.</li></ul>' +
      '<div style="display:flex;gap:12px;justify-content:center;margin-top:32px;flex-wrap:wrap"><a class="btn btn--primary" href="#/order/' + esc(o.orderNo) + '">Track this order</a><a class="btn btn--secondary" href="#/shop">Continue shopping</a></div></div>';
    return { title: 'Order confirmed — BoutiqueFlow', html };
  };

  function orderSummary(o) {
    const A = o.address;
    return '<table class="table-plain"><thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Total</th></tr></thead><tbody>' +
      o.items.map((i) => '<tr><td><strong style="font-weight:500">' + esc(i.productName) + '</strong><br><span class="muted small">' + esc(i.color) + ' &middot; ' + esc(i.size) + ' &middot; ' + money(i.unitPrice) + ' each</span></td><td class="right">' + i.qty + '</td><td class="right">' + money(i.lineTotal) + '</td></tr>').join('') + '</tbody></table>' +
      '<div style="max-width:320px;margin:16px 0 0 auto"><div class="totals"><div><span>Subtotal</span><span>' + money(o.subtotal) + '</span></div>' + (o.discount ? '<div class="discount"><span>Discount (' + esc(o.promoCode) + ')</span><span>&minus;' + money(o.discount) + '</span></div>' : '') +
      '<div><span>Delivery</span><span>' + (o.deliveryFee ? money(o.deliveryFee) : 'Complimentary') + '</span></div><div class="grand"><span>Total</span><span>' + money(o.total) + '</span></div></div></div>' +
      '<hr class="rule"><dl class="kv"><div><dt>Deliver to</dt><dd>' + esc(A.name) + '<br><span class="muted">' + esc(A.line1) + (A.line2 ? ', ' + esc(A.line2) : '') + '<br>' + esc(A.city) + ', ' + esc(A.state) + ' ' + esc(A.pincode) + '</span></dd></div>' +
      '<div><dt>Payment</dt><dd>' + esc(PAYMENT_METHODS[o.paymentMethod]) + '<br>' + UI.payBadge(o.paymentStatus) + '</dd></div><div><dt>Placed</dt><dd>' + fmtDateTime(o.created) + '</dd></div></dl>';
  }

  /* ===================== order detail + tracking ===================== */
  function timeline(o) {
    if (o.status === 'Cancelled') {
      const c = o.history.find((h) => h.status === 'Cancelled');
      return '<div class="cancel-banner" role="status"><div><strong>This order was cancelled</strong><br><span class="small">' + (c ? fmtDate(c.at) + ' &middot; ' : '') + esc(o.cancelReason || 'No reason given') + '. ' +
        (o.paymentStatus === 'Refund Pending' ? 'Your refund is being processed.' : 'No payment was taken.') + '</span></div></div>';
    }
    const idx = STATUS_FLOW.indexOf(o.status);
    return (o.status === 'Pending Payment' ? '<div class="form-note form-note--warn" role="status">Awaiting payment &mdash; your order is confirmed once payment completes.</div>' : '') +
      '<ol class="timeline" aria-label="Order progress">' + STATUS_FLOW.map((s, i) => {
        const h = o.history.find((x) => x.status === s);
        return '<li class="timeline__step' + (i <= idx ? ' is-done' : '') + (i === idx ? ' is-current' : '') + '"' + (i === idx ? ' aria-current="step"' : '') + '>' + s + '<small>' + (h ? fmtDate(h.at) : (i === idx + 1 && idx >= 0 ? 'Next' : '&nbsp;')) + '</small></li>';
      }).join('') + '</ol>' +
      (o.status === 'Shipped' && o.trackingNo ? '<p class="small muted" style="text-align:center">Shipped with ' + esc(o.courier || 'our courier') + ' &middot; Tracking <strong style="font-weight:500;color:var(--espresso)">' + esc(o.trackingNo) + '</strong></p>' : '') +
      (o.status !== 'Delivered' && o.status !== 'Pending Payment' ? '<p class="small muted" style="text-align:center">Estimated delivery ' + UI.etaRange(o) + '</p>' : '');
  }

  views.order = ({ segs }) => {
    const o = api.order(segs[1]);
    if (!o) return notFound('Order not found', 'Sign in to see your orders, or track an order with your order number and email.');
    const u = api.currentUser();
    const canCancel = CANCELLABLE.includes(o.status) && (!u || u.role === 'Customer' || true);
    const html = '<div class="container container--narrow" style="padding-top:32px;padding-bottom:64px">' +
      '<p class="breadcrumb">' + (u && u.role === 'Customer' ? '<a href="#/account">My account</a> / <a href="#/account">Orders</a>' : '<a href="#/track">Track an order</a>') + ' / ' + esc(o.orderNo) + '</p>' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap"><div><p class="eyebrow">Order</p><h1 class="h1">' + esc(o.orderNo) + '</h1><p class="muted small" style="margin-top:4px">Placed ' + fmtDateTime(o.created) + '</p></div><div style="display:flex;gap:8px;flex-wrap:wrap">' + UI.statusBadge(o.status) + (o.status === 'Cancelled' && o.paymentStatus === 'Cancelled' ? '' : UI.payBadge(o.paymentStatus)) + '</div></div>' +
      '<div class="card" style="margin-top:24px">' + timeline(o) + '</div>' +
      '<div class="card" style="margin-top:16px"><h2 class="card__title">Items &amp; payment</h2>' + orderSummary(o) + '</div>' +
      '<div class="card" style="margin-top:16px"><h2 class="card__title">History</h2><ol class="history">' + o.history.slice().reverse().map((h) => '<li>' + esc(h.status) + (h.note ? ' <span class="muted">&middot; ' + esc(h.note) + '</span>' : '') + '<time datetime="' + esc(h.at) + '">' + fmtDateTime(h.at) + '</time></li>').join('') + '</ol></div>' +
      '<div style="display:flex;gap:12px;margin-top:24px;flex-wrap:wrap">' +
      (o.status === 'Pending Payment' && o.paymentMethod === 'SIMULATED' ? '<button type="button" class="btn btn--primary" data-action="pay-now" data-id="' + o.id + '">Complete payment (simulated)</button>' : '') +
      (canCancel ? '<button type="button" class="btn btn--danger" data-action="cancel-order" data-id="' + o.id + '" data-no="' + esc(o.orderNo) + '">Cancel order</button>' : '') +
      '<a class="btn btn--secondary" href="#/shop">Continue shopping</a></div>' +
      (!CANCELLABLE.includes(o.status) && o.status !== 'Cancelled' && o.status !== 'Delivered' ? '<p class="xs muted" style="margin-top:12px">Orders can be cancelled until they are shipped. Need help? <a class="link" href="#/page/contact">Contact us</a>.</p>' : '') + '</div>';
    return { title: 'Order ' + o.orderNo + ' — BoutiqueFlow', html };
  };
  actions['cancel-order'] = async (el) => {
    const r = await UI.confirmDialog({ title: 'Cancel order ' + el.dataset.no + '?', message: 'Items will be released back to stock' + ' and any payment refunded to the original method.', reasons: ['Changed my mind', 'Ordered the wrong size or colour', 'Found a better price', 'Delivery would take too long', 'Other'], reasonLabel: 'Reason for cancelling', confirmLabel: 'Cancel order', cancelLabel: 'Keep my order', danger: true });
    if (!r) return;
    try { api.cancelOrder(el.dataset.id, r.reason); UI.toast('Your order has been cancelled.'); UI.refreshStoreChrome(); UI.rerender(); } catch (e) { UI.fail(e); UI.rerender(); }
  };
  actions['pay-now'] = async (el) => {
    UI.setBusy(el, true, 'Processing simulated payment');
    await delay(900);
    try { api.completeSimulatedPayment(el.dataset.id); UI.toast('Payment received (simulated).'); } catch (e) { UI.fail(e); }
    UI.rerender();
  };

  views.track = () => {
    const html = '<div class="container container--form" style="padding:48px var(--gutter) 80px"><p class="eyebrow">Order tracking</p><h1 class="h1" style="margin:6px 0 12px">Track an order</h1><p class="muted" style="margin-bottom:24px">Enter your order number and the email used at checkout. Signed-in customers can see all orders in <a class="link" href="#/account">their account</a>.</p>' +
      '<form data-form="track" novalidate><div id="track-error"></div>' + UI.field({ id: 'orderNo', label: 'Order number', placeholder: 'BF-261026-1001', required: true }) + UI.field({ id: 'email', label: 'Email', type: 'email', required: true }) + '<button class="btn btn--primary btn--block" type="submit">Track order</button></form></div>';
    return { title: 'Track an order — BoutiqueFlow', html };
  };
  forms.track = (f) => {
    try { const o = api.trackOrder(f.orderNo.value.trim(), f.email.value.trim()); UI.nav('#/order/' + o.orderNo); }
    catch (e) { $('#track-error').innerHTML = '<div class="form-error" role="alert">' + esc(UI.errMsg(e)) + '</div>'; }
  };

  /* ===================== auth + account ===================== */
  const DEMO = { customer: 'customer@boutiqueflow.demo', staff: 'staff@boutiqueflow.demo', fulfilment: 'fulfilment@boutiqueflow.demo', admin: 'admin@boutiqueflow.demo' };
  function afterLogin(u, next) {
    UI.refreshStoreChrome();
    if (next && next.startsWith('#/') && !(u.role === 'Customer' && next.startsWith('#/admin'))) return UI.nav(next);
    UI.nav(u.role === 'Customer' ? '#/account' : '#/admin');
  }
  views.login = ({ query }) => {
    const html = '<div class="container container--form" style="padding:48px var(--gutter) 80px"><p class="eyebrow">Welcome back</p><h1 class="h1" style="margin:6px 0 24px">Sign in</h1><form data-form="login" novalidate data-next="' + esc(query.next || '') + '"><div id="login-error"></div>' +
      UI.field({ id: 'email', label: 'Email', type: 'email', required: true, autocomplete: 'username' }) + UI.field({ id: 'password', label: 'Password', type: 'password', required: true, autocomplete: 'current-password' }) +
      '<button class="btn btn--primary btn--block" type="submit">Sign in</button></form><p class="small muted center" style="margin-top:16px">New here? <a class="link" href="#/register' + (query.next ? '?next=' + encodeURIComponent(query.next) : '') + '">Create an account</a></p>' +
      '<div class="demo-box"><h3>Demo accounts</h3><p class="small muted" style="margin-bottom:12px">Password for all demo accounts: <strong>demo1234</strong>. Each role sees different things.</p>' +
      '<button type="button" class="btn btn--secondary btn--sm" data-action="demo-login" data-role="customer">Customer</button><button type="button" class="btn btn--secondary btn--sm" data-action="demo-login" data-role="fulfilment">Staff &middot; fulfilment only</button><button type="button" class="btn btn--secondary btn--sm" data-action="demo-login" data-role="staff">Staff &middot; products + fulfilment</button><button type="button" class="btn btn--secondary btn--sm" data-action="demo-login" data-role="admin">Admin</button></div></div>';
    return { title: 'Sign in — BoutiqueFlow', html };
  };
  forms.login = (f) => {
    try { const u = api.login(f.email.value, f.password.value); afterLogin(u, f.dataset.next); }
    catch (e) { $('#login-error').innerHTML = '<div class="form-error" role="alert">' + esc(UI.errMsg(e)) + '</div>'; }
  };
  actions['demo-login'] = (el) => { try { const u = api.login(DEMO[el.dataset.role], 'demo1234'); afterLogin(u, UI.parseHash().query.next); } catch (e) { UI.fail(e); } };
  views.demo = ({ segs }) => { try { const u = api.login(DEMO[segs[1]] || DEMO.customer, 'demo1234'); UI.refreshStoreChrome(); return { redirect: u.role === 'Customer' ? '#/account' : '#/admin' }; } catch (e) { return { redirect: '#/login' }; } };
  views.logout = () => { api.logout(); resetCheckout(); UI.refreshStoreChrome(); UI.toast('You have been signed out.'); return { redirect: '#/' }; };

  views.register = ({ query }) => {
    const html = '<div class="container container--form" style="padding:48px var(--gutter) 80px"><p class="eyebrow">Join BoutiqueFlow</p><h1 class="h1" style="margin:6px 0 24px">Create an account</h1><form data-form="register" novalidate data-next="' + esc(query.next || '') + '">' +
      UI.field({ id: 'name', label: 'Full name', required: true, autocomplete: 'name' }) + UI.field({ id: 'email', label: 'Email', type: 'email', required: true, autocomplete: 'email' }) + UI.field({ id: 'phone', label: 'Mobile number', type: 'tel', opt: true, autocomplete: 'tel', inputmode: 'numeric' }) +
      UI.field({ id: 'password', label: 'Password', type: 'password', required: true, autocomplete: 'new-password', hint: 'At least 8 characters.' }) + '<button class="btn btn--primary btn--block" type="submit">Create account</button></form>' +
      '<p class="small muted center" style="margin-top:16px">Already registered? <a class="link" href="#/login">Sign in</a></p></div>';
    return { title: 'Create account — BoutiqueFlow', html };
  };
  forms.register = (f) => {
    try { const u = api.register(UI.formValues(f)); UI.toast('Welcome to BoutiqueFlow.'); afterLogin(u, f.dataset.next); }
    catch (e) { if (e.fields) UI.showFieldErrors(f, e.fields); else UI.fail(e); }
  };

  function needCustomer() {
    const u = api.currentUser();
    if (!u) return { redirect: '#/login?next=' + encodeURIComponent('#/account') };
    if (u.role !== 'Customer') return { staff: true };
    return { u };
  }
  views.account = ({ segs }) => {
    const g = needCustomer();
    if (g.redirect) return g;
    if (g.staff) return { title: 'Account', html: '<div class="container"><div class="empty"><h1 class="h2">You are signed in as staff</h1><p>Customer accounts hold orders, addresses and a profile. Your tools are in the admin dashboard.</p><a class="btn btn--primary" href="#/admin">Open dashboard</a></div></div>' };
    const tab = segs[1] || 'orders', u = g.u;
    const tabs = [['orders', 'Orders'], ['profile', 'Profile'], ['addresses', 'Addresses']];
    let body = '';
    if (tab === 'orders') {
      const orders = api.myOrders();
      body = orders.length ? orders.map((o) => '<a class="order-row" href="#/order/' + esc(o.orderNo) + '"><div><div class="order-row__no">' + esc(o.orderNo) + '</div><div class="order-row__meta">' + fmtDate(o.created) + ' &middot; ' + o.items.reduce((s, i) => s + i.qty, 0) + ' item(s) &middot; ' + money(o.total) + '</div></div><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">' + UI.statusBadge(o.status) + UI.payBadge(o.paymentStatus) + '</div></a>').join('')
        : '<div class="empty empty--box"><h2 class="h3">No orders yet</h2><p>Your orders and their progress will appear here.</p><a class="btn btn--primary" href="#/shop">Explore Collection</a></div>';
      const notes = api.myNotifications().slice(0, 5);
      if (notes.length) body += '<h2 class="h3" style="margin:32px 0 12px">Recent updates</h2>' + notes.map((n) => '<div class="notice"><div class="notice__body"><strong style="font-weight:500">' + esc(n.title) + '</strong><div class="muted small">' + esc(n.body) + '</div><time>' + fmtDateTime(n.at) + ' &middot; ' + esc(n.channel) + '</time></div></div>').join('');
    } else if (tab === 'profile') {
      body = '<form class="card" data-form="profile" novalidate style="max-width:560px"><h2 class="card__title">Your details</h2>' + UI.field({ id: 'name', label: 'Full name', value: u.name, required: true }) +
        '<div class="field"><label class="field__label" for="f-email">Email</label><input class="input" id="f-email" value="' + esc(u.email) + '" disabled><div class="field__hint">Your email is used to sign in and cannot be changed here.</div></div>' +
        UI.field({ id: 'phone', label: 'Mobile number', type: 'tel', value: u.phone, opt: true }) + '<button class="btn btn--primary" type="submit">Save changes</button></form>';
    } else {
      const list = api.addresses();
      body = '<div class="address-grid">' + list.map((a) => '<div class="address-card"><div style="display:flex;justify-content:space-between"><strong style="font-weight:500">' + esc(a.label) + '</strong>' + (a.isDefault ? '<span class="badge badge--active">Default</span>' : '') + '</div><address>' + esc(a.name) + '<br>' + esc(a.line1) + (a.line2 ? ', ' + esc(a.line2) : '') + '<br>' + esc(a.city) + ', ' + esc(a.state) + ' ' + esc(a.pincode) + '<br>' + esc(a.phone) + '</address>' +
        '<div style="display:flex;gap:16px"><button type="button" class="link small" data-action="edit-address" data-id="' + a.id + '">Edit</button><button type="button" class="link small" data-action="delete-address" data-id="' + a.id + '">Delete</button></div></div>').join('') + '</div>' +
        (list.length ? '' : '<div class="empty empty--box"><h2 class="h3">No saved addresses</h2><p>Save an address to speed through checkout.</p></div>') + '<p style="margin-top:16px"><button type="button" class="btn btn--secondary" data-action="edit-address">Add an address</button></p>';
    }
    const html = '<div class="container" style="padding-top:40px;padding-bottom:64px"><div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:24px"><div><p class="eyebrow">My account</p><h1 class="h1">Hello, ' + esc(u.name.split(' ')[0]) + '</h1></div><a class="link" href="#/logout">Sign out</a></div>' +
      '<nav class="tabs" aria-label="Account sections">' + tabs.map((t) => '<a href="#/account/' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '>' + t[1] + '</a>').join('') + '</nav>' + body + '</div>';
    return { title: 'My account — BoutiqueFlow', html };
  };
  forms.profile = (f) => {
    try { api.updateProfile(UI.formValues(f)); UI.toast('Profile updated.'); UI.rerender(); } catch (e) { if (e.fields) UI.showFieldErrors(f, e.fields); else UI.fail(e); }
  };
  function addressForm(a) {
    a = a || {};
    return '<form data-form="address" novalidate><input type="hidden" name="id" value="' + esc(a.id || '') + '"><div class="form-grid form-grid--2">' +
      UI.field({ id: 'label', label: 'Label', value: a.label || 'Home', placeholder: 'Home, Work…' }) + UI.field({ id: 'name', label: 'Full name', value: a.name || api.currentUser().name, required: true }) +
      UI.field({ id: 'phone', label: 'Mobile number', type: 'tel', value: a.phone || api.currentUser().phone, required: true, span: true }) +
      UI.field({ id: 'line1', label: 'Address', value: a.line1, required: true, span: true }) + UI.field({ id: 'line2', label: 'Apartment, landmark', value: a.line2, opt: true, span: true }) +
      UI.field({ id: 'city', label: 'City', value: a.city, required: true }) + UI.field({ id: 'state', label: 'State', value: a.state, required: true }) + UI.field({ id: 'pincode', label: 'PIN code', value: a.pincode, required: true, inputmode: 'numeric' }) + '</div>' +
      '<label class="check"><input type="checkbox" name="isDefault"' + (a.isDefault ? ' checked' : '') + '> Make this my default address</label>' +
      '<div class="modal__actions"><button type="button" class="btn btn--secondary" data-action="modal-close">Cancel</button><button type="submit" class="btn btn--primary">Save address</button></div></form>';
  }
  actions['edit-address'] = (el) => { const a = el.dataset.id ? api.addresses().find((x) => x.id === el.dataset.id) : null; UI.openModal({ title: a ? 'Edit address' : 'Add an address', html: addressForm(a) }); };
  forms.address = (f) => {
    try { api.saveAddress(UI.formValues(f)); UI.closeModal(); UI.toast('Address saved.'); UI.rerender(); } catch (e) { if (e.fields) UI.showFieldErrors(f, e.fields); else UI.fail(e); }
  };
  actions['delete-address'] = async (el) => {
    const r = await UI.confirmDialog({ title: 'Delete this address?', message: 'This cannot be undone.', confirmLabel: 'Delete', cancelLabel: 'Keep', danger: true });
    if (!r) return;
    try { api.deleteAddress(el.dataset.id); UI.toast('Address deleted.'); UI.rerender(); } catch (e) { UI.fail(e); }
  };

  /* ===================== info pages ===================== */
  const PAGES = {
    about: ['Our story', ['BoutiqueFlow began in a small Chennai atelier with one belief: a garment should feel as good as it looks.', 'We work directly with weavers and embroiderers, and make every piece in limited runs.']],
    shipping: ['Shipping & delivery', ['Orders are dispatched within two business days and typically arrive in 3–6 days across India.', 'Delivery is complimentary above ₹3,000; otherwise a flat fee applies, shown at checkout. Cash on Delivery is available on all orders.', 'You can follow every order from Confirmed to Delivered from your account or with “Track an order”.']],
    returns: ['Returns & exchanges', ['Unworn items with tags and original packaging can be exchanged within 7 days of delivery.', 'Orders may be cancelled free of charge until they are shipped. Refunds are issued to the original payment method.', 'Sample policy text for this demonstration.']],
    privacy: ['Privacy', ['We collect only what is needed to fulfil your order: name, contact details and delivery address.', 'Sample policy text for this demonstration.']],
    terms: ['Terms of sale', ['Prices are in Indian rupees and inclusive of applicable taxes.', 'Stock is confirmed when an order is placed. Sample policy text for this demonstration.']],
    contact: ['Contact us', ['Write to care@boutiqueflow.example or visit the atelier at 24 Khader Nawaz Khan Road, Nungambakkam, Chennai 600034 (Mon–Sat, 10am–7pm).', 'Placeholder contact details for this demonstration.']],
    'size-guide': ['Size guide', ['Measurements are body measurements in inches: XS (bust 32), S (34), M (36), L (38), XL (40), XXL (42).', 'Sarees and accessories are one size. Between sizes? We suggest sizing up for a relaxed fit.']]
  };
  views.page = ({ segs }) => {
    const p = PAGES[segs[1]];
    if (!p) return notFound();
    return { title: p[0] + ' — BoutiqueFlow', html: '<div class="container container--narrow prose" style="padding:48px var(--gutter) 64px"><p class="eyebrow">BoutiqueFlow</p><h1 class="h1" style="margin:6px 0 12px">' + esc(p[0]) + '</h1><hr class="gold-rule">' + p[1].map((t) => '<p>' + esc(t) + '</p>').join('') + '</div>' };
  };

  UI.lineHtml = lineHtml; UI.totalsHtml = totalsHtml; UI.orderSummary = orderSummary; UI.timeline = timeline; UI.grid = grid;
})(window);

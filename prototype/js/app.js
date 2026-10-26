/* BoutiqueFlow — router and boot. Hash routes keep the prototype openable straight from disk. */
(function (root) {
  'use strict';

  const { api } = root.BF;
  const UI = root.UI;
  const { $, esc } = UI;

  let mode = null;
  let booting = true;
  let lastPath = null;

  function setMode(m) {
    if (mode === m) return;
    mode = m;
    $('#shell').innerHTML = m === 'admin' ? UI.adminShell() : UI.storeShell();
    document.body.classList.toggle('is-admin', m === 'admin');
  }

  function skeleton() {
    const card = '<div class="skeleton-card"><div class="skeleton"></div><div class="skeleton skeleton-line" style="width:70%"></div><div class="skeleton skeleton-line" style="width:35%"></div></div>';
    return '<div class="skeleton" style="height:min(60vh,520px)" aria-hidden="true"></div><div class="container" style="padding-top:48px" role="status" aria-label="Loading"><div class="product-grid product-grid--4">' + card.repeat(8) + '</div></div>';
  }

  function errorView(err) {
    console.error(err);
    return { title: 'Something went wrong', html: '<div class="container"><div class="empty"><h1 class="h2">Something went wrong</h1><p>The page could not be displayed. Try going back, or return to the home page.</p><a class="btn btn--primary" href="#/">Back to home</a></div></div>' };
  }

  function render() {
    const ctx = UI.parseHash();
    const name = ctx.segs[0] || 'home';
    if (name !== 'shop' && UI.onLeaveShop) UI.onLeaveShop();
    const isAdminRoute = name === 'admin';
    const user = api.currentUser();
    const wantAdmin = isAdminRoute && !!user && user.role !== 'Customer';
    setMode(wantAdmin ? 'admin' : 'store');

    if (booting && !wantAdmin) {
      booting = false;
      $('#main').innerHTML = skeleton();
      setTimeout(render, 320);
      return;
    }
    booting = false;

    let res;
    try {
      const view = UI.views[name];
      res = view ? view(ctx) : UI.notFoundView();
    } catch (e) {
      res = e && e.name === 'BFError' && (e.code === 'FORBIDDEN' || e.code === 'UNAUTHENTICATED')
        ? { title: 'No access', html: '<div class="container"><div class="empty"><h1 class="h2">' + esc(e.message) + '</h1><a class="btn btn--primary" href="#/login">Sign in</a></div></div>' }
        : errorView(e);
    }
    if (res.redirect) {
      location.replace(location.href.split('#')[0] + res.redirect);
      return;
    }

    const main = $('#main');
    main.innerHTML = res.html;
    document.title = res.title || 'BoutiqueFlow';
    const pathKey = ctx.segs.join('/');
    const samePath = pathKey === lastPath;
    if (!(res.keepScroll && samePath)) window.scrollTo(0, 0);
    if (!samePath) main.focus({ preventScroll: true });
    lastPath = pathKey;
    if (res.after) res.after();
    if (mode === 'admin') UI.refreshAdminChrome(); else UI.refreshStoreChrome();
  }
  UI.rerender = render;

  UI.actions.skip = () => { const m = $('#main'); if (m) m.focus(); };

  window.addEventListener('hashchange', () => { UI.closeModal(true); UI.closeDrawer(); render(); });
  render();
})(window);

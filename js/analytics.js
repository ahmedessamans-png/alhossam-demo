/* Analytics — GA4 + Meta pixel.
   The brief makes drop measurement a P1 requirement (early-access visits, waitlist demand, purchases
   attributed to launch emails). This wires the events and stays completely inert until real IDs are
   supplied by the owner: no IDs = no network calls, no cookies, no injected tags.

   Configure in catalog.json → settings.analytics = { "ga4": "G-XXXXXXX", "meta": "1234567890" }
*/
(function () {
  const state = { ga4: null, meta: null, ready: false, queued: [] };

  function log(msg) {
    if (window.DRYV_ANALYTICS_DEBUG) console.info('[analytics]', msg);
  }

  function injectGA4(id) {
    if (document.querySelector('script[data-ga4]')) return;
    const s = document.createElement('script');
    s.async = true;
    s.dataset.ga4 = '1';
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id, { send_page_view: false });
    log('GA4 injected');
  }

  function injectMeta(id) {
    if (window.fbq) return;
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', id);
    log('Meta pixel injected');
  }

  function flush() {
    const q = state.queued.splice(0);
    q.forEach(([name, params]) => send(name, params));
  }

  function send(name, params) {
    if (state.ga4 && window.gtag) window.gtag('event', name, params || {});
    if (state.meta && window.fbq) {
      const map = {
        page_view: 'PageView', view_item: 'ViewContent', add_to_cart: 'AddToCart',
        begin_checkout: 'InitiateCheckout', purchase: 'Purchase', sign_up: 'Lead'
      };
      const fbEvent = map[name];
      if (fbEvent) window.fbq('track', fbEvent, params || {});
    }
    log('event ' + name + ' ' + JSON.stringify(params || {}));
  }

  function track(name, params) {
    if (!state.ready) { state.queued.push([name, params]); return; }
    send(name, params);
  }

  function pageView() {
    const path = location.hash.replace(/^#/, '') || '/';
    track('page_view', { page_path: path, page_location: location.href, page_title: document.title });
  }

  async function loadConfig() {
    if (!window.DRYV_CATALOG) {
      try {
        const r = await fetch('catalog.json?v=20261102b', { cache: 'no-store' });
        window.DRYV_CATALOG = await r.json();
      } catch (e) { log('catalog unavailable'); }
    }
    const settings = (window.DRYV_CATALOG && window.DRYV_CATALOG.settings) || null;
    const cfg = (settings && settings.analytics) || {};
    // also accept values placed in config.js for owners who prefer editing that file
    const ga4 = cfg.ga4 || (window.DRYV_GA4_ID || '');
    const meta = cfg.meta || (window.DRYV_META_PIXEL_ID || '');
    if (ga4) { state.ga4 = ga4; injectGA4(ga4); }
    if (meta) { state.meta = meta; injectMeta(meta); }
    state.ready = true;
    if (!ga4 && !meta) log('no IDs configured — inert (set settings.analytics in catalog.json)');
    flush();
  }

  async function init() {
    await loadConfig();
    pageView();
    window.addEventListener('hashchange', () => {
      pageView();
      const h = location.hash;
      if (h.startsWith('#/confirmation/')) {
        const order = h.split('/')[2] || null;
        track('purchase', { transaction_id: order });
      }
      if (h.startsWith('#/early-access')) track('sign_up', { method: 'early_access' });
    });
  }

  window.DRYV_ANALYTICS = { track, pageView, state };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

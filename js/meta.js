/* Route metadata.
   Cart, checkout and early-access never set their own title, so after visiting a
   policy page they inherited "Shipping Policy | DRYV" and its description — every
   share and every tab showed the wrong page. This owns title/description/canonical
   for the routes the page modules do not handle.
*/
(function () {
  const SITE = 'DRYV';
  const ORIGIN = 'https://dryv.com';

  function setTag(selector, attr, value) {
    let el = document.head.querySelector(selector);
    if (!el) {
      el = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
      if (selector.includes('name=')) el.setAttribute('name', 'description');
      if (selector.includes('rel=')) el.setAttribute('rel', 'canonical');
      if (selector.includes('property=')) el.setAttribute('property', 'og:title');
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  }

  function apply(title, description, path) {
    document.title = title;
    let d = document.head.querySelector('meta[name="description"]');
    if (d) d.setAttribute('content', description);
    let c = document.head.querySelector('link[rel="canonical"]');
    if (c) c.setAttribute('href', ORIGIN + (path === '/' ? '/' : path));
    // social cards follow the same page
    const ogt = document.head.querySelector('meta[property="og:title"]');
    if (ogt) ogt.setAttribute('content', title);
    const ogu = document.head.querySelector('meta[property="og:url"]');
    if (ogu) ogu.setAttribute('content', ORIGIN + (path === '/' ? '/' : path));
    const ogd = document.head.querySelector('meta[property="og:description"]');
    if (ogd) ogd.setAttribute('content', description);
  }

  function productName(handle) {
    const cat = window.DRYV_CATALOG;
    if (!cat || !cat.products) return null;
    const p = cat.products.find(x => x.handle === handle);
    if (!p) return null;
    return (p.name && (p.name.en || p.name)) || null;
  }

  function run() {
    const raw = location.hash.replace(/^#/, '') || '/';
    const path = raw.split('?')[0];

    // canonical belongs to every route, including the page/policy modules
    // that set their own title and description.
    const canon = document.head.querySelector('link[rel="canonical"]');
    if (canon) canon.setAttribute('href', ORIGIN + (path === '/' ? '/' : path));
    const ogu = document.head.querySelector('meta[property="og:url"]');
    if (ogu) ogu.setAttribute('content', ORIGIN + (path === '/' ? '/' : path));

    if (path === '/' || path === '') {
      return apply('DRYV | Strength in Motion',
        'DRYV is Egypt-based training wear built for movement: technical jersey, quiet lines, and nothing that asks for attention.', '/');
    }
    if (path === '/collections/all') {
      return apply(`Shop All | ${SITE}`,
        'The full DRYV collection: Core Training Tank and Fitted Compression Tee, in every colour and size.', '/collections/all');
    }
    if (path.startsWith('/products/')) {
      const handle = path.split('/')[2];
      const name = productName(handle) || 'Product';
      return apply(`${name} | ${SITE}`,
        `${name} from DRYV. Technical jersey, athletic fit, free delivery across Egypt over EGP 950.`, path);
    }
    if (path === '/cart') {
      return apply(`Your Bag | ${SITE}`, 'Review your DRYV bag before checkout.', '/cart');
    }
    if (path === '/checkout') {
      return apply(`Checkout | ${SITE}`, 'Secure DRYV checkout with cash on delivery, Fawry or Valu.', '/checkout');
    }
    if (path === '/early-access') {
      return apply(`Early Access | ${SITE}`, 'Shop the DRYV drop before it opens to everyone, with an invitation code.', '/early-access');
    }
    // /pages/* and /policies/* set their own metadata in pages.js
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
  window.addEventListener('hashchange', () => setTimeout(run, 30));
})();

/* DRYV pop-ins: sections and cards rise in once as they enter, the briefing rail tracks the current
   section, and a small "first in line" card offers the drop list once per visit.
   Never hides content without a fallback: everything is shown after 1.2 s if the observer never fires,
   and nothing runs under prefers-reduced-motion. Free scrolling: no scroll listeners that block. */
(function () {
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  if (!REDUCE) root.classList.add('pop-ready');

  let io;
  function popIn() {
    if (REDUCE || !('IntersectionObserver' in window)) return;
    io = io || new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-popped'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    const els = document.querySelectorAll('#mainContent [data-pop]:not(.is-popped), #mainContent [data-pop-stagger]:not(.is-popped),' +
      ' #mainContent .ed-h2:not(.is-popped), #mainContent .section-title:not(.is-popped), #mainContent .product-card:not(.is-popped),' +
      ' #mainContent .page-cover:not(.is-popped), #mainContent .page-figure:not(.is-popped)');
    els.forEach(el => { if (!el.hasAttribute('data-pop') && !el.hasAttribute('data-pop-stagger')) el.setAttribute('data-pop', ''); io.observe(el); });
    setTimeout(() => els.forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight) el.classList.add('is-popped'); }), 1200);
  }

  let spy;
  function rail() {
    const r = document.querySelector('.ed-rail'); if (!r) return;
    const links = [...r.querySelectorAll('a[data-scroll]')];
    const bar = r.querySelector('.ed-rail__bar i');
    spy && spy.disconnect();
    spy = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach((a, i) => { const on = a.dataset.scroll === '#' + e.target.id; a.classList.toggle('is-on', on);
        if (on && bar) bar.style.transform = `scaleX(${(i + 1) / links.length})`; });
    }), { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(a => { const s = document.querySelector(a.dataset.scroll); if (s) spy.observe(s); });
  }

  function offerCard() {
    let seen = false; try { seen = sessionStorage.getItem('dryv-offer') === '1'; } catch (e) {}
    if (seen || document.querySelector('.dryv-offer') || !/^#\/?$/.test(location.hash || '#/')) return;
    const fire = () => {
      let done = false; try { done = sessionStorage.getItem('dryv-offer') === '1'; } catch (e) {}
      if (done || document.querySelector('.dryv-offer') || !/^#\/?$/.test(location.hash || '#/')) return;
      const c = document.createElement('aside');
      c.className = 'dryv-offer'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-label', 'Join the drop list');
      c.innerHTML = `<button class="dryv-offer__x" type="button" aria-label="Close">&times;</button>
        <img src="assets/img/gen/dryv-pull-960.webp" alt="" loading="lazy">
        <div><p class="dryv-offer__k">The list</p><p class="dryv-offer__t">First in line for the next drop.</p>
        <a class="dryv-offer__cta" href="#next-drop" data-scroll="#next-drop">Get early access</a></div>`;
      document.body.appendChild(c);
      requestAnimationFrame(() => c.classList.add('is-in'));
      const close = () => { c.classList.remove('is-in'); setTimeout(() => c.remove(), 260); try { sessionStorage.setItem('dryv-offer', '1'); } catch (e) {} };
      c.querySelector('.dryv-offer__x').addEventListener('click', close);
      c.querySelector('.dryv-offer__cta').addEventListener('click', close);
    };
    const t = setTimeout(fire, 25000);
    const onScroll = () => { if (scrollY > document.body.scrollHeight * 0.55) { clearTimeout(t); fire(); removeEventListener('scroll', onScroll); } };
    addEventListener('scroll', onScroll, { passive: true });
  }

  function header() {
    const h = document.querySelector('.site-header, header.header, #siteHeader, header');
    if (!h) return;
    addEventListener('scroll', () => h.classList.toggle('is-scrolled', scrollY > 24), { passive: true });
  }

  // Same section-name chip on every page: inner-page headings, the product type, shop headers.
  function labelize() {
    const mk = el => {
      if (!el || el.classList.contains('ed-label')) return;
      el.classList.add('ed-label'); el.setAttribute('data-pop', '');
      if (!el.querySelector(':scope > span')) { const sp = document.createElement('span'); sp.textContent = el.textContent.trim(); el.textContent = ''; el.appendChild(sp); }
    };
    document.querySelectorAll('#mainContent .page-content h2:not(.page-title-inline):not(.visually-hidden), #mainContent .product-page .product-info > p.product-card-name').forEach(mk);
    const ph = document.querySelector('#mainContent .page-header .container');
    if (ph && !ph.querySelector('.ed-label')) {
      const k = document.createElement('p'); k.className = 'ed-kicker'; k.innerHTML = '<span>Shop DRYV</span>';
      ph.insertBefore(k, ph.firstChild); mk(k);
    }
  }

  function run() {
    labelize();
    const home = /^#\/?$/.test(location.hash || '#/');
    if (!home) document.querySelectorAll('.dryv-offer').forEach(c => c.remove());
    popIn(); rail(); offerCard();
  }
  const mo = new MutationObserver(() => { clearTimeout(run._t); run._t = setTimeout(run, 80); });
  addEventListener('hashchange', () => setTimeout(run, 60));
  document.addEventListener('DOMContentLoaded', () => {
    const m = document.getElementById('mainContent'); if (m) mo.observe(m, { childList: true });
    header(); run();
  });
})();

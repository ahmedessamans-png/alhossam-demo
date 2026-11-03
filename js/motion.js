/* Motion layer for the DRYV storefront.
   The site read as a set of static screenshots: sections appeared fully formed, images sat dead, and
   nothing responded to the scroll. This adds the movement a fashion house site has — but restrained:
   content rises into place, images drift at a different rate to the page, cards answer the cursor.
   Everything is skipped for anyone with prefers-reduced-motion. */
(function () {
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CSS = `
  [data-reveal]{opacity:0;transform:translate3d(0,26px,0);
    transition:opacity .9s cubic-bezier(.2,.7,.2,1), transform .9s cubic-bezier(.2,.7,.2,1);
    will-change:opacity,transform}
  [data-reveal].is-in{opacity:1;transform:none}
  [data-reveal-stagger] > *{opacity:0;transform:translate3d(0,22px,0);
    transition:opacity .8s cubic-bezier(.2,.7,.2,1), transform .8s cubic-bezier(.2,.7,.2,1)}
  [data-reveal-stagger].is-in > *{opacity:1;transform:none}
  .motion-figure{overflow:hidden}
  .motion-figure img{will-change:transform;transition:transform .2s linear}
  .page-cover img{transition:transform 1.2s cubic-bezier(.2,.7,.2,1)}
  body.motion-ready .page-cover img[data-parallax]{transform:scale(1.06) translateY(var(--py,0px))}
  .motion-hover{transition:transform .5s cubic-bezier(.2,.7,.2,1), box-shadow .5s ease}
  .motion-hover:hover{transform:translateY(-4px)}
  @media (prefers-reduced-motion: reduce){
    [data-reveal],[data-reveal-stagger] > *{opacity:1!important;transform:none!important;transition:none!important}
    .motion-figure img{transform:none!important}
  }
  `;

  function inject() {
    if (document.getElementById('motion-css')) return;
    const el = document.createElement('style');
    el.id = 'motion-css';
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  function targets() {
    return Array.from(document.querySelectorAll(
      '#mainContent > section, #mainContent .product-card, #mainContent .page-figure,' +
      ' #mainContent .page-cover-inner, #mainContent .brand-band, #mainContent .next-drop-band'
    ));
  }

  function prep() {
    targets().forEach((el, i) => {
      if (el.dataset.reveal) return;
      el.dataset.reveal = '';
      el.style.transitionDelay = (Math.min(i, 6) * 55) + 'ms';
    });
    // grids get a stagger so cards arrive one after another, not as a block
    document.querySelectorAll('#mainContent .shop-grid, #mainContent .product-grid').forEach(g => {
      if (!g.dataset.revealStagger) g.dataset.revealStagger = '';
    });
    document.querySelectorAll('#mainContent .page-cover img, #mainContent .page-figure img').forEach(img => {
      if (!img.dataset.parallax) img.dataset.parallax = '';
      img.parentElement.classList.add('motion-figure');
    });
  }

  let io = null;
  function observe() {
    if (io) io.disconnect();
    io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    document.querySelectorAll('[data-reveal], [data-reveal-stagger]').forEach(el => io.observe(el));
  }

  function parallax() {
    if (REDUCE) return;
    const vh = window.innerHeight;
    document.querySelectorAll('img[data-parallax]').forEach(img => {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      // subtle: max ±18px over the viewport travel
      const progress = (r.top + r.height / 2 - vh / 2) / vh;
      img.style.setProperty('--py', (progress * 18).toFixed(2) + 'px');
    });
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { parallax(); ticking = false; });
  }

  function run() {
    if (REDUCE) { inject(); return; }
    inject();
    document.body.classList.add('motion-ready');
    prep();
    observe();
    parallax();
  }

  function boot() {
    run();
    const main = document.getElementById('mainContent');
    if (main && !main.dataset.motionWatched) {
      main.dataset.motionWatched = '1';
      new MutationObserver(() => { prep(); observe(); parallax(); })
        .observe(main, { childList: true, subtree: true });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('hashchange', () => setTimeout(run, 60));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

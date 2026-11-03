/* DRYV redesign v2: small helpers only (no injected banners). Adds the giant outlined word to each category
   tile (Scrolltide layering) and lets fabric-lab callouts open on tap. Route-aware for the hash SPA. */
(function () {
  function run() {
    document.querySelectorAll('.shop-by-category .category-tile').forEach(t => {
      if (t.dataset.word) return;
      const h = (t.getAttribute('data-handle') || '').toLowerCase();
      t.dataset.word = h.includes('tank') ? 'Tanks' : h.includes('compression') ? 'Tees' : 'DRYV';
    });
    // Account page reads as the member's locker.
    const acc = document.getElementById('accountTitle');
    document.body.classList.toggle('is-locker', !!acc);
    if (acc && (document.documentElement.lang || 'en').startsWith('en') && acc.textContent.trim() !== 'Your Locker') acc.textContent = 'Your Locker';
    const ph = document.querySelector('.page-header');
    if (ph) {
      const r = location.hash.toLowerCase();
      ph.dataset.cover = r.includes('tank') ? 'tanks' : (r.includes('compression') || r.includes('tee')) ? 'tees'
        : r.includes('new') ? 'new' : r.includes('best') ? 'best' : 'all';
    }
  }
  const mo = new MutationObserver(() => { clearTimeout(run._t); run._t = setTimeout(run, 60); });
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-scroll]'); if (!a || !a.dataset.scroll) return;
    const el = document.querySelector(a.dataset.scroll); if (!el) return;
    e.preventDefault(); el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  window.addEventListener('hashchange', () => setTimeout(run, 120));
  document.addEventListener('DOMContentLoaded', () => {
    const main = document.getElementById('mainContent'); if (main) mo.observe(main, { childList: true, subtree: false });
    run();
  });
})();

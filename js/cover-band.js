/* Page cover bands.
   The inner pages were bare text with one shared SEO image, so every section looked the same.
   This injects a distinct, art-directed cover above each page's content: image, kicker and the
   page's own h1 promoted onto it. Runs on load and on every route change; idempotent so it never
   double-inserts. */
(function () {
  const COVERS = {
    aboutTitle:    { img: 'gen/dryv-workshop.webp',   kicker: 'Made in Cairo' },
    accountTitle:  { img: 'gen/dryv-locker.webp', kicker: 'Members' },
    contactTitle:  { img: 'gen/dryv-rooftop.webp', kicker: 'Talk to us' },
    faqTitle:      { img: 'gen/dryv-barbell.webp',     kicker: 'Answers' },
    policyTitle:   { img: 'gen/dryv-fold-black.webp',  kicker: 'The Fine Print' },
    sizeGuideTitle:{ img: 'gen/dryv-stretch.webp',    kicker: 'Fit' },
    supportTitle:  { img: 'gen/dryv-support.webp', kicker: 'Support' },
    trackOrderTitle:{ img: 'gen/dryv-box.webp',  kicker: 'Tracking' }
  };

  const CSS = `
  .page-cover{position:relative;width:100%;height:clamp(240px,42vh,420px);overflow:hidden;
    display:flex;align-items:flex-end;background:#08080a;margin-bottom:clamp(18px,3vw,34px)}
  .page-cover img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
    object-position:center;filter:saturate(.92) contrast(1.04);transform:scale(1.02)}
  .page-cover::after{content:'';position:absolute;inset:0;
    background:linear-gradient(180deg,rgba(6,6,7,.15) 0%,rgba(6,6,7,.55) 55%,rgba(6,6,7,.94) 100%)}
  .page-cover-inner{position:relative;z-index:2;width:100%;max-width:1280px;margin:0 auto;
    padding:0 clamp(20px,5vw,56px) clamp(18px,3vw,34px)}
  .page-cover .kicker{display:block;font:600 11px/1 ui-sans-serif,system-ui,sans-serif;
    letter-spacing:.34em;text-transform:uppercase;color:#cfcfd4;opacity:.85;margin-bottom:12px}
  .page-cover h1{margin:0;color:#fff;font-size:clamp(26px,5vw,54px);line-height:1.02;
    letter-spacing:-.02em;font-weight:700}
  .page-cover .rule{width:44px;height:2px;background:#fff;opacity:.75;margin:16px 0 0}
  @media (max-width:640px){.page-cover{height:clamp(200px,32vh,300px)}}

  /* the page body: a readable editorial column, not an unstyled wall of text */
  .page-content{max-width:min(760px,92vw);margin:0 auto;padding:clamp(8px,2vw,20px) clamp(20px,5vw,40px) clamp(56px,9vw,110px);color:#232326}
  .page-content h1{display:none}
  .page-content h2{font-size:clamp(17px,2.4vw,23px);letter-spacing:.14em;text-transform:uppercase;
    margin:clamp(30px,5vw,54px) 0 14px;padding-top:clamp(18px,3vw,26px);border-top:1px solid #e6e4df;font-weight:700}
  .page-content h2:first-of-type{margin-top:clamp(10px,2vw,18px);padding-top:0;border-top:0}
  .page-content p{font-size:clamp(15px,1.5vw,17px);line-height:1.75;margin:0 0 1.15em;color:#3a3a3e}
  .page-content em{color:#7a7a80;font-size:.94em}
  .page-content strong{font-weight:650;color:#141416}
  .page-content ul,.page-content ol{padding-left:1.2em;margin:0 0 1.3em}
  .page-content li{line-height:1.7;margin-bottom:.5em;color:#3a3a3e}
  .page-content a{color:#141416;text-underline-offset:3px}
  .page-content blockquote{margin:clamp(26px,4vw,44px) 0;padding:clamp(16px,3vw,26px) clamp(18px,3vw,30px);
    border-left:3px solid #141416;background:#f7f5f1;font-size:clamp(16px,1.8vw,19px);line-height:1.6;color:#232326}
  .page-figure{margin:clamp(28px,5vw,52px) 0;max-width:1080px}
  .page-figure img{display:block;width:100%;height:clamp(200px,34vw,420px);object-fit:cover;
    filter:saturate(.95) contrast(1.03)}
  .page-figure figcaption{margin-top:12px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;
    color:#8a8a90;font-weight:600}
  .page-split{display:grid;gap:clamp(18px,3vw,32px);margin:clamp(28px,5vw,52px) 0;
    grid-template-columns:1fr;align-items:center;max-width:1080px}
  @media (min-width:860px){.page-split{grid-template-columns:1.1fr .9fr}}
  .page-split img{width:100%;height:clamp(220px,28vw,380px);object-fit:cover;filter:saturate(.95)}
  .page-split .copy p:last-child{margin-bottom:0}
  @media (min-width:900px){
    .page-content{max-width:min(1080px,92vw)}
    .page-content > p,.page-content > h2,.page-content > ul,.page-content > ol,.page-content > blockquote{max-width:680px}
  }
  `;

  function injectCSS() {
    if (document.getElementById('page-cover-css')) return;
    const s = document.createElement('style');
    s.id = 'page-cover-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function apply() {
    const main = document.getElementById('mainContent');
    if (!main) return;
    const page = main.querySelector('.page-content');
    if (!page) return;
    let h1 = page.querySelector('h1');
    if (!h1 || !COVERS[h1.id]) return;

    const cfg = COVERS[h1.id];
    let band = main.querySelector('.page-cover');

    if (!band) {
      band = document.createElement('div');
      band.className = 'page-cover';
      band.innerHTML =
        '<img alt="" loading="eager" decoding="async">' +
        '<div class="page-cover-inner">' +
        '<span class="kicker"></span>' +
        '<h1></h1>' +
        '<div class="rule"></div>' +
        '</div>';
      main.insertBefore(band, page);
      // Move the heading into the band instead of leaving a second, hidden <h1>:
      // two h1 elements per page (one invisible) is an SEO and a11y fault.
      const demoted = document.createElement('h2');
      demoted.id = h1.id;
      demoted.className = 'page-title-inline';
      demoted.textContent = h1.textContent;
      h1.replaceWith(demoted);
      h1 = demoted;
    }

    const img = band.querySelector('img');
    const kicker = band.querySelector('.kicker');
    const title = band.querySelector('h1');

    if (img.getAttribute('src') !== 'assets/img/' + cfg.img) {
      img.src = 'assets/img/' + cfg.img;
      const t = h1.textContent.trim();
      title.textContent = t;
      const k = cfg.kicker;
      // never repeat the page title as the kicker (SUPPORT over SUPPORT reads like a bug)
      const same = k.trim().toLowerCase() === t.trim().toLowerCase();
      kicker.textContent = k;
      kicker.style.display = same ? 'none' : '';
    }
  }

  // Figures must never be the page's own cover, and never a cover of a sibling page —
  // FAQ was showing cover-faq twice (band + figure) which is exactly the repetition
  // the client could feel. These are distinct photographs.
  const FIGURES = {
    aboutTitle:    { img: 'gen/dryv-duo.webp',      cap: 'Strength in Motion, Cairo 2026' },
    supportTitle:  { img: 'gen/dryv-rail.webp',      cap: 'Built for the long set' },
    contactTitle:  { img: 'gen/dryv-fold-white.webp', cap: 'We answer personally' },
    sizeGuideTitle:{ img: 'gen/dryv-fold-charcoal.webp',   cap: 'Fit notes' },
    faqTitle:      { img: 'gen/dryv-ropes.webp',   cap: 'Measured to move' },
    accountTitle:  { img: 'gen/dryv-fold-heather.webp', cap: 'Members’ fittings' },
    policyTitle:   { img: 'gen/dryv-knit.webp', cap: 'Made to last' },
  };

  function addFigure() {
    const page = document.querySelector('#mainContent .page-content');
    if (!page) return;
    let h1 = page.querySelector('h1');
    if (!h1 || !FIGURES[h1.id]) return;
    if (page.querySelector('.page-figure')) return;

    const cfg = FIGURES[h1.id];
    const fig = document.createElement('figure');
    fig.className = 'page-figure';
    fig.innerHTML = '<img alt="" loading="lazy" decoding="async" src="assets/img/' + cfg.img + '">' +
                    '<figcaption>' + cfg.cap + '</figcaption>';

    const headings = page.querySelectorAll('h2');
    if (headings.length >= 2) headings[1].before(fig);
    else if (headings.length === 1) headings[0].after(fig);
    else page.appendChild(fig);
  }

  function boot() {
    injectCSS();
    apply();
    addFigure();
    // routes re-render #mainContent, so watch for it
    const main = document.getElementById('mainContent');
    if (main && !main.dataset.coverWatched) {
      main.dataset.coverWatched = '1';
      new MutationObserver(() => { apply(); addFigure(); }).observe(main, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('hashchange', () => setTimeout(boot, 30));
})();

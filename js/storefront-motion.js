/* Storefront motion: video hero + editorial marquees.
   Reference patterns (not code) from the motion-site library: a hero whose video loops with a fade so
   the restart is invisible, and duplicated vertical image columns drifting at different speeds.
   Every asset is DRYV's own. Skipped entirely for prefers-reduced-motion. */
(function () {
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HERO_VIDEO_WIDE = 'assets/img/hero-runner.mp4';   // rope shots cut out 2026-11-01
  const HERO_VIDEO_TALL = 'assets/img/hero-runner.mp4';
  const pickHeroVideo = () => window.innerWidth >= 900 ? HERO_VIDEO_WIDE : HERO_VIDEO_TALL;
  const POSTER = 'assets/img/dryv-gate-poster.jpg';
  const STRIP = [
    'assets/img/strip-4.jpg',
    'assets/img/cover-motion.jpg',
    'assets/img/strip-3.jpg',
    'assets/img/dryv-gen-1.jpg',
    'assets/img/strip-2.jpg',
    'assets/img/cover-fabric.jpg'
  ];

  const CSS = `
  .hero-video-wrap{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
  .hero.has-video > picture, .hero.has-video > img, .hero.has-video .hero-media{
    opacity:0!important;transition:opacity .6s ease}
  .hero.has-video > *:not(.hero-video-wrap){position:relative;z-index:1}
  .hero-video-wrap video{width:100%;height:100%;object-fit:cover;display:block;
    object-position:center 42%;   /* lifts the athlete clear of the headline */
    opacity:1;transition:none}
  .hero-video-wrap::after{content:'';position:absolute;inset:0;
    background:linear-gradient(180deg,rgba(6,6,7,.35) 0%,rgba(6,6,7,.15) 40%,rgba(6,6,7,.88) 100%)}

  .editorial-marquee{display:grid;grid-template-columns:1fr 1fr;gap:clamp(10px,1.6vw,20px);
    height:clamp(320px,52vh,560px);overflow:hidden;margin:clamp(40px,7vw,90px) 0;position:relative}
  .editorial-marquee::before,.editorial-marquee::after{content:'';position:absolute;left:0;right:0;height:70px;
    z-index:2;pointer-events:none}
  .editorial-marquee::before{top:0;background:linear-gradient(#faf9f6,transparent)}
  .editorial-marquee::after{bottom:0;background:linear-gradient(transparent,#faf9f6)}
  .marquee-col{display:flex;flex-direction:column;gap:clamp(10px,1.6vw,20px);will-change:transform}
  .marquee-col img{width:100%;height:clamp(200px,26vw,320px);object-fit:cover;display:block;
    filter:saturate(.95) contrast(1.03)}
  @keyframes marqueeUp{from{transform:translateY(0)}to{transform:translateY(-50%)}}
  @keyframes marqueeDown{from{transform:translateY(-50%)}to{transform:translateY(0)}}
  @media (prefers-reduced-motion: reduce){
    .marquee-col{animation:none!important}
  }
  @media (max-width:720px){
    .editorial-marquee{grid-template-columns:1fr;height:clamp(260px,44vh,420px)}
    .editorial-marquee .marquee-col:nth-child(2){display:none}
  }
  `;

  function inject() {
    if (document.getElementById('sf-motion-css')) return;
    const s = document.createElement('style');
    s.id = 'sf-motion-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function heroVideo() {
    const hero = document.querySelector('#mainContent .hero');
    if (!hero || hero.querySelector('.hero-video-wrap')) return;
    // 1.6 MB of video is a fair trade on desktop and a bad one on mobile data,
    // where the still already reads as intended.
    if (window.matchMedia('(max-width: 767px)').matches) return;

    const wrap = document.createElement('div');
    wrap.className = 'hero-video-wrap';
    const v = document.createElement('video');
    v.src = pickHeroVideo();
    v.poster = POSTER;
    v.muted = true;
    v.playsInline = true;
    v.autoplay = true;
    v.loop = false;                 // we drive the loop ourselves so the seam is invisible
    v.preload = 'auto';
    wrap.appendChild(v);
    hero.insertBefore(wrap, hero.firstChild);
    hero.classList.add('has-video');
    if (getComputedStyle(hero).position === 'static') hero.style.position = 'relative';

    if (REDUCE) { v.loop = true; v.play().catch(() => {}); return; }

    // seamless loop: fade out over the last 1.5s, restart, fade back in over the first 1.0s
    const FADE_OUT = 1.5, FADE_IN = 1.0;
    let restarting = false;
    function tick() {
      if (!v.duration) { requestAnimationFrame(tick); return; }
      const t = v.currentTime, d = v.duration;
      let op = 1;
      if (d - t < FADE_OUT) op = Math.max(0, (d - t) / FADE_OUT);
      else if (t < FADE_IN) op = Math.min(1, t / FADE_IN);
      v.style.opacity = op.toFixed(3);
      if (d - t < 0.05 && !restarting) {
        restarting = true;
        v.currentTime = 0;
        v.play().catch(() => {});
        setTimeout(() => { restarting = false; }, 120);
      }
      requestAnimationFrame(tick);
    }
    v.addEventListener('loadedmetadata', () => { v.play().catch(() => {}); requestAnimationFrame(tick); });
  }

  function marquee() {
    const main = document.getElementById('mainContent');
    if (!main || main.querySelector('.editorial-marquee')) return;
    // The same six photographs on every route read as stock, not art direction.
    // Home only; inner pages carry their own cover.
    const h = location.hash.replace(/^#/, '');
    if (h && h !== '/') return;
    // place it after the second section so it breaks up the page mid-scroll
    const sections = main.querySelectorAll(':scope > section, :scope > div');
    if (sections.length < 2) return;

    const box = document.createElement('div');
    box.className = 'editorial-marquee';
    const colA = document.createElement('div'); colA.className = 'marquee-col';
    const colB = document.createElement('div'); colB.className = 'marquee-col';

    // duplicate the images so the loop has no gap
    const a = STRIP.slice(0, 3), b = STRIP.slice(3);
    [...a, ...a].forEach(src => { const i = new Image(); i.src = src; i.alt = ''; i.loading = 'lazy'; colA.appendChild(i); });
    [...b, ...b].forEach(src => { const i = new Image(); i.src = src; i.alt = ''; i.loading = 'lazy'; colB.appendChild(i); });

    box.appendChild(colA); box.appendChild(colB);
    sections[1].after(box);

    if (!REDUCE) {
      colA.style.animation = 'marqueeUp 42s linear infinite';
      colB.style.animation = 'marqueeDown 52s linear infinite';
    }
  }

  function boot() {
    inject();
    heroVideo();
    marquee();
  }

  function watch() {
    const main = document.getElementById('mainContent');
    if (main && !main.dataset.sfMotion) {
      main.dataset.sfMotion = '1';
      new MutationObserver(() => { heroVideo(); marquee(); })
        .observe(main, { childList: true, subtree: false });
    }
  }

  function start() { boot(); watch(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  window.addEventListener('hashchange', () => setTimeout(start, 140));
})();

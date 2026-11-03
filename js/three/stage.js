// DRYV 3D layer: loader and lifecycle. Progressive enhancement only.
//  - The still photographs are always in the HTML and are what Lighthouse measures (LCP).
//  - Three.js is fetched only after the page has loaded and gone idle, only on devices that can carry it,
//    only for scenes that are near the viewport, and never with prefers-reduced-motion or Save-Data.
//  - Each scene renders only while on screen and the tab is visible, and is fully disposed when the
//    SPA swaps the page, so GPU memory does not pile up across routes.
//  - Scroll is never captured: scenes only read scroll position.
// 2 Nov 10:45: hero 3D scene disabled (Ahmed rejected the rope wordmark). Code kept in hero.js, not loaded.
const SCENES = { hero: () => import('./landing.js?v=20261102h3') };
const live = new Map();          // host element -> { inst, io }

function tier() {
  const force = new URLSearchParams(location.search).get('x3d');   // QA override: ?x3d=0|1|2
  if (force !== null) return Math.max(0, Math.min(2, +force || 0));
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
    if (navigator.connection && navigator.connection.saveData) return 0;
    const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
    if (mem < 4 || cores < 4) return 0;
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return 0;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return Math.min(window.innerWidth, window.innerHeight) < 700 ? 1 : 2;
  } catch (_) { return 0; }
}

const TIER = tier();
document.documentElement.dataset.x3d = String(TIER);

function introOpen() { return !!document.getElementById('dryv-intro-gate'); }

function mount(host) {
  if (live.has(host)) return;
  const kind = host.dataset['3d'];
  if (!SCENES[kind]) return;
  if (kind === 'hero' && window.innerWidth < 900) return;   // phones keep the billboard photograph: faster and cleaner
  const rec = { inst: null, io: null, loading: false, visible: false, dead: false };
  live.set(host, rec);
  rec.io = new IntersectionObserver(([en]) => {
    rec.visible = en.isIntersecting;
    if (rec.visible && !rec.inst && !rec.loading) {
      rec.loading = true;
      SCENES[kind]()
        .then((m) => m.create(host, { tier: TIER }))
        .then((inst) => { if (rec.dead) { inst.dispose(); return; } rec.inst = inst; sync(rec); })
        .catch((err) => { console.warn('[x3d]', kind, err); host.classList.add('is-3d-failed'); });
    } else sync(rec);
  }, { rootMargin: '250px 0px' });
  rec.io.observe(host);
}

function sync(rec) {
  if (!rec.inst) return;
  if (rec.visible && !document.hidden) rec.inst.start(); else rec.inst.stop();
}

function unmountGone() {
  live.forEach((rec, host) => {
    if (!host.isConnected) { rec.dead = true; rec.io.disconnect(); rec.inst?.dispose(); live.delete(host); }
  });
}

function scan() {
  unmountGone();
  if (introOpen()) return;                     // let the intro film have the GPU; we mount when it is gone
  document.querySelectorAll('#mainContent [data-3d]').forEach(mount);
}

function boot() {
  if (!TIER) return;
  const main = document.getElementById('mainContent');
  if (!main) return;
  let t = 0;
  const later = () => { clearTimeout(t); t = setTimeout(scan, 120); };
  new MutationObserver(later).observe(main, { childList: true });
  new MutationObserver(() => { if (!introOpen()) later(); }).observe(document.body, { childList: true });
  document.addEventListener('visibilitychange', () => live.forEach(sync));
  scan();
}

// Wait for load + idle so none of this competes with first paint or the LCP image.
const idle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 1200));
if (document.readyState === 'complete') idle(boot);
else addEventListener('load', () => idle(boot), { once: true });

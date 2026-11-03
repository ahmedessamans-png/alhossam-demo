// DRYV depth: pointer tilt with a moving light sheen on product cards and image tiles.
// CSS 3D transforms only (compositor), fine pointers only, off for reduced motion. One delegated
// listener, so it keeps working after the SPA re-renders a page. Scroll parallax and focus are pure CSS (x3d.css).
(function () {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var SEL = '.product-card .product-link, .ed-cat, .ed-colour, .ed-plate';
  var cur = null, raf = 0, px = 0, py = 0;
  function paint() {
    raf = 0;
    if (!cur) return;
    var r = cur.getBoundingClientRect();
    var x = (px - r.left) / r.width, y = (py - r.top) / r.height;
    var big = r.width > 520 ? 0.45 : 1;                     // large tiles tilt less
    cur.style.setProperty('--rx', ((0.5 - y) * 7 * big).toFixed(2) + 'deg');
    cur.style.setProperty('--ry', ((x - 0.5) * 9 * big).toFixed(2) + 'deg');
    cur.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
    cur.style.setProperty('--my', (y * 100).toFixed(1) + '%');
  }
  function leave(el) {
    el.classList.remove('is-tilting');
    el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
  }
  document.addEventListener('pointermove', function (e) {
    var el = e.target.closest && e.target.closest(SEL);
    if (el !== cur) { if (cur) leave(cur); cur = el; if (cur) cur.classList.add('x3d-tilt', 'is-tilting'); }
    if (!cur) return;
    px = e.clientX; py = e.clientY;
    if (!raf) raf = requestAnimationFrame(paint);
  }, { passive: true });
  document.addEventListener('pointerleave', function () { if (cur) leave(cur); cur = null; });
})();

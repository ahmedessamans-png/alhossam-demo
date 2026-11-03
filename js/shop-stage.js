// DRYV shop stage: click a product and it is pulled out of the grid onto a stage on the left (bottom sheet on phones)
// to view, tilt, zoom, change colour, pick a size and add to bag without leaving the shop.
// The page keeps scrolling freely: the stage is sticky, wheel and touch scrolling are never captured.
// Ctrl/Cmd-click and the Quick add button keep their normal behaviour. Failure here falls back to the normal product link.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var catalog = null, el = null, cur = null, zoom = 1, tiltRaf = 0;
  var COLOUR = { black: '#111', white: '#f2f2f0', grey: '#8a8c90', charcoal: '#3a3b3e', heather: '#9a9ca0' };
  var money = function (n) { return 'EGP ' + Number(n).toLocaleString('en-US'); };
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };

  function load() {
    if (catalog) return Promise.resolve(catalog);
    return fetch('catalog.json').then(function (r) { return r.json(); }).then(function (c) { catalog = c; return c; });
  }
  function product(h) { return catalog.products.find(function (p) { return p.handle === h; }); }
  function colours(p) { var s = []; p.variants.forEach(function (v) { if (s.indexOf(v.colour) < 0) s.push(v.colour); }); return s; }

  function build(grid) {
    var host = document.createElement('div');
    grid.parentElement.insertBefore(host, grid); host.appendChild(grid);
    el = document.createElement('aside');
    el.className = 'stage'; el.setAttribute('aria-label', 'Product viewer'); el.hidden = true;
    el.innerHTML =
      '<button class="stage__x" type="button" aria-label="Close viewer">&times;</button>' +
      '<div class="stage__view" tabindex="0" role="img"><div class="stage__obj"><img alt="" draggable="false"></div><div class="stage__floor" aria-hidden="true"></div></div>' +
      '<div class="stage__views" role="group" aria-label="View"><button type="button" data-v="front" class="is-on">Front</button><button type="button" data-v="back">Back</button></div>' +
      '<div class="stage__zoom"><button type="button" data-z="-1" aria-label="Zoom out">&minus;</button><span aria-live="polite">100%</span><button type="button" data-z="1" aria-label="Zoom in">+</button></div>' +
      '<div class="stage__info"><p class="stage__type"></p><h2 class="stage__name"></h2><p class="stage__price"></p>' +
      '<div class="stage__row stage__colours" role="group" aria-label="Colour"></div>' +
      '<div class="stage__row stage__sizes" role="group" aria-label="Size"></div>' +
      '<button class="btn btn-primary stage__add" type="button" disabled>Choose a size</button>' +
      '<a class="stage__more" href="#">Full details</a></div>';
    host.insertBefore(el, grid);
    host.classList.add('stage-host');
    el.querySelector('.stage__x').onclick = close;
    el.querySelector('.stage__add').onclick = add;
    el.querySelector('.stage__zoom').onclick = function (e) { var z = e.target.dataset.z; if (z) setZoom(zoom + (+z) * 0.4); };
    el.querySelector('.stage__views').onclick = function (e) { var v = e.target.dataset.v; if (v) turn(v); };
    var view = el.querySelector('.stage__view');
    view.addEventListener('click', function () { setZoom(zoom > 1 ? 1 : 2.4); });
    view.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setZoom(zoom > 1 ? 1 : 2.2); } });
    view.addEventListener('pointermove', onMove, { passive: true });
    view.addEventListener('pointerleave', function () { paint(0.5, 0.5); });
  }

  function onMove(e) {
    if (e.pointerType === 'touch' && zoom === 1) return;
    var r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    if (tiltRaf) return;
    tiltRaf = requestAnimationFrame(function () { tiltRaf = 0; paint(x, y); });
  }
  function paint(x, y) {
    if (!el) return;
    var obj = el.querySelector('.stage__obj');
    obj.style.setProperty('--ox', (x * 100).toFixed(1) + '%'); obj.style.setProperty('--oy', (y * 100).toFixed(1) + '%');
    var t = zoom > 1 || reduce ? 0 : 1;
    obj.style.setProperty('--ry', ((x - 0.5) * 16 * t).toFixed(2) + 'deg');
    obj.style.setProperty('--rx', ((0.5 - y) * 10 * t).toFixed(2) + 'deg');
  }
  function setZoom(z) {
    zoom = Math.max(1, Math.min(3, z));
    el.querySelector('.stage__obj').style.setProperty('--z', zoom);
    el.classList.toggle('is-zoomed', zoom > 1);
    el.querySelector('.stage__zoom span').textContent = Math.round(zoom * 100) + '%';
    paint(0.5, 0.5);
  }

  function variants(c) { return cur.p.variants.filter(function (v) { return v.colour === c; }); }
  function renderInfo() {
    var p = cur.p, vs = variants(cur.colour), name = p.name.en || p.name;
    el.querySelector('.stage__type').textContent = p.type;
    el.querySelector('.stage__name').textContent = name;
    el.querySelector('.stage__price').textContent = money(vs[0].price);
    el.querySelector('.stage__more').href = '#/products/' + p.handle + '?color=' + cur.colour;
    var view = el.querySelector('.stage__view'); view.setAttribute('aria-label', name + ', ' + cur.colour + '. Press Enter to zoom.');
    el.querySelector('.stage__obj img').alt = name + ' in ' + cur.colour;
    el.querySelector('.stage__colours').innerHTML = colours(p).map(function (c) {
      return '<button type="button" class="stage__sw' + (c === cur.colour ? ' is-on' : '') + '" data-c="' + c + '" aria-pressed="' + (c === cur.colour) + '" aria-label="' + cap(c) + '" title="' + cap(c) + '"><i style="background:' + (COLOUR[c] || '#777') + '"></i></button>';
    }).join('');
    el.querySelector('.stage__sizes').innerHTML = vs.map(function (v) {
      var out = v.stock === 0;
      return '<button type="button" class="stage__sz' + (v.size === cur.size ? ' is-on' : '') + '" data-s="' + v.size + '"' + (out ? ' disabled' : '') + ' aria-pressed="' + (v.size === cur.size) + '">' + v.size + '</button>';
    }).join('');
    el.querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { swap(b.dataset.c); }; });
    el.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { cur.size = b.dataset.s; renderInfo(); }; });
    var btn = el.querySelector('.stage__add');
    btn.disabled = !cur.size; btn.textContent = cur.size ? 'Add to bag' : 'Choose a size';
  }
  function src(side) { return variants(cur.colour)[0].image.replace('-front.', '-' + side + '.'); }
  function viewButtons() {
    el.querySelectorAll('[data-v]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.v === cur.side); b.setAttribute('aria-pressed', b.dataset.v === cur.side); });
    var back = el.querySelector('[data-v="back"]'), t = new Image();          // a colourway without a back shot simply hides the button
    back.hidden = false; t.onerror = function () { back.hidden = true; }; t.src = src('back');
  }
  function spin(url) {                                 // the garment turns on its axis and the other side comes round
    var obj = el.querySelector('.stage__obj'), img = obj.querySelector('img');
    if (reduce) { img.src = url; return; }
    var pre = new Image(); pre.src = url;
    obj.classList.add('is-turning');
    setTimeout(function () { img.src = url; obj.classList.remove('is-turning'); }, 240);
  }
  function turn(side) { if (side === cur.side) return; cur.side = side; viewButtons(); spin(src(side)); }
  function swap(c) {                                   // a quarter turn hides the change of garment, like a turntable
    if (c === cur.colour) return;
    cur.colour = c; cur.side = 'front'; cur.size = variants(c).some(function (x) { return x.size === cur.size && x.stock > 0; }) ? cur.size : null;
    renderInfo(); viewButtons(); spin(src('front'));
  }

  function pull(card, handle, colour) {
    var from = card.querySelector('.product-image'), obj = el.querySelector('.stage__obj'), img = obj.querySelector('img');
    var v = variants(colour)[0];
    img.src = v.image;
    document.querySelectorAll('.product-card.on-stage').forEach(function (c) { c.classList.remove('on-stage'); });
    card.classList.add('on-stage');
    if (reduce || !from) return;
    var a = from.getBoundingClientRect(), b = obj.getBoundingClientRect();
    if (!a.width || !b.width) return;
    var dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2), s = Math.min(b.width / a.width, b.height / a.height);
    obj.style.opacity = 0;
    // Swipe and suck: the product leans back, is dragged right to left in a stretched streak with a trail of
    // ghosts, gets squeezed thin as it reaches the stage, then bursts open at full size. Transform and opacity
    // only, so it stays on the compositor and never touches scrolling.
    var frames = function (o) {
      return [
        { offset: 0, transform: 'translate3d(0,0,0) skewX(0deg) scale(1,1)', filter: 'blur(0)', opacity: o, easing: 'cubic-bezier(.3,0,.6,1)' },
        { offset: 0.14, transform: 'translate3d(26px,-6px,0) skewX(-6deg) scale(.94,1.03)', filter: 'blur(0)', opacity: o, easing: 'cubic-bezier(.7,0,.9,.4)' },
        { offset: 0.62, transform: 'translate3d(' + dx * 0.72 + 'px,' + dy * 0.6 + 'px,0) skewX(20deg) scale(1.55,.42)', filter: 'blur(5px)', opacity: o, easing: 'cubic-bezier(.5,0,1,1)' },
        { offset: 0.8, transform: 'translate3d(' + dx + 'px,' + dy + 'px,0) skewX(4deg) scale(.1,.06)', filter: 'blur(2px)', opacity: o * 0.9 },
        { offset: 1, transform: 'translate3d(' + dx + 'px,' + dy + 'px,0) skewX(0deg) scale(.02,.02)', filter: 'blur(0)', opacity: 0 }
      ];
    };
    var make = function (delay, o) {
      var f = from.cloneNode(); f.removeAttribute('loading'); f.className = 'stage__fly';
      f.style.cssText = 'left:' + a.left + 'px;top:' + a.top + 'px;width:' + a.width + 'px;height:' + a.height + 'px';
      document.body.appendChild(f);
      var an = f.animate(frames(o), { duration: 640, delay: delay, fill: 'both' });
      an.onfinish = an.oncancel = function () { f.remove(); };
      return an;
    };
    make(90, 0.22); make(45, 0.42);
    var main = make(0, 1);
    el.classList.remove('is-inhaling'); void el.offsetWidth; el.classList.add('is-inhaling');
    setTimeout(function () {                           // released: it bursts out of the point it was sucked into
      obj.style.opacity = '';
      obj.animate([
        { transform: 'scale(.06,.06) rotateY(-30deg)', opacity: 0, filter: 'blur(6px)' },
        { transform: 'scale(1.07,.96) rotateY(5deg)', opacity: 1, filter: 'blur(0)', offset: 0.6 },
        { transform: 'scale(.985,1.01) rotateY(-1deg)', offset: 0.82 },
        { transform: 'scale(1) rotateY(0)' }
      ], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }, 520);
    setTimeout(function () { el && el.classList.remove('is-inhaling'); }, 1100);
  }

  function open(card) {
    var handle = card.dataset.handle, colour = card.dataset.colour, grid = document.getElementById('shopGrid');
    load().then(function () {
      var p = product(handle);
      if (!p) { location.hash = '#/products/' + handle; return; }
      if (!el || !el.isConnected) build(grid);
      cur = { p: p, colour: colour, size: null, side: 'front' };
      var first = el.hidden;
      el.hidden = false; el.parentElement.classList.add('stage-open'); document.documentElement.classList.toggle('stage-sheet', innerWidth < 900);
      setZoom(1); renderInfo(); viewButtons();
      requestAnimationFrame(function () { pull(card, handle, colour); });
      if (first) el.querySelector('.stage__x').focus({ preventScroll: true });
    }).catch(function () { location.hash = card.querySelector('.product-link').getAttribute('href'); });
  }
  function close() {
    if (!el) return;
    el.hidden = true; el.parentElement && el.parentElement.classList.remove('stage-open');
    document.documentElement.classList.remove('stage-sheet');
    var c = document.querySelector('.product-card.on-stage');
    if (c) { c.classList.remove('on-stage'); var l = c.querySelector('.product-link'); if (l) l.focus({ preventScroll: true }); }
  }
  function add() {
    var v = variants(cur.colour).find(function (x) { return x.size === cur.size; });
    if (!v) return;
    var cart = document.querySelector('.header [href*="cart"], .header #cartBtn, .header [aria-label*="art"]');
    var img = el.querySelector('.stage__obj img');
    if (cart && !reduce) {
      var a = img.getBoundingClientRect(), b = cart.getBoundingClientRect(), f = img.cloneNode(); f.className = 'stage__fly';
      f.style.cssText = 'left:' + a.left + 'px;top:' + a.top + 'px;width:' + a.width + 'px;height:' + a.height + 'px';
      document.body.appendChild(f);
      f.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(' + (b.left - a.left - a.width / 2) + 'px,' + (b.top - a.top - a.height / 2) + 'px) scale(.06)', opacity: 0.4 }], { duration: 560, easing: 'cubic-bezier(.5,0,.2,1)' }).onfinish = function () { f.remove(); };
    }
    setTimeout(function () { window.DRYV_SHOP.addToCart(v.sku, 1); }, reduce ? 0 : 520);
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
    if (e.target.closest('.quick-add-btn')) return;
    var link = e.target.closest('#shopGrid .product-link');
    if (!link) return;
    e.preventDefault(); open(link.closest('.product-card'));
  });
  // hovering a card turns it round to show the back, when there is one
  if (matchMedia('(hover: hover)').matches && !reduce) {
    document.addEventListener('mouseover', function (e) {
      var i = e.target.closest && e.target.closest('#shopGrid .product-image'); if (!i || i.dataset.f) return;
      if (i.src.indexOf('-front.') < 0) return;
      i.dataset.f = i.src; var b = i.src.replace('-front.', '-back.'), t = new Image();
      t.onload = function () { if (i.matches(':hover')) i.src = b; }; t.src = b;
      i.addEventListener('mouseleave', function () { i.src = i.dataset.f; delete i.dataset.f; }, { once: true });
    });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && el && !el.hidden) close(); });
  addEventListener('hashchange', function () { if (el && !el.isConnected) el = null; document.documentElement.classList.remove('stage-sheet'); });
})();

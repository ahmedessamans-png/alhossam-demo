// DRYV Home Module
// Homepage rendering: normal / pre-drop / live states
// Depends on: DRYV_CORE, LBN_I18N, catalog.json

(() => {
  'use strict';

  const { domReady, $, $$, delegate, fetchJSON, formatEGP, show, hide, toggleHidden, getData, route } = window.DRYV_CORE;
  const I18N = window.LBN_I18N;

  let catalog = null;
  let currentLang = 'en';

  function t(key, vars) {
    let str = I18N[currentLang]?.[key] || I18N.en[key] || key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
      });
    }
    return str;
  }

  function getStateFromCatalog() {
    return catalog?.settings?.homeState || 'normal';
  }

  function getDrop() {
    return catalog?.drops?.[0];
  }

  async function loadCatalog() {
    try {
      catalog = await fetchJSON('catalog.json');
      currentLang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
    } catch (err) {
      console.error('Failed to load catalog:', err);
      catalog = { settings: { homeState: 'normal' }, products: [], drops: [] };
    }
  }

  function renderHero(state, drop) {
    const main = $('#mainContent');
    if (!main) return;

    if (state === 'pre-drop') {
      renderPreDropHero(main, drop);
    } else if (state === 'live') {
      renderLiveHero(main, drop);
    } else {
      renderNormalHero(main);
    }
  }

  function renderNormalHero(main) {
    // Adopt the hero that ships in index.html (fast LCP) instead of re-creating it, when the language matches.
    const keep = currentLang === 'en' ? main.querySelector('.ed-hero[data-static]') : null;
    main.innerHTML = `
      ${keep ? '<div data-hero-slot></div>' : renderIssueHero()}
      ${renderIndex()}
      ${renderEdCategories()}
      ${renderSpecSheet()}
      ${renderFeaturedProducts()}
      ${renderColourways()}
      ${renderManifestoPanel()}
      ${renderPlates()}
      ${renderNextDropBand()}
      ${renderSignupBand()}
    `;
    if (keep) main.querySelector('[data-hero-slot]').replaceWith(keep);
    bindSignupBand();
  }

  const G = 'assets/img/gen/dryv-';
  const pic = (n, alt, cls = '', eager = false) => `
    <picture class="${cls}">
      <source type="image/webp" srcset="${G}${n}-960.webp 960w, ${G}${n}.webp 2400w" sizes="100vw">
      <img src="${G}${n}.jpg" alt="${alt}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async">
    </picture>`;

  // Issue 01 hero: one still, a tight type lockup, and a static spec ribbon. No video, no motion.
  function renderIssueHero() {
    return `
      <section class="ed-hero" data-3d="hero" aria-labelledby="heroHeadline">
        ${pic('sprint', 'Athlete in a black DRYV fitted compression tee driving out of a sprint start', 'ed-hero__img', true)}
        <div class="ed-hero__lockup">
          <p class="ed-kicker ed-label is-popped">Training wear, made in Egypt</p>
          <h1 id="heroHeadline" class="ed-hero__title">${t('heroHeadline')}</h1>
          <div class="ed-hero__actions">
            <a href="#/collections/all" class="btn btn-primary btn-on-dark btn-lg">${t('shopCollection')}</a>
            <a href="#/drop/performance-collection" class="btn btn-secondary-on-dark btn-lg">${t('joinNextDrop')}</a>
          </div>
        </div>
        <ul class="ed-ribbon" aria-label="At a glance">
          <li>Core Training Tank <b>EGP 850</b></li>
          <li>Fitted Compression Tee <b>EGP 1,150</b></li>
          <li>Four colourways</li>
          <li>Free delivery over EGP 950</li>
        </ul>
      </section>`;
  }

  // Briefing rail: a slim sticky strip under the header. Numbers match the section numbers below,
  // the current section lights up as you scroll, each item jumps to its section.
  const SECTIONS = [
    ['1', 'Shop', '#shop'], ['2', 'Fabric', '#fabric'], ['3', 'Essentials', '#essentials'],
    ['4', 'Colours', '#colourways'], ['5', 'Standard', '#standard'], ['6', 'Lookbook', '#lookbook'], ['7', 'Next drop', '#next-drop']
  ];
  function renderIndex() {
    return `
      <nav class="ed-rail" aria-label="On this page">
        <div class="ed-rail__in">
          <span class="ed-rail__brand">DRYV</span>
          <ol>${SECTIONS.map(x => `<li><a href="${x[2]}" data-scroll="${x[2]}">${x[1]}</a></li>`).join('')}</ol>
          <span class="ed-rail__bar" aria-hidden="true"><i></i></span>
        </div>
      </nav>`;
  }
  const kick = (_n, label) => `<p class="ed-kicker ed-label" data-pop><span>${label}</span></p>`;

  function renderEdCategories() {
    return `
      <section class="ed-cats" id="shop" aria-labelledby="shopByCategoryTitle">
        <div class="ed-cats__head">${kick('1', 'Shop by category')}</div>
        <h2 id="shopByCategoryTitle" class="visually-hidden">${t('shopByCategory')}</h2>
        <a data-pop class="ed-cat" href="#/collections/tank-tops">
          ${pic('barbell', 'Athlete in a heather grey DRYV training tank gripping a barbell')}
          <span class="ed-cat__no">01</span>
          <span class="ed-cat__name">${t('tankTops')}</span>
          <span class="ed-cat__cta">Shop tanks &rarr;</span>
        </a>
        <a data-pop class="ed-cat" href="#/collections/compression-t-shirts">
          ${pic('compression', 'Athlete in a black DRYV fitted compression tee, studio portrait')}
          <span class="ed-cat__no">02</span>
          <span class="ed-cat__name">Compression tees</span>
          <span class="ed-cat__cta">Shop tees &rarr;</span>
        </a>
      </section>`;
  }

  // Tech-pack spec sheet. Only claims already made in DRYV copy; no invented numbers.
  function renderSpecSheet() {
    const spec = [
      ['Fabric', 'Technical jersey'], ['Feel', 'Dense, fine knit that holds its shape'],
      ['Moisture', 'Sweat-wicking'], ['Movement', 'Four-way stretch'],
      ['Seams', 'Placed away from contact points'], ['Fit', 'Fitted, athletic'], ['Made in', 'Egypt']
    ];
    return `
      <section class="ed-spec" id="fabric" aria-labelledby="specTitle">
        <div class="ed-spec__img">${pic('fabric-macro', 'Macro of black DRYV technical jersey with sweat beading on the surface')}
          <span class="ed-tag">Jersey, 1:1 macro</span></div>
        <div class="ed-spec__body">
          ${kick('2', 'The fabric')}
          <h2 id="specTitle" class="ed-h2">Built from<br>the thread up.</h2>
          <dl class="ed-spec__table" data-pop-stagger>${spec.map(r => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('')}</dl>
          <div class="ed-spec__fig">${pic('stretch', 'Hands stretching black DRYV jersey to show four-way stretch')}
            <span class="ed-tag">Four-way stretch</span></div>
        </div>
      </section>`;
  }

  function renderColourways() {
    const c = [
      ['Black', 'fold-black', '#/collections/all?color=black', '#0B0B0B'],
      ['Charcoal', 'fold-charcoal', '#/products/fitted-compression-tee?color=charcoal', '#3A3A3A'],
      ['Heather Grey', 'fold-heather', '#/products/core-training-tank?color=heather-grey', '#9A9A9A'],
      ['White', 'fold-white', '#/collections/all?color=white', '#F4F4F4']
    ];
    return `
      <section class="ed-colours" id="colourways" aria-labelledby="colTitle">
        <div class="ed-wrap"><header class="ed-head ed-head--split"><div>${kick('4', 'Colourways')}
          <h2 id="colTitle" class="ed-h2">One standard.<br>Four colours.</h2></div>
          <p class="ed-lede">Every piece is cut from the same jersey in four colours chosen to work together.</p></header>
          <div class="ed-colours__grid" data-pop-stagger>${c.map(x => `
            <a class="ed-colour" href="${x[2]}">
              <img src="${G}${x[1]}.webp" alt="${x[0]} DRYV training tops, folded" loading="lazy" decoding="async">
              <span class="ed-colour__cap"><i style="background:${x[3]}"></i>${x[0]}</span>
            </a>`).join('')}</div></div>
      </section>`;
  }

  // Lookbook plates: asymmetric still photographs with printed captions.
  function renderPlates() {
    return `
      <section class="ed-plates" id="lookbook" aria-labelledby="platesTitle">
        <div class="ed-wrap"><header class="ed-head">${kick('6', 'Lookbook')}<h2 id="platesTitle" class="ed-h2">Worn in the work.</h2></header>
          <div class="ed-plates__grid">
            <figure data-pop class="ed-plate ed-plate--a">${pic('story-tank', 'Athlete in a black DRYV tank preparing to train')}<figcaption>Before the session</figcaption></figure>
            <figure data-pop class="ed-plate ed-plate--b">${pic('rooftop', 'Athlete in a white DRYV tee on a Cairo rooftop at dawn')}<figcaption>Cairo, first light</figcaption></figure>
            <figure data-pop class="ed-plate ed-plate--c">${pic('locker', 'DRYV black tee and grey tank hanging in a locker room')}<figcaption>After the session</figcaption></figure>
          </div></div>
      </section>`;
  }

  function renderShopByCategory() {
    return `
      <section class="shop-by-category" aria-labelledby="shopByCategoryTitle">
        <div class="container">
                    <p class="section-label"><span class="section-label__num">01</span> shop</p>
<h2 id="shopByCategoryTitle" class="section-title">${t('shopByCategory')}</h2>
          <div class="category-grid">
            <a href="#/collections/tank-tops" class="category-tile" data-handle="tank-tops">
              <img src="assets/img/dryv-gen-1.jpg" alt="" loading="eager" width="1264" height="1264">
              <div class="category-tile-content">
                <h3>${t('tankTops')}</h3>
                <span class="btn btn-secondary-on-dark btn-md">Shop now</span>
              </div>
            </a>
            <a href="#/collections/compression-t-shirts" class="category-tile" data-handle="compression-t-shirts">
              <img src="assets/img/dryv-gen-2.jpg" alt="" loading="eager" width="1264" height="1264">
              <div class="category-tile-content">
                <h3>${t('compressionTees')}</h3>
                <span class="btn btn-secondary-on-dark btn-md">Shop now</span>
              </div>
            </a>
          </div>
        </div>
      </section>
    `;
  }

  // ── newsletter band (§A.9 normal state) + campaign tiles (§A.11) ────────────────────────────────
  // Brief requires both sections on the homepage. Copy is honest: this is a preview build, nothing is
  // sent, and no follower counts or reviews are invented.
  function tt(key, fallback) {
    const v = t(key);
    return (v && v !== key) ? v : fallback;
  }

  function renderSignupBand() {
    return `
      <section class="signup-band" aria-labelledby="signupHeadline">
        <div class="signup-band-inner">
          <p class="signup-eyebrow">${tt('newsletterEyebrow', 'The list')}</p>
          <h2 id="signupHeadline" class="signup-headline">${tt('newsletterTitle', 'First in line.')}</h2>
          <p class="signup-sub">${tt('newsletterSub', 'New drops, restocks and training notes. Nothing else.')}</p>
          <form class="signup-band-form" id="newsletterForm" novalidate>
            <label for="newsletterEmail" class="visually-hidden">${tt('emailSignup', 'Email address')}</label>
            <input type="email" id="newsletterEmail" name="email" class="signup-band-input"
                   placeholder="your@email.com" required autocomplete="email">
            <button type="submit" class="btn btn-primary">${tt('joinBtn', 'Join')}</button>
          </form>
          <p class="signup-band-note" id="newsletterNote" role="status" aria-live="polite"></p>
        </div>
      </section>`;
  }

  function bindSignupBand() {
    const form = $('#newsletterForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = ($('#newsletterEmail')?.value || '').trim();
      const note = $('#newsletterNote');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        if (note) note.textContent = tt('validEmail', 'Enter a valid email address.');
        return;
      }
      try { localStorage.setItem('dryv_newsletter_email', email); } catch (err) {}
      if (note) note.textContent = tt('signupThanks', 'You are on the list. Preview build, nothing was sent.');
      form.reset();
    });
  }


  function renderManifestoPanel() {
    // Deliberately no photograph: with fifteen covers cut from five images,
    // a type-led band gives the eye somewhere to rest between them.
    return `
      <section class="type-panel ed-manifesto" id="standard" aria-labelledby="manifestoTitle">
        ${pic('bench', '', 'ed-manifesto__img')}
        <div class="type-panel__inner">
          ${kick('5', 'The standard')}
          <h2 id="manifestoTitle">Built for the work<br>you put in.</h2>
          <p>Technical jersey cut to move with you. Sweat-wicking, four-way stretch, seams placed where they will not rub. Made in Egypt for the session, the cool-down and every rep in between.</p>
          <div class="type-panel__rule" aria-hidden="true"></div>
        </div>
      </section>
    `;
  }

  function renderCampaignTiles() {
    const tiles = [
      { img: 'assets/img/strip-3.jpg', href: '#/collections/all', label: tt('tileTrain', 'Train') },
      { img: 'assets/img/strip-2.jpg', href: '#/products/core-training-tank', label: tt('tileTank', 'Core tank') },
      { img: 'assets/img/cover-fabric.jpg', href: '#/products/fitted-compression-tee', label: tt('tileTee', 'Compression tee') }
    ];
    const handle = String(catalog?.settings?.instagram || '').trim();
    const items = tiles.map((x, i) => `
      <a class="campaign-tile plate" href="${x.href}">
        <div class="plate__frame">
          <img src="${x.img}" alt="" loading="lazy" width="645" height="799">
        </div>
        <div class="plate__caption">
          <em>${x.label}</em>
          <span>${tt('plateBrandMark', 'DRYV')}</span>
        </div>
      </a>`).join('');
    return `
      <section class="campaign-tiles-section" aria-labelledby="campaignHeadline">
        <div class="section-header">
                    <p class="section-label"><span class="section-label__num">07</span> collection</p>
<h2 id="campaignHeadline" class="section-title">${tt('campaignTitle', 'The collection')}</h2>
        </div>
        <div class="campaign-tiles">${items}</div>
      </section>`;
  }

  function renderFeaturedProducts() {
    if (!catalog?.products?.length) return '';

    // One card per PRODUCT, not per colour (brief §3.5: swatches live on the card, max 5 + count).
    // The old build emitted one card per colour, so a 3-colour product appeared three times — which
    // reads as an unfinished placeholder grid, not a catalogue.
    const byProduct = new Map();
    catalog.products.forEach(product => {
      if (!product.variants?.length) return;
      const first = product.variants[0];
      byProduct.set(product.handle, {
        productHandle: product.handle,
        productName: product.name[currentLang] || product.name.en,
        productType: product.type,
        colour: first.colour,
        price: first.price,
        image: first.image,
        stock: first.stock,
        colours: [...new Set(product.variants.map(v => v.colour))]   // one swatch per colour, not per size
      });
    });

    const allVariants = Array.from(byProduct.values());

    if (!allVariants.length) return '';

    const cards = allVariants.map(v => {
      const badge = v.stock === 0 ? `<span class="product-badge badge-sold-out">${t('soldOut')}</span>`
        : v.stock <= (catalog.settings?.lowStockThreshold || 3) ? `<span class="product-badge badge-low-stock">${t('lowStock')}</span>`
        : '';

      const colourName = v.colour.charAt(0).toUpperCase() + v.colour.slice(1).toLowerCase();

      const swatchesHtml = v.colours.map(c => {
        const cName = c.charAt(0).toUpperCase() + c.slice(1).toLowerCase();
        const isActive = c === v.colour;
        return `<a class="swatch-wrapper swatch-link" href="#/products/${v.productHandle}?color=${c}" aria-label="${cName}"><span class="swatch${isActive ? ' active' : ''}" style="background: ${getSwatchColor(c)};"></span><span class="swatch-label">${cName}</span></a>`;
      }).join('');

      return `
        <article class="product-card" data-handle="${v.productHandle}" data-colour="${v.colour}" role="listitem">
          <a href="#/products/${v.productHandle}?color=${v.colour}" class="product-link" aria-label="${v.productName} ${colourName} ${formatEGP(v.price)}">
            <div class="product-image-wrapper">
              <img src="${v.image}" alt="${v.productName}, ${colourName}" class="product-image" loading="lazy" width="645" height="799">
              ${badge}
            </div>
            <div class="product-info">
              <h3 class="product-name">${v.productName}</h3>
              <p class="product-price">${formatEGP(v.price)}</p>
              <div class="product-card-swatches">
                ${swatchesHtml}
              </div>
            </div>
          </a>
        </article>
      `;
    }).join('');

    return `
      <section class="featured-products" id="essentials" aria-labelledby="featuredTitle">
        <div class="container">
          <div class="section-header">
                      ${kick('3', 'Essentials')}
<h2 id="featuredTitle" class="section-title">${t('featuredProducts')}</h2>
            <a href="#/collections/all" class="link-view-all">${t('allProducts')}</a>
          </div>
          <div class="product-grid" role="list">
            ${cards}
          </div>
        </div>
      </section>
    `;
  }

  function getSwatchColor(colour) {
    const colors = {
      'black': '#0B0B0B',
      'white': '#FFFFFF',
      'heather grey': '#9A9A9A',
      'charcoal': '#2B2B2B',
      'grey': '#9A9A9A'
    };
    return colors[colour.toLowerCase()] || '#2B2B2B';
  }

  function renderBrandBand() {
    return `
      <section class="brand-band" aria-labelledby="brandTitle">
        <div class="container">
          <h2 id="brandTitle" class="section-title visually-hidden">${t('brandStory')}</h2>
          <p class="section-label"><span class="section-label__num">05</span> our story</p>
          <div class="brand-content">
            <p>DRYV is Egypt-based training wear shaped around movement. The collection starts with two essentials: the Core Training Tank and Fitted Compression Tee, with clean lines and an athletic fit for the work you put in.</p>
            <a href="#/pages/about" class="btn btn-outline">${t('readOurStory')}</a>
          </div>
        </div>
      </section>
    `;
  }

  function renderNextDropBand() {
    const drop = getDrop();
    if (!drop) return '';

    return `
      <section class="next-drop-band" id="next-drop" aria-labelledby="nextDropTitle">
        <div class="container">
          ${kick('7', 'Next drop')}
          <h2 id="nextDropTitle" class="section-title">${t('upcomingDrop')}</h2>
          <div class="drop-preview">
            <h3 class="drop-preview-name">${drop.name || t('dropName')}</h3>
            <p class="drop-preview-teaser">Coming soon. Join the list for early access.</p>
            <form class="drop-signup drop-signup-inline" id="nextDropSignup" novalidate>
              <div class="signup-row">
                <div class="signup-field">
                  <label for="nextDropEmail" class="visually-hidden">${t('emailSignup')}</label>
                  <input type="email" id="nextDropEmail" name="email" placeholder="${t('emailPlaceholder')}" required autocomplete="email" aria-describedby="nextDropConsentHelp">
                </div>
                <div class="signup-consent">
                  <input type="checkbox" id="nextDropConsent" name="consent" required>
                  <label for="nextDropConsent" id="nextDropConsentHelp">${t('consentText')} <a href="#/policies/privacy">${t('privacyLink')}</a></label>
                </div>
                <button type="submit" class="btn btn-primary">${t('getEarlyAccessBtn')}</button>
              </div>
            </form>
          </div>
        </div>
      </section>
    `;
  }

  function startCountdown(targetDate) {
    const countdownEl = $('#countdown');
    if (!countdownEl) return;

    const update = () => {
      const now = Date.now();
      const target = new Date(targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        countdownEl.innerHTML = `<span>${t('dropIsLive')}</span>`;
        return;
      }

      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      countdownEl.innerHTML = `
        <div class="countdown-item"><span class="countdown-value">${days}</span><span class="countdown-label">${t('days')}</span></div>
        <div class="countdown-item"><span class="countdown-value">${hours}</span><span class="countdown-label">${t('hours')}</span></div>
        <div class="countdown-item"><span class="countdown-value">${minutes}</span><span class="countdown-label">${t('minutes')}</span></div>
        <div class="countdown-item"><span class="countdown-value">${seconds}</span><span class="countdown-label">${t('seconds')}</span></div>
      `;
    };

    update();
    const interval = setInterval(update, 1000);
    countdownEl.dataset.intervalId = interval;
  }

  function handleDropSignup(event) {
    event.preventDefault();
    const form = event.target;
    const emailInput = form.querySelector('input[type="email"]');
    const consentInput = form.querySelector('input[type="checkbox"]');

    const email = (emailInput && emailInput.value || '').trim();

    // Every early return used to be silent — the customer clicked, nothing happened,
    // and nothing told them why.
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      window.DRYV_CORE.showToast(t('errorEmailInvalid'), 'error');
      if (emailInput) emailInput.focus();
      return;
    }
    if (consentInput && !consentInput.checked) {
      window.DRYV_CORE.showToast(t('consentRequired'), 'error');
      consentInput.focus();
      return;
    }

    // Demo: store in localStorage only
    const signups = JSON.parse(localStorage.getItem('dryv_drop_signups') || '[]');
    signups.push({ email, timestamp: Date.now() });
    localStorage.setItem('dryv_drop_signups', JSON.stringify(signups));

    window.DRYV_CORE.showToast(t('checkInbox'), 'success');
    form.reset();
  }

  async function initHome() {
    await loadCatalog();
    await domReady;

    // Set announcement bar text
    const announcementText = $('#announcementText');
    if (announcementText) {
      announcementText.textContent = t('freeDelivery');
    }

    const state = getStateFromCatalog();
    const drop = getDrop();
    renderHero(state, drop);

    // Attach signup handler for inline form
    const inlineForm = $('#nextDropSignup');
    if (inlineForm) {
      inlineForm.addEventListener('submit', handleDropSignup);
    }

    // Listen for homeState changes (from other modules)
    window.addEventListener('dryv:homeStateChange', () => {
      const newState = getStateFromCatalog();
      const newDrop = getDrop();
      renderHero(newState, newDrop);
    });
  }

  // Register routes with central router
  route('', () => initHome());
  route('/', () => initHome());

  // Export for other modules
  const DRYV_HOME = {
    init: initHome,
    renderHero,
    getState: getStateFromCatalog
  };

  if (typeof module !== 'undefined') {
    module.exports = DRYV_HOME;
  }
  window.DRYV_HOME = DRYV_HOME;
})();

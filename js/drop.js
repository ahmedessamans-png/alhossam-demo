// DRYV Drop Module
// Pre-drop page, countdown, signup, early-access entry
// Depends on: DRYV_CORE, LBN_I18N, catalog.json

(() => {
  'use strict';

  const { domReady, $, $$, delegate, fetchJSON, formatEGP, show, hide, toggleHidden, showToast, navigate, route } = window.DRYV_CORE;
  const I18N = window.LBN_I18N;

  let catalog = null;
  let currentLang = 'en';
  let drop = null;
  let countdownInterval = null;

  function t(key, vars) {
    let str = I18N[currentLang]?.[key] || I18N.en[key] || key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
      });
    }
    return str;
  }

  async function loadCatalog() {
    try {
      catalog = await fetchJSON('catalog.json');
      currentLang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
      drop = catalog?.drops?.[0] || null;
    } catch (err) {
      console.error('Failed to load catalog:', err);
      catalog = { drops: [], settings: {} };
      drop = null;
    }
  }

  function getSwatchColor(colour) {
    const colors = {
      'black': '#0B0B0B',
      'white': '#FFFFFF',
      'heather-grey': '#9A9A9A',
      'heather grey': '#9A9A9A',
      'grey': '#9A9A9A',
      'charcoal': '#2B2B2B'
    };
    return colors[colour.toLowerCase()] || '#2B2B2B';
  }

  function renderDropPage() {
    const main = $('#mainContent');
    if (!main) return;

    const dropName = drop?.name || t('dropName');
    const hasDate = drop?.date;

    main.innerHTML = `
      <div class="drop-page" aria-labelledby="dropName">
        <div class="container">
          <div class="drop-hero" aria-hidden="true">
            <img src="assets/img/cover-fabric.jpg" alt="" loading="eager" fetchpriority="high">
          </div>
          <h1 id="dropName" class="drop-name">${dropName}</h1>
          <p class="drop-teaser">${t('dropTeaser')}</p>

          <div class="drop-countdown" id="dropCountdown" aria-live="polite" aria-label="${t('dropCountdown')}">
            ${hasDate ? '' : `<p class="countdown-tba">${t('dateTBA')}</p>`}
          </div>

          <form class="drop-signup drop-signup-inline" id="dropSignup" novalidate>
            <div class="signup-field">
              <label for="dropEmail" class="visually-hidden">${t('emailSignup')}</label>
              <input type="email" id="dropEmail" name="email" placeholder="${t('emailPlaceholder')}" required autocomplete="email" aria-describedby="dropConsentHelp">
            </div>
            <div class="signup-field" style="display: none;">
              <label for="dropMobile" class="visually-hidden">${t('phone')}</label>
              <input type="tel" id="dropMobile" name="mobile" placeholder="${t('phonePlaceholder')}" autocomplete="tel" aria-describedby="dropConsentHelp">
            </div>
            <div class="signup-consent drop-consent">
              <input type="checkbox" id="dropConsent" name="consent" required>
              <label for="dropConsent" id="dropConsentHelp">${t('consentText')} <a href="#/policies/privacy">${t('privacyLink')}</a></label>
            </div>
            <button type="submit" class="btn btn-primary">${t('getEarlyAccessBtn')}</button>
          </form>

          <p class="demo-notice" style="margin-top: var(--gutter-3); font-size: var(--small-size); color: var(--color-steel);">Demo: email stored locally only. Nothing is sent.</p>
        </div>
      </div>
    `;

    if (hasDate) {
      startCountdown(drop.date);
    }

    bindDropEvents();
  }

  function startCountdown(targetDate) {
    const container = $('#dropCountdown');
    if (!container) return;

    if (countdownInterval) clearInterval(countdownInterval);

    const update = () => {
      const now = Date.now();
      const target = new Date(targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        container.innerHTML = `<span class="drop-live">${t('dropIsLive')}</span>`;
        if (countdownInterval) clearInterval(countdownInterval);
        return;
      }

      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      container.innerHTML = `
        <div class="countdown-grid">
          <div class="countdown-item"><span class="countdown-value">${days}</span><span class="countdown-label">${t('days')}</span></div>
          <div class="countdown-item"><span class="countdown-value">${hours}</span><span class="countdown-label">${t('hours')}</span></div>
          <div class="countdown-item"><span class="countdown-value">${minutes}</span><span class="countdown-label">${t('minutes')}</span></div>
          <div class="countdown-item"><span class="countdown-value">${seconds}</span><span class="countdown-label">${t('seconds')}</span></div>
        </div>
      `;
    };

    update();
    countdownInterval = setInterval(update, 1000);
  }

  function handleDropSignup(event) {
    event.preventDefault();
    const form = event.target;
    const emailInput = form.querySelector('input[type="email"]');
    const mobileInput = form.querySelector('input[type="tel"]');
    const consentInput = form.querySelector('input[type="checkbox"]');

    if (!emailInput.value || !consentInput.checked) return;

    // Demo: store in localStorage only
    const signups = JSON.parse(localStorage.getItem('dryv_drop_signups') || '[]');
    signups.push({
      email: emailInput.value,
      mobile: mobileInput?.value || '',
      timestamp: Date.now()
    });
    localStorage.setItem('dryv_drop_signups', JSON.stringify(signups));

    showToast(t('checkInbox'), 'success');
    form.reset();
  }

  function bindDropEvents() {
    const form = $('#dropSignup');
    if (form) {
      form.addEventListener('submit', handleDropSignup);
    }
  }

  function renderEarlyAccessPage() {
    const main = $('#mainContent');
    if (!main) return;

    main.innerHTML = `
      <div class="early-access-page" aria-labelledby="earlyAccessTitle">
        <div class="container">
          <h1 id="earlyAccessTitle">${t('earlyAccessTitle')}</h1>
          <p class="early-access-note">${t('earlyAccessNote')}</p>

          <form class="early-access-form" id="earlyAccessForm" novalidate>
            <div class="form-group">
              <label for="earlyAccessCode" class="visually-hidden">${t('earlyAccessCode')}</label>
              <input type="text" id="earlyAccessCode" name="code" placeholder="${t('enterCode')}" required autocomplete="off" aria-describedby="earlyAccessError">
              <p class="error-message" id="earlyAccessError"></p>
            </div>
            <button type="submit" class="btn btn-primary btn-block">${t('unlock')}</button>
          </form>
        </div>
      </div>
    `;

    bindEarlyAccessEvents();
  }

  function bindEarlyAccessEvents() {
    const form = $('#earlyAccessForm');
    const input = $('#earlyAccessCode');
    const errorEl = $('#earlyAccessError');

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = input.value.trim().toUpperCase();

        if (code === 'DRYV-EARLY') {
          // Demo: set early access flag in localStorage
          localStorage.setItem('dryv_early_access', 'true');
          showToast('Early access unlocked!', 'success');
          navigate('#/collections/early-access');
        } else {
          if (errorEl) errorEl.textContent = t('codeInvalid');
          input.classList.add('error');
          showToast(t('codeInvalid'), 'error');
        }
      });

      input.addEventListener('input', () => {
        input.classList.remove('error');
        if (errorEl) errorEl.textContent = '';
      });
    }
  }

  function parseDropURL() {
    const hash = window.location.hash.slice(1);
    if (hash === '/drop/performance-collection') {
      return { type: 'drop' };
    }
    if (hash === '/early-access') {
      return { type: 'early-access' };
    }
    if (hash === '/collections/early-access') {
      return { type: 'early-access-collection' };
    }
    return null;
  }

  function renderEarlyAccessCollection() {
    const main = $('#mainContent');
    if (!main) return;

    // Check if early access is granted
    const hasAccess = localStorage.getItem('dryv_early_access') === 'true';
    if (!hasAccess) {
      navigate('#/early-access');
      return;
    }

    // Show products that are in the early access collection
    // For demo, show all products
    const products = catalog?.products || [];
    const allVariants = [];
    products.forEach(product => {
      product.variants.forEach(variant => {
        if (variant.stock > 0) {
          allVariants.push({
            productHandle: product.handle,
            productName: product.name[currentLang] || product.name.en,
            colour: variant.colour,
            price: variant.price,
            image: variant.image
          });
        }
      });
    });

    // One per colour
    const colourVariants = new Map();
    allVariants.forEach(v => {
      const key = `${v.productHandle}-${v.colour}`;
      if (!colourVariants.has(key)) colourVariants.set(key, v);
    });

    const cards = Array.from(colourVariants.values()).slice(0, 8).map(v => {
      const colourName = v.colour.charAt(0).toUpperCase() + v.colour.slice(1).toLowerCase();
      return `
        <article class="product-card" data-handle="${v.productHandle}" data-colour="${v.colour}" role="listitem">
          <a href="#/products/${v.productHandle}?color=${v.colour}" class="product-link" aria-label="${v.productName} ${colourName} ${formatEGP(v.price)}">
            <div class="product-image-wrapper">
              <img src="${v.image}" alt="" class="product-image" loading="lazy" width="645" height="799">
            </div>
            <div class="product-info">
              <h3 class="product-name">${v.productName}</h3>
              <p class="product-price">${formatEGP(v.price)}</p>
              <div class="product-card-swatches">
                <span class="swatch" style="background: ${getSwatchColor(v.colour)};" aria-label="${colourName}"></span>
                <span class="swatch-label">${colourName}</span>
              </div>
            </div>
          </a>
        </article>
      `;
    }).join('');

    main.innerHTML = `
      <header class="page-header" aria-labelledby="earlyAccessCollectionTitle">
        <div class="container">
          <h1 id="earlyAccessCollectionTitle">${t('earlyAccessTitle')}</h1>
          <p style="color: var(--color-steel);">Exclusive early access collection</p>
        </div>
      </header>
      <section class="featured-products" style="background: var(--color-white);">
        <div class="container">
          <div class="product-grid" role="list">${cards}</div>
        </div>
      </section>
    `;
  }

  async function initDrop() {
    await loadCatalog();
    await domReady;

    // Set announcement bar text on drop routes
    const announcementText = $('#announcementText');
    if (announcementText) {
      announcementText.textContent = t('freeDelivery');
    }

    const route = parseDropURL();
    if (route) {
      if (route.type === 'drop') {
        renderDropPage();
      } else if (route.type === 'early-access') {
        renderEarlyAccessPage();
      } else if (route.type === 'early-access-collection') {
        renderEarlyAccessCollection();
      }
    }
  }

  // Register routes with central router
  route('/drop/performance-collection', () => renderDropPage());
  route('/early-access', () => renderEarlyAccessPage());
  route('/collections/early-access', () => renderEarlyAccessCollection());

  // Export for other modules
  const DRYV_DROP = {
    init: initDrop,
    renderDropPage,
    renderEarlyAccessPage,
    renderEarlyAccessCollection
  };

  if (typeof module !== 'undefined') {
    module.exports = DRYV_DROP;
  }
  window.DRYV_DROP = DRYV_DROP;
})();
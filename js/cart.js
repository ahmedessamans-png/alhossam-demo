// DRYV Cart Module
// Cart drawer + cart page, free-shipping bar, discount code
// Depends on: DRYV_CORE, LBN_I18N, catalog.json

(() => {
  'use strict';

  const { domReady, $, $$, delegate, fetchJSON, formatEGP, show, hide, toggleHidden, storage, showToast, navigate, route } = window.DRYV_CORE;
  const I18N = window.LBN_I18N;

  let catalog = null;
  let currentLang = 'en';
  let cart = { items: [] };
  let appliedDiscount = null;
  let catalogLoaded = false;

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
      catalog = await fetchJSON('catalog.json?v=20261102b');
      currentLang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
      catalogLoaded = true;
    } catch (err) {
      console.error('Failed to load catalog:', err);
      catalog = { settings: { freeDeliveryOver: 950, zones: {} } };
      catalogLoaded = true;
    }
  }

  function loadCart() {
    cart = storage.get('dryv_cart', { items: [] });
  }

  // product.js writes the cart straight to storage; this module's in-memory copy
  // went stale, so the drawer rendered empty while the badge showed 1.
  function syncCart() {
    const stored = storage.get('dryv_cart', { items: [] });
    if (JSON.stringify(stored) !== JSON.stringify(cart)) cart = stored;
    return cart;
  }

  function saveCart() {
    storage.set('dryv_cart', cart);
    updateCartCount();
    updateDrawer();
    updatePage();
  }

  function updateCartCount() {
    const count = cart.items.reduce((sum, item) => sum + item.qty, 0);
    const cartCount = $('#cartCount');
    if (cartCount) cartCount.textContent = count;
  }

  function getVariantBySKU(sku) {
    if (!catalog?.products) return null;
    for (const product of catalog.products) {
      const variant = product.variants.find(v => v.sku === sku);
      if (variant) return { ...variant, productHandle: product.handle, productName: product.name[currentLang] || product.name.en, productType: product.type };
    }
    return null;
  }

  function calculateSubtotal() {
    return cart.items.reduce((sum, item) => {
      const variant = getVariantBySKU(item.sku);
      return sum + (variant?.price || 0) * item.qty;
    }, 0);
  }

  function calculateShipping(subtotal) {
    if (!catalog?.settings?.zones) return 0;
    const freeThreshold = catalog.settings.freeDeliveryOver || 950;
    if (subtotal >= freeThreshold) return 0;
    // Default to Cairo & Giza zone for cart drawer estimation
    return catalog.settings.zones['cairo-giza']?.fee || 70;
  }

  function calculateDiscount(subtotal) {
    if (!appliedDiscount) return 0;
    const promo = catalog?.settings?.promos?.[appliedDiscount];
    if (!promo) return 0;
    return Math.round(subtotal * (promo.pct / 100));
  }

  function calculateTotal() {
    const subtotal = calculateSubtotal();
    const shipping = calculateShipping(subtotal);
    const discount = calculateDiscount(subtotal);
    return subtotal + shipping - discount;
  }

  function updateDrawer() {
    syncCart();
    const content = $('#cartDrawerContent');
    if (!content) return;

    if (!cart.items.length) {
      const empty = $('#cartEmpty');
      const summary = $('#cartSummary');
      if (empty) empty.hidden = false;
      if (summary) summary.hidden = true;
      return;
    }

    const empty = $('#cartEmpty');
    const summary = $('#cartSummary');
    if (empty) empty.hidden = true;
    if (summary) summary.hidden = false;

    const itemsContainer = $('#CartItems');
    if (itemsContainer) {
      itemsContainer.innerHTML = cart.items.map(item => {
        const variant = getVariantBySKU(item.sku);
        if (!variant) return '';
        const colourName = variant.colour.charAt(0).toUpperCase() + variant.colour.slice(1).toLowerCase();
        const lineTotal = variant.price * item.qty;
        return `
          <div class="cart-item" data-sku="${item.sku}" role="listitem">
            <img src="${variant.image}" alt="" width="80" height="100" class="cart-item-image">
            <div class="cart-item-details">
              <h4 class="cart-item-name">${variant.productName}</h4>
              <p class="cart-item-variant">${colourName} / ${variant.size}</p>
              <p class="cart-item-price">${formatEGP(variant.price)}</p>
              <div class="quantity-stepper" data-sku="${item.sku}">
                <button type="button" aria-label="${t('decrease')}" data-action="decrease">−</button>
                <input type="number" value="${item.qty}" min="1" max="${variant.stock}" aria-label="${t('quantity')}" ${variant.stock === 0 ? 'disabled' : ''}>
                <button type="button" aria-label="${t('increase')}" data-action="increase">+</button>
              </div>
            </div>
            <button class="remove-btn" type="button" data-sku="${item.sku}" aria-label="${t('remove')} ${variant.productName}">${t('remove')}</button>
            <p class="cart-item-total">${formatEGP(lineTotal)}</p>
          </div>
        `;
      }).join('');
    }

    updateSummary();
  }

  function updateSummary() {
    syncCart();
    const subtotal = calculateSubtotal();
    const shipping = calculateShipping(subtotal);
    const discount = calculateDiscount(subtotal);
    const total = calculateTotal();
    const freeThreshold = catalog?.settings?.freeDeliveryOver || 950;

    const subtotalEl = $('#cartSubtotal');
    const shippingEl = $('#cartShipping');
    const totalEl = $('#cartTotal');
    const progressBar = $('#freeShippingProgress');
    const progressFill = $('#progressFill');
    const progressText = $('#freeShippingText');
    const discountInput = $('#discountCode');
    const discountMsg = $('#discountMessage');

    if (subtotalEl) subtotalEl.textContent = formatEGP(subtotal);
    if (shippingEl) shippingEl.textContent = shipping === 0 ? t('freeShipping') : formatEGP(shipping);
    if (totalEl) totalEl.textContent = formatEGP(total);

    if (progressBar && progressFill && progressText) {
      if (subtotal >= freeThreshold) {
        progressFill.style.width = '100%';
        progressText.textContent = t('freeShipping');
        progressBar.hidden = false;
      } else {
        const pct = Math.min(100, Math.round((subtotal / freeThreshold) * 100));
        progressFill.style.width = `${pct}%`;
        const remaining = freeThreshold - subtotal;
        progressText.textContent = t('freeShippingProgress', { amount: formatEGP(remaining) });
        progressBar.hidden = false;
      }
    }

    if (discountInput && appliedDiscount) {
      discountInput.value = appliedDiscount;
    }
    if (discountMsg) {
      if (appliedDiscount && discount > 0) {
        discountMsg.textContent = t('discountApplied');
        discountMsg.className = 'discount-message success';
      } else if (appliedDiscount && discount === 0) {
        discountMsg.textContent = t('discountInvalid');
        discountMsg.className = 'discount-message error';
      } else {
        discountMsg.textContent = '';
        discountMsg.className = 'discount-message';
      }
    }
  }

  function updatePage() {
    syncCart();
    const pageGrid = $('#cartPageGrid');
    if (!pageGrid) return;

    if (!cart.items.length) {
      pageGrid.innerHTML = `
      <h1 class="page-title">${t('cartTitle')}</h1>
        <div class="cart-empty" style="grid-column: 1 / -1; text-align: center; padding: var(--section-pad-3);">
          <p>${t('cartEmpty')}</p>
          <a href="#/collections/all" class="btn btn-primary">${t('continueShopping')}</a>
        </div>
      `;
      return;
    }

    const subtotal = calculateSubtotal();
    const shipping = calculateShipping(subtotal);
    const discount = calculateDiscount(subtotal);
    const total = calculateTotal();
    const freeThreshold = catalog?.settings?.freeDeliveryOver || 950;

    pageGrid.innerHTML = `
      <h1 class="page-title">${t('cartTitle')}</h1>
      <table class="cart-table" role="table">
        <thead>
          <tr>
            <th scope="col">${t('product')}</th>
            <th scope="col">${t('priceLabel')}</th>
            <th scope="col">${t('quantity')}</th>
            <th scope="col">${t('total')}</th>
            <th scope="col"></th>
          </tr>
        </thead>
        <tbody>
          ${cart.items.map(item => {
            const variant = getVariantBySKU(item.sku);
            if (!variant) return '';
            const colourName = variant.colour.charAt(0).toUpperCase() + variant.colour.slice(1).toLowerCase();
            const lineTotal = variant.price * item.qty;
            return `
              <tr data-sku="${item.sku}">
                <td>
                  <div class="cart-table-product">
                    <img src="${variant.image}" alt="" width="80" height="100">
                    <div>
                      <p class="product-name">${variant.productName}</p>
                      <p class="product-variant">${colourName} / ${variant.size}</p>
                    </div>
                  </div>
                </td>
                <td>${formatEGP(variant.price)}</td>
                <td>
                  <div class="quantity-stepper" data-sku="${item.sku}">
                    <button type="button" aria-label="${t('decrease')}" data-action="decrease">−</button>
                    <input type="number" value="${item.qty}" min="1" max="${variant.stock}" aria-label="${t('quantity')}" ${variant.stock === 0 ? 'disabled' : ''}>
                    <button type="button" aria-label="${t('increase')}" data-action="increase">+</button>
                  </div>
                </td>
                <td>${formatEGP(lineTotal)}</td>
                <td><button class="remove-btn" type="button" data-sku="${item.sku}" aria-label="${t('remove')} ${variant.productName}">${t('remove')}</button></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="cart-page-summary" id="cartPageSummary">
        <div class="cart-row"><span>${t('subtotal')}</span><span>${formatEGP(subtotal)}</span></div>
        <div class="cart-row"><span>${t('shipping')}</span><span>${shipping === 0 ? t('freeShipping') : formatEGP(shipping)}</span></div>
        <div class="cart-discount">
          <label for="pageDiscountCode" class="visually-hidden">${t('discount')}</label>
          <input type="text" id="pageDiscountCode" placeholder="${t('discountPlaceholder')}" aria-label="${t('discount')}" value="${appliedDiscount || ''}">
          <button id="pageApplyDiscount" class="btn btn-secondary btn-sm" type="button">${t('apply')}</button>
          <p class="discount-message" id="pageDiscountMessage"></p>
        </div>
        <div class="free-shipping-progress" ${subtotal >= freeThreshold ? '' : 'hidden'}>
          <div class="progress-bar"><div class="progress-fill" id="pageProgressFill" style="width: ${subtotal >= freeThreshold ? 100 : Math.min(100, Math.round((subtotal / freeThreshold) * 100))}%"></div></div>
          <p id="pageFreeShippingText">${subtotal >= freeThreshold ? t('freeShipping') : t('freeShippingProgress', { amount: formatEGP(freeThreshold - subtotal) })}</p>
        </div>
        <div class="cart-total"><span>${t('total')}</span><span>${formatEGP(total)}</span></div>
        <div class="cart-page-actions">
          <a href="#/checkout" class="btn btn-primary btn-block">${t('checkout')}</a>
          <a href="#/collections/all" class="btn btn-secondary btn-block">${t('continueShopping')}</a>
        </div>
      </div>
    `;

    // Bind page events
    const pageDiscountInput = $('#pageDiscountCode');
    const pageApplyBtn = $('#pageApplyDiscount');
    const pageDiscountMsg = $('#pageDiscountMessage');

    if (pageApplyBtn && pageDiscountInput) {
      pageApplyBtn.addEventListener('click', () => {
        const code = pageDiscountInput.value.trim().toUpperCase();
        applyDiscount(code);
      });
    }
  }

  function applyDiscount(code) {
    const upperCode = code.trim().toUpperCase();
    const promo = catalog?.settings?.promos?.[upperCode];
    if (promo) {
      appliedDiscount = upperCode;
      showToast(t('discountApplied'), 'success');
    } else {
      appliedDiscount = null;
      showToast(t('discountInvalid'), 'error');
    }
    saveCart();
    updateDrawer();
    updatePage();
  }

  function removeDiscount() {
    appliedDiscount = null;
    saveCart();
    updateDrawer();
    updatePage();
  }

  function bindDrawerEvents() {
    // Quantity steppers
    delegate($('#CartItems'), '.quantity-stepper button[data-action]', 'click', function() {
      const stepper = this.closest('.quantity-stepper');
      const sku = stepper.dataset.sku;
      const action = this.dataset.action;
      const input = stepper.querySelector('input');
      if (!input) return;

      const variant = getVariantBySKU(sku);
      const max = variant?.stock || 99;
      let val = parseInt(input.value) || 1;
      if (action === 'increase' && val < max) val++;
      if (action === 'decrease' && val > 1) val--;
      input.value = val;
      updateItemQty(sku, val);
    });

    delegate($('#CartItems'), '.quantity-stepper input', 'change', function() {
      const stepper = this.closest('.quantity-stepper');
      const sku = stepper.dataset.sku;
      const variant = getVariantBySKU(sku);
      const max = variant?.stock || 99;
      let val = parseInt(this.value) || 1;
      if (val < 1) val = 1;
      if (val > max) val = max;
      this.value = val;
      updateItemQty(sku, val);
    });

    // Remove buttons
    delegate($('#CartItems'), '.remove-btn', 'click', function() {
      const sku = this.dataset.sku;
      removeItem(sku);
    });

    // Discount code in drawer
    const discountInput = $('#discountCode');
    const applyBtn = $('#applyDiscount');
    if (applyBtn && discountInput) {
      applyBtn.addEventListener('click', () => {
        applyDiscount(discountInput.value);
      });
    }
  }

  function bindPageEvents() {
    // Quantity steppers on cart page
    delegate($('#cartPageGrid'), '.quantity-stepper button[data-action]', 'click', function() {
      const stepper = this.closest('.quantity-stepper');
      const sku = stepper.dataset.sku;
      const action = this.dataset.action;
      const input = stepper.querySelector('input');
      if (!input) return;

      const variant = getVariantBySKU(sku);
      const max = variant?.stock || 99;
      let val = parseInt(input.value) || 1;
      if (action === 'increase' && val < max) val++;
      if (action === 'decrease' && val > 1) val--;
      input.value = val;
      updateItemQty(sku, val);
    });

    delegate($('#cartPageGrid'), '.quantity-stepper input', 'change', function() {
      const stepper = this.closest('.quantity-stepper');
      const sku = stepper.dataset.sku;
      const variant = getVariantBySKU(sku);
      const max = variant?.stock || 99;
      let val = parseInt(this.value) || 1;
      if (val < 1) val = 1;
      if (val > max) val = max;
      this.value = val;
      updateItemQty(sku, val);
    });

    // Remove buttons on cart page
    delegate($('#cartPageGrid'), '.remove-btn', 'click', function() {
      const sku = this.dataset.sku;
      removeItem(sku);
    });

    // Discount code on cart page
    const pageApplyBtn = $('#pageApplyDiscount');
    const pageDiscountInput = $('#pageDiscountCode');
    if (pageApplyBtn && pageDiscountInput) {
      pageApplyBtn.addEventListener('click', () => {
        applyDiscount(pageDiscountInput.value);
      });
    }
  }

  function updateItemQty(sku, qty) {
    const item = cart.items.find(i => i.sku === sku);
    if (item) {
      item.qty = qty;
      if (item.qty <= 0) {
        cart.items = cart.items.filter(i => i.sku !== sku);
      }
      saveCart();
    }
  }

  function removeItem(sku) {
    cart.items = cart.items.filter(i => i.sku !== sku);
    saveCart();
    showToast(t('remove') + ' ' + (getVariantBySKU(sku)?.productName || ''), 'info');
  }

  function openCartDrawer() {
    syncCart();
    const drawer = document.getElementById('cartDrawer');
    if (drawer) {
      drawer.hidden = false;
      drawer.style.visibility = '';
      drawer.style.transform = '';
      document.getElementById('cartBtn')?.setAttribute('aria-expanded', 'true');
      document.body.classList.add('has-drawer-open');
      // Ensure catalog is loaded before updating drawer
      if (catalogLoaded) {
        updateDrawer();
      } else {
        loadCatalog().then(updateDrawer);
      }
    }
  }

  function renderCartPage() {
    const main = $('#mainContent');
    if (!main) return;

    main.innerHTML = `
      <div class="cart-page" id="cartPageGrid" role="main"></div>
    `;
    updatePage();
    bindPageEvents();
  }

  async function initCart() {
    await loadCatalog();
    await domReady;
    loadCart();
    updateCartCount();
    bindDrawerEvents();

    // Cart drawer open/close
    const cartBtn = document.getElementById('cartBtn');
    const cartDrawer = document.getElementById('cartDrawer');
    const cartDrawerClose = document.getElementById('cartDrawerClose');
    const cartDrawerBackdrop = document.getElementById('cartDrawerBackdrop');
    const goToCart = document.getElementById('goToCart');
    const checkoutBtn = document.getElementById('checkoutBtn');

    if (cartBtn && cartDrawer) {
      cartBtn.addEventListener('click', () => {
        const isOpen = cartDrawer.hidden === false;
        if (isOpen) {
          cartDrawer.hidden = true;
          cartBtn.setAttribute('aria-expanded', 'false');
          document.body.classList.remove('has-drawer-open');
          return;
        }
        document.getElementById('searchDrawer')?.setAttribute('hidden', '');
        document.getElementById('searchBtn')?.setAttribute('aria-expanded', 'false');
        document.getElementById('mobileDrawer')?.setAttribute('hidden', '');
        cartDrawer.style.visibility = '';
        cartDrawer.style.transform = '';
        cartDrawer.hidden = false;
        cartBtn.setAttribute('aria-expanded', 'true');
        document.body.classList.add('has-drawer-open');
        updateDrawer();
      });
    }
    if (cartDrawerClose && cartDrawer) {
      cartDrawerClose.addEventListener('click', () => { 
        cartDrawer.hidden = true;
        cartBtn?.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('has-drawer-open');
      });
    }
    if (cartDrawerBackdrop && cartDrawer) {
      cartDrawerBackdrop.addEventListener('click', () => { 
        cartDrawer.hidden = true;
        cartBtn?.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('has-drawer-open');
      });
    }
    if (goToCart) {
      goToCart.addEventListener('click', () => {
        cartDrawer.hidden = true;
        cartBtn?.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('has-drawer-open');
        navigate('#/cart');
      });
    }
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        cartDrawer.hidden = true;
        cartBtn?.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('has-drawer-open');
        navigate('#/checkout');
      });
    }

    // Initial render if on cart page
    if (window.location.hash === '#/cart') {
      renderCartPage();
    }
  }

  // Register routes with central router
  route('/cart', () => renderCartPage());

  // Export for other modules
  const DRYV_CART = {
    init: initCart,
    loadCart,
    saveCart,
    updateCartCount,
    openCartDrawer,
    applyDiscount,
    removeDiscount,
    getCart: () => cart
  };

  if (typeof module !== 'undefined') {
    module.exports = DRYV_CART;
  }
  window.DRYV_CART = DRYV_CART;

  if (document.readyState !== 'loading') {
    initCart();
  } else {
    document.addEventListener('DOMContentLoaded', initCart, { once: true });
  }
})();

// DRYV Checkout Module
// Checkout page, validation, confirmation
// Depends on: DRYV_CORE, LBN_I18N, catalog.json

(() => {
  'use strict';

  const { domReady, $, $$, delegate, fetchJSON, formatEGP, show, hide, toggleHidden, storage, showToast, navigate, route } = window.DRYV_CORE;
  const I18N = window.LBN_I18N;

  let catalog = null;
  let currentLang = 'en';
  let cart = { items: [] };
  let appliedDiscount = null;
  let currentStep = 'contact';

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
    } catch (err) {
      console.error('Failed to load catalog:', err);
      catalog = { settings: { freeDeliveryOver: 950, zones: {}, promos: {} } };
    }
  }

  function loadCart() {
    cart = storage.get('dryv_cart', { items: [] });
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

  function calculateShipping(subtotal, zone) {
    if (!catalog?.settings?.zones) return 0;
    const freeThreshold = catalog.settings.freeDeliveryOver || 950;
    if (subtotal >= freeThreshold) return 0;
    const zoneData = catalog.settings.zones[zone];
    return zoneData?.fee || 70;
  }

  function calculateDiscount(subtotal) {
    if (!appliedDiscount) return 0;
    const promo = catalog?.settings?.promos?.[appliedDiscount];
    if (!promo) return 0;
    return Math.round(subtotal * (promo.pct / 100));
  }

  function calculateTotal(subtotal, zone) {
    const shipping = calculateShipping(subtotal, zone);
    const discount = calculateDiscount(subtotal);
    return subtotal + shipping - discount;
  }

  function generateOrderNumber() {
    return 'DRYV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  function validateEgyptianMobile(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return /^01[0125]\d{8}$/.test(cleaned);
  }

  function formatEgyptianMobile(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3');
    }
    return phone;
  }

  function renderCheckout() {
    const main = $('#mainContent');
    if (!main) return;

    if (!cart.items.length) {
      main.innerHTML = `
        <div class="checkout-page" role="main">
          <div class="container" style="text-align: center; padding: var(--section-pad-4) var(--gutter-2);">
            <h1>${t('checkoutTitle')}</h1>
            <p style="margin: var(--gutter-3) 0; color: var(--color-graphite);">${t('cartEmpty')}</p>
            <a href="#/collections/all" class="btn btn-primary">${t('continueShopping')}</a>
          </div>
        </div>
      `;
      return;
    }

    const subtotal = calculateSubtotal();
    const zones = catalog?.settings?.zones || {};
    const zoneKeys = Object.keys(zones);

    main.innerHTML = `
      <div class="checkout-page" id="checkoutPage">
        <div class="container">
          <header class="page-header" style="padding: var(--section-pad-1) 0; background: transparent; text-align: left;">
            <h1>${t('checkoutTitle')}</h1>
          </header>

          <div class="checkout-grid">
            <form class="checkout-form" id="checkoutForm" novalidate>
              <!-- Contact Information -->
              <section class="checkout-section" id="contactSection" aria-labelledby="contactTitle">
                <h2 id="contactTitle">${t('contactInfo')}</h2>
                <div class="form-row">
                  <div class="form-group">
                    <label for="fullName">${t('fullName')}</label>
                    <input type="text" id="fullName" name="fullName" required autocomplete="name" aria-describedby="fullNameError">
                    <p class="error-message" id="fullNameError"></p>
                  </div>
                  <div class="form-group">
                    <label for="email">${t('email')}</label>
                    <input type="email" id="email" name="email" required autocomplete="email" aria-describedby="emailError">
                    <p class="error-message" id="emailError"></p>
                  </div>
                </div>
                <div class="form-group">
                  <label for="phone">${t('phone')}</label>
                  <input type="tel" id="phone" name="phone" placeholder="${t('phonePlaceholder')}" required autocomplete="tel" aria-describedby="phoneError">
                  <p class="error-message" id="phoneError"></p>
                </div>
              </section>

              <!-- Delivery Address -->
              <section class="checkout-section" id="addressSection" aria-labelledby="addressTitle">
                <h2 id="addressTitle">${t('deliveryAddress')}</h2>
                <div class="form-group">
                  <label for="governorate">${t('governorate')}</label>
                  <select id="governorate" name="governorate" required aria-describedby="governorateError">
                    <option value="">${t('selectGovernorate')}</option>
                    ${(catalog?.governorates || []).map(g => `<option value="${g}">${g}</option>`).join('')}
                  </select>
                  <p class="error-message" id="governorateError"></p>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label for="cityArea">${t('cityArea')}</label>
                    <input type="text" id="cityArea" name="cityArea" required autocomplete="address-level2" aria-describedby="cityAreaError">
                    <p class="error-message" id="cityAreaError"></p>
                  </div>
                  <div class="form-group">
                    <label for="street">${t('street')}</label>
                    <input type="text" id="street" name="street" required autocomplete="street-address" aria-describedby="streetError">
                    <p class="error-message" id="streetError"></p>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label for="building">${t('building')}</label>
                    <input type="text" id="building" name="building" autocomplete="address-line2" aria-describedby="buildingError">
                    <p class="error-message" id="buildingError"></p>
                  </div>
                  <div class="form-group">
                    <label for="landmark">${t('landmark')}</label>
                    <input type="text" id="landmark" name="landmark" autocomplete="address-line3" aria-describedby="landmarkError">
                    <p class="error-message" id="landmarkError"></p>
                  </div>
                </div>
              </section>

              <!-- Shipping Method -->
              <section class="checkout-section" id="shippingSection" aria-labelledby="shippingTitle">
                <h2 id="shippingTitle">${t('shippingMethod')}</h2>
                <div class="shipping-options" id="shippingOptions">
                  ${zoneKeys.map(zoneKey => {
                    const zone = zones[zoneKey];
                    const shippingFee = calculateShipping(subtotal, zoneKey);
                    const isFree = shippingFee === 0;
                    return `
                      <label class="shipping-option">
                        <input type="radio" name="shippingZone" value="${zoneKey}" ${zoneKey === 'cairo-giza' ? 'checked' : ''}>
                        <div class="shipping-option-info">
                          <span class="shipping-zone-name">${zone.name[currentLang] || zone.name.en}</span>
                          <span class="shipping-zone-days">${zone.days} ${t('days')}</span>
                          <span class="shipping-zone-price">${isFree ? t('freeShipping') : formatEGP(shippingFee)}</span>
                        </div>
                      </label>
                    `;
                  }).join('')}
                </div>
              </section>

              <!-- Payment Method -->
              <section class="checkout-section" id="paymentSection" aria-labelledby="paymentTitle">
                <h2 id="paymentTitle">${t('paymentMethod')}</h2>
                <div class="payment-options">
                  <label class="payment-option">
                    <input type="radio" name="paymentMethod" value="cod" checked>
                    <div class="payment-option-info">
                      <span class="method-name">${t('cashOnDelivery')}</span>
                      <span class="method-note">${t('comingSoon').replace('Available', 'Available (default)')}</span>
                    </div>
                  </label>
                  <label class="payment-option disabled">
                    <input type="radio" name="paymentMethod" value="card" disabled>
                    <div class="payment-option-info">
                      <span class="method-name">${t('cardWallet')}</span>
                      <span class="method-note">${t('comingSoon')}</span>
                    </div>
                  </label>
                  <label class="payment-option disabled">
                    <input type="radio" name="paymentMethod" value="fawry" disabled>
                    <div class="payment-option-info">
                      <span class="method-name">${t('fawry')}</span>
                      <span class="method-note">${t('comingSoon')}</span>
                    </div>
                  </label>
                </div>
              </section>

              <!-- Marketing Consent -->
              <section class="checkout-section" id="consentSection">
                <div class="form-group" style="flex-direction: row; align-items: flex-start; gap: var(--gutter-2);">
                  <input type="checkbox" id="marketingConsent" name="marketingConsent">
                  <label for="marketingConsent" style="font-family: var(--font-body); font-size: var(--body-size); font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--color-graphite); cursor: pointer; margin: 0;">${t('marketingConsent')}</label>
                </div>
              </section>

              <button type="submit" class="btn btn-primary btn-lg btn-block" id="placeOrderBtn">${t('placeOrder')}</button>
              <p class="preview-notice" id="previewNotice">${t('previewNotice')}</p>
            </form>

            <!-- Order Summary -->
            <aside class="checkout-summary" aria-labelledby="summaryTitle">
              <h2 id="summaryTitle">${t('orderSummary')}</h2>
              <div class="summary-items" id="summaryItems"></div>
              <div class="cart-total"><span>${t('total')}</span><span id="summaryTotal">${formatEGP(calculateTotal(subtotal, 'cairo-giza'))}</span></div>
            </aside>
          </div>
        </div>
      </div>
    `;

    renderSummary();
    bindEvents();
  }


  // Paymob service address: config.js (DRYV_PAYMOB_BASE) wins. Locally it is the dev service on :8901;
  // on the live domain it defaults to the same origin, so production never calls a visitor's own machine.
  const _isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const PAYMOB_BASE = (window.DRYV_PAYMOB_BASE || (_isLocal ? 'http://127.0.0.1:8901' : ''));

  // Card payments are enabled only when the Paymob service reports it has keys.
  // Without keys the option stays visibly disabled rather than failing at submit.
  async function enableCardIfConfigured() {
    const label = document.querySelector('.payment-option.disabled');
    const input = label && label.querySelector('input[name="paymentMethod"]');
    if (!label || !input) return;
    try {
      const r = await fetch(PAYMOB_BASE + '/paymob/health', { cache: 'no-store' });
      const d = await r.json();
      if (!d.configured) return;
      input.disabled = false;
      label.classList.remove('disabled');
      label.classList.add('enabled');
    } catch (e) { /* service not running: leave card off */ }
  }

  async function startCardPayment(orderData) {
    const btn = $('#placeOrderBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Opening secure payment…'; }
    try {
      const r = await fetch(PAYMOB_BASE + '/paymob/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: orderData.orderNumber,
          amount_cents: Math.round(orderData.total * 100),
          currency: 'EGP',
          items: (cart.items || []).map(i => ({ name: i.name, amount_cents: Math.round(i.price * 100), quantity: i.quantity })),
          billing_data: {
            first_name: orderData.firstName || 'Guest', last_name: orderData.lastName || 'Guest',
            email: orderData.email || '', phone_number: orderData.phone || '',
            street: orderData.address || '', city: orderData.city || '',
            country: 'EG', state: orderData.governorate || ''
          }
        })
      });
      const d = await r.json();
      if (!r.ok || !d.iframe_url) throw new Error(d.error || 'payment_unavailable');
      localStorage.setItem('dryv_pending_order', JSON.stringify(orderData));
      window.location.href = d.iframe_url;
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = 'Place order'; }
      navigate('#/payment-failed/' + encodeURIComponent(orderData.orderNumber));
    }
  }

  function renderSummary() {
    const container = $('#summaryItems');
    if (!container) return;

    container.innerHTML = cart.items.map(item => {
      const variant = getVariantBySKU(item.sku);
      if (!variant) return '';
      const colourName = variant.colour.charAt(0).toUpperCase() + variant.colour.slice(1).toLowerCase();
      const lineTotal = variant.price * item.qty;
      return `
        <div class="summary-item">
          <div>
            <p class="summary-name">${variant.productName}</p>
            <p class="summary-variant">${colourName} / ${variant.size} × ${item.qty}</p>
          </div>
          <span>${formatEGP(lineTotal)}</span>
        </div>
      `;
    }).join('');
  }

  function updateSummaryTotal() {
    const selectedZone = document.querySelector('input[name="shippingZone"]:checked');
    const zone = selectedZone?.value || 'cairo-giza';
    const subtotal = calculateSubtotal();
    const total = calculateTotal(subtotal, zone);
    const totalEl = $('#summaryTotal');
    if (totalEl) totalEl.textContent = formatEGP(total);
  }

  function showError(inputId, message) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(inputId + 'Error');
    if (input) input.classList.add('error');
    if (errorEl) errorEl.textContent = message;
  }

  function clearError(inputId) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(inputId + 'Error');
    if (input) input.classList.remove('error');
    if (errorEl) errorEl.textContent = '';
  }

  function validateForm() {
    let isValid = true;
    let firstError = null;
    const fail = (id, message, el) => {
      showError(id, message);
      isValid = false;
      if (!firstError) { firstError = el; }
    };

    // Full name
    const fullName = $('#fullName');
    if (fullName && !fullName.value.trim()) {
      fail('fullName', t('errorName'), fullName);
    } else if (fullName) clearError('fullName');

    // Email
    const email = $('#email');
    if (email && !email.value.trim()) {
      fail('email', t('errorEmail'), email);
    } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      fail('email', t('errorEmailInvalid'), email);
    } else if (email) clearError('email');

    // Phone
    const phone = $('#phone');
    if (phone && !validateEgyptianMobile(phone.value)) {
      showError('phone', t('phoneError'));
      isValid = false;
      if (!firstError) phone.focus();
    } else if (phone) {
      clearError('phone');
      phone.value = formatEgyptianMobile(phone.value);
    }

    // Governorate
    const governorate = $('#governorate');
    if (governorate && !governorate.value) {
      fail('governorate', t('errorGovernorate'), governorate);
    } else if (governorate) clearError('governorate');

    // City/Area
    const cityArea = $('#cityArea');
    if (cityArea && !cityArea.value.trim()) {
      fail('cityArea', t('errorCity'), cityArea);
    } else if (cityArea) clearError('cityArea');

    // Street
    const street = $('#street');
    if (street && !street.value.trim()) {
      fail('street', t('errorStreet'), street);
    } else if (street) clearError('street');

    if (!isValid && firstError) firstError.focus();
    return isValid;
  }

  function collectFormData() {
    const selectedZone = document.querySelector('input[name="shippingZone"]:checked');
    const zone = selectedZone?.value || 'cairo-giza';
    const subtotal = calculateSubtotal();
    const shipping = calculateShipping(subtotal, zone);
    const discount = calculateDiscount(subtotal);
    const total = subtotal + shipping - discount;

    return {
      orderNumber: generateOrderNumber(),
      items: cart.items.map(item => {
        const variant = getVariantBySKU(item.sku);
        return {
          sku: item.sku,
          name: variant?.productName,
          colour: variant?.colour,
          size: variant?.size,
          price: variant?.price,
          qty: item.qty,
          image: variant?.image
        };
      }),
      contact: {
        fullName: $('#fullName')?.value?.trim(),
        email: $('#email')?.value?.trim(),
        phone: formatEgyptianMobile($('#phone')?.value || '')
      },
      address: {
        governorate: $('#governorate')?.value,
        cityArea: $('#cityArea')?.value?.trim(),
        street: $('#street')?.value?.trim(),
        building: $('#building')?.value?.trim(),
        landmark: $('#landmark')?.value?.trim()
      },
      shipping: {
        zone,
        fee: shipping
      },
      payment: {
        method: document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cod'
      },
      marketingConsent: $('#marketingConsent')?.checked || false,
      discount: appliedDiscount ? { code: appliedDiscount, amount: discount } : null,
      subtotal,
      shipping: shipping,
      discount: discount,
      total,
      timestamp: Date.now(),
      staging: catalog?.settings?.staging !== false
    };
  }

  function bindEvents() {
    enableCardIfConfigured();

    // Form submission
    const form = $('#checkoutForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        const orderData = collectFormData();
        const method = (document.querySelector('input[name="paymentMethod"]:checked') || {}).value || 'cod';

        if (method === 'card') {
          await startCardPayment(orderData);   // cart is kept until Paymob confirms
          return;
        }

        // Demo: store in localStorage only
        const orders = JSON.parse(localStorage.getItem('dryv_orders') || '[]');
        orders.push(orderData);
        localStorage.setItem('dryv_orders', JSON.stringify(orders));

        // Clear cart
        cart = { items: [] };
        storage.set('dryv_cart', cart);
        appliedDiscount = null;
        updateCartCount();

        // Navigate to confirmation
        navigate(`#/confirmation/${orderData.orderNumber}`);
      });
    }

    // Real-time validation
    $$('#checkoutForm input, #checkoutForm select').forEach(input => {
      input.addEventListener('blur', () => {
        if (input.required && !input.value.trim() && !input.disabled) {
          showError(input.id, t('error'));
        } else {
          clearError(input.id);
        }
        if (input.id === 'phone') {
          if (!validateEgyptianMobile(input.value)) {
            showError('phone', t('phoneError'));
          } else {
            clearError('phone');
            input.value = formatEgyptianMobile(input.value);
          }
        }
      });

      input.addEventListener('input', () => {
        if (input.classList.contains('error')) {
          clearError(input.id);
        }
      });
    });

    // Shipping zone change
    $$('input[name="shippingZone"]').forEach(radio => {
      radio.addEventListener('change', updateSummaryTotal);
    });

    // Phone formatting on input
    const phoneInput = $('#phone');
    if (phoneInput) {
      phoneInput.addEventListener('input', (e) => {
        const cursorPos = e.target.selectionStart;
        const formatted = formatEgyptianMobile(e.target.value);
        e.target.value = formatted;
        // Try to maintain cursor position
        e.target.setSelectionRange(cursorPos, cursorPos);
      });
    }
  }

  function renderConfirmation(orderNumber) {
    const main = $('#mainContent');
    if (!main) return;

    main.innerHTML = `
      <div class="confirmation-page" role="main">
        <div class="confirmation-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <h1>${t('orderConfirmed')}</h1>
        <p class="order-number">${t('orderNumber')}: <strong>${orderNumber}</strong></p>
        <p>${t('thankYou')}</p>
        <p class="preview-notice">${t('previewNotice')}</p>
        <a href="#/" class="btn btn-primary btn-block" style="margin-top: var(--gutter-3);">${t('continueShopping')}</a>
      </div>
    `;
  }


  function renderPaymentFailed(orderNumber) {
    const main = $('#mainContent');
    if (!main) return;
    const ref = orderNumber ? `<p class="order-number">${t('orderNumber')}: <strong>${orderNumber}</strong></p>` : '';
    main.innerHTML = `
      <div class="confirmation-page payment-failed-page" role="main">
        <div class="confirmation-icon confirmation-icon--warn" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h1>Payment didn't go through</h1>
        <p>Your card was not charged. Nothing in your bag has changed, so you can try again straight away.</p>
        ${ref}
        <p class="preview-notice">If your bank declined the payment, try a different method or contact us and we will take the order manually.</p>
        <a href="#/checkout" class="btn btn-primary btn-block" style="margin-top: var(--gutter-3);">Try payment again</a>
        <a href="#/pages/contact" class="btn btn-secondary btn-block" style="margin-top: var(--gutter-2);">Contact us</a>
      </div>
    `;
  }

  function updateCartCount() {
    const count = cart.items.reduce((sum, item) => sum + item.qty, 0);
    const cartCount = $('#cartCount');
    if (cartCount) cartCount.textContent = count;
  }

  function parseCheckoutURL() {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith('/confirmation/')) {
      return { type: 'confirmation', orderNumber: hash.split('/')[2] };
    }
    if (hash === '/checkout') {
      return { type: 'checkout' };
    }
    if (hash.startsWith('/payment-failed')) {
      return { type: 'failed', orderNumber: hash.split('/')[2] || null };
    }
    return null;
  }

  async function initCheckout() {
    await loadCatalog();
    await domReady;
    loadCart();

    const route = parseCheckoutURL();
    if (route) {
      if (route.type === 'confirmation') {
        renderConfirmation(route.orderNumber);
      } else if (route.type === 'failed') {
        renderPaymentFailed(route.orderNumber);
      } else if (route.type === 'checkout') {
            if (!cart.items.length) {
              renderCheckout();
              return;
            }
            renderCheckout();
          }
    }
  }

  // Register routes with central router
  route('/checkout', () => {
    initCheckout();
  });
  route('/confirmation/:orderNumber', (params) => {
    renderConfirmation(params.orderNumber);
  });
  route('/payment-failed', () => renderPaymentFailed(null));
  route('/payment-failed/:orderNumber', (params) => renderPaymentFailed(params.orderNumber));

  // Export for other modules
  const DRYV_CHECKOUT = {
    init: initCheckout,
    renderCheckout,
    renderConfirmation,
    renderPaymentFailed,
    enableCardIfConfigured,
    validateEgyptianMobile
  };

  if (typeof module !== 'undefined') {
    module.exports = DRYV_CHECKOUT;
  }
  window.DRYV_CHECKOUT = DRYV_CHECKOUT;
})();
// DRYV Product Module
// Product page, gallery, size guide modal, sticky add-to-cart
// Depends on: DRYV_CORE, LBN_I18N, catalog.json

(() => {
  'use strict';

  const { domReady, $, $$, delegate, fetchJSON, formatEGP, show, hide, toggleHidden, getData, setData, showToast, navigate, route } = window.DRYV_CORE;
  const I18N = window.LBN_I18N;

  let catalog = null;
  let currentLang = 'en';
  let currentProduct = null;
  let currentVariant = null;
  let selectedColour = null;
  let selectedSize = null;

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
    } catch (err) {
      console.error('Failed to load catalog:', err);
      catalog = { products: [], settings: {} };
    }
  }

  function parseProductURL() {
    const hash = window.location.hash.slice(1);
    const match = hash.match(/^\/products\/([^?]+)(?:\?(.*))?$/);
    if (!match) return null;

    const handle = match[1];
    const params = new URLSearchParams(match[2] || '');
    const colour = params.get('color');

    const product = catalog.products.find(p => p.handle === handle);
    if (!product) return null;

    let variant = null;
    if (colour) {
      variant = product.variants.find(v => v.colour === colour);
    }
    if (!variant) {
      variant = product.variants.find(v => v.stock > 0) || product.variants[0];
    }

    return { product, variant };
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

  function getColourName(colour) {
    return colour.charAt(0).toUpperCase() + colour.slice(1).toLowerCase();
  }

  function getStockStatus(stock) {
    if (stock === 0) return { class: 'sold-out', text: t('stockSoldOut') };
    if (stock <= (catalog.settings?.lowStockThreshold || 3)) return { class: 'low-stock', text: t('stockLowStock') };
    return { class: 'in-stock', text: t('stockInStock') };
  }

  function getFitText(productType) {
    return productType === 'Tank Tops' ? t('fitted') : t('athleticFit');
  }

  function getDeliveryLine() {
    const threshold = catalog.settings?.freeDeliveryOver || 950;
    return `${t('deliveryInfo')}: ${t('freeDelivery')}`.replace('EGP 950', `EGP ${threshold}`);
  }

  function renderProductPage(data) {
    const { product, variant } = data;
    currentProduct = product;
    currentVariant = variant;
    selectedColour = variant.colour;
    selectedSize = null;

    const main = $('#mainContent');
    if (!main) return;

    const productName = product.name[currentLang] || product.name.en;
    const productDescription = product.description[currentLang] || product.description.en;
    const colours = [...new Set(product.variants.map(v => v.colour))];
    const sizes = [...new Set(product.variants.map(v => v.size))].sort((a, b) => {
      const order = ['S', 'M', 'L', 'XL', 'XXL'];
      return order.indexOf(a) - order.indexOf(b);
    });

    const stockStatus = getStockStatus(variant.stock);
    const fitText = getFitText(product.type);

    main.innerHTML = `
      <article class="product-page" aria-labelledby="productName">
        <div class="product-gallery">
          <div class="gallery-main" id="galleryMain">
            <img src="${variant.image}" alt="" id="mainImage" width="645" height="799">
          </div>
          <div class="gallery-thumbs" id="galleryThumbs" role="group" aria-label="${t('productDetails')}">
            ${colours.map(c => {
              const v = product.variants.find(v => v.colour === c);
              return `<button class="gallery-thumb ${c === selectedColour ? 'active' : ''}" data-colour="${c}" aria-label="${getColourName(c)}" aria-pressed="${c === selectedColour}">
                <img src="${v.image}" alt="" width="80" height="100">
              </button>`;
            }).join('')}
          </div>
        </div>

        <div class="product-info">
          <p class="product-card-name">${product.type}</p>
          <h1 id="productName" class="product-title">${productName}</h1>
          <p class="product-card-price" id="productPrice">${formatEGP(variant.price)}</p>

          <div class="colour-swatches" id="colourSwatches" role="group" aria-label="${t('color')}">
            ${colours.map(c => `
              <button class="colour-swatch ${c === selectedColour ? 'active' : ''}" data-colour="${c}" aria-pressed="${c === selectedColour}" aria-label="${getColourName(c)}">
                <span class="swatch" style="background: ${getSwatchColor(c)};"></span>
                <span>${getColourName(c)}</span>
              </button>
            `).join('')}
          </div>

          <div class="size-chips" id="sizeChips" role="group" aria-label="${t('size')}">
            ${sizes.map(size => {
              const sizeVariant = product.variants.find(v => v.colour === selectedColour && v.size === size);
              const stock = sizeVariant?.stock || 0;
              const isSoldOut = stock === 0;
              return `
                <button class="size-chip ${isSoldOut ? 'sold-out' : ''}" data-size="${size}" ${isSoldOut ? 'disabled' : ''} aria-label="${size} ${isSoldOut ? t('stockSoldOut') : t('stockInStock')}" aria-pressed="false">
                  ${size}
                  ${isSoldOut ? `<span class="sr-only">, ${t('stockSoldOut')}</span>` : ''}
                </button>
              `;
            }).join('')}
          </div>

          <a href="#/pages/size-guide" class="size-guide-link" id="sizeGuideLink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            ${t('sizeGuide')}
          </a>

          <p class="fit-line" id="fitLine">${t('fit')}: ${fitText}</p>

          <div class="quantity-stepper" id="quantityStepper" hidden>
            <button type="button" aria-label="${t('decrease')}" data-action="decrease">−</button>
            <input type="number" id="quantityInput" value="1" min="1" max="${variant.stock}" aria-label="${t('quantity')}" ${variant.stock === 0 ? 'disabled' : ''}>
            <button type="button" aria-label="${t('increase')}" data-action="increase">+</button>
          </div>

          <p class="stock-message ${stockStatus.class}" id="stockMessage">${stockStatus.text}</p>

          <p class="delivery-line" id="deliveryLine">${getDeliveryLine()}</p>

          <div class="policy-links" id="policyLinks">
            <a href="#/policies/shipping">${t('shippingPolicy')}</a>
            <a href="#/policies/returns">${t('exchangePolicy')}</a>
          </div>

          <button class="btn btn-primary btn-lg add-to-cart-main" id="addToCartMain" type="button" disabled>${t('selectSizePrompt')}</button>

          <div class="sticky-add-to-cart" id="stickyAddToCart" hidden>
            <div class="sticky-content">
              <img src="${variant.image}" alt="" width="60" height="75">
              <div class="sticky-info">
                <p class="sticky-name">${productName}</p>
                <p class="sticky-price">${formatEGP(variant.price)}</p>
              </div>
              <button class="btn btn-primary" id="stickyAddBtn" type="button" disabled>${t('addToCart')}</button>
            </div>
          </div>
        </div>
      </article>

      <section class="related-products" id="relatedProducts" aria-labelledby="relatedTitle" hidden>
        <div class="container">
          <h2 id="relatedTitle" class="section-title">${t('relatedProducts')}</h2>
          <div class="product-grid" id="relatedGrid" role="list"></div>
        </div>
      </section>
    `;

    bindEvents();
    renderRelatedProducts();
    updateAddToCartState();
  }

  function bindEvents() {
    // Colour swatches
    delegate($('#colourSwatches'), '.colour-swatch', 'click', function() {
      const colour = this.dataset.colour;
      if (colour === selectedColour) return;
      selectColour(colour);
    });

    // Gallery thumbnails
    delegate($('#galleryThumbs'), '.gallery-thumb', 'click', function() {
      const colour = this.dataset.colour;
      if (colour === selectedColour) return;
      selectColour(colour);
    });

    // Size chips
    delegate($('#sizeChips'), '.size-chip:not(.sold-out)', 'click', function() {
      const size = this.dataset.size;
      selectSize(size);
    });

    // Quantity stepper
    const qtyInput = $('#quantityInput');
    if (qtyInput) {
      qtyInput.addEventListener('input', () => {
        const max = parseInt(qtyInput.max) || 99;
        let val = parseInt(qtyInput.value) || 1;
        if (val < 1) val = 1;
        if (val > max) val = max;
        qtyInput.value = val;
      });
    }

    delegate($('#quantityStepper'), 'button[data-action]', 'click', function() {
      const action = this.dataset.action;
      const input = $('#quantityInput');
      if (!input) return;
      const max = parseInt(input.max) || 99;
      let val = parseInt(input.value) || 1;
      if (action === 'increase' && val < max) val++;
      if (action === 'decrease' && val > 1) val--;
      input.value = val;
    });

    // Add to cart main
    const addBtn = $('#addToCartMain');
    if (addBtn) {
      addBtn.addEventListener('click', () => addToCart());
    }

    // Sticky add to cart
    const stickyBtn = $('#stickyAddBtn');
    if (stickyBtn) {
      stickyBtn.addEventListener('click', () => addToCart());
    }

    // Size guide link
    const sizeGuideLink = $('#sizeGuideLink');
    if (sizeGuideLink) {
      sizeGuideLink.addEventListener('click', (e) => {
        e.preventDefault();
        openSizeGuideModal();
      });
    }

    // Sticky bar on scroll
    let stickyVisible = false;
    const mainImage = $('#mainImage');
    const stickyBar = $('#stickyAddToCart');
    if (mainImage && stickyBar) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting && !stickyVisible) {
            stickyVisible = true;
            stickyBar.hidden = false;
          } else if (entry.isIntersecting && stickyVisible) {
            stickyVisible = false;
            stickyBar.hidden = true;
          }
        });
      }, { rootMargin: '-80px 0px 0px 0px' });
      observer.observe(mainImage);
    }
  }

  function selectColour(colour) {
    selectedColour = colour;
    const variant = currentProduct.variants.find(v => v.colour === colour && (!selectedSize || v.size === selectedSize))
      || currentProduct.variants.find(v => v.colour === colour);
    if (!variant) return;

    currentVariant = variant;

    // Update main image
    const mainImage = $('#mainImage');
    if (mainImage) {
      mainImage.src = variant.image;
      mainImage.alt = '';
    }

    // Update active states
    $$('.colour-swatch').forEach(btn => {
      const active = btn.dataset.colour === colour;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active);
    });
    $$('.gallery-thumb').forEach(btn => {
      const active = btn.dataset.colour === colour;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active);
    });

    // Update price
    const priceEl = $('#productPrice');
    if (priceEl) priceEl.textContent = formatEGP(variant.price);

    // Update stock message
    const stockStatus = getStockStatus(variant.stock);
    const stockMsg = $('#stockMessage');
    if (stockMsg) {
      stockMsg.className = `stock-message ${stockStatus.class}`;
      stockMsg.textContent = stockStatus.text;
    }

    // Update delivery line
    const deliveryLine = $('#deliveryLine');
    if (deliveryLine) deliveryLine.textContent = getDeliveryLine();

    // Reset size selection
    selectedSize = null;
    renderSizeChips();
    updateAddToCartState();
    updateStickyBar();
  }

  function renderSizeChips() {
    const container = $('#sizeChips');
    if (!container || !currentProduct) return;

    const sizes = [...new Set(currentProduct.variants.map(v => v.size))].sort((a, b) => {
      const order = ['S', 'M', 'L', 'XL', 'XXL'];
      return order.indexOf(a) - order.indexOf(b);
    });

    container.innerHTML = sizes.map(size => {
      const sizeVariant = currentProduct.variants.find(v => v.colour === selectedColour && v.size === size);
      const stock = sizeVariant?.stock || 0;
      const isSoldOut = stock === 0;
      return `
        <button class="size-chip ${isSoldOut ? 'sold-out' : ''}" data-size="${size}" ${isSoldOut ? 'disabled' : ''} aria-label="${size} ${isSoldOut ? t('stockSoldOut') : t('stockInStock')}" aria-pressed="false">
          ${size}
          ${isSoldOut ? `<span class="sr-only">, ${t('stockSoldOut')}</span>` : ''}
        </button>
      `;
    }).join('');
  }

  function selectSize(size) {
    selectedSize = size;
    // Without this the SKU stayed on whichever variant rendered first (black/S),
    // so every size added the same item.
    if (currentProduct && selectedColour) {
      const match = currentProduct.variants.find(v => v.colour === selectedColour && v.size === size);
      if (match) currentVariant = match;
    }
    $$('.size-chip').forEach(btn => {
      const active = btn.dataset.size === size;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active);
    });
    updateAddToCartState();
    updateStickyBar();
  }

  function updateAddToCartState() {
    const addBtn = $('#addToCartMain');
    const qtyStepper = $('#quantityStepper');
    const qtyInput = $('#quantityInput');

    if (selectedSize && currentVariant && currentVariant.stock > 0) {
      if (addBtn) {
        addBtn.disabled = false;
        addBtn.textContent = t('addToCart');
      }
      if (qtyStepper) qtyStepper.hidden = false;
      if (qtyInput) {
        qtyInput.max = currentVariant.stock;
        if (parseInt(qtyInput.value) > currentVariant.stock) qtyInput.value = currentVariant.stock;
        qtyInput.disabled = false;
      }
    } else {
      if (addBtn) {
        addBtn.disabled = true;
        addBtn.textContent = selectedSize ? (currentVariant?.stock === 0 ? t('soldOut') : t('addToCart')) : t('selectSizePrompt');
      }
      if (qtyStepper) qtyStepper.hidden = true;
    }
  }

  function updateStickyBar() {
    const stickyBtn = $('#stickyAddBtn');
    if (stickyBtn) {
      if (selectedSize && currentVariant && currentVariant.stock > 0) {
        stickyBtn.disabled = false;
        stickyBtn.textContent = t('addToCart');
      } else {
        stickyBtn.disabled = true;
        stickyBtn.textContent = selectedSize ? (currentVariant?.stock === 0 ? t('soldOut') : t('addToCart')) : t('selectSizePrompt');
      }
    }
  }

  function addToCart() {
    if (!selectedSize || !currentVariant || currentVariant.stock === 0) return;

    const qtyInput = $('#quantityInput');
    const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

    const cart = window.DRYV_CORE.storage.get('dryv_cart', { items: [] });
    const existing = cart.items.find(item => item.sku === currentVariant.sku);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.items.push({ sku: currentVariant.sku, qty });
    }
    window.DRYV_CORE.storage.set('dryv_cart', cart);
    showToast(t('addedToCart'), 'success');
    updateCartCount();
    // Use cart module's openCartDrawer which ensures catalog is loaded
    if (window.DRYV_CART && window.DRYV_CART.openCartDrawer) {
      window.DRYV_CART.openCartDrawer();
    } else {
      const drawer = document.getElementById('cartDrawer');
      if (drawer) drawer.hidden = false;
    }
  }

  function updateCartCount() {
    const cart = window.DRYV_CORE.storage.get('dryv_cart', { items: [] });
    const count = cart.items.reduce((sum, item) => sum + item.qty, 0);
    const cartCount = $('#cartCount');
    if (cartCount) cartCount.textContent = count;
  }

  function openSizeGuideModal() {
    const modal = $('#sizeGuideModal');
    if (modal) {
      modal.hidden = false;
      // Populate modal content from i18n
      const content = $('#sizeGuideModalContent');
      if (content) {
        content.innerHTML = `
          <h3>${t('chooseSize')}</h3>
          <p>${t('fitGuidance')}</p>
          <p>${t('sizeHelp')}</p>
        `;
      }
    }
  }

  function renderRelatedProducts() {
    const grid = $('#relatedGrid');
    const section = $('#relatedProducts');
    if (!grid || !section || !catalog) return;

    const otherProducts = catalog.products.filter(p => p.handle !== currentProduct.handle);
    if (!otherProducts.length) return;

    const variants = [];
    otherProducts.forEach(product => {
      product.variants.forEach(variant => {
        if (variant.stock > 0 && !variants.some(v => v.productHandle === product.handle && v.colour === variant.colour)) {
          variants.push({
            productHandle: product.handle,
            productName: product.name[currentLang] || product.name.en,
            colour: variant.colour,
            price: variant.price,
            image: variant.image
          });
        }
      });
    });

    if (!variants.length) return;

    // Pick up to 4 random variants
    const shuffled = variants.sort(() => 0.5 - Math.random()).slice(0, 4);
    const cards = shuffled.map(v => {
      const colourName = getColourName(v.colour);
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

    grid.innerHTML = cards;
    section.hidden = false;
  }

  async function initProduct() {
    await loadCatalog();
    await domReady;
    const data = parseProductURL();
    if (data) {
      renderProductPage(data);
    } else {
      navigate('#/collections/all');
    }
  }

  // Register routes with central router
  route('/products/:handle', (params) => {
    initProduct();
  });

  // Export for other modules
  const DRYV_PRODUCT = {
    init: initProduct,
    renderProductPage
  };

  if (typeof module !== 'undefined') {
    module.exports = DRYV_PRODUCT;
  }
  window.DRYV_PRODUCT = DRYV_PRODUCT;
})();

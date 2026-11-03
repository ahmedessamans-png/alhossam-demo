// DRYV Shop Module
// Shop grid, filters, sort, chips, URL state, product card, quick add
// Depends on: DRYV_CORE, LBN_I18N, catalog.json

(() => {
  'use strict';

  const { domReady, $, $$, delegate, fetchJSON, formatEGP, show, hide, toggleHidden, getData, setData, debounce, navigate, getHashPath, route } = window.DRYV_CORE;
  const I18N = window.LBN_I18N;

  let catalog = null;
  let currentLang = 'en';
  let currentFilters = {
    type: [],
    size: [],
    colour: [],
    availability: [],
    priceRange: null
  };
  let currentSort = 'featured';
  let currentCollection = 'all';
  let allProducts = [];

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
      buildProductList();
    } catch (err) {
      console.error('Failed to load catalog:', err);
      catalog = { products: [], collections: [], settings: {} };
    }
  }

  function buildProductList() {
    allProducts = [];
    catalog.products.forEach(product => {
      product.variants.forEach(variant => {
        if (variant.stock > 0 || variant.stock === 0) {
          allProducts.push({
            productHandle: product.handle,
            productName: product.name[currentLang] || product.name.en,
            productType: product.type,
            colour: variant.colour,
            size: variant.size,
            price: variant.price,
            image: variant.image,
            stock: variant.stock,
            sku: variant.sku
          });
        }
      });
    });
  }

  function getFilteredProducts() {
    let filtered = [...allProducts];

    // Collection filter
    const collection = catalog.collections.find(c => c.handle === currentCollection);
    if (collection && collection.products.length) {
      filtered = filtered.filter(p => collection.products.includes(p.productHandle));
    }

    // Type filter
    if (currentFilters.type.length) {
      filtered = filtered.filter(p => currentFilters.type.includes(p.productType));
    }

    // Size filter
    if (currentFilters.size.length) {
      filtered = filtered.filter(p => currentFilters.size.includes(p.size));
    }

    // Colour filter
    if (currentFilters.colour.length) {
      filtered = filtered.filter(p => currentFilters.colour.includes(p.colour));
    }

    // Availability filter
    if (currentFilters.availability.length) {
      filtered = filtered.filter(p => {
        if (currentFilters.availability.includes('in-stock')) return p.stock > 0;
        if (currentFilters.availability.includes('low-stock')) return p.stock > 0 && p.stock <= (catalog.settings?.lowStockThreshold || 3);
        if (currentFilters.availability.includes('sold-out')) return p.stock === 0;
        return true;
      });
    }

    // Price range filter
    if (currentFilters.priceRange) {
      const [min, max] = currentFilters.priceRange.split('-').map(Number);
      filtered = filtered.filter(p => p.price >= min && (max ? p.price <= max : true));
    }

    // Sort
    switch (currentSort) {
      case 'newest':
        filtered.sort((a, b) => b.productHandle.localeCompare(a.productHandle));
        break;
      case 'price-low-high':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high-low':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'best-selling':
      case 'featured':
      default:
        break;
    }

    // Move sold out to end
    filtered.sort((a, b) => (a.stock === 0 ? 1 : 0) - (b.stock === 0 ? 1 : 0));

    return filtered;
  }

  function getUniqueValues(products, key) {
    const values = [...new Set(products.map(p => p[key]))].filter(Boolean);
    return values.sort();
  }

  function updateURL() {
    const params = new URLSearchParams();
    if (currentCollection !== 'all') params.set('collection', currentCollection);
    if (currentSort !== 'featured') params.set('sort', currentSort);
    if (currentFilters.type.length) params.set('type', currentFilters.type.join(','));
    if (currentFilters.size.length) params.set('size', currentFilters.size.join(','));
    if (currentFilters.colour.length) params.set('colour', currentFilters.colour.join(','));
    if (currentFilters.availability.length) params.set('availability', currentFilters.availability.join(','));
    if (currentFilters.priceRange) params.set('price', currentFilters.priceRange);
    const hash = `#/collections/${currentCollection}${params.toString() ? '?' + params.toString() : ''}`;
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash);
    }
  }

  function parseURL() {
    const path = getHashPath();
    const match = path.match(/^\/collections\/([^?]+)(?:\?(.*))?$/);
    if (!match) return;

    currentCollection = match[1] || 'all';
    const params = new URLSearchParams(match[2] || '');

    currentSort = params.get('sort') || 'featured';
    currentFilters.type = params.get('type')?.split(',').filter(Boolean) || [];
    currentFilters.size = params.get('size')?.split(',').filter(Boolean) || [];
    currentFilters.colour = params.get('colour')?.split(',').filter(Boolean) || [];
    currentFilters.availability = params.get('availability')?.split(',').filter(Boolean) || [];
    currentFilters.priceRange = params.get('price') || null;
  }

  function renderShop() {
    const main = $('#mainContent');
    if (!main) return;

    const filtered = getFilteredProducts();
    const types = getUniqueValues(allProducts, 'productType');
    const sizes = getUniqueValues(allProducts, 'size');
    const colours = getUniqueValues(allProducts, 'colour');

    // Count unique product-colour combinations (cards shown)
    const colourVariantsMap = new Map();
    filtered.forEach(p => {
      const key = `${p.productHandle}-${p.colour}`;
      if (!colourVariantsMap.has(key)) {
        colourVariantsMap.set(key, p);
      }
    });
    const cardCount = colourVariantsMap.size;

    main.innerHTML = `
      <header class="page-header" aria-labelledby="pageTitle">
        <div class="container">
          <h1 id="pageTitle">${getCollectionName(currentCollection)}</h1>
        </div>
      </header>

      <div class="filters-toolbar" role="search" aria-label="Product filters">
        <div class="container">
          <div class="toolbar-left">
            <span class="results-count" id="resultsCount">${t('resultsCount', { count: cardCount })}</span>
            <select class="sort-select" id="sortSelect" aria-label="${t('sortBy')}">
              <option value="featured">${t('featured')}</option>
              <option value="newest">${t('newest')}</option>
              <option value="price-low-high">${t('priceLowHigh')}</option>
              <option value="price-high-low">${t('priceHighLow')}</option>
              <option value="best-selling">${t('bestSelling')}</option>
            </select>
          </div>
          <button class="filter-btn" id="filterBtn" type="button" aria-expanded="false" aria-controls="filterPanel">${t('filters')}</button>
        </div>
      </div>

      <div class="filter-panel" id="filterPanel" hidden>
        <div class="container">
          <div class="filter-sections">
            <section class="filter-section">
              <h3>${t('type')}</h3>
              <div class="filter-options" id="filterType">${renderFilterOptions('type', types)}</div>
            </section>
            <section class="filter-section">
              <h3>${t('size')}</h3>
              <div class="filter-options" id="filterSize">${renderFilterOptions('size', sizes)}</div>
            </section>
            <section class="filter-section">
              <h3>${t('color')}</h3>
              <div class="filter-options" id="filterColour">${renderFilterOptions('colour', colours.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1).toLowerCase() })))}</div>
            </section>
            <section class="filter-section">
              <h3>${t('availability')}</h3>
              <div class="filter-options" id="filterAvailability">${renderAvailabilityOptions()}</div>
            </section>
            <section class="filter-section">
              <h3>${t('priceRange')}</h3>
              <div class="filter-options" id="filterPrice">${renderPriceOptions()}</div>
            </section>
          </div>
          <div class="filter-actions">
            <button class="btn btn-secondary" id="clearFilters" type="button">${t('clearFilters')}</button>
          </div>
        </div>
      </div>

      <div class="active-filters" id="activeFilters" hidden>
        <div class="container">
          <div class="filter-chips" id="filterChips"></div>
          <button class="clear-filters" id="clearAllFilters" type="button">${t('clearFilters')}</button>
        </div>
      </div>

      <div class="shop-grid" id="shopGrid" role="list" aria-label="${getCollectionName(currentCollection)}"></div>
    `;

    renderProducts(filtered);
    updateActiveFilters();
    bindEvents();
  }

  function getCollectionName(handle) {
    const collection = catalog.collections.find(c => c.handle === handle);
    return collection?.name[currentLang] || collection?.name.en || handle;
  }

  function renderFilterOptions(filterKey, options) {
    return options.map(opt => {
      const value = opt.value || opt;
      const label = opt.label || (typeof opt === 'string' ? opt.charAt(0).toUpperCase() + opt.slice(1).toLowerCase() : opt);
      const checked = currentFilters[filterKey].includes(value) ? 'checked' : '';
      return `
        <label class="filter-option">
          <input type="checkbox" name="${filterKey}" value="${value}" ${checked}>
          <span>${label}</span>
        </label>
      `;
    }).join('');
  }

  function renderAvailabilityOptions() {
    const options = [
      { value: 'in-stock', label: t('inStock') },
      { value: 'low-stock', label: t('lowStock') },
      { value: 'sold-out', label: t('soldOut') }
    ];
    return options.map(opt => {
      const checked = currentFilters.availability.includes(opt.value) ? 'checked' : '';
      return `
        <label class="filter-option">
          <input type="checkbox" name="availability" value="${opt.value}" ${checked}>
          <span>${opt.label}</span>
        </label>
      `;
    }).join('');
  }

  function renderPriceOptions() {
    const prices = allProducts.map(p => p.price);
    const minPrice = Math.floor(Math.min(...prices) / 100) * 100;
    const maxPrice = Math.ceil(Math.max(...prices) / 100) * 100;
    const ranges = [
      { value: '', label: t('priceRange') },
      { value: `${minPrice}-${minPrice + 500}`, label: `${formatEGP(minPrice)} - ${formatEGP(minPrice + 500)}` },
      { value: `${minPrice + 500}-${minPrice + 1000}`, label: `${formatEGP(minPrice + 500)} - ${formatEGP(minPrice + 1000)}` },
      { value: `${minPrice + 1000}-`, label: `${formatEGP(minPrice + 1000)}+` }
    ];
    return ranges.map(opt => {
      const checked = currentFilters.priceRange === opt.value ? 'checked' : '';
      return `
        <label class="filter-option">
          <input type="radio" name="price" value="${opt.value}" ${checked}>
          <span>${opt.label}</span>
        </label>
      `;
    }).join('');
  }

  function renderProducts(products) {
    const grid = $('#shopGrid');
    if (!grid) return;

    if (!products.length) {
      grid.innerHTML = `
        <div class="no-results" role="status">
          <p>${t('noResults')}</p>
          <p>${t('clearFiltersOrBrowse')}</p>
        </div>
      `;
      return;
    }

    // Group by product handle + colour to show one card per colour
    const colourVariants = new Map();
    products.forEach(p => {
      const key = `${p.productHandle}-${p.colour}`;
      if (!colourVariants.has(key)) {
        colourVariants.set(key, p);
      }
    });

    const cards = Array.from(colourVariants.values()).map(p => {
      const badge = p.stock === 0 ? `<span class="product-badge badge-sold-out">${t('soldOut')}</span>`
        : p.stock <= (catalog.settings?.lowStockThreshold || 3) ? `<span class="product-badge badge-low-stock">${t('lowStock')}</span>`
        : '';

      const colourName = p.colour.charAt(0).toUpperCase() + p.colour.slice(1).toLowerCase();

      // Get all colours for this product
      const productColours = Array.from(colourVariants.values())
        .filter(cv => cv.productHandle === p.productHandle)
        .map(cv => cv.colour);

      const swatchesHtml = productColours.map(c => {
        const cName = c.charAt(0).toUpperCase() + c.slice(1).toLowerCase();
        return `<span class="swatch" style="background: ${getSwatchColor(c)};" aria-label="${cName}"></span><span class="swatch-label">${cName}</span>`;
      }).join('');

      return `
        <article class="product-card" data-handle="${p.productHandle}" data-colour="${p.colour}" role="listitem">
          <a href="#/products/${p.productHandle}?color=${p.colour}" class="product-link" aria-label="${p.productName} ${colourName} ${formatEGP(p.price)}">
            <div class="product-image-wrapper">
              <img src="${p.image}" alt="${p.productName} — ${p.colour}" class="product-image" loading="lazy" width="645" height="799">
              ${badge}
            </div>
            <div class="product-info">
              <h3 class="product-name">${p.productName}</h3>
              <p class="product-price">${formatEGP(p.price)}</p>
              <div class="product-card-swatches">
                ${swatchesHtml}
              </div>
              <div class="product-card-actions">
                <button class="btn btn-primary quick-add-btn" type="button" data-handle="${p.productHandle}" data-colour="${p.colour}" ${p.stock === 0 ? 'disabled' : ''} aria-label="${p.stock === 0 ? t('soldOut') : t('quickAdd')}">${t('quickAdd')}</button>
              </div>
            </div>
          </a>
        </article>
      `;
    }).join('');

    grid.innerHTML = cards;
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

  function updateActiveFilters() {
    const chipsContainer = $('#filterChips');
    const activeContainer = $('#activeFilters');
    if (!chipsContainer || !activeContainer) return;

    const chips = [];
    if (currentFilters.type.length) chips.push(...currentFilters.type.map(v => ({ type: 'type', value: v, label: v })));
    if (currentFilters.size.length) chips.push(...currentFilters.size.map(v => ({ type: 'size', value: v, label: `Size ${v}` })));
    if (currentFilters.colour.length) chips.push(...currentFilters.colour.map(v => ({ type: 'colour', value: v, label: v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() })));
    if (currentFilters.availability.length) chips.push(...currentFilters.availability.map(v => ({ type: 'availability', value: v, label: t(v) })));
    if (currentFilters.priceRange) chips.push({ type: 'price', value: currentFilters.priceRange, label: currentFilters.priceRange });

    if (chips.length) {
      chipsContainer.innerHTML = chips.map(chip => `
        <span class="filter-chip" data-type="${chip.type}" data-value="${chip.value}">
          ${chip.label}
          <button type="button" aria-label="${t('remove')} ${chip.label}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </span>
      `).join('');
      activeContainer.hidden = false;
    } else {
      activeContainer.hidden = true;
    }
  }

  function bindEvents() {
    // Sort select
    const sortSelect = $('#sortSelect');
    if (sortSelect) {
      sortSelect.value = currentSort;
      sortSelect.addEventListener('change', () => {
        currentSort = sortSelect.value;
        updateURL();
        renderShop();
      });
    }

    // Filter button toggle
    const filterBtn = $('#filterBtn');
    const filterPanel = $('#filterPanel');
    if (filterBtn && filterPanel) {
      filterBtn.addEventListener('click', () => {
        const expanded = filterBtn.getAttribute('aria-expanded') === 'true';
        filterBtn.setAttribute('aria-expanded', !expanded);
        filterPanel.hidden = expanded;
      });
    }

    // Filter checkboxes
    $$('#filterPanel input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', debounce(() => {
        const filterKey = input.name;
        const value = input.value;
        if (input.checked) {
          if (!currentFilters[filterKey].includes(value)) currentFilters[filterKey].push(value);
        } else {
          currentFilters[filterKey] = currentFilters[filterKey].filter(v => v !== value);
        }
        updateURL();
        renderShop();
      }, 150));
    });

    // Price radio
    $$('#filterPanel input[type="radio"][name="price"]').forEach(input => {
      input.addEventListener('change', () => {
        currentFilters.priceRange = input.value || null;
        updateURL();
        renderShop();
      });
    });

    // Clear all filters
    const clearAll = $('#clearAllFilters');
    if (clearAll) {
      clearAll.addEventListener('click', () => {
        currentFilters = { type: [], size: [], colour: [], availability: [], priceRange: null };
        updateURL();
        renderShop();
      });
    }

    // Individual chip remove - use delegate with proper scope
    const chipsContainer = $('#filterChips');
    if (chipsContainer) {
      delegate(chipsContainer, '.filter-chip button', 'click', function() {
        const chip = this.closest('.filter-chip');
        const type = chip.dataset.type;
        const value = chip.dataset.value;
        if (type && value) {
          currentFilters[type] = currentFilters[type].filter(v => v !== value);
          updateURL();
          renderShop();
        }
      });
    }

    // Quick add buttons
    const grid = $('#shopGrid');
    if (grid) {
      delegate(grid, '.quick-add-btn', 'click', function() {
        const handle = this.dataset.handle;
        const colour = this.dataset.colour;
        // Apparel needs a size. Adding the first matching variant meant every
        // Quick Add silently bought a size S — a guaranteed return.
        window.location.hash = '#/products/' + handle + (colour ? '?colour=' + encodeURIComponent(colour) : '');
      });
    }
  }

  function addToCart(sku, qty = 1) {
    const cart = window.DRYV_CORE.storage.get('dryv_cart', { items: [] });
    const existing = cart.items.find(item => item.sku === sku);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.items.push({ sku, qty });
    }
    window.DRYV_CORE.storage.set('dryv_cart', cart);
    window.DRYV_CORE.showToast(t('addedToCart'), 'success');
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

  async function initShop() {
    await loadCatalog();
    await domReady;
    parseURL();
    renderShop();
    updateCartCount();
  }

  // Register routes with central router
  route('/collections/:collection', (params) => {
    currentCollection = params.collection || 'all';
    initShop();
  });

  // Export for other modules
  const DRYV_SHOP = {
    init: initShop,
    renderShop,
    addToCart,
    updateCartCount
  };

  if (typeof module !== 'undefined') {
    module.exports = DRYV_SHOP;
  }
  window.DRYV_SHOP = DRYV_SHOP;
})();

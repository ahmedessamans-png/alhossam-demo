// DRYV Core Module
// Shared utilities, DOM helpers, and core functionality
// Loaded before app.js, provides foundation for all scripts

(() => {
  'use strict';

  // ============================================
  // DOM Ready Promise
  // ============================================
  const domReady = new Promise((resolve) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', resolve, { once: true });
    } else {
      resolve();
    }
  });

  // ============================================
  // Safe Query Selectors
  // ============================================
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

  // ============================================
  // Event Delegation Helper
  // ============================================
  function delegate(parent, selector, eventType, handler) {
    parent.addEventListener(eventType, (event) => {
      const target = event.target.closest(selector);
      if (target && parent.contains(target)) {
        handler.call(target, event);
      }
    });
  }

  // ============================================
  // ARIA Toggle Helpers
  // ============================================
  function toggleAriaExpanded(btn, expanded = null) {
    const isExpanded = expanded ?? (btn.getAttribute('aria-expanded') !== 'true');
    btn.setAttribute('aria-expanded', isExpanded);
    const targetId = btn.getAttribute('aria-controls');
    if (targetId) {
      const target = document.getElementById(targetId);
      if (target) {
        target.hidden = !isExpanded;
      }
    }
    return isExpanded;
  }

  function setAriaExpanded(btn, expanded) {
    btn.setAttribute('aria-expanded', expanded);
    const targetId = btn.getAttribute('aria-controls');
    if (targetId) {
      const target = document.getElementById(targetId);
      if (target) {
        target.hidden = !expanded;
      }
    }
  }

  // ============================================
  // Hidden Attribute Toggle
  // ============================================
  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }
  function toggleHidden(el) { if (el) el.hidden = !el.hidden; }

  // ============================================
  // Class Toggle Helpers
  // ============================================
  function addClass(el, className) { if (el) el.classList.add(className); }
  function removeClass(el, className) { if (el) el.classList.remove(className); }
  function toggleClass(el, className) { if (el) el.classList.toggle(className); }
  function hasClass(el, className) { return el && el.classList.contains(className); }

  // ============================================
  // Data Attribute Helpers
  // ============================================
  function getData(el, key) { return el && el.dataset[key]; }
  function setData(el, key, value) { if (el) el.dataset[key] = value; }

  // ============================================
  // Format Currency (EGP)
  // ============================================
  function formatEGP(amount) {
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  // ============================================
  // Format Number with Arabic/English Digits
  // ============================================
  function formatNumber(num, lang = 'en') {
    if (lang === 'ar') {
      return new Intl.NumberFormat('ar-EG').format(num);
    }
    return new Intl.NumberFormat('en-EG').format(num);
  }

  // ============================================
  // Debounce
  // ============================================
  function debounce(fn, wait = 150) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // ============================================
  // Throttle
  // ============================================
  function throttle(fn, limit = 100) {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  // ============================================
  // Fetch Wrapper with JSON
  // ============================================
  async function fetchJSON(url, options = {}) {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  // ============================================
  // LocalStorage Safe Access
  // ============================================
  const storage = {
    get(key, fallback = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    }
  };

  // ============================================
  // Cookie Helpers
  // ============================================
  const cookies = {
    get(name) {
      const value = `; ${document.cookie}`.split(`; ${name}=`).pop();
      return value.split(';')[0] || null;
    },
    set(name, value, days = 365) {
      const expires = new Date(Date.now() + days * 864e5).toUTCString();
      document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
    },
    remove(name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
    }
  };

  // ============================================
  // URL / Routing Helpers
  // ============================================
  function getHashPath() {
    const hash = window.location.hash.slice(1);
    return hash.startsWith('/') ? hash : `/${hash || ''}`;
  }

  function navigate(path) {
    const routePath = String(path || '').replace(/^#/, '');
    window.location.hash = routePath.startsWith('/') ? routePath : `/${routePath}`;
  }

  // ============================================
  // Central Router
  // ============================================
  const routeRegistry = new Map();
  let routerInitialized = false;

  // Function to close all drawers on route change
  function closeAllDrawers() {
    const cartDrawer = document.getElementById('cartDrawer');
    const mobileDrawer = document.getElementById('mobileDrawer');
    const searchDrawer = document.getElementById('searchDrawer');
    const cartBackdrop = document.getElementById('cartDrawerBackdrop');
    const mobileBackdrop = document.getElementById('mobileDrawerBackdrop');
    
    if (cartDrawer) {
      cartDrawer.hidden = true;
    }
    if (mobileDrawer) {
      mobileDrawer.hidden = true;
    }
    if (searchDrawer) {
      searchDrawer.hidden = true;
    }
    ['searchBtn', 'cartBtn', 'mobileMenuBtn'].forEach(id => {
      const button = document.getElementById(id);
      if (button) button.setAttribute('aria-expanded', 'false');
    });
    ['shopBtn', 'collectionsBtn'].forEach(id => {
      const button = document.getElementById(id);
      if (!button) return;
      button.setAttribute('aria-expanded', 'false');
      const menu = document.getElementById(button.getAttribute('aria-controls'));
      if (menu) menu.hidden = true;
    });
    if (cartBackdrop) {
      cartBackdrop.style.opacity = '0';
      cartBackdrop.style.visibility = 'hidden';
    }
    if (mobileBackdrop) {
      mobileBackdrop.style.opacity = '0';
      mobileBackdrop.style.visibility = 'hidden';
    }
    
    // Remove body class that prevents horizontal scroll
    document.body.classList.remove('has-drawer-open');
  }

  function matchRoute(path) {
    // First try exact and parameterized routes
    for (const [pattern, handler] of routeRegistry) {
      if (pattern === '*') continue; // Skip catch-all for now
      const regex = patternToRegex(pattern);
      const match = path.match(regex);
      if (match) {
        const params = {};
        const paramNames = getParamNames(pattern);
        paramNames.forEach((name, i) => {
          params[name] = match[i + 1];
        });
        return { handler, params };
      }
    }
    // Then try catch-all
    if (routeRegistry.has('*')) {
      return { handler: routeRegistry.get('*'), params: {} };
    }
    return null;
  }

  function patternToRegex(pattern) {
    const escaped = pattern
      .replace(/[.+?^${}()|[\\]\\]/g, '\\$&')
      .replace(/:(\w+)/g, '([^/]+)');
    return new RegExp(`^${escaped}$`);
  }

  function getParamNames(pattern) {
    const names = [];
    pattern.replace(/:(\w+)/g, (_, name) => names.push(name));
    return names;
  }

  function route(pattern, renderFn) {
    routeRegistry.set(pattern, renderFn);
  }

  function initRouter() {
    if (routerInitialized) return;
    routerInitialized = true;

    function handleHashChange() {
      closeAllDrawers();
      const path = getHashPath();
      const match = matchRoute(path);
      if (match) {
        match.handler(match.params);
      } else {
        // No route matched - trigger 404
        window.dispatchEvent(new CustomEvent('dryv:routeNotFound', { detail: { path } }));
      }
      // Set announcement bar text on every route change
      if (window.LBN_I18N) {
        const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
        const text = window.LBN_I18N[lang]?.freeDelivery || window.LBN_I18N.en?.freeDelivery;
        if (text) setAnnouncementText(text);
      }
    }

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('load', handleHashChange);
  }

  // Expose router API
  const DRYV_ROUTER = {
    route,
    initRouter,
    getHashPath,
    navigate
  };

  // ============================================
  // Animation Frame Scheduler
  // ============================================
  function scheduleFrame(callback) {
    return requestAnimationFrame(callback);
  }

  function cancelFrame(id) {
    cancelAnimationFrame(id);
  }

  // ============================================
  // Announcement Bar Helper
  // ============================================
  function setAnnouncementText(text) {
    const announcementText = document.getElementById('announcementText');
    const announcementBar = document.getElementById('announcementBar');
    if (announcementText && text) {
      announcementText.textContent = text;
    }
    if (announcementBar) {
      let dismissed = false;
      try { dismissed = sessionStorage.getItem('dryv-ann-dismissed') === '1'; } catch (e) {}
      announcementBar.hidden = !text || dismissed;
    }
  }
  // Close button on the delivery bar: hides it for the rest of the visit.
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#announcementDismiss')) return;
    const bar = document.getElementById('announcementBar');
    if (bar) bar.hidden = true;
    try { sessionStorage.setItem('dryv-ann-dismissed', '1'); } catch (err) {}
  });

  // ============================================
  // Intersection Observer Helper
  // ============================================
  function observeIntersection(selector, callback, options = {}) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback(entry.target, entry);
        }
      });
    }, { rootMargin: '100px', threshold: 0.1, ...options });

    $$(selector).forEach((el) => observer.observe(el));
    return observer;
  }

  // ============================================
  // Toast / Notification System
  // ============================================
  function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;
    container.appendChild(toast);

    // Force reflow for animation
    toast.offsetHeight;
    toast.classList.add('toast-visible');

    setTimeout(() => {
      toast.classList.remove('toast-visible');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duration);
  }

  // ============================================
  // Expose Core API
  // ============================================
  const DRYV_CORE = {
    // DOM
    domReady,
    $,
    $$,
    delegate,
    // ARIA
    toggleAriaExpanded,
    setAriaExpanded,
    // Visibility
    show,
    hide,
    toggleHidden,
    // Classes
    addClass,
    removeClass,
    toggleClass,
    hasClass,
    // Data
    getData,
    setData,
    // Formatting
    formatEGP,
    formatNumber,
    // Timing
    debounce,
    throttle,
    // Network
    fetchJSON,
    // Storage
    storage,
    cookies,
    // Routing
    getHashPath,
    navigate,
    route: DRYV_ROUTER.route,
    initRouter: DRYV_ROUTER.initRouter,
    // Animation
    scheduleFrame,
    cancelFrame,
    // Intersection
    observeIntersection,
    // UI
    showToast,
    // Announcement
    setAnnouncementText
  };

  // Export for modules and global
  if (typeof module !== 'undefined') {
    module.exports = DRYV_CORE;
  }
  window.DRYV_CORE = DRYV_CORE;

  // Initialize router on load
  DRYV_CORE.initRouter();

  // Global drawer handlers (mobile menu, search, dropdowns)
  function initGlobalDrawers() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileDrawer = document.getElementById('mobileDrawer');
    const mobileDrawerClose = document.getElementById('mobileDrawerClose');
    const mobileDrawerBackdrop = document.getElementById('mobileDrawerBackdrop');
    const searchBtn = document.getElementById('searchBtn');
    const searchDrawer = document.getElementById('searchDrawer');
    const searchClose = document.getElementById('searchClose');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const mobileSearchInput = document.getElementById('mobileSearchInput');
    const mobileSearchResults = document.getElementById('mobileSearchResults');
    const cartDrawer = document.getElementById('cartDrawer');
    const accountBtn = document.getElementById('accountBtn');
    const nav = document.getElementById('headerNav');

    // Dropdown buttons - query fresh each time in case of late rendering
    function getDropdownButtons() {
      return ['shopBtn', 'collectionsBtn']
        .map(id => document.getElementById(id))
        .filter(Boolean);
    }

    const closeDropdowns = (except = null) => {
      getDropdownButtons().forEach(button => {
        if (button === except) return;
        button.setAttribute('aria-expanded', 'false');
        const menuId = button.getAttribute('aria-controls');
        if (menuId) {
          const menu = document.getElementById(menuId);
          if (menu) menu.hidden = true;
        }
      });
    };

    // Use event delegation for dropdown buttons (works even if rendered late)
    if (nav) {
      nav.addEventListener('click', event => {
        const button = event.target.closest('.nav-item.has-dropdown');
        if (!button) return;
        const menuId = button.getAttribute('aria-controls');
        const menu = menuId ? document.getElementById(menuId) : null;
        if (!menu) return;
        const open = button.getAttribute('aria-expanded') !== 'true';
        closeDropdowns(button);
        if (searchDrawer) searchDrawer.hidden = true;
        if (searchBtn) searchBtn.setAttribute('aria-expanded', 'false');
        menu.hidden = !open;
        button.setAttribute('aria-expanded', String(open));
      });
    }

    // Close dropdowns when clicking outside nav
    document.addEventListener('click', event => {
      if (nav && !nav.contains(event.target)) closeDropdowns();
    });

    const renderSearchResults = async (query, target = searchResults) => {
      if (!target) return;
      target.replaceChildren();
      const term = query.trim().toLocaleLowerCase();
      if (!term) return;
      try {
        productsPromise ||= fetchJSON('catalog.json?v=20261102b').then(data => data.products || []);
        const products = await productsPromise;
        const matches = products.filter(product => {
          const name = typeof product.name === 'string' ? product.name : product.name?.en;
          return [name, product.type, product.description?.en]
            .filter(Boolean).some(value => value.toLocaleLowerCase().includes(term));
        });
        if (!matches.length) {
          const empty = document.createElement('p');
          empty.className = 'search-empty';
          empty.textContent = 'No products found. Try “tank” or “compression”.';
          target.append(empty);
          return;
        }
        matches.forEach(product => {
          const variant = product.variants?.find(item => item.stock > 0) || product.variants?.[0];
          const link = document.createElement('a');
          link.className = 'search-result';
          link.href = `#/products/${encodeURIComponent(product.handle)}`;
          link.setAttribute('role', 'option');
          const image = document.createElement('img');
          image.src = variant?.image || '';
          image.alt = '';
          image.loading = 'lazy';
          const title = document.createElement('span');
          title.textContent = typeof product.name === 'string' ? product.name : (product.name?.en || 'DRYV product');
          link.append(image, title);
          link.addEventListener('click', () => {
            if (searchDrawer) searchDrawer.hidden = true;
            if (searchBtn) searchBtn.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('has-drawer-open');
          });
          target.append(link);
        });
      } catch (error) {
        const message = document.createElement('p');
        message.className = 'search-empty';
        message.textContent = 'Search is temporarily unavailable. Browse all products instead.';
        const browse = document.createElement('a');
        browse.href = '#/collections/all';
        browse.textContent = 'Browse all products';
        target.append(message, browse);
      }
    };

    if (mobileMenuBtn && mobileDrawer) {
      mobileMenuBtn.addEventListener('click', () => {
        const isOpen = mobileDrawer.hidden === false;
        if (searchDrawer) searchDrawer.hidden = true;
        if (searchBtn) searchBtn.setAttribute('aria-expanded', 'false');
        mobileDrawer.hidden = isOpen;
        mobileMenuBtn.setAttribute('aria-expanded', !isOpen);
        if (!isOpen) document.body.classList.add('has-drawer-open');
        else document.body.classList.remove('has-drawer-open');
      });
    }
    if (mobileDrawerClose && mobileDrawer) {
      mobileDrawerClose.addEventListener('click', () => {
        mobileDrawer.hidden = true;
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('has-drawer-open');
      });
    }
    if (mobileDrawerBackdrop && mobileDrawer) {
      mobileDrawerBackdrop.addEventListener('click', () => {
        mobileDrawer.hidden = true;
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('has-drawer-open');
      });
    }

    if (searchBtn && searchDrawer) {
      searchBtn.addEventListener('click', () => {
        const isOpen = searchDrawer.hidden === false;
        closeDropdowns();
        if (mobileDrawer) mobileDrawer.hidden = true;
        if (cartDrawer) cartDrawer.hidden = true;
        searchDrawer.hidden = isOpen;
        searchBtn.setAttribute('aria-expanded', !isOpen);
        if (!isOpen) document.body.classList.add('has-drawer-open');
        else document.body.classList.remove('has-drawer-open');
        if (!isOpen) searchInput?.focus();
      });
    }
    if (searchClose && searchDrawer) {
      searchClose.addEventListener('click', () => {
        searchDrawer.hidden = true;
        searchBtn.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('has-drawer-open');
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => renderSearchResults(searchInput.value));
      searchInput.addEventListener('keydown', event => {
        if (event.key === 'Enter' && searchInput.value.trim()) {
          const firstResult = searchResults?.querySelector('a[href]');
          if (firstResult) firstResult.click();
          else navigate('#/collections/all');
        }
      });
    }
    if (mobileSearchInput) {
      mobileSearchInput.addEventListener('input', () => renderSearchResults(mobileSearchInput.value, mobileSearchResults));
      mobileSearchInput.addEventListener('keydown', event => {
        if (event.key === 'Enter' && mobileSearchInput.value.trim()) {
          const firstResult = mobileSearchResults?.querySelector('a[href]');
          if (firstResult) firstResult.click();
          else navigate('#/collections/all');
          if (mobileDrawer) mobileDrawer.hidden = true;
          document.body.classList.remove('has-drawer-open');
        }
      });
    }

    if (accountBtn) {
      accountBtn.addEventListener('click', () => {
        closeDropdowns();
        navigate('#/pages/account');
      });
    }

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeDropdowns();
        if (searchDrawer) searchDrawer.hidden = true;
        if (searchBtn) searchBtn.setAttribute('aria-expanded', 'false');
        if (mobileDrawer) mobileDrawer.hidden = true;
        if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'false');
        if (cartDrawer) cartDrawer.hidden = true;
        const cartBtn = document.getElementById('cartBtn');
        if (cartBtn) cartBtn.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('has-drawer-open');
      }
    });
  }

  if (document.readyState !== 'loading') {
    initGlobalDrawers();
  } else {
    document.addEventListener('DOMContentLoaded', initGlobalDrawers, { once: true });
  }
})();

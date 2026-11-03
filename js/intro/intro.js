// intro.js — DRYV Cinematic Fabric Intro
// Stage 1: Zoomed-in fabric macro view (0-2.5s) — luxury lighting, visible weave, folds
// Stage 2: DRYV logo emerges with thunder/earth crack effects (2.5-3s)
// No loop, no replay, single play-through

class DRYVFabricIntro {
  constructor() {
    this.gateEl = null;
    this.videoEl = null;
    this.logoEl = null;
    this.sloganEl = null;
    this.crackCanvas = null;
    this.crackCtx = null;
    this.cracks = [];
    this.isLoaded = false;
    this.hasEntered = false;
    this.rafId = null;
    this.startTime = 0;
    this.phase = 0; // 0 = fabric zoom, 1 = logo reveal with cracks, 2 = done

    // Config
    this.config = window.DRYV_CONFIG || { intro: { enabled: true } };
    this.i18n = window.LBN_I18N?.en || {};
    this.lang = document.documentElement.lang || 'en';

    // Session flag
    this.seenKey = 'dryv_intro_seen';
    this.forceIntro = new URLSearchParams(window.location.search).has('intro');

    // Fallback checks
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.deviceMemory = navigator.deviceMemory || 4;

    // Video paths - landscape on desktop, portrait on mobile.
    // The entrance is now the Blender plate: real geometry, real light, the wordmark cannot morph.
    // The old fabric clips (dryv-fabric-*) are kept on disk untouched, they are just no longer referenced.
    this.isMobile = window.innerWidth < 768;
    this.videoSrc = this.isMobile
      ? 'assets/img/dryv-gate-portrait.mp4?v=26'
      : 'assets/img/dryv-gate-landscape.mp4?v=26';
    this.videoWebMSrc = this.isMobile
      ? 'assets/img/dryv-gate-portrait.webm?v=26'
      : 'assets/img/dryv-gate-landscape.webm?v=26';

    // FILM MODE: the entrance is now a rendered film (fabric -> shatter -> DRYV). It carries its own
    // zoom, its own crack and its own wordmark, so the JS stages that used to fake those would double
    // every effect and crop the composed frame. In film mode the gate just plays it and hands over.
    this.FILM_MODE = true;
    const _canvas = document.getElementById('dryvCrackCanvas');
    if (_canvas) _canvas.style.display = 'none';
    const _brand = document.getElementById('dryvBrandReveal');
    if (_brand) { _brand.style.display = 'none'; }

    // Timing (in ms) — TOTAL 3000ms
    this.FABRIC_ZOOM_DURATION = 2500;    // Stage 1: zoomed fabric admiration (2.5s)
    this.LOGO_REVEAL_DURATION = 500;     // Stage 2: logo + cracks (0.5s)
    // Safety net only. The gate used to hard-cut at 3s while the film runs 5s,
    // so the wordmark reveal (3.7-4.2s) never reached the visitor. The video's
    // own 'ended' event now hands off; this is just the backstop.
    this.TOTAL_DURATION = 6000; // film 5.0 s plus a margin, counted from the click
  }

  shouldShowIntro() {
    if (!this.config.intro?.enabled) return false;
    if (this.forceIntro) return true;
    if (this.reducedMotion) return false;
    try {
      return !sessionStorage.getItem(this.seenKey);
    } catch (e) {
      return true;
    }
  }

  markSeen() {
    try {
      sessionStorage.setItem(this.seenKey, '1');
    } catch (e) {}
  }

  async init() {
    if (!this.shouldShowIntro()) {
      this.cleanup();
      return;
    }

    this.startTime = performance.now();

    // Create gate HTML immediately
    this.createGateHTML();

    // Preload video
    await this.preloadVideo();

    // Start the experience
    this.startExperience();
  }

  createGateHTML() {
    this.gateEl = document.createElement('div');
    this.gateEl.id = 'dryv-intro-gate';
    this.gateEl.setAttribute('role', 'dialog');
    this.gateEl.setAttribute('aria-modal', 'true');
    this.gateEl.setAttribute('aria-label', 'DRYV intro');
    this.gateEl.innerHTML = `
      <div class="dryv-gate-bg" aria-hidden="true">
        <img class="dryv-gate-poster" src="assets/img/dryv-gate-poster.jpg?v=26" alt="" decoding="async" fetchpriority="high">
        <video class="dryv-gate-video" id="dryvGateVideo" muted playsinline preload="auto" aria-hidden="true">
          <source src="${this.videoWebMSrc}" type="video/webm">
          <source src="${this.videoSrc}" type="video/mp4">
        </video>
        <canvas class="dryv-crack-canvas" id="dryvCrackCanvas" aria-hidden="true"></canvas>
        <div class="dryv-grain" aria-hidden="true"></div>
        <div class="dryv-vignette" aria-hidden="true"></div>
      </div>
      <button type="button" class="dryv-skip" id="dryvSkip" aria-label="Skip intro">Skip</button>
      <div class="dryv-tagline" id="dryvTagline" aria-hidden="true">
        <span class="dryv-tag-main">BUILT TO MOVE</span>
        <span class="dryv-tag-sub">STRENGTH IN MOTION</span>
      </div>
      <button type="button" class="dryv-enter" id="dryvEnter" aria-label="Enter DRYV with sound">
        <span class="dryv-enter-ring" aria-hidden="true"></span>
        <span class="dryv-enter-label">ENTER</span>
        <span class="dryv-enter-note">Sound on</span>
      </button>
      <div class="dryv-gate-content">
        <div class="dryv-brand-reveal" id="dryvBrandReveal" aria-hidden="true">
          <h1 class="dryv-brand" id="dryvBrand">DRYV</h1>
          <p class="dryv-slogan" id="dryvSlogan">${this.i18n.introSlogan || 'STRENGTH IN MOTION.'}</p>
        </div>
      </div>
    `;
    document.body.appendChild(this.gateEl);

    // Cache elements
    this.videoEl = document.getElementById('dryvGateVideo');
    this.logoEl = document.getElementById('dryvBrand');
    this.sloganEl = document.getElementById('dryvSlogan');
    this.brandRevealEl = document.getElementById('dryvBrandReveal');
    this.crackCanvas = document.getElementById('dryvCrackCanvas');
    this.crackCtx = this.crackCanvas?.getContext('2d');

    // Lock scroll during intro
    document.body.style.overflow = 'hidden';

    // Skip on click/tap/key. Listeners go on the DOCUMENT: the gate div is not focusable,
    // so a keydown listener attached to it never fires (keyboard users could not escape).
    const skipBtn = document.getElementById('dryvSkip');
    const doSkip = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } this.skip(); };
    // Director's cut: the veiled logo waits. One click anywhere starts the film WITH sound,
    // because browsers only allow audio after a real gesture. Esc always gets out.
    this.gateEl.addEventListener('click', (e) => {
      if (e.target.closest && e.target.closest('#dryvSkip')) return;
      this.begin();
    });
    document.addEventListener('keydown', this._onKey = (e) => {
      if (e.key === 'Escape') doSkip(e);
      else if ((e.key === 'Enter' || e.key === ' ') && !this.started) { e.preventDefault(); this.begin(); }
    });
    if (skipBtn) {
      skipBtn.addEventListener('click', doSkip);
      // Reveal the control after 1.2 s — visible, but it does not compete with the brand moment.
      setTimeout(() => { skipBtn.classList.add('is-ready'); }, 1200);
    }

    // If the video errors or never arrives, drop straight to the site instead of showing a black box.
    this.videoEl.addEventListener('error', () => this.skip(), { once: true });
    this.videoEl.addEventListener('ended', () => this.transitionToSite(), { once: true });

    // Resize canvas
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (!this.crackCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.crackCanvas.width = window.innerWidth * dpr;
    this.crackCanvas.height = window.innerHeight * dpr;
    this.crackCanvas.style.width = '100%';
    this.crackCanvas.style.height = '100%';
    if (this.crackCtx) {
      this.crackCtx.scale(dpr, dpr);
    }
  }

  preloadVideo() {
    return new Promise((resolve) => {
      if (!this.videoEl) { resolve(); return; }

      const checkReady = () => {
        if (this.videoEl.readyState >= 3) { // HAVE_FUTURE_DATA
          resolve();
        } else {
          setTimeout(checkReady, 50);
        }
      };

      this.videoEl.addEventListener('canplaythrough', () => resolve(), { once: true });
      this.videoEl.addEventListener('error', () => resolve(), { once: true });
      this.videoEl.load();
      checkReady();

      // Timeout after 1.5s — long enough for a cached asset, short enough that a slow
      // network never becomes a black screen (the hard reveal timer is the real guarantee).
      setTimeout(resolve, 1500);
    });
  }

  startExperience() {
    // The gate now waits on the veiled poster for the visitor's click (see begin()).
    this.gateEl?.classList.add('is-waiting');
  }

  begin() {
    if (this.started || this.hasEntered) return;
    this.started = true;
    this.startTime = performance.now();
    this.gateEl.classList.remove('is-waiting');
    this.gateEl.classList.add('is-playing');

    // HARD REVEAL: independent of rAF, video events and animation state. Nothing can hold the page hostage.
    this._hardTimer = setTimeout(() => this.transitionToSite(), this.TOTAL_DURATION);

    if (this.videoEl) {
      this.videoEl.loop = false;
      this.videoEl.currentTime = 0;
      this.videoEl.muted = false;
      this.videoEl.volume = 1;
      // If sound is refused for any reason, the film still plays silently rather than stalling.
      this.videoEl.play().catch(() => {
        this.videoEl.muted = true;
        this.videoEl.play().catch(() => this.transitionToSite());
      });
    }
    this.animatePhases();
  }

  initCracks() {
    // Pre-generate crack paths for the logo reveal
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const numCracks = 12; // 12 primary cracks radiating from center

    this.cracks = [];
    for (let i = 0; i < numCracks; i++) {
      const angle = (i / numCracks) * Math.PI * 2;
      const length = Math.max(window.innerWidth, window.innerHeight) * 0.8;
      const segments = 8 + Math.floor(Math.random() * 6); // 8-13 segments per crack
      const points = [];
      let x = centerX;
      let y = centerY;

      for (let s = 0; s <= segments; s++) {
        const progress = s / segments;
        const segmentLength = length / segments;
        // Add jaggedness
        const jitterAngle = angle + (Math.random() - 0.5) * 0.5;
        const jitterLength = segmentLength * (0.7 + Math.random() * 0.6);
        x += Math.cos(jitterAngle) * jitterLength;
        y += Math.sin(jitterAngle) * jitterLength;
        points.push({ x, y, delay: progress * 0.3 + Math.random() * 0.1 }); // staggered start
      }
      this.cracks.push({ points, angle, progress: 0, opacity: 0 });
    }

    // Secondary micro-cracks
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const startRadius = 50 + Math.random() * 150;
      const length = 80 + Math.random() * 120;
      const segments = 3 + Math.floor(Math.random() * 3);
      const points = [];
      let x = centerX + Math.cos(angle) * startRadius;
      let y = centerY + Math.sin(angle) * startRadius;

      for (let s = 0; s <= segments; s++) {
        const progress = s / segments;
        const jitterAngle = angle + (Math.random() - 0.5) * 0.8;
        const jitterLength = (length / segments) * (0.5 + Math.random());
        x += Math.cos(jitterAngle) * jitterLength;
        y += Math.sin(jitterAngle) * jitterLength;
        points.push({ x, y, delay: progress * 0.2 + Math.random() * 0.15 });
      }
      this.cracks.push({ points, angle, progress: 0, opacity: 0, micro: true });
    }
  }

  animatePhases() {
    const now = performance.now();
    const elapsed = now - this.startTime;

    // Hard cap at 3 seconds
    if (elapsed >= this.TOTAL_DURATION) {
      this.transitionToSite();
      return;
    }

    if (this.FILM_MODE) {
      // nothing to choreograph: the footage already is the animation
      this.rafId = requestAnimationFrame(() => this.animatePhases());
      return;
    }

    // Phase 0: Fabric zoom (0 to 2500ms)
    if (elapsed < this.FABRIC_ZOOM_DURATION) {
      this.phase = 0;
      const zoomProgress = elapsed / this.FABRIC_ZOOM_DURATION;
      // Ease out cubic for zoom
      const easedZoom = 1 - Math.pow(1 - zoomProgress, 3);
      // Scale from 1.4x down to 1.0x (zoom in effect)
      const scale = 1.4 - easedZoom * 0.4;
      if (this.videoEl) {
        this.videoEl.style.transform = `translate(-50%, -50%) scale(${scale})`;
      }
      this.rafId = requestAnimationFrame(() => this.animatePhases());
      return;
    }

    // Phase 1: Logo reveal with cracks (2500ms to 3000ms)
    if (this.phase === 0) {
      this.phase = 1;
      this.triggerLogoReveal();
    }

    if (this.phase === 1) {
      const logoElapsed = elapsed - this.FABRIC_ZOOM_DURATION;
      const logoProgress = Math.min(1, logoElapsed / this.LOGO_REVEAL_DURATION);

      // Animate cracks
      this.animateCracks(logoProgress);

      // Logo and slogan fade in
      const eased = logoProgress < 0.5 ? 4 * logoProgress * logoProgress * logoProgress : 1 - Math.pow(-2 * logoProgress + 2, 3) / 2;
      if (this.brandRevealEl) this.brandRevealEl.style.opacity = eased;
      if (this.logoEl) this.logoEl.style.transform = `translateY(${20 * (1 - eased)}px)`;
      if (this.sloganEl) {
        this.sloganEl.style.opacity = eased * 0.8; // Slightly delayed
        this.sloganEl.style.transform = `translateY(${16 * (1 - eased)}px)`;
      }

      this.rafId = requestAnimationFrame(() => this.animatePhases());
      return;
    }

    // Should not reach here due to hard cap, but safety
    this.transitionToSite();
  }

  triggerLogoReveal() {
    if (this.brandRevealEl) {
      this.brandRevealEl.hidden = false;
      this.brandRevealEl.style.opacity = 0;
    }
    if (this.logoEl) {
      this.logoEl.style.opacity = 1;
      this.logoEl.style.transform = 'translateY(20px)';
      this.logoEl.style.transition = `transform ${this.LOGO_REVEAL_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
    }
    if (this.sloganEl) {
      this.sloganEl.style.opacity = 0;
      this.sloganEl.style.transform = 'translateY(16px)';
      this.sloganEl.style.transition = `opacity ${this.LOGO_REVEAL_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform ${this.LOGO_REVEAL_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
    }

    // Add screen shake effect
    this.addScreenShake();
  }

  animateCracks(progress) {
    if (!this.crackCtx || !this.crackCanvas) return;

    const ctx = this.crackCtx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Draw cracks
    this.cracks.forEach(crack => {
      crack.progress = Math.min(1, progress / (crack.micro ? 0.6 : 1.0));
      crack.opacity = crack.progress;

      if (crack.progress <= 0) return;

      ctx.beginPath();
      const points = crack.points;
      if (points.length < 2) return;

      ctx.moveTo(points[0].x, points[0].y);

      // Draw up to current progress
      const maxIndex = Math.floor((points.length - 1) * crack.progress);
      for (let i = 1; i <= maxIndex; i++) {
        const p = points[i];
        // Add slight curve for organic feel
        const prev = points[i - 1];
        const cpX = (prev.x + p.x) / 2 + (Math.random() - 0.5) * 10;
        const cpY = (prev.y + p.y) / 2 + (Math.random() - 0.5) * 10;
        ctx.quadraticCurveTo(cpX, cpY, p.x, p.y);
      }

      // Style
      const isMicro = crack.micro;
      ctx.strokeStyle = isMicro
        ? `rgba(255, 255, 255, ${0.6 * crack.opacity})`
        : `rgba(255, 255, 255, ${0.9 * crack.opacity})`;
      ctx.lineWidth = isMicro ? 1.5 : 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowBlur = isMicro ? 4 : 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Continue animation if not done
    if (progress < 1) {
      requestAnimationFrame(() => this.animateCracks(progress + 0.016));
    }
  }

  addScreenShake() {
    if (!this.gateEl) return;
    const shakeIntensity = 8;
    let shakeTime = 0;
    const shakeDuration = 300;

    const shake = () => {
      shakeTime += 16;
      if (shakeTime >= shakeDuration) {
        this.gateEl.style.transform = '';
        return;
      }
      const progress = shakeTime / shakeDuration;
      const intensity = shakeIntensity * (1 - progress);
      const x = (Math.random() - 0.5) * intensity;
      const y = (Math.random() - 0.5) * intensity;
      this.gateEl.style.transform = `translate(${x}px, ${y}px)`;
      requestAnimationFrame(shake);
    };
    shake();
  }

  transitionToSite() {
    if (this.hasEntered) return;   // 'ended' and the backstop timer can both fire
    this.hasEntered = true;
    this.markSeen();
    if (this._hardTimer) { clearTimeout(this._hardTimer); this._hardTimer = null; }

    const gate = this.gateEl;
    if (this._onKey) { document.removeEventListener('keydown', this._onKey); this._onKey = null; }
    const site = document.getElementById('mainContent');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const done = () => {
      if (site) { site.style.transition = ''; site.style.transform = ''; site.style.filter = ''; site.style.transformOrigin = ''; }
      document.documentElement.classList.remove('dryv-pulling');
      this.cleanupGate();
      document.body.style.overflow = '';
    };
    if (!gate || reduce) {                       // plain cross-fade for reduced motion
      if (gate) { gate.style.transition = 'opacity 500ms ease'; gate.style.opacity = '0'; }
      setTimeout(done, 520);
      return;
    }

    // Dust transition: the film ends in the dust roll from the impact. That dust thickens over the
    // frame, then clears to reveal the site settling from a slight push-in, as if it was behind it.
    document.documentElement.classList.add('dryv-pulling');
    if (site) {
      site.style.transformOrigin = '50% 45vh';
      site.style.transform = 'scale(1.06)';
      site.style.filter = 'brightness(0.6)';
    }
    gate.classList.add('is-dust');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      gate.classList.add('is-clearing');
      if (site) {
        site.style.transition = 'transform 1300ms cubic-bezier(0.2, 0.7, 0.1, 1), filter 1100ms ease-out';
        site.style.transform = 'scale(1)';
        site.style.filter = 'brightness(1)';
      }
    }));
    setTimeout(done, 1400);
  }

  skip() {
    if (this.hasEntered) return;
    this.hasEntered = true;
    if (this._hardTimer) { clearTimeout(this._hardTimer); this._hardTimer = null; }
    if (this._onKey) { document.removeEventListener('keydown', this._onKey); this._onKey = null; }
    this.markSeen();
    this.cleanupGate();
    document.body.style.overflow = '';
    const hero = document.querySelector('.hero, #hero, main');
    if (hero) hero.scrollIntoView({ behavior: 'instant' });
  }

  cleanupGate() {
    if (this.gateEl) {
      this.gateEl.remove();
      this.gateEl = null;
    }
  }

  cleanup() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.src = '';
      this.videoEl.load();
      this.videoEl = null;
    }
    this.isLoaded = false;
  }

  // Static method for footer "Replay intro" link
  static addReplayLink() {
    const footer = document.querySelector('.footer-bottom, footer');
    if (!footer) return;

    const link = document.createElement('a');
    link.href = '?intro=1';
    link.className = 'dryv-replay-intro';
    link.textContent = window.LBN_I18N?.en?.introReplay || 'Replay intro';
    link.style.cssText = 'display:inline-block;margin-top:16px;color:var(--color-fog);text-decoration:underline;font-size:14px;';
    footer.appendChild(link);
  }
}

// Auto-init at DOM-ready (31 Oct 2026, Brief Amd v1.1). Waiting for `load` meant the gate
// appeared 3+ s in — after the video and every image — so the visitor saw an empty page, then
// a splash, then waited again. If DOM-ready is already later than 1.2 s, skip the ceremony:
// content beats theatre.
if (typeof window !== 'undefined') {
  const LATE_MS = 1200;
  const initIntro = () => {
    const isHome = document.querySelector('.hero, #hero, [data-page="home"]') || window.location.pathname === '/' || window.location.hash === '' || window.location.hash === '#/';
    if (!isHome) return;
    if (performance.now() > LATE_MS && !/[?&]intro=1/.test(location.search)) {
      try { sessionStorage.setItem('dryv_intro_seen', '1'); } catch (e) {}
      return;
    }

    const intro = new DRYVFabricIntro();
    intro.init();
    window.DRYVIntro = intro;
  };

  const boot = () => {
    if (window.DRYVIntro) return;
    const late = performance.now() > LATE_MS && !/[?&]intro=1/.test(location.search);
    if (late) {
      try { sessionStorage.setItem('dryv_intro_seen', '1'); } catch (e) {}
      return;
    }
    try {
      const intro = new DRYVFabricIntro();
      intro.init();
      window.DRYVIntro = intro;
    } catch (e) {
      // never let the entrance break the page
      document.body.style.overflow = '';
      try { sessionStorage.setItem('dryv_intro_seen', '1'); } catch (e2) {}
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
  // Belt and braces: rAF and load events can both be throttled on a background tab or a
  // prerendered page. If nothing has started shortly after execution, run once.
  setTimeout(boot, 2500);

  // Replay link in footer
  document.addEventListener('DOMContentLoaded', () => {
    DRYVFabricIntro.addReplayLink();
  });
}

if (typeof module !== 'undefined') module.exports = { DRYVFabricIntro };
window.DRYVFabricIntro = DRYVFabricIntro;
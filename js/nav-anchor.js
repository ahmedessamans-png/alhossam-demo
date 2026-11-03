/* Nav dropdowns were anchored to the header, so every menu opened at the left edge of the nav instead of
   under the button you pressed. This positions each panel against its own trigger on open, and keeps it
   inside the viewport on narrow screens. */
(function () {
  function place(btn) {
    const panel = btn.nextElementSibling;
    if (!panel || !panel.classList.contains('dropdown')) return;
    const nav = btn.closest('.header-nav') || btn.parentElement;
    if (!nav) return;
    const navBox = nav.getBoundingClientRect();
    const btnBox = btn.getBoundingClientRect();
    const panelWidth = panel.offsetWidth || 200;
    let left = btnBox.left - navBox.left;
    // keep the panel on screen: pull it back if it would run past the right edge
    const overflowRight = btnBox.left + panelWidth - (window.innerWidth - 16);
    if (overflowRight > 0) left -= overflowRight;
    panel.style.left = Math.max(8, left) + 'px';
    panel.style.right = 'auto';
  }

  // close every other open panel — opening one must never leave another open
  function closeAll(except) {
    document.querySelectorAll('.nav-item.has-dropdown').forEach((other) => {
      if (other === except) return;
      const panel = other.nextElementSibling;
      if (!panel || !panel.classList.contains('dropdown')) return;
      other.setAttribute('aria-expanded', 'false');
      panel.hidden = true;
    });
  }

  function bind() {
    document.querySelectorAll('.nav-item.has-dropdown').forEach((btn) => {
      const panel = btn.nextElementSibling;
      if (!panel || !panel.classList.contains('dropdown')) return;
      const open = () => {
        closeAll(btn);
        place(btn);
        btn.setAttribute('aria-expanded', 'true');
        panel.hidden = false;
        requestAnimationFrame(() => place(btn));
      };
      const close = () => {
        btn.setAttribute('aria-expanded', 'false');
        panel.hidden = true;
      };
      const toggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (btn.getAttribute('aria-expanded') === 'true') close(); else open();
      };

      btn.addEventListener('click', toggle);
      btn.addEventListener('mouseenter', () => { if (window.matchMedia('(hover:hover)').matches) open(); });
      btn.parentElement.addEventListener('mouseleave', () => {
        if (window.matchMedia('(hover:hover)').matches) close();
      });
      btn.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
      panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); btn.focus(); } });
      window.addEventListener('resize', () => { if (!panel.hidden) place(btn); });
    });

    document.addEventListener('click', (e) => {
      if (e.target.closest('.nav-item.has-dropdown') || e.target.closest('.dropdown')) return;
      document.querySelectorAll('.nav-item.has-dropdown[aria-expanded="true"]').forEach((b) => {
        b.setAttribute('aria-expanded', 'false');
        if (b.nextElementSibling) b.nextElementSibling.hidden = true;
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

(() => {
  function mount(root, shell) {
    const candidates = 'aside,nav[aria-label],[role="navigation"],mat-sidenav,side-navigation,side-navigation-v2,[data-testid="sidebar"],[data-test-id="side-nav"],[aria-label="Side navigation"],[aria-label="Sidebar"],[aria-label="侧边导航栏"]';
    let frame = 0;
    const sizes = new ResizeObserver(schedule);
    const observed = new Set();
    function sidebarEdge() {
      let edge = 0;
      document.querySelectorAll(candidates).forEach(element => {
        if (!observed.has(element)) { sizes.observe(element); observed.add(element); }
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0 ||
            element.closest('[hidden],[aria-hidden="true"], [inert]')) return;
        if (rect.left > 8 || rect.right <= 0 || rect.top > innerHeight * .3 || rect.bottom < innerHeight * .65 ||
            rect.width >= innerWidth * .95) return;
        edge = Math.max(edge, rect.right);
      });
      // Some sites build the sidebar from hashed classes. Their conversation
      // column starts where the sidebar ends, which is enough to stay clear of it.
      const anchor = globalThis.ConversationMinimapProfiles?.sidebarAnchor;
      const column = anchor ? document.querySelector(anchor)?.getBoundingClientRect() : null;
      if (column && column.left > 8 && column.left < innerWidth * .45) edge = Math.max(edge, column.left);
      return edge;
    }
    function update() {
      frame = 0;
      const left = shell.dataset.side === 'left';
      for (const element of observed) {
        if (!left || !element.isConnected) { sizes.unobserve(element); observed.delete(element); }
      }
      const edge = left ? sidebarEdge() : 0;
      const obstructed = left && edge > 0 && innerWidth - edge < 260;
      shell.dataset.obstructed = String(obstructed);
      shell.style.setProperty('--left-offset', `${Math.ceil(edge) + 14}px`);
      shell.style.setProperty('--panel-width', `${Math.max(180, Math.min(340, innerWidth - edge - 64))}px`);
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(update); }
    new MutationObserver(schedule).observe(document.body, { subtree: true, childList: true,
      attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'aria-expanded', 'inert'] });
    addEventListener('resize', schedule, { passive: true });
    document.addEventListener('transitionend', schedule, true);
    document.addEventListener('conversation-minimap-layout', schedule);
    update();
  }
  globalThis.ConversationMinimapLayout = { mount };
})();

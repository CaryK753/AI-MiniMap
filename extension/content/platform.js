(() => {
  function immediate(container, action) {
    const value = container.style.getPropertyValue('scroll-behavior');
    const priority = container.style.getPropertyPriority('scroll-behavior');
    container.style.setProperty('scroll-behavior', 'auto', 'important');
    try { action(); }
    finally {
      if (value) container.style.setProperty('scroll-behavior', value, priority);
      else container.style.removeProperty('scroll-behavior');
    }
  }
  function scrollTop(container, top) {
    immediate(container, () => { container.scrollTop = top; });
  }
  function reveal(element, smooth = true, block = 'start') {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (smooth && !reduce) { element.scrollIntoView({ behavior: 'smooth', block }); return; }
    const container = globalThis.ConversationMinimapAdapter.scroller(element);
    immediate(container, () => element.scrollIntoView({ behavior: 'auto', block }));
  }
  globalThis.ConversationMinimapPlatform = { scrollTop, reveal };
})();

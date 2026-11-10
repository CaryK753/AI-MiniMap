(() => {
  const t = globalThis.ConversationMinimapI18n.t;
  const adapter = globalThis.ConversationMinimapAdapter;
  const store = globalThis.ConversationMinimapStore;
  let controller, state = { busy: false, reason: 'not-scanned', count: 0, direction: null };
  function localized() {
    let text;
    if (state.reason === 'not-scanned') text = t('ready');
    else if (state.busy) text = state.direction ? t(state.direction === 'up' ? 'scanningUp' : 'scanningDown', { count: state.count }) : t('reading');
    else text = t('historyResult', { result: t(state.reason), count: state.count });
    return { ...state, text };
  }
  const subscribers = new Set();
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  function notify(change) {
    state = { ...state, ...change };
    subscribers.forEach(callback => callback(localized()));
    document.dispatchEvent(new CustomEvent('conversation-minimap-history'));
  }
  function stop() { controller?.abort(); }
  function reset() { stop(); notify({ busy: !!controller, reason: 'not-scanned', count: 0, direction: null }); }
  function find(key) { return adapter.conversation().find(entry => entry.key === key)?.element; }
  function position(scroll, top) { globalThis.ConversationMinimapPlatform.scrollTop(scroll, top); }
  async function scan(targetKey) {
    if (controller) { stop(); return; }
    controller = new AbortController();
    const signal = controller.signal, epoch = store.epoch;
    const initial = adapter.conversation();
    const scroll = adapter.scroller(initial[0]?.element);
    const savedTop = scroll.scrollTop;
    const rectTop = scroll === document.scrollingElement ? 0 : scroll.getBoundingClientRect().top;
    const anchor = initial.find(entry => entry.element.getBoundingClientRect().bottom > rectTop);
    const anchorOffset = anchor?.element.getBoundingClientRect().top;
    const started = Date.now();
    let reason = 'edges', target;
    const valid = () => !signal.aborted && store.epoch === epoch && Date.now() - started < 180000;
    notify({ busy: true, reason: 'scanning', count: store.entries().length, direction: null });
    const onWheel = event => { if (event.isTrusted) stop(); };
    const onKey = event => { if (['Escape', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) stop(); };
    document.addEventListener('wheel', onWheel, { passive: true });
    document.addEventListener('keydown', onKey);
    try {
      for (const direction of ['up', 'down']) {
        let stable = 0, signature = '';
        while (valid()) {
          const records = store.capture(direction);
          notify({ direction, count: records.length });
          target = targetKey && find(targetKey);
          if (target) { reason = 'target'; break; }
          const height = scroll.clientHeight || innerHeight;
          const top = scroll.scrollTop;
          const atEdge = direction === 'up' ? top <= 2 : top + height >= scroll.scrollHeight - 2;
          const current = `${records.length}:${scroll.scrollHeight}:${records[0]?.key}:${records.at(-1)?.key}`;
          stable = atEdge && current === signature && !adapter.loading() ? stable + 1 : 0;
          signature = current;
          if (stable >= 8) break;
          const live = adapter.conversation();
          const origin = scroll === document.scrollingElement ? 0 : scroll.getBoundingClientRect().top;
          const first = live[0]?.element.getBoundingClientRect().top;
          const last = live.at(-1)?.element.getBoundingClientRect().bottom;
          // All mounted text was captured above. Skip its already-read extent,
          // retaining viewport overlap so virtual lists can mount the next batch.
          const previous = first === undefined ? top - height * .75 : Math.min(top - height * .75, first - origin + top - height * .5);
          const following = last === undefined ? top + height * .75 : Math.max(top + height * .75, last - origin + top - height * .5);
          const next = direction === 'up' ? Math.max(0, previous) : Math.min(scroll.scrollHeight, following);
          position(scroll, next);
          // Also wakes a lazy-loading sentinel when already positioned at an edge.
          if (atEdge) scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
          await pause(atEdge ? 400 : 180);
        }
        if (target || !valid()) break;
      }
      if (signal.aborted) reason = 'cancelled';
      else if (store.epoch !== epoch) reason = 'route';
      else if (Date.now() - started >= 180000) reason = 'timeout';
      else if (targetKey && !target) reason = 'missing';
    } catch {
      reason = 'error';
    } finally {
      document.removeEventListener('wheel', onWheel);
      document.removeEventListener('keydown', onKey);
      if (store.epoch === epoch) {
        if (target?.isConnected && reason === 'target') globalThis.ConversationMinimapPlatform.reveal(target, false);
        else {
          const restored = anchor && find(anchor.key);
          if (restored && anchorOffset !== undefined) position(scroll, scroll.scrollTop + restored.getBoundingClientRect().top - anchorOffset);
          else position(scroll, savedTop);
        }
        store.capture();
      }
      controller = null;
      const count = store.entries().length;
      notify({ busy: false, reason, count });
    }
    return target;
  }
  function subscribe(callback) { subscribers.add(callback); callback(localized()); }
  document.addEventListener('conversation-minimap-language', () => notify({}));
  globalThis.ConversationMinimapHistory = { scan, stop, reset, subscribe,
    get state() { return localized(); } };
})();

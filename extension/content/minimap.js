(() => {
  if (document.getElementById('conversation-minimap-extension')) return;
  const i18n = globalThis.ConversationMinimapI18n;
  const t = i18n.t;
  const adapter = globalThis.ConversationMinimapAdapter;
  const store = globalThis.ConversationMinimapStore;
  const history = globalThis.ConversationMinimapHistory;
  const host = document.createElement('div');
  host.id = 'conversation-minimap-extension';
  host.style.cssText = 'all:initial!important;position:fixed!important;top:0!important;right:0!important;width:0!important;height:0!important;z-index:2147483647!important;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${globalThis.ConversationMinimapStyles}</style>
    <nav class="shell" hidden data-i18n-aria="navigationLabel">
      <section class="panel" data-i18n-aria="navigationLabel">
        <section class="navigation-view"><header><div><span class="heading" data-i18n="navigation"></span><small data-i18n="subtitle"></small></div><span class="count badge"></span>
        <div class="history-bar"><span class="history-status" role="status"></span><button class="secondary history-trigger" data-i18n="loadEarlier"></button></div></header><div class="list"></div><footer><button class="secondary settings-trigger"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.5 3-.7 2.3-2 .9-2.2-.5-2 3.5 1.5 1.8v2l-1.5 1.8 2 3.5 2.2-.5 2 .9.7 2.3h4.9l.7-2.3 2-.9 2.2.5 2-3.5-1.5-1.8v-2l1.5-1.8-2-3.5-2.2.5-2-.9-.7-2.3Z"/><circle cx="12" cy="12" r="3"/></svg><span data-i18n="appearance"></span></button><button class="secondary export-trigger"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/></svg><span data-i18n="export"></span></button></footer></section>
      </section>
      <button class="rail" data-i18n-aria="expand" aria-expanded="false"><span class="track"><span class="viewport"></span></span></button>
    </nav>`;
  document.documentElement.append(host);
  const shell = root.querySelector('.shell');
  const list = root.querySelector('.list');
  const track = root.querySelector('.track');
  const rail = root.querySelector('.rail');
  const viewport = root.querySelector('.viewport');
  let initialized = false;
  let entries = [], buttons = [], marks = [], active = -1, refreshTimer, frame;
  let scrollTarget = null;
  const exportPanel = globalThis.ConversationMinimapExport.mount(root, shell);
  const settingsPanel = globalThis.ConversationMinimapPreferences.mount(root, shell);
  globalThis.ConversationMinimapLayout.mount(root, shell);
  i18n.apply(root);
  async function jump(index) {
    let entry = entries[index];
    if (!entry) return;
    if (!adapter.isLive(entry)) {
      const element = await history.scan(entry.key);
      if (!element) return;
      entry = { ...entry, element };
    }
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    globalThis.ConversationMinimapPlatform.reveal(entry.element, !reduce);
    const animation = entry.element.animate?.([
      { outline: '3px solid transparent', outlineOffset: '6px' },
      { outline: '3px solid #888888', outlineOffset: '6px' },
      { outline: '3px solid transparent', outlineOffset: '6px' }
    ], { duration: reduce ? 1 : 1100 });
    animation?.finished.catch(() => {});
  }
  function update() {
    frame = null;
    if (!entries.length) return;
    const liveEntry = entries.find(entry => adapter.isLive(entry));
    const scroll = adapter.scroller(liveEntry?.element);
    if (scrollTarget !== scroll) {
      scrollTarget?.removeEventListener('scroll', scheduleUpdate);
      scrollTarget = scroll;
      scrollTarget.addEventListener('scroll', scheduleUpdate, { passive: true });
    }
    const page = scroll === document.scrollingElement;
    const rect = page ? { top: 0, height: innerHeight } : scroll.getBoundingClientRect();
    const total = Math.max(scroll.scrollHeight, rect.height, 1);
    let current = active < 0 ? 0 : active;
    const virtual = entries.some(entry => !adapter.isLive(entry));
    entries.forEach((entry, index) => {
      if (!adapter.isLive(entry)) { marks[index].style.top = `${(index + .5) / entries.length * 100}%`; return; }
      const position = entry.element.getBoundingClientRect().top - rect.top;
      const ratio = Math.max(0, Math.min(1, (position + scroll.scrollTop) / total));
      marks[index].style.top = `${(virtual ? (index + .5) / entries.length : ratio) * 100}%`;
      if (position <= Math.min(160, rect.height * .3)) current = index;
    });
    viewport.style.top = `${Math.max(0, scroll.scrollTop / total * 100)}%`;
    viewport.style.height = `${Math.min(100, rect.height / total * 100)}%`;
    if (current !== active) {
      active = current;
      buttons.forEach((button, index) => {
        button.classList.toggle('active', index === current);
        if (index === current) button.setAttribute('aria-current', 'location');
        else button.removeAttribute('aria-current');
        marks[index].classList.toggle('active', index === current);
      });
    }
  }
  function scheduleUpdate() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  function refresh() {
    const all = store.capture();
    const prompts = all.filter(entry => entry.role === 'user');
    const repliesOnly = !prompts.length && all.length > 0;
    const next = (prompts.length ? prompts : all).map(entry => ({ ...entry, text: entry.text.replace(/\s+/g, ' ') }));
    root.querySelector('.count').textContent = t(repliesOnly ? 'replyCount' : 'promptCount', { count: next.length });
    root.querySelector('.navigation-view small').textContent = t(repliesOnly ? 'repliesSubtitle' : 'subtitle');
    shell.style.setProperty('--rail-height', `${Math.min(220, Math.max(52, 36 + next.length * 12))}px`);
    shell.hidden = !adapter.supported() || !all.length;
    shell.dataset.empty = String(!next.length);
    if (initialized && next.length === entries.length && next.every((entry, i) =>
      entry.element === entries[i].element && entry.text === entries[i].text)) {
      scheduleUpdate();
      return;
    }
    initialized = true;
    entries = next;
    active = -1;
    list.replaceChildren();
    track.querySelectorAll('.mark').forEach(mark => mark.remove());
    buttons = []; marks = [];
    if (!entries.length) {
      const empty = document.createElement('p'); empty.className = 'empty';
      empty.textContent = t('emptyPrompts'); list.append(empty);
    }
    entries.forEach((entry, index) => {
      const button = document.createElement('button');
      button.className = 'item';
      const number = document.createElement('span');
      number.className = 'number'; number.textContent = String(index + 1).padStart(2, '0');
      const label = document.createElement('span');
      label.className = 'label'; label.textContent = entry.text;
      button.title = entry.text;
      button.append(number, label);
      button.addEventListener('click', () => jump(index));
      list.append(button); buttons.push(button);
      const mark = document.createElement('span');
      mark.className = 'mark'; track.append(mark); marks.push(mark);
    });
    scheduleUpdate();
  }
  rail.addEventListener('click', () => {
    const open = shell.classList.toggle('open');
    rail.setAttribute('aria-expanded', String(open));
    if (open) buttons[active]?.scrollIntoView({ block: 'nearest' });
  });
  shell.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      exportPanel.close();
      settingsPanel.close();
      shell.classList.remove('open');
      rail.setAttribute('aria-expanded', 'false');
      root.activeElement?.blur();
    }
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && buttons.includes(root.activeElement)) {
      event.preventDefault();
      const index = buttons.indexOf(root.activeElement);
      buttons[Math.max(0, Math.min(buttons.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))].focus();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!event.composedPath().includes(host)) {
      exportPanel.close();
      settingsPanel.close();
      shell.classList.remove('open');
      rail.setAttribute('aria-expanded', 'false');
    }
  });
  const observer = new MutationObserver(records => {
    if (records.every(record => host.contains(record.target))) return;
    if (!refreshTimer) refreshTimer = setTimeout(() => { refreshTimer = null; refresh(); }, 180);
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true,
    attributes: true, attributeFilter: ['class', 'hidden', 'aria-hidden', 'data-message-author-role', 'data-content-search-unit-key', 'data-chatgpt-search-unit-key', 'data-message-id'] });
  new ResizeObserver(scheduleUpdate).observe(document.body);
  document.addEventListener('scroll', scheduleUpdate, { capture: true, passive: true });
  addEventListener('resize', scheduleUpdate, { passive: true });
  addEventListener('popstate', refresh);
  root.querySelector('.history-trigger').addEventListener('click', () => history.state.busy ? history.stop() : history.scan());
  history.subscribe(state => {
    shell.dataset.busy = String(state.busy);
    const status = root.querySelector('.history-status');
    status.textContent = state.reason === 'not-scanned' && !state.busy ? '' : state.reason === 'edges' && !state.busy ? t('historyChecked') : state.text;
    status.title = state.text;
    root.querySelector('.history-trigger').textContent = t(state.busy ? 'stop' : state.reason === 'edges' ? 'recheckHistory' : 'loadEarlier');
  });
  document.addEventListener('conversation-minimap-history', refresh);
  document.addEventListener('conversation-minimap-route', () => { history.reset(); exportPanel.close(); settingsPanel.close(); });
  setInterval(() => { if (store.ensureRoute()) { history.stop(); exportPanel.close(); settingsPanel.close(); refresh(); } }, 500);
  document.addEventListener('conversation-minimap-language', () => { initialized = false; refresh(); });
  refresh();
})();

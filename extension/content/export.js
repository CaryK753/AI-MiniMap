(() => {
  function mount(root, shell) {
    const i18n = globalThis.ConversationMinimapI18n, t = i18n.t;
    const panel = root.querySelector('.panel');
    const view = document.createElement('section');
    view.className = 'export-view'; view.hidden = true;
    view.innerHTML = `<header><button class="icon-button back" data-i18n-aria="back">←</button><div class="heading" data-i18n="export"></div><span class="badge" data-i18n="local"></span>
      <div class="history-bar"><span class="export-history-status" role="status"></span><button class="secondary export-history-trigger" data-i18n="loadEarlier"></button></div></header><div class="export-options">
        <fieldset><legend data-i18n="include"></legend><div class="role-options">
          <label><input type="checkbox" name="role" value="user" checked><span data-i18n="userPrompts"></span></label>
          <label><input type="checkbox" name="role" value="assistant" checked><span data-i18n="aiReplies"></span></label>
        </div></fieldset>
        <fieldset><legend data-i18n="format"></legend><div class="formats">
          <label><input type="radio" name="format" value="txt"><span>TXT</span></label>
          <label><input type="radio" name="format" value="md" checked><span>Markdown</span></label>
          <label><input type="radio" name="format" value="json"><span>JSON</span></label>
        </div></fieldset>
      </div>
      <div class="selection-bar"><label><input type="checkbox" class="select-all" checked><span data-i18n="selectAll"></span></label><span class="selected-count"></span></div>
      <div class="export-list" data-i18n-aria="selectMessages"></div>
      <div class="export-bottom"><p class="export-note" data-i18n="exportNote"></p>
        <p class="export-status" role="status" aria-live="polite"></p>
        <button class="primary download"></button>
      </div>`;
    panel.append(view);
    const navigation = [root.querySelector('.navigation-view')];
    const list = view.querySelector('.export-list');
    const selectAll = view.querySelector('.select-all');
    const download = view.querySelector('.download');
    const status = view.querySelector('.export-status');
    const serializer = globalThis.ConversationMinimapSerialize;
    const history = globalThis.ConversationMinimapHistory;
    const store = globalThis.ConversationMinimapStore;
    let snapshot = [], selected = new Set(), sourceUrl = '', title = '', processing = false, snapshotEpoch = 0;
    const format = () => view.querySelector('[name="format"]:checked').value;
    const roles = () => new Set([...view.querySelectorAll('[name="role"]:checked')].map(input => input.value));
    const available = () => snapshot.filter(entry => roles().has(entry.role));
    function update() {
      const items = available();
      const count = items.filter(entry => selected.has(entry.key)).length;
      view.querySelector('.selected-count').textContent = t('selected', { count, total: items.length });
      selectAll.checked = count > 0 && count === items.length;
      selectAll.indeterminate = count > 0 && count < items.length;
      selectAll.disabled = !items.length;
      download.disabled = !count || history.state.busy || processing;
      download.dataset.processing = String(processing);
      const names = { txt: 'TXT', md: 'Markdown', json: 'JSON' };
      download.textContent = processing ? t('preparing') : t(count ? 'downloadCount' : 'download', { format: names[format()], count });
    }
    function render() {
      list.replaceChildren();
      const items = available();
      if (!items.length) {
        const empty = document.createElement('p'); empty.className = 'empty';
        empty.textContent = t('emptySelection'); list.append(empty);
      }
      items.forEach(entry => {
        const label = document.createElement('label'); label.className = 'export-item';
        const input = document.createElement('input'); input.type = 'checkbox';
        input.checked = selected.has(entry.key); input.setAttribute('aria-label', t('selectMessage', { index: entry.index, role: t(entry.role === 'user' ? 'userPrompts' : 'aiReplies') }));
        input.addEventListener('change', () => {
          input.checked ? selected.add(entry.key) : selected.delete(entry.key); update();
        });
        const content = document.createElement('span');
        const meta = document.createElement('span'); meta.className = 'message-meta';
        meta.textContent = `${String(entry.index).padStart(2, '0')} / ${t(entry.role === 'user' ? 'user' : 'ai')}`;
        const text = document.createElement('span'); text.className = 'label';
        text.textContent = entry.text.replace(/\s+/g, ' '); label.title = entry.text;
        content.append(meta, text); label.append(input, content); list.append(label);
      });
      update();
    }
    function close() {
      view.hidden = true; navigation.forEach(child => child.hidden = false);
    }
    function open() {
      snapshot = serializer.snapshot(); snapshotEpoch = store.epoch; sourceUrl = location.href; title = document.title || t('conversationTitle');
      selected = new Set(snapshot.map(entry => entry.key));
      view.querySelectorAll('[name="role"]').forEach(input => input.checked = true);
      status.textContent = ''; render();
      navigation.forEach(child => child.hidden = true); view.hidden = false;
      shell.classList.add('open');
      root.querySelector('.rail').setAttribute('aria-expanded', 'true');
      view.querySelector('.back').focus();
    }
    view.querySelector('.back').addEventListener('click', () => {
      close(); root.querySelector('.export-trigger').focus();
    });
    view.querySelectorAll('[name="role"]').forEach(input => input.addEventListener('change', render));
    view.querySelectorAll('[name="format"]').forEach(input => input.addEventListener('change', update));
    selectAll.addEventListener('change', () => {
      available().forEach(entry => selectAll.checked ? selected.add(entry.key) : selected.delete(entry.key));
      render();
    });
    download.addEventListener('click', async () => {
      if (processing || history.state.busy) return;
      if (location.href !== sourceUrl || store.epoch !== snapshotEpoch) {
        status.textContent = t('routeChanged'); return;
      }
      const entries = available().filter(entry => selected.has(entry.key));
      if (!entries.length) return;
      const preparingSince = performance.now();
      const originUrl = sourceUrl, originTitle = title, extension = format(), originEpoch = snapshotEpoch;
      const stillCurrent = () => location.href === originUrl && sourceUrl === originUrl && store.epoch === originEpoch;
      processing = true; update();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (!stillCurrent()) { processing = false; update(); return; }
      const metadata = { title: originTitle, url: originUrl, exportedAt: new Date().toISOString(),
        scope: 'collected-messages', collection: { reason: history.state.reason, note: t('collectionNote') }, platform: globalThis.ConversationMinimapAdapter.platform() };
      const mime = { txt: 'text/plain', md: 'text/markdown', json: 'application/json' };
      let url;
      try {
        const text = serializer.file(entries, extension, metadata);
        await new Promise(resolve => setTimeout(resolve, Math.max(0, 180 - (performance.now() - preparingSince))));
        if (!stillCurrent()) return;
        url = URL.createObjectURL(new Blob([text], { type: `${mime[extension]};charset=utf-8` }));
        const anchor = document.createElement('a'); anchor.href = url;
        const basename = originTitle.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[. ]+$/g, '').slice(0, 70) || t('conversationTitle');
        anchor.download = `${basename}-${new Date().toISOString().slice(0, 10)}.${extension}`;
        root.append(anchor); anchor.click(); anchor.remove();
        status.textContent = t('downloadStarted', { count: entries.length });
      } catch {
        status.textContent = t('downloadFailed');
      } finally {
        processing = false; update();
        if (url) setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
    });
    view.querySelector('.export-history-trigger').addEventListener('click', async () => {
      if (history.state.busy) { history.stop(); return; }
      const oldKeys = new Set(snapshot.map(entry => entry.key));
      await history.scan();
      if (view.hidden || location.href !== sourceUrl) return;
      snapshot = serializer.snapshot();
      snapshot.forEach(entry => { if (!oldKeys.has(entry.key)) selected.add(entry.key); });
      render();
    });
    history.subscribe(state => {
      view.querySelector('.export-history-status').textContent = state.text;
      view.querySelector('.export-history-trigger').textContent = t(state.busy ? 'stop' : 'loadEarlier');
      if (snapshot.length) update();
    });
    document.addEventListener('conversation-minimap-language', () => { i18n.apply(root); if (!view.hidden) render(); });
    root.querySelector('.export-trigger').addEventListener('click', open);
    return { close };
  }
  globalThis.ConversationMinimapExport = { mount };
})();

(() => {
  const i18n = globalThis.ConversationMinimapI18n;
  const api = globalThis.browser || globalThis.chrome;
  const key = 'conversationMinimapPreferences';
  const schema = 2;
  const platformSide = () => globalThis.ConversationMinimapProfiles?.deepseek ? 'left' : 'right';
  let values = { theme: 'system', language: 'auto', side: 'auto', glass: false };
  const subscribers = new Set();
  function normalize(input = {}) {
    if (!input || typeof input !== 'object') input = {};
    return {
      glass: input.glass === true,
      side: ['auto', 'left', 'right'].includes(input.side) ? input.side : 'auto',
      theme: ['system', 'light', 'dark'].includes(input.theme) ? input.theme : 'system',
      language: ['auto', 'en', 'zh-CN'].includes(input.language) ? input.language : 'auto'
    };
  }
  function notify() { i18n.setPreference(values.language); subscribers.forEach(callback => callback(values)); }
  const persist = () => api?.storage?.local?.set({ [key]: { ...values, schema } });
  const ready = (async () => {
    try {
      if (api?.storage?.local) {
        const stored = (await api.storage.local.get(key))[key];
        values = normalize(stored);
        // Earlier builds only stored the resolved side, where 'right' was the
        // built-in default. Treat that as "follow the platform" so DeepSeek can
        // open on the left without an explicit choice; an explicit left stays.
        if (stored && stored.schema !== schema) {
          if (values.side === 'right') values.side = 'auto';
          await persist();
        }
      }
    } catch { /* Storage may be unavailable in temporary extension contexts. */ }
    notify();
  })();
  async function set(change) {
    await ready;
    values = normalize({ ...values, ...change }); notify();
    try {
      if (!api?.storage?.local) return false;
      await persist(); return true;
    } catch { return false; }
  }
  api?.storage?.onChanged?.addListener((changes, area) => {
    if (area === 'local' && changes[key]) { values = normalize(changes[key].newValue); notify(); }
  });
  function mount(root, shell) {
    const host = root.host;
    const webkit = /AppleWebKit/i.test(navigator.userAgent) && !/Chrome|Chromium|Edg|OPR/i.test(navigator.userAgent);
    host.dataset.engine = /Firefox\//i.test(navigator.userAgent) ? 'firefox' : webkit ? 'webkit' : 'chromium';
    const navigation = root.querySelector('.navigation-view');
    const view = document.createElement('section'); view.className = 'settings-view'; view.hidden = true;
    view.innerHTML = `<header><button class="icon-button settings-back" data-i18n-aria="back">←</button><div class="heading" data-i18n="preferences"></div></header>
      <div class="settings-options"><label><span data-i18n="position"></span><select name="side"><option value="auto" data-i18n="automatic"></option><option value="left" data-i18n="left"></option><option value="right" data-i18n="right"></option></select></label><label><span data-i18n="theme"></span><select name="theme">
        <option value="system" data-i18n="system"></option><option value="light" data-i18n="light"></option><option value="dark" data-i18n="dark"></option>
      </select></label><label><span data-i18n="language"></span><select name="language">
        <option value="auto" data-i18n="automatic"></option><option value="zh-CN">简体中文</option><option value="en">English</option>
      </select></label><label><span data-i18n="glassEffect"></span><input type="checkbox" role="switch" name="glass"></label><p data-i18n="glassNote"></p><p class="settings-status" role="status" aria-live="polite"></p></div>`;
    const notes = { side: 'positionNote', theme: 'themeNote', language: 'languageNote', glass: 'glassNote' };
    view.querySelector('[data-i18n="glassNote"]').remove();
    for (const [name, note] of Object.entries(notes)) {
      const label = view.querySelector(`[name="${name}"]`).closest('label');
      const group = document.createElement('div'); group.className = 'setting-group';
      label.before(group); group.append(label);
      const description = document.createElement('p'); description.dataset.i18n = note;
      description.id = `minimap-${name}-note`; group.append(description);
      label.querySelector('select,input').setAttribute('aria-describedby', description.id);
    }
    let version = '—';
    try { version = api?.runtime?.getManifest?.().version || version; } catch { /* Context may have expired. */ }
    const about = document.createElement('div'); about.className = 'settings-about';
    about.innerHTML = `<div><span>AI MiniMap</span><span class="version"></span></div>
      <div class="about-links"><a href="https://github.com/CaryK753/AI-MiniMap" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
      <a href="https://github.com/CaryK753/AI-MiniMap/releases/latest" target="_blank" rel="noopener noreferrer" data-i18n="checkUpdates"></a></div><p data-i18n="updateNote"></p>`;
    about.querySelector('.version').textContent = `v${version}`;
    view.querySelector('.settings-options').append(about);
    root.querySelector('.panel').append(view);
    const status = view.querySelector('.settings-status');
    function close() { view.hidden = true; navigation.hidden = false; }
    root.querySelector('.settings-trigger').addEventListener('click', () => {
      navigation.hidden = true; view.hidden = false; status.textContent = '';
      shell.classList.add('open'); root.querySelector('.rail').setAttribute('aria-expanded', 'true');
      view.querySelector('.settings-back').focus();
    });
    view.querySelector('.settings-back').addEventListener('click', () => { close(); root.querySelector('.settings-trigger').focus(); });
    view.querySelectorAll('select').forEach(select => select.addEventListener('change', async () => {
      const saved = await set({ [select.name]: select.value });
      status.textContent = i18n.t(saved ? 'saved' : 'saveFailed');
    }));
    view.querySelector('[name="glass"]').addEventListener('change', async event => {
      const saved = await set({ glass: event.target.checked });
      status.textContent = i18n.t(saved ? 'saved' : 'saveFailed');
    });
    function update(preferences) {
      host.dataset.glass = String(preferences.glass);
      view.querySelector('[name="glass"]').checked = preferences.glass;
      host.dataset.theme = preferences.theme;
      shell.dataset.side = preferences.side === 'auto' ? platformSide() : preferences.side;
      view.querySelector('[name="side"]').value = preferences.side;
      document.dispatchEvent(new CustomEvent('conversation-minimap-layout'));
      view.querySelector('[name="theme"]').value = preferences.theme;
      view.querySelector('[name="language"]').value = preferences.language;
      root.querySelector('.shell').lang = i18n.locale;
      i18n.apply(root);
    }
    subscribers.add(update); update(values);
    document.addEventListener('conversation-minimap-language', () => { i18n.apply(root); shell.lang = i18n.locale; });
    return { close };
  }
  globalThis.ConversationMinimapPreferences = { ready, set, mount, get values() { return { ...values }; } };
})();

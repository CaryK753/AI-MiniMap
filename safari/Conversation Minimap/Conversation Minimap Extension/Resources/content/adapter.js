(() => {
  const profiles = globalThis.ConversationMinimapProfiles;
  const isGemini = profiles.gemini;
  const labels = '.sr-only,.cdk-visually-hidden,.screen-reader-user-query-label,.screen-reader-model-response-label,[aria-hidden="true"],button';
  const ids = new WeakMap();
  let serial = 0;
  function visible(el) {
    return el.getClientRects().length && !el.closest('[hidden],[aria-hidden="true"]') &&
      getComputedStyle(el).visibility !== 'hidden';
  }
  function find(selector) {
    const nodes = [...document.querySelectorAll(selector)].filter(el => visible(el) && !el.closest('aside,nav,[role="navigation"],[data-testid="tool-output"],[data-tool-output],[data-testid="terminal"]'));
    return nodes.filter(el => !nodes.some(other => other !== el && other.contains(el)));
  }
  function key(element, role) {
    const unit = element.closest('[data-content-search-unit-key],[data-chatgpt-search-unit-key]');
    const turn = element.closest('.conversation-container[id],[data-turn-key],[data-message-id],[data-uuid],[data-item-key],[data-turn-id],[data-index],[data-item-index]');
    const stable = unit?.getAttribute('data-content-search-unit-key') || unit?.getAttribute('data-chatgpt-search-unit-key') ||
      element.getAttribute('data-message-id') || turn?.getAttribute('data-message-id') ||
      turn?.getAttribute('data-turn-key') || turn?.getAttribute('data-uuid') || turn?.getAttribute('data-item-key') || turn?.getAttribute('data-turn-id') || turn?.getAttribute('data-index') || turn?.getAttribute('data-item-index') || turn?.id;
    if (stable) return `${role}:${stable}`;
    if (!ids.has(element)) ids.set(element, ++serial);
    return `${role}:node-${ids.get(element)}`;
  }
  function supported() { return !profiles.claude || /^\/(chat|share|code|new)(\/|$)/.test(location.pathname); }
  let routeBase = '', threadId = '', threadGeneration = 0;
  function routeKey() {
    const url = new URL(location.href);
    const identity = ['threadId', 'thread_id', 'conversationId', 'conversation_id', 'taskId', 'task_id'].map(key => url.searchParams.get(key) || '').join(':');
    const base = `${url.pathname}:${identity}`;
    const thread = document.querySelector('[data-thread-find-target="conversation"][data-thread-id],[data-testid="conversation"][data-conversation-id]');
    const current = thread?.getAttribute('data-thread-id') || thread?.getAttribute('data-conversation-id') || '';
    if (base !== routeBase) { routeBase = base; threadId = current; threadGeneration = 0; }
    else if (current && current !== threadId) {
      if (threadId) threadGeneration++;
      threadId = current;
    }
    return `${base}:${threadGeneration}`;
  }
  function conversation(onlyRole) {
    if (!supported()) return [];
    const profile = profiles.profile();
    const selectors = profile.selectors;
    const entries = Object.entries(selectors).filter(([role]) => !onlyRole || onlyRole === role)
      .flatMap(([role, selector]) => find(selector).map(element => ({ element, role })));
    if (profiles.isWork()) {
      if ((!onlyRole || onlyRole === 'user') && !entries.some(entry => entry.role === 'user')) entries.push(...find('main .self-end.bg-token-bg-tertiary,[role="log"] .self-end.bg-token-bg-tertiary').map(element => ({ element, role: 'user' })));
      if ((!onlyRole || onlyRole === 'assistant') && !entries.some(entry => entry.role === 'assistant')) entries.push(...find('main .markdown.prose,[role="log"] .markdown.prose').filter(el => !el.closest('.self-end.bg-token-bg-tertiary')).map(element => ({ element, role: 'assistant' })));
    }
    // Legacy Gemini pages may expose only the text container.
    if ((!onlyRole || onlyRole === 'user') && !entries.some(entry => entry.role === 'user') && isGemini) {
      entries.push(...find('.query-text').map(element => ({ element, role: 'user' })));
    }
    return entries.sort((a, b) => a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
      .map(entry => {
        const selector = profiles.claude && entry.role === 'assistant' && entry.element.querySelector('[data-perf-reply-text]')
          ? '[data-perf-reply-text]' : entry.role === 'user' ? profile.userBody : profile.assistantBody;
        const matches = [...entry.element.querySelectorAll(selector)].filter(visible);
        const bodies = matches.filter(el => !matches.some(other => other !== el && other.contains(el)));
        if (!bodies.length) bodies.push(entry.element.querySelector('.query-text') || entry.element);
        const text = bodies.map(body => {
          const clone = body.cloneNode(true);
          clone.querySelectorAll(labels).forEach(el => el.remove());
          return clone.textContent.trim();
        }).join('\n\n');
        return { ...entry, bodies, key: key(entry.element, entry.role),
          text: text || (globalThis.ConversationMinimapI18n.t(entry.role === 'user' ? 'userAttachment' : 'aiAttachment')) };
      });
  }
  function messages() {
    return conversation('user').map(entry => ({ ...entry, text: entry.text.replace(/\s+/g, ' ') }));
  }
  function scroller(element) {
    for (let parent = element?.parentElement; parent; parent = parent.parentElement) {
      if (/(auto|scroll|overlay)/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight + 2) return parent;
    }
    return document.querySelector('.thread-scroll-container,infinite-scroller.chat-history,[data-testid="virtuoso-scroller"],[data-radix-scroll-area-viewport]') ||
      document.scrollingElement || document.documentElement;
  }
  function loading() {
    return [...document.querySelectorAll('[aria-busy="true"],[role="status"],.loading-history')]
      .some(el => visible(el) && (el.getAttribute('aria-busy') === 'true' || /更早|加载|loading|earlier/i.test(el.textContent)));
  }
  function isLive(entry) { return !!entry?.element?.isConnected && key(entry.element, entry.role) === entry.key; }
  globalThis.ConversationMinimapAdapter = { messages, conversation, scroller, loading, key, isLive, supported, routeKey, platform: () => profiles.profile().name };
})();

(() => {
  const hostname = location.hostname;
  const gemini = hostname === 'gemini.google.com';
  const claude = hostname === 'claude.ai';
  const isWork = () => !gemini && !claude && /^\/(codex|work)(\/|$)/.test(location.pathname);
  const chat = {
    user: '[data-message-author-role="user"],[data-content-search-unit-key$=":user"],[data-chatgpt-search-unit-key$=":user"],[data-user-message-bubble="true"]',
    assistant: '[data-message-author-role="assistant"],[data-content-search-unit-key$=":assistant"],[data-chatgpt-search-unit-key$=":assistant"]'
  };
  function profile() {
    if (gemini) return {
      name: 'Gemini',
      selectors: { user: 'user-query,[data-message-author-role="user"],.user-query', assistant: 'model-response,[data-message-author-role="assistant"],.model-response' },
      userBody: '.query-text-line', assistantBody: '.markdown,.markdown-main-panel,.message-content'
    };
    if (claude) return {
      name: 'Claude',
      selectors: {
        user: '[data-testid="user-message"],[data-testid="user-human-turn"],[data-testid="human-message"],[data-user-message-bubble="true"],[class~="!font-user-message"]',
        assistant: '.font-claude-response,[data-testid="assistant-message"],[data-testid="ai-message"],.font-claude-message'
      },
      userBody: '[data-testid="user-message"],.whitespace-pre-wrap',
      assistantBody: '.font-claude-response-body,.standard-markdown,.progressive-markdown,.markdown,.prose'
    };
    return {
      name: isWork() ? 'ChatGPT Work / Codex' : 'ChatGPT',
      selectors: {
        user: chat.user + ',[data-message-role="user"],[data-role="user"][data-message-id],[data-testid="user-message"]',
        assistant: chat.assistant + ',[data-message-role="assistant"],[data-role="assistant"][data-message-id],[data-testid="assistant-message"]'
      },
      userBody: '[data-search-result-target],.whitespace-pre-wrap,[data-user-message-bubble="true"]',
      assistantBody: '.markdown,.message-content,[data-message-content]'
    };
  }
  globalThis.ConversationMinimapProfiles = { profile, gemini, claude,
    isWork };
})();

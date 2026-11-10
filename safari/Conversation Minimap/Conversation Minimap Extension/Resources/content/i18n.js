(() => {
  const strings = {
    en: {
      replyCount: '{count} replies', repliesSubtitle: 'Jump between task updates and AI replies', position: 'Position', left: 'Left', right: 'Right',
      navigation: 'Conversation', subtitle: 'Jump back to any prompt', navigationLabel: 'Conversation minimap',
      promptsLabel: 'User prompts', promptCount: '{count} prompts', local: 'Local', localProcessing: 'Processed on device',
      export: 'Export conversation', expand: 'Open conversation navigation', back: 'Back to navigation',
      ready: 'Read earlier messages', loadEarlier: 'Load earlier', stop: 'Stop',
      emptyPrompts: 'No user prompts yet. You can export AI replies or load earlier messages.',
      include: 'Include', userPrompts: 'User prompts', aiReplies: 'AI replies', format: 'File format',
      selectAll: 'Select all', selectMessages: 'Select messages to export', selected: '{count} / {total} selected',
      emptySelection: 'No matching messages. Choose what to include.',
      exportNote: 'Load earlier messages first. Only collected messages are exported; attachment files are excluded.',
      download: 'Download {format}', downloadCount: 'Download {format} · {count}', preparing: 'Preparing file…',
      selectMessage: 'Select message {index}: {role}', user: 'User', ai: 'AI',
      conversationTitle: 'Conversation', routeChanged: 'Conversation changed. Reopen export to continue.',
      downloadStarted: 'Download requested · {count} messages.', downloadFailed: 'Could not start download. Please try again.',
      collectionNote: 'Only messages provided by the page were collected; full server history is not guaranteed.',
      source: 'Source', exportedAt: 'Exported at', image: 'Image', userAttachment: 'Image or attachment prompt', aiAttachment: 'Non-text reply',
      reading: 'Reading conversation history…', scanningUp: 'Reading earlier · {count} collected',
      scanningDown: 'Checking later · {count} collected', historyResult: '{result} · {count} collected',
      edges: 'Reached both page ends', cancelled: 'Stopped; you can resume', route: 'Conversation changed',
      timeout: 'Time limit reached; continue to read more', missing: 'Message is not loaded yet; retry',
      error: 'Reading interrupted; retry', target: 'Historical prompt located',
      appearance: 'Settings', language: 'Language', automatic: 'Automatic', theme: 'Theme',
      system: 'System', light: 'Light', dark: 'Dark', preferences: 'Preferences',
      preferenceNote: 'Only language and appearance are saved. Your conversations stay in this tab.',
      saveFailed: 'Could not save preferences. Changes apply only in this tab.', saved: 'Preferences saved',
      glassNote: 'Glass effects adapt to this browser and your system accessibility settings.'
    },
    'zh-CN': {
      replyCount: '{count} 条回复', repliesSubtitle: '快速跳转每次任务更新或 AI 回复', position: '位置', left: '左侧', right: '右侧',
      navigation: '对话导航', subtitle: '快速回到任意一条提示词', navigationLabel: '对话缩略导航',
      promptsLabel: '用户提示词列表', promptCount: '{count} 条提示词', local: '本地', localProcessing: '当前对话 · 本地处理',
      export: '导出对话', expand: '展开对话导航', back: '返回对话导航',
      ready: '可加载更早记录', loadEarlier: '加载更早记录', stop: '停止',
      emptyPrompts: '暂无用户提示词。可导出 AI 回复，或加载更早记录。',
      include: '包含内容', userPrompts: '用户提示词', aiReplies: 'AI 回复', format: '文件格式',
      selectAll: '全选', selectMessages: '选择要导出的消息', selected: '已选 {count} / {total} 条',
      emptySelection: '没有匹配的消息，请选择包含内容。',
      exportNote: '先加载更早记录，再选择导出内容。仅导出已收集的消息；图片与附件不打包。',
      download: '下载 {format}', downloadCount: '下载 {format} · {count} 条', preparing: '正在准备文件…',
      selectMessage: '选择第 {index} 条{role}', user: '用户', ai: 'AI',
      conversationTitle: '对话记录', routeChanged: '对话已切换，请返回并重新打开导出。',
      downloadStarted: '已发起下载，共 {count} 条消息。', downloadFailed: '下载未能开始，请重试。',
      collectionNote: '仅包含网页已提供并收集的消息，不保证服务端历史完整性',
      source: '来源', exportedAt: '导出时间', image: '图片', userAttachment: '图片或附件提示词', aiAttachment: '非文本回复',
      reading: '正在读取历史记录…', scanningUp: '正在向前读取 · 已收集 {count} 条',
      scanningDown: '正在向后读取 · 已收集 {count} 条', historyResult: '{result} · 已收集 {count} 条',
      edges: '已遍历页面两端', cancelled: '已停止，可继续加载', route: '对话已切换',
      timeout: '本轮读取到时，可继续加载', missing: '目标暂未加载，请重试',
      error: '读取中断，可重试', target: '已定位历史提示词',
      appearance: '设置', language: '语言', automatic: '自动', theme: '主题',
      system: '跟随系统', light: '亮色', dark: '暗色', preferences: '偏好设置',
      preferenceNote: '仅保存语言和外观偏好，对话内容只保留在当前页面。',
      saveFailed: '偏好未能保存，本次更改仅在当前页面生效。', saved: '偏好已保存',
      glassNote: '玻璃效果会适配当前浏览器与系统辅助功能设置。'
    }
  };
  let preference = 'auto';
  function deviceLocale() {
    const api = globalThis.browser || globalThis.chrome;
    const language = api?.i18n?.getUILanguage?.() || navigator.languages?.[0] || navigator.language || 'en';
    return language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
  }
  const locale = () => preference === 'auto' ? deviceLocale() : preference;
  function t(key, parameters = {}) {
    const value = strings[locale()][key] || strings.en[key] || key;
    return value.replace(/\{(\w+)\}/g, (_, name) => String(parameters[name] ?? `{${name}}`));
  }
  function apply(root) {
    root.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
    root.querySelectorAll('[data-i18n-aria]').forEach(element => { element.setAttribute('aria-label', t(element.dataset.i18nAria)); });
  }
  function setPreference(value) {
    const next = ['auto', 'en', 'zh-CN'].includes(value) ? value : 'auto';
    if (next !== preference) { preference = next; document.dispatchEvent(new CustomEvent('conversation-minimap-language')); }
  }
  addEventListener('languagechange', () => {
    if (preference === 'auto') document.dispatchEvent(new CustomEvent('conversation-minimap-language'));
  });
  globalThis.ConversationMinimapI18n = { t, apply, setPreference, get locale() { return locale(); } };
})();

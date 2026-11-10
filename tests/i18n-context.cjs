// Author: wwj
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../extension/content/i18n.js'), 'utf8');
for (const language of ['zh-CN', 'en-US', 'fr-FR']) {
  let invalid = false;
  const context = vm.createContext({
    navigator: { languages: [language], language },
    chrome: { i18n: { getUILanguage() {
      if (invalid) throw new Error('Extension context invalidated.');
      return 'zh-CN';
    } } },
    document: { dispatchEvent() {} }, addEventListener() {}, CustomEvent: class {}
  });
  vm.runInContext(source, context);
  const i18n = context.ConversationMinimapI18n;
  assert.equal(i18n.locale, 'zh-CN');
  invalid = true;
  for (let count = 0; count < 20; count++) {
    assert.equal(i18n.locale, language.startsWith('zh') ? 'zh-CN' : 'en');
    assert.equal(i18n.t('navigation'), language.startsWith('zh') ? '对话导航' : 'Conversation');
  }
  i18n.setPreference('en'); assert.equal(i18n.t('navigation'), 'Conversation');
  i18n.setPreference('auto'); assert.equal(i18n.locale, language.startsWith('zh') ? 'zh-CN' : 'en');
}
console.log('Invalidated extension context: language fallback, repeated refresh and explicit preferences PASS');

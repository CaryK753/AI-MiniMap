// Author: wwj
const fs = require('node:fs');
const path = require('node:path');
const playwright = require('playwright');
const extension = path.resolve(__dirname, '../extension');
const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json')));
async function launch(engine) {
  const options = { headless: true };
  if (process.env.MINIMAP_BROWSER_EXECUTABLE) options.executablePath = process.env.MINIMAP_BROWSER_EXECUTABLE;
  if (engine === 'chromium' && process.env.MINIMAP_CHROME_CHANNEL) options.channel = process.env.MINIMAP_CHROME_CHANNEL;
  return playwright[engine].launch(options);
}
async function inject(page) {
  for (const script of manifest.content_scripts[0].js) await page.addScriptTag({ path: path.join(extension, script) });
  await page.evaluate(() => ConversationMinimapPreferences.ready);
}
function storage(context) {
  return context.addInitScript(() => {
    window.browser = { storage: { local: {
      async get(key) { return { [key]: JSON.parse(localStorage.getItem(key) || 'null') }; },
      async set(values) { for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value)); }
    } } };
  });
}
module.exports = { launch, inject, storage, extension, manifest };

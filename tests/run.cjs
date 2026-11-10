// Author: wwj
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const engine = process.argv[2] || 'chromium';
if (!['chromium', 'firefox', 'webkit'].includes(engine)) throw new Error(`Unknown browser: ${engine}`);
for (const file of ['i18n-context.cjs', 'platforms.cjs', 'history.cjs', 'claude-history.cjs', 'export.cjs', 'motion.cjs', 'preferences.cjs', 'optimizations.cjs']) {
  const result = spawnSync(process.execPath, [path.join(__dirname, file)], {
    stdio: 'inherit', env: { ...process.env, MINIMAP_TEST_ENGINE: engine }
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

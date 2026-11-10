# Verification / 验证范围

Author / 作者：wwj

## Browser-engine regression tests

The 1.4.0 change set is checked in Chromium, Firefox and WebKit using local deterministic webpage fixtures. These tests inject the same ordered content scripts listed by the extension manifest; they do not depend on paid accounts or send messages to AI services.

| Area | Checks |
| --- | --- |
| Site profiles | ChatGPT chat, AI-only scheduled updates, role-marked Work, guarded legacy Codex bubbles, current Claude hooks, Gemini |
| Navigation | Prompt / reply count, click target, active item, AI-only fallback |
| Empty pages | Initially hidden rail; first user or AI content restores it; login-page samples ignored |
| Position | Left / right, collapsed and expanded sidebars, narrow overlay obstruction, restored preference |
| History | Delayed pagination, virtualized windows, 60 ordered messages, identical prompts retained, cancellation, conversation isolation |
| Claude recycling | Reused connected DOM nodes with changed stable keys, correct historical jump, no cross-chat stale cache |
| Export | Actual TXT / Markdown / JSON downloads, roles, selections, code fences, tables, safe text, hidden branch / tool exclusion |
| Language and theme | en-US / zh-CN / other-language English fallback, runtime switching, original content unchanged, system theme / explicit override, saved preferences |
| Motion | Enter / exit, no invisible hover area, progress / spinner, file preparation, reduced motion, small viewport |

## Live-page inspection

- A signed-in ChatGPT scheduled conversation was inspected read-only. It used assistant search-unit markers without user prompts. No private chat content is included in this repository.
- A signed-in Claude chat was inspected after login. The current page exposed `data-testid="user-message"`, `data-testid="assistant-message"`, `data-turn-key` and `[data-perf-reply-text]`. The sidebar was a semantic `aside`. The adapter retains older Claude class hooks as fallbacks.
- Separate legacy Codex task pages were **not** live-account verified. Their path-guarded fallback has fixture coverage. Work conversations that use normal ChatGPT role/search-unit hooks share that adapter.

Live DOM inspection verifies the observed hooks, not every later website deployment. Browser-engine fixture tests verify behavior independently; they are not represented as full logged-in integration tests.

## Packaging and installation boundary

- Shared Chromium/Safari Manifest V3 package and Firefox-specific manifest are built from `extension/`.
- Firefox declares a stable add-on ID, minimum Firefox 140 and `data_collection_permissions.required: ["none"]`.
- The Firefox build is unsigned. It is intended for temporary loading via `about:debugging`; no AMO signing or persistent store installation is claimed.
- Safari macOS source uses native SwiftUI Liquid Glass only in the containing application, gated on macOS 26+. Webpage glass is CSS.
- Safari application builds use local ad-hoc signing, not Apple Developer distribution signing / notarization. Safari unsigned-extension settings are not changed by the build script.

## Run

```sh
npm install
npx playwright install chromium firefox webkit
npm run test:chromium
npm run test:firefox
npm run test:webkit
```

The development environment used existing Playwright and browser installations rather than installing a new dependency into the system. For your own checkout, use the pinned development dependency in `package.json` and its corresponding browser builds.

Optional `MINIMAP_BROWSER_EXECUTABLE` selects an existing browser executable. `MINIMAP_CHROME_CHANNEL=chrome` uses installed Google Chrome. Test screenshots and downloads go to ignored `work/test-artifacts/`.

## Public screenshots

```sh
npm run screenshots
MINIMAP_TEST_ENGINE=firefox npm run screenshots
MINIMAP_TEST_ENGINE=webkit npm run screenshots
```

The five images under `docs/images/` are generated from `tests/fixtures.cjs`. They use invented messages and local layouts. No account cookies, private URLs, transcript text or service responses are published.

---

## 中文摘要

1.4.0 在 Chromium、Firefox、WebKit 三种引擎下验证了网站角色提取、导航、定时任务纯回复导航、空白页隐藏、左右位置、侧边栏避让、历史采集、节点复用、三种格式下载、中英切换、主题和动效。

真实账号只做只读页面结构核对；与浏览器引擎里的合成对话测试明确区分。独立旧版 Codex 任务页面没有真实账号验证，Firefox 没有 AMO 签名，Safari 没有发行签名 / 公证。公开截图全部来自合成内容，不包含私人会话。

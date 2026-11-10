# AI MiniMap

[简体中文](README.md) · [English](README.en.md)

为 ChatGPT、Gemini 和 Claude 提供轻量的对话导航与导出工具。通过悬浮展开的导航条快速定位提示词，读取更早的消息，并将所选内容保存为文件。

## 功能

- **快速导航**：点击提示词跳转并高亮；没有用户提示词时，按 AI 回复或任务更新导航。导航条随消息数量增长，并设有高度上限，空白对话自动隐藏。
- **历史读取**：通过网页自身的滚动加载机制收集消息，显示实时进度，支持停止；完成后恢复阅读位置。
- **按需导出**：筛选用户提示词和 AI 回复，逐条选择，导出 TXT、Markdown 或 JSON。
- **外观设置**：支持左右位置、侧边栏避让、亮色与暗色主题、中英双语及自动语言选择。玻璃效果默认关闭，可手动开启。
- **使用辅助**：支持键盘导航、减少动态效果、设置说明，以及 GitHub 最新版本入口。

## 界面预览

以下截图使用合成对话，不包含私人聊天内容。

| 对话导航 | 设置 |
| --- | --- |
| ![对话导航](docs/images/compact-navigation.png) | ![设置](docs/images/settings-glass-toggle.png) |

![选择消息并导出](docs/images/firefox-export.png)

## 安装

从 [Releases](https://github.com/CaryK753/AI-MiniMap/releases) 下载对应文件，或克隆源码后运行 `python3 script/package.py` 生成安装包。

| 浏览器 | 安装包 | 安装方式 |
| --- | --- | --- |
| Chrome / Edge | `conversation-minimap.zip` | 解压，打开扩展管理页并启用开发者模式，选择“加载已解压的扩展程序”，定位到含 `manifest.json` 的目录。 |
| Firefox 140+ | `ai-minimap-firefox-unsigned.xpi` | 打开 `about:debugging#/runtime/this-firefox`，选择“临时载入附加组件”。临时安装会在浏览器重启后移除，持久安装需要 Mozilla 签名。 |
| Safari 27 | `conversation-minimap.zip` | 解压，在 Safari 设置的开发者选项中添加临时扩展并授予网站访问权限。临时扩展会在退出 Safari 或 24 小时后失效。 |
| Safari 原生应用 | `conversation-minimap-safari-app.zip` | 本地开发用 ad-hoc 签名版本，未公证；安装和构建方式见 [Safari 文档](docs/SAFARI.md)。 |

更新后重新加载扩展，并刷新已打开的聊天网页。

## 使用

1. 打开一段已有消息的对话，悬浮导航条展开面板；点击导航条可保持展开。
2. 点击列表项跳转到对应消息。
3. 长对话可点击标题右侧的历史图标，读取更早消息；再次点击停止。悬浮图标可查看功能说明。
4. 点击“导出对话”，筛选角色、选择消息和文件格式，下载文件。
5. 在“设置”中调整外观、位置和语言，或通过“检查更新”打开 GitHub 最新发布页。

键盘操作：Tab 移动焦点，上下方向键选择导航项，Enter 跳转，Esc 关闭面板或停止历史读取。读取期间主动滚动网页也会停止本轮收集。

## 支持范围

| 平台 | 支持内容 |
| --- | --- |
| ChatGPT | 普通与项目会话、定时任务中的纯 AI 回复、Work / Codex 角色标记及旧版气泡结构。独立旧版 Codex 任务页尚未完成真实账号验证。 |
| Gemini | 用户提示词、AI 回复与虚拟列表历史读取。 |
| Claude | 聊天与分享页面，支持消息节点复用；忽略登录页示例内容。 |

历史读取只能收集网页提供的消息。到达页面两端不代表服务端历史完整；每轮最多读取约三分钟，可再次继续。网站更新页面结构后，适配可能需要调整。

导出不包含附件文件、隐藏分支或独立工具输出。图片以引用或占位文字表示，Markdown 由网页结构转换。网页玻璃效果通过 CSS 实现；原生 Liquid Glass 仅用于支持该效果的 macOS 承载应用。

## 隐私与权限

- 不上传聊天内容，不调用 AI API 或私有对话接口，不包含统计追踪。
- `storage` 权限仅保存外观、位置和语言偏好。
- 消息缓存保存在当前页面内存，刷新或切换会话后清空。
- 导出文件包含所选消息和来源网址，请按需保管。
- 历史读取会触发聊天网站正常的加载请求；GitHub 和更新入口仅在点击时打开外部页面。

## 本地开发

扩展使用原生 JavaScript 和 Manifest V3，无运行时依赖。测试需要 Node.js 20+、Python 3 和 Playwright；Safari 原生构建还需要 macOS 与兼容的 Xcode。

```sh
npm ci
npx playwright install chromium firefox webkit
npm run check
npm run test:release
npm run test:chromium
npm run test:firefox
npm run test:webkit
npm run package
```

```text
extension/  通用扩展源码
browsers/   浏览器专属配置
safari/     Safari 原生承载应用与扩展工程
script/     版本、校验、打包和构建脚本
tests/      浏览器回归与测试页面
docs/       截图、安装、验证与发布文档
```

详见 [测试说明](docs/TESTING.md)、[Safari 构建](docs/SAFARI.md) 和 [发布指南](docs/RELEASING.md)。提交与 PR 自动执行校验、跨引擎回归和 Safari 构建；推送匹配产品版本的 `vX.Y.Z` 标签后自动打包并发布 Release，附带 SHA-256 校验值。

## 问题反馈

请通过 [Issues](https://github.com/CaryK753/AI-MiniMap/issues) 提交问题，附上浏览器与扩展版本、使用的平台和复现步骤。截图及日志请先移除私人信息。

## 许可证

本项目采用 [MIT License](LICENSE)。

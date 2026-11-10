# Safari 版本安装说明

作者：wwj

版本：1.4.2

## 推荐：Safari 27 临时加载

本机 Safari 27.2 支持直接加载 Web Extension 文件夹，不必先安装应用。

1. 解压 `conversation-minimap.zip`。
2. Safari → 设置 → 高级，开启“显示网页开发者功能”。
3. Safari → 设置 → 开发者 → “添加临时扩展…”。
4. 选择含有 `manifest.json` 的 `conversation-minimap` 文件夹，或直接选择 ZIP。
5. 按 Safari 提示自行确认未签名扩展测试，再到扩展页启用插件、允许访问 ChatGPT / Gemini / Claude。
6. 刷新对应网页。悬浮右侧胶囊，底部“设置 / Settings”可切换语言和主题。

**系统限制：** 临时扩展在退出 Safari 或 24 小时后移除，需要重新添加。Safari 的未签名扩展确认会放宽开发测试时的签名校验；本次没有替你启用该设置。

## 原生应用测试版

`conversation-minimap-safari-app.zip` 包含 macOS 原生承载应用，适用于 Apple Silicon，最低 macOS 13。macOS 26+ 使用 SwiftUI Liquid Glass，旧系统使用系统半透明材质。

这是本地 ad-hoc 签名构建：已经通过签名完整性校验，但没有 Apple Developer 发行签名和公证，不能当作正式发行安装包。Safari 默认不会信任其中的开发扩展。

如你已配置 Safari 未签名扩展开发环境，可以解压并启动应用，点击“打开 Safari 设置 / Open Safari Settings”，再启用扩展、允许两个网站。若系统阻止运行，不建议绕过系统提示，优先使用上面的临时加载方式或自行在 Xcode 签名。

## Xcode 工程与签名

仓库 `safari/` 或 `conversation-minimap-safari-project.zip` 包含 Apple 官方工具生成并调整过的 macOS Safari Web Extension 工程，使用 Xcode 27.2 构建验证。

1. 解压工程，打开 `Conversation Minimap/Conversation Minimap.xcodeproj`。
2. 给应用和扩展两个 target 选择你的 Signing Team，保证 bundle identifier 有一致前缀。
3. 选择 `Conversation Minimap` scheme、`My Mac`，运行。
4. 在 Safari 扩展设置中启用并授予两个网站访问权限。

正式分发需要你自己的 Apple 签名和分发流程。当前没有发布 App Store，也未注册或更改你的开发者账号。

## 功能与边界

- 中文 / 英文自动选择，可手动切换。
- 跟随系统 / 亮色 / 暗色，保存偏好；只使用本地 `storage` 权限。
- Chromium 网页面板为 CSS 半透明玻璃；Safari 网页面板为 WebKit CSS 玻璃近似材质。
- **原生 Liquid Glass 仅出现在 macOS 承载应用窗口**，网页扩展无法调用 SwiftUI 原生材质。
- WebKit 下验证了导航、历史分页与虚拟列表、三种格式实际下载、动效、语言和主题。
- Safari 原生应用已启动并检查窗口。没有替你启用 Safari 未签名扩展开关，没有以 Safari 扩展登录真实账号验证。

Apple 官方说明：[运行 Safari Web Extension](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension)、[打包 Safari Web Extension](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari)。


## Build from this repository / 从本仓库构建

Run `python3 script/package.py` to synchronize extension resources into the Xcode project before opening it. Alternatively use `./script/build_and_run.sh --build-only`. Both use `extension/` as the source of truth.

打开 Xcode 工程前先运行 `python3 script/package.py` 同步资源，或运行 `./script/build_and_run.sh --build-only`；通用源码以 `extension/` 为准。

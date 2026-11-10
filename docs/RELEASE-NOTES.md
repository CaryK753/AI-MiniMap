## 中文

- 导航条按提示词数量从 52px 增长到 220px，同时不超过窗口高度的 60%。
- 历史加载入口并入标题区，减少分割线与空白；加载时保留状态和停止操作。
- 设置新增玻璃效果开关，默认关闭，偏好保存在本机。
- 历史扫描期间暂停浏览器自动滚动锚定，结束后恢复，减少虚拟列表节点复用时漏读。
- 修复同一网址切换会话时旧导出继续下载的问题；清理已移除的侧边栏观察对象。
- 自动校验版本、运行 Chromium / Firefox / WebKit 回归、构建 Safari 应用并发布文件及 SHA256SUMS。

Firefox XPI 未经 Mozilla 签名；Safari 应用仅做本地开发用 ad-hoc 签名，未经 Apple 公证。安装方法与限制见 README 和 docs/SAFARI.md。网页历史加载仅收集页面提供的消息，不保证服务端历史完整。

## English

- The minimap grows from 52px to 220px with prompt count, capped at 60% of viewport height.
- History actions now sit inside the header, retaining progress and stop controls.
- Optional glass effect in Settings, disabled by default and saved locally.
- Temporarily suspend native scroll anchoring during history scans, then restore it, to avoid skipping recycled virtual rows.
- Cancel stale exports when switching conversations at the same URL; release detached sidebar observers.
- Automated version checks, Chromium / Firefox / WebKit regression tests, Safari builds and release checksums.

Firefox XPI is unsigned. The Safari app is ad-hoc signed for local development and is not notarized by Apple. See README and docs/SAFARI.md for installation and limitations. History collection depends on messages exposed by the page and does not guarantee complete server history.

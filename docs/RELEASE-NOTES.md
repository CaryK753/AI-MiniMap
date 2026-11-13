## 1.5.0

### 中文

- 新增 DeepSeek 网页版（chat.deepseek.com）适配：提示词导航、AI 回复导出与虚拟列表历史读取。
- 深度思考内容不计入 AI 回复；代码块导出保留语言标记，复制、下载等工具栏文字不进入文件。
- 左侧位置按会话栏边缘计算偏移，避让 DeepSeek 以哈希类名构建的侧边栏。
- 位置新增「自动」档：DeepSeek 默认靠左，其余平台保持靠右；旧版本保存的默认右侧会自动迁移，显式选择仍然优先。
- 导航标签不再包含图标、内联样式和代码块工具栏文字。

### English

- Add DeepSeek web (`chat.deepseek.com`): prompt navigation, AI reply export and virtual-list history collection.
- DeepThink reasoning stays out of replies; code fences keep their language while copy/download toolbar text is excluded.
- Left placement derives its offset from the conversation column, so hashed sidebar containers are avoided too.
- Placement gains an "Automatic" mode: DeepSeek opens on the left, other platforms stay right. Legacy saved defaults migrate automatically and explicit choices still win.
- Message labels no longer include icons, inline styles or code-block toolbar text.

## 1.4.2

### 中文

- 导航标题与数量合并为一行，历史读取改为图标入口，附带功能介绍与停止提示。
- 历史读取进度与按钮同行，窄屏下省略过长文本。
- 设置说明归属各自选项，新增版本号、GitHub 与最新发布页入口。
- 修复扩展更新或重新加载后，旧网页语言接口失效导致的未捕获异常。
- 重写项目文档，默认显示中文，提供英文文档和最新界面截图。

### English

- Compact navigation header with prompt count, history icon and contextual help.
- Inline collection progress with overflow handling on narrow screens.
- Per-setting descriptions, installed version, GitHub and latest-release links.
- Handle invalidated extension contexts during language detection.
- Rewrite project documentation with Chinese as the default and an English translation.

Firefox XPI remains unsigned. Safari application builds use ad-hoc signing for local development and are not notarized. See installation documentation for details.

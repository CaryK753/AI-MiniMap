# Release / 发布

Author / 作者：wwj

Pushes and pull requests to `main` run version/syntax/package checks, browser regressions in Chromium, Firefox and WebKit, and a Safari native build. Chromium and Firefox run on Ubuntu; WebKit runs on macOS. Only a successful version-tag workflow creates a GitHub Release.

提交和 PR 会检查版本、语法、打包、三个浏览器引擎及 Safari 原生构建。推送版本标签后，全部检查成功才会创建 GitHub Release。

1. Run `python3 script/version.py X.Y.Z` to synchronize product versions. Update `docs/RELEASE-NOTES.md` for the new version.
2. Run `python3 script/check.py`, `python3 tests/release_unit.py`, and the affected browser tests. Commit and push; wait for CI to succeed.
3. Run `git tag vX.Y.Z` and `git push origin vX.Y.Z`.
4. Wait for Release to succeed. Download assets and verify them against `SHA256SUMS`.

1. 用版本助手同步版本号，更新发布说明。
2. 本地验证后提交推送，等待 CI 成功。
3. 推送相同版本的 `vX.Y.Z` 标签。
4. 等待 Release 成功，用校验值核对下载文件。

The tag must match package.json, extension manifest and Safari project versions. Existing tags can be retried through the Release workflow's manual `tag` input. Published versions are never force-moved. The workflow uses the built-in GitHub token; no additional secret is needed. Store publishing, Mozilla signing and Apple notarization are outside this workflow.

标签必须与所有产品版本一致。失败时可从 Release 的手动入口填入已有标签重试；不强制移动已发布标签。流程使用 GitHub 自带令牌，无需额外密钥，不包含商店发布、Mozilla 签名或 Apple 公证。

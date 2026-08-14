# GHFRC Website

GHFRC Website is the public website codebase and a reusable website template. Framework development, skins, branches, Pull Requests, Issues, and engineering history are maintained in this repository.

The repository contains only replaceable example content. GHFRC's real website content is maintained separately in a private repository and is not part of this project.

## Project Structure

- `framework/`: page structure, components, navigation behavior, and content interfaces.
- `skins/`: replaceable visual themes and design tokens.
- `achievements/`: skin-independent achievement rules, progress, notifications, and sound.
- `content/`: public example content that can be replaced with another team's content.
- `engineering-logs/`: project-wide same-day goals and completed work.
- `docs/`: implementation specifications and cross-module documentation.

The complete sanitized legacy framework and skin history is connected to the `Tony` branch. The public history excludes GHFRC's real content. Use a regular merge commit when merging `Tony` into `main`; do not squash or rebase if the legacy topology must remain visible.

## Use as a Template

1. Download or fork this repository.
2. Replace the files inside `content/` with your own text and media while keeping the documented structure.
3. Install dependencies and start the local development server.

```bash
npm install
npm run dev
```

The local website is available at `http://localhost:4321` by default. The project requires Node.js 24.

## Content Source Priority

The build selects one complete content source in the following order:

1. `GH_FRC_CONTENT_DIR`, when explicitly configured.
2. The public example `content/` folder in this repository.

This keeps public and preview builds on the replaceable example content by default, even when GHFRC's private content repository exists beside the project locally. Set `GH_FRC_CONTENT_DIR` explicitly when a trusted build needs the private content. The selected source must contain both `config/site.yaml` and the required media files; the build does not mix files from different content sources.

## Verification

```bash
npm test
npm run check
npm run build
```

Pull Requests targeting `preview` must pass the `Preview pull request checks` workflow before merging. Direct pushes, force pushes, and branch deletion are blocked for `preview`, including for repository administrators. The request workflow notifies the private content repository after an approved public `preview` update and runs when the repository variable `PREVIEW_DEPLOYMENT_ENABLED` is exactly `true`. It requires the repository Secret `PRIVATE_DEPLOYMENT_TRIGGER_TOKEN`, limited to triggering and reading the private deployment workflow. The private workflow publishes the tested result to `https://preview.ghfrc.pages.dev`, while this public repository records the matching Preview Deployment status without receiving private content or Cloudflare credentials.

## License

The public website code and example content are released under the [MIT License](LICENSE). GHFRC's private content repository and brand assets are not included.

# GHFRC 官网

GHFRC 官网是公开的网站代码库，也是可复用的网站模板。框架开发、皮肤、分支、Pull Request、Issue 和工程历史均在本仓库中公开维护。

本仓库只包含可替换的示例内容。GHFRC 官网的真实内容单独保存在私有仓库中，不属于本项目的一部分。

## 项目结构

- `framework/`：页面结构、组件、导航行为和内容接口。
- `skins/`：可替换的视觉主题和设计令牌。
- `achievements/`：不依赖皮肤的成就规则、进度、通知和声音。
- `content/`：可由其他队伍直接替换的公开示例内容。
- `engineering-logs/`：项目所有模块当天的目标与实际完成工作。
- `docs/`：实施规格和跨模块文档。

经过净化的旧框架与皮肤完整历史已经连接到 `Tony` 分支，公开历史不包含 GHFRC 真实内容。将 `Tony` 合并到 `main` 时应使用普通 Merge commit；如需保留旧历史拓扑，不要使用 Squash 或 Rebase。

## 作为模板使用

1. 下载或 Fork 本仓库。
2. 保持文档约定的结构，用自己的文字和媒体替换 `content/` 中的文件。
3. 安装依赖并启动本地开发服务器。

```bash
npm install
npm run dev
```

本地网站默认使用 `http://localhost:4321`，项目要求使用 Node.js 24。

## 内容来源优先级

构建时按照以下顺序选择一套完整内容来源：

1. 明确设置的 `GH_FRC_CONTENT_DIR`。
2. 本仓库中的公开示例 `content/` 文件夹。

这样，即使 GHFRC 私有内容仓库位于本项目旁边，公开构建和预览构建默认仍会使用可替换的示例内容。只有受信任的构建需要使用私有内容时，才明确设置 `GH_FRC_CONTENT_DIR`。所选来源必须同时包含 `config/site.yaml` 和所需媒体文件，构建过程不会混用不同来源中的文件。

## 验证

```bash
npm test
npm run check
npm run build
```

以 `preview` 为目标分支的 Pull Request 必须通过 `Preview pull request checks` 工作流后才能合并。`preview` 禁止直接推送、强制推送和删除分支，并且仓库管理员同样不能绕过。请求工作流会在获准合并的公开 `preview` 更新后通知私有内容仓库，并在仓库变量 `PREVIEW_DEPLOYMENT_ENABLED` 严格等于 `true` 时运行。该工作流需要仓库 Secret `PRIVATE_DEPLOYMENT_TRIGGER_TOKEN`，其权限仅限触发和读取私有部署工作流。私有工作流会将通过测试的结果发布至 `https://preview.ghfrc.pages.dev`，公开仓库则记录对应的 Preview Deployment 状态，但不会获得私有内容或 Cloudflare 凭据。

## 许可证

公开网站代码和示例内容使用 [MIT License](LICENSE)。GHFRC 私有内容仓库及品牌资产不包含在内。

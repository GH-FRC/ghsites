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

This keeps public builds on the replaceable example content by default, even when GHFRC's private content repository exists beside the project locally. Set `GH_FRC_CONTENT_DIR` explicitly when a trusted build needs the private content. The selected source must contain locale-specific site configuration under `config/locales/`, exactly eight primary Markdown files in each enabled locale folder under `pages/`, the `robots/` and `news/` collection directories, and every media file referenced by those documents. Before each build, the staging script clears the previous staged content and copies only validated, explicitly referenced media from the selected source, so files from different content sets cannot be mixed.

## Languages

The current site generates Simplified Chinese and English content pages under `/zh-cn/` and `/en/`. Unprefixed entry routes choose Simplified Chinese for any Chinese browser language and English for every other language. A visitor's manual choice is stored for later visits, and the language control preserves the current page, query, and fragment when switching.

Simplified Chinese is the complete base content. English files are independent overlays: missing structured fields and stable-ID list items fall back to their Simplified Chinese counterparts, while an empty English Markdown body falls back to the Simplified Chinese body. The translation report remains non-blocking, but English pages stay `noindex` until required English content is complete. Unified Traditional Chinese using `/zh-hant/` is reserved for a later release and is not generated now.

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

这样，即使 GHFRC 私有内容仓库位于本项目旁边，公开构建默认仍会使用可替换的示例内容。只有受信任的构建需要使用私有内容时，才明确设置 `GH_FRC_CONTENT_DIR`。所选来源必须包含 `config/locales/` 下按语言划分的全站配置、`pages/` 下每个启用语言严格对应 8 个主要页面的 Markdown 文件、`robots/` 与 `news/` 内容集合目录，以及这些文档明确引用的全部媒体文件。每次构建前，暂存脚本都会先清空上一次的暂存内容，再从当前内容来源复制经过校验且被明确引用的媒体，因此不会混用不同内容集中的文件。

## 语言

当前网站生成简体中文与英文内容页面，路径分别以 `/zh-cn/` 和 `/en/` 开头。无语言前缀入口会将任何中文浏览器语言映射到简体中文，将所有其他语言映射到英文。访客的手动选择会留待以后访问继续使用；切换语言时会保留当前页面、查询参数和页面片段。

简体中文是完整基础内容，英文文件是相互独立的覆盖内容：缺失的结构化字段及带稳定 ID 的列表项目会回退到对应简体中文内容；英文 Markdown 正文为空时，整段正文回退到简体中文。翻译检查不会阻断构建，但在必需英文内容全部完成前，英文页面保持 `noindex`。未来统一繁体中文使用 `/zh-hant/`，当前版本不生成该语言。

## 验证

```bash
npm test
npm run check
npm run build
```

以 `preview` 为目标分支的 Pull Request 必须通过 `Preview pull request checks` 工作流后才能合并。`preview` 禁止直接推送、强制推送和删除分支，并且仓库管理员同样不能绕过。请求工作流会在获准合并的公开 `preview` 更新后通知私有内容仓库，并在仓库变量 `PREVIEW_DEPLOYMENT_ENABLED` 严格等于 `true` 时运行。该工作流需要仓库 Secret `PRIVATE_DEPLOYMENT_TRIGGER_TOKEN`，其权限仅限触发和读取私有部署工作流。私有工作流会将通过测试的结果发布至 `https://preview.ghfrc.pages.dev`，公开仓库则记录对应的 Preview Deployment 状态，但不会获得私有内容或 Cloudflare 凭据。

## 许可证

公开网站代码和示例内容使用 [MIT License](LICENSE)。GHFRC 私有内容仓库及品牌资产不包含在内。

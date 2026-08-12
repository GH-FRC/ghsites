# GHFRC Website

GHFRC Website is the public website codebase and a reusable website template. Framework development, skins, branches, Pull Requests, Issues, and engineering history are maintained in this repository.

The repository contains only replaceable example content. GHFRC's real website content is maintained separately in a private repository and is not part of this project.

## Project Structure

- `framework/`: page structure, components, navigation behavior, and content interfaces.
- `skins/`: replaceable visual themes and design tokens.
- `content/`: public example content that can be replaced with another team's content.
- `engineering-logs/`: project-wide same-day goals and completed work.
- `docs/`: implementation specifications and cross-module documentation.

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
2. A sibling folder named `ghfrc-website-content`, when present.
3. The public example `content/` folder in this repository.

This allows the public project to run independently while letting GHFRC use its private sibling content repository locally. The selected source must contain both `config/site.yaml` and the required media files; the build does not mix files from different content sources.

## Verification

```bash
npm test
npm run check
npm run build
```

## License

The public website code and example content are released under the [MIT License](LICENSE). GHFRC's private content repository and brand assets are not included.

# GHFRC 官网

GHFRC 官网是公开的网站代码库，也是可复用的网站模板。框架开发、皮肤、分支、Pull Request、Issue 和工程历史均在本仓库中公开维护。

本仓库只包含可替换的示例内容。GHFRC 官网的真实内容单独保存在私有仓库中，不属于本项目的一部分。

## 项目结构

- `framework/`：页面结构、组件、导航行为和内容接口。
- `skins/`：可替换的视觉主题和设计令牌。
- `content/`：可由其他队伍直接替换的公开示例内容。
- `engineering-logs/`：项目所有模块当天的目标与实际完成工作。
- `docs/`：实施规格和跨模块文档。

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
2. 同级目录中的 `ghfrc-website-content` 文件夹。
3. 本仓库中的公开示例 `content/` 文件夹。

因此，公开项目可以独立运行，GHFRC 本地开发时也可以自动使用同级私有内容仓库。所选来源必须同时包含 `config/site.yaml` 和所需媒体文件，构建过程不会混用不同来源中的文件。

## 验证

```bash
npm test
npm run check
npm run build
```

## 许可证

公开网站代码和示例内容使用 [MIT License](LICENSE)。GHFRC 私有内容仓库及品牌资产不包含在内。

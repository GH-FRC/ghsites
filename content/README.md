# Example Content

This folder contains public, replaceable example content for the website template. It does not contain GHFRC's private website media.

- `config/locales/zh-CN/site.yaml`: complete Simplified Chinese site metadata, navigation, accessibility labels, homepage hero copy, and interface text.
- `config/locales/en/site.yaml`: independent English overrides for site-wide interface text.
- `pages/zh-CN/`: the complete Simplified Chinese base documents for the eight primary pages.
- `pages/en/`: independent English overlay documents for the same eight English-slug pages.
- `robots/`: optional robot detail documents. No fictional robot entry is included in the public example content.
- `news/`: optional news detail documents. No fictional news entry is included in the public example content.
- `media/images/`: replaceable example images. The included `placeholder-logo.png` is exactly `400 × 138 px`.
- `media/videos/`: replaceable example videos and usage notes.

Media objects default to `type: image`. Set `type: video` for video files and provide the same intrinsic dimensions and accessible `alt` description. Video entries can also provide a `poster` path and a `captions` list containing `/content/` WebVTT paths, language codes, and visible labels.

Every enabled locale folder must contain exactly the same eight page filenames. Simplified Chinese supplies the complete base. English frontmatter can override individual fields and stable-ID list items; omitted values fall back to Simplified Chinese. An empty English Markdown body uses the complete Simplified Chinese body. Run `npm run check:translations` from the project root to list missing English content without blocking a build.

Replace the files in this folder with one complete content set. Do not place passwords, access tokens, private contact details, or licensed brand assets in a public fork.

# 示例内容

本文件夹保存网站模板中公开且可替换的示例内容，不包含 GHFRC 官网的私有媒体。

- `config/locales/zh-CN/site.yaml`：完整的简体中文全站元数据、导航、无障碍标签、首页首屏文字和界面文字。
- `config/locales/en/site.yaml`：独立的英文全站界面覆盖内容。
- `pages/zh-CN/`：8 个主要页面的完整简体中文基础文档。
- `pages/en/`：使用相同英文文件名的 8 个独立英文覆盖文档。
- `robots/`：可选的机器人详情文档。公开示例内容不包含虚构的机器人条目。
- `news/`：可选的新闻详情文档。公开示例内容不包含虚构的新闻条目。
- `media/images/`：可替换的示例图片，其中 `placeholder-logo.png` 的尺寸严格为 `400 × 138 px`。
- `media/videos/`：可替换的示例视频和使用说明。

媒体对象默认使用 `type: image`。视频文件应设置 `type: video`，并同样提供原始尺寸和可访问的 `alt` 描述。视频条目还可以提供 `poster` 封面路径，以及包含 `/content/` WebVTT 路径、语言代码和可见标签的 `captions` 列表。

每个启用语言文件夹必须包含完全相同的 8 个页面文件名。简体中文提供完整基础内容；英文 Frontmatter 可以覆盖单个字段及带稳定 ID 的列表项目，缺失值回退到简体中文；英文 Markdown 正文为空时使用完整的简体中文正文。请从项目根目录运行 `npm run check:translations`，列出缺失英文内容而不阻断构建。

请使用一套完整内容替换本文件夹中的文件。公开 Fork 中不得加入密码、访问令牌、私人联系方式或未获授权的品牌资产。

# Example Content

This folder contains public, replaceable example content for the website template. It does not contain GHFRC's private website media.

- `config/site.yaml`: site-wide metadata, navigation labels, accessibility labels, home-page hero copy, and legacy compatibility fields.
- `pages/`: the eight primary page documents. Frontmatter controls page metadata and home-page summaries; Markdown holds the page body.
- `robots/`: optional robot detail documents. No fictional robot entry is included in the public example content.
- `news/`: optional news detail documents. No fictional news entry is included in the public example content.
- `media/images/`: replaceable example images. The included `placeholder-logo.png` is exactly `400 × 138 px`.
- `media/videos/`: replaceable example videos and usage notes.

During the framework transition, `config/about-frc.yaml`, the legacy fields under `config/site.yaml` `hero`, and `sections` remain available for older framework branches. New multi-page framework work should use `pages/` as the source of page content. Remove compatibility files and fields only after every supported branch has migrated.

Replace the files in this folder with one complete content set. Do not place passwords, access tokens, private contact details, or licensed brand assets in a public fork.

# 示例内容

本文件夹保存网站模板中公开且可替换的示例内容，不包含 GHFRC 官网的私有媒体。

- `config/site.yaml`：全站元数据、导航文字、无障碍标签、首页首屏文字及旧框架兼容字段。
- `pages/`：8 个主要页面文档。Frontmatter 管理页面元数据和首页摘要，Markdown 保存页面正文。
- `robots/`：可选的机器人详情文档。公开示例内容不包含虚构的机器人条目。
- `news/`：可选的新闻详情文档。公开示例内容不包含虚构的新闻条目。
- `media/images/`：可替换的示例图片，其中 `placeholder-logo.png` 的尺寸严格为 `400 × 138 px`。
- `media/videos/`：可替换的示例视频和使用说明。

在框架迁移期间，`config/about-frc.yaml`、`config/site.yaml` 中 `hero` 下的旧字段及 `sections` 将继续保留，供旧框架分支兼容使用。新的多页面框架应将 `pages/` 作为页面内容来源。只有在所有受支持的分支均完成迁移后，才可删除这些兼容文件和字段。

请使用一套完整内容替换本文件夹中的文件。公开 Fork 中不得加入密码、访问令牌、私人联系方式或未获授权的品牌资产。

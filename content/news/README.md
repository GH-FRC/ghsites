---
entryType: guide
---

# News Detail Content

Add one Markdown file for each real news item that should appear on the News page. The file name becomes the detail-page path and should use a short lowercase English slug.

Each document requires these frontmatter fields:

- `entryType`: use `news` for a real news entry.
- `title`: the published headline.
- `summary`: short copy for the news list.
- `description`: the detail page's metadata description.
- `publishedAt`: the real publication date in an unambiguous date format.
- `cover`: an optional `/content/` media path, accessible description, and intrinsic pixel dimensions.
- `cover.type`: omit it or use `image` for an image; use `video` for a video with controls, and add optional poster and WebVTT caption fields.
- `published`: whether the entry should appear on the public website.

Write the full article in the Markdown body. Do not create fictional news to fill an empty page; the framework displays the configured empty state when this folder contains no published entries.

# 新闻详情内容

每条需要在“新闻动态”页面展示的真实新闻应使用一个独立的 Markdown 文件。文件名会成为详情页路径，应采用简短的英文小写 Slug。

每份文档的 Frontmatter 必须包含以下字段：

- `entryType`：真实新闻条目应填写为 `news`。
- `title`：正式发布的新闻标题。
- `summary`：用于新闻列表的简短摘要。
- `description`：详情页的元数据描述。
- `publishedAt`：采用明确日期格式填写的真实发布日期。
- `cover`：可选的封面媒体，包括以 `/content/` 开头的路径、可访问描述和媒体原始像素尺寸。
- `cover.type`：图片可省略或填写 `image`；带播放控件的视频填写 `video`，并可补充封面与 WebVTT 字幕字段。
- `published`：是否在公开网站上显示该条目。

请在 Markdown 正文中填写完整新闻。不要为了填满空白页面而虚构新闻；当本文件夹中没有已发布条目时，框架会显示已配置的空状态。

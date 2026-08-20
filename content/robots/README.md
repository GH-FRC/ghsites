---
entryType: guide
---

# Robot Detail Content

Add one Markdown file for each real robot that should appear on the Robots page. The file name becomes the detail-page path and should use a short lowercase English slug.

Each document requires these frontmatter fields:

- `entryType`: use `robot` for a real robot entry.
- `title`: the robot's official display name.
- `season`: the real competition season.
- `summary`: short copy for the large poster.
- `description`: the detail page's metadata description.
- `poster`: a `/content/` media path, accessible description, and intrinsic pixel dimensions.
- `poster.type`: omit it or use `image` for an image; use `video` for a video with controls, and add optional poster and WebVTT caption fields.
- `published`: whether the entry should appear on the public website.

Write the full robot story in the Markdown body. Do not create fictional robots to fill an empty page; the framework displays the configured empty state when this folder contains no published entries.

# 机器人详情内容

每台需要在“机器人”页面展示的真实机器人应使用一个独立的 Markdown 文件。文件名会成为详情页路径，应采用简短的英文小写 Slug。

每份文档的 Frontmatter 必须包含以下字段：

- `entryType`：真实机器人条目应填写为 `robot`。
- `title`：机器人的正式展示名称。
- `season`：真实参赛赛季。
- `summary`：用于大型海报的简短介绍。
- `description`：详情页的元数据描述。
- `poster`：以 `/content/` 开头的媒体路径、可访问描述和媒体原始像素尺寸。
- `poster.type`：图片可省略或填写 `image`；带播放控件的视频填写 `video`，并可补充封面与 WebVTT 字幕字段。
- `published`：是否在公开网站上显示该条目。

请在 Markdown 正文中填写完整的机器人介绍。不要为了填满空白页面而虚构机器人；当本文件夹中没有已发布条目时，框架会显示已配置的空状态。

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
- `poster`: a `/content/` image path, alternative text, and intrinsic pixel dimensions.
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
- `poster`：以 `/content/` 开头的图片路径、替代文字和图片原始像素尺寸。
- `published`：是否在公开网站上显示该条目。

请在 Markdown 正文中填写完整的机器人介绍。不要为了填满空白页面而虚构机器人；当本文件夹中没有已发布条目时，框架会显示已配置的空状态。

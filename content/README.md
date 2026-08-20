# Example Content

This folder contains public, replaceable example content for the website template. It does not contain GHFRC's private website media.

- `config/locales/zh-CN/site.yaml`: complete Simplified Chinese navigation, headings, accessibility labels, and placeholder copy.
- `config/locales/zh-CN/about-frc.yaml`: complete Simplified Chinese content for the independent About FRC page.
- `config/locales/en/site.yaml`: independent English overlay for site content.
- `config/locales/en/about-frc.yaml`: independent English overlay for the About FRC page.
- `media/images/`: replaceable example images. The included `placeholder-logo.png` is exactly `400 × 138 px`.
- `media/videos/`: replaceable example videos and usage notes.

Simplified Chinese is the base content. A missing or blank English field falls back to only the matching Simplified Chinese field or paragraph. This fallback is silent for visitors and is reported by `npm run check:translations`. While any required English field is missing, generated English pages stay out of search indexes; all of them become indexable automatically after the English content is complete.

Keep each list item's stable `id` unchanged across locale files. The ID, rather than the item's position, associates an English translation with its Simplified Chinese source. A locale can override media fields to use a different image or video; omit those fields to share the Simplified Chinese media.

The current website generates only `/zh-cn/` and `/en/`. A unified Traditional Chinese locale at `/zh-hant/` is planned but does not have content files or generated pages yet.

Replace the files in this folder with one complete content source. A trusted private source is loaded only when `GH_FRC_CONTENT_DIR` explicitly points to its root. Do not place passwords, access tokens, private contact details, or licensed brand assets in a public fork.

# 示例内容

本文件夹保存网站模板中公开且可替换的示例内容，不包含 GHFRC 官网的私有媒体。

- `config/locales/zh-CN/site.yaml`：完整的简体中文导航、栏目标题、无障碍标签和占位文字。
- `config/locales/zh-CN/about-frc.yaml`：完整的简体中文“关于 FRC”独立页面内容。
- `config/locales/en/site.yaml`：独立的英文网站内容覆盖文件。
- `config/locales/en/about-frc.yaml`：独立的英文“关于 FRC”页面覆盖文件。
- `media/images/`：可替换的示例图片，其中 `placeholder-logo.png` 的尺寸严格为 `400 × 138 px`。
- `media/videos/`：可替换的示例视频和使用说明。

简体中文是基础内容。某个英文字段为空或缺失时，只为对应字段或段落回退到简体中文。访客不会看到回退提示，`npm run check:translations` 会为维护者报告缺失字段。只要仍有任一必需英文字段缺失，生成的英文页面就不会被搜索引擎收录；英文内容完整后，系统会自动允许全部英文页面被收录。

语言文件之间必须保持每个列表项目的稳定 `id` 不变。系统按照 ID 而不是项目位置，将英文翻译与简体中文源内容对应。某种语言可以覆盖媒体字段以使用不同图片或视频；省略媒体字段时共用简体中文媒体。

当前网站只生成 `/zh-cn/` 和 `/en/`。未来计划使用 `/zh-hant/` 提供统一繁体中文，但目前没有相应内容文件，也不会生成相应页面。

请使用一套完整内容来源替换本文件夹中的文件。受信任的私有内容只有在 `GH_FRC_CONTENT_DIR` 明确指向其根目录时才会载入。公开 Fork 中不得加入密码、访问令牌、私人联系方式或未获授权的品牌资产。

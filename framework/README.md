# Framework

The framework module owns the GHFRC website's page structure, components, routes, navigation behavior, responsive layout, accessibility foundation, and content interfaces. It does not store GHFRC's private production content or define the visual identity of future skins.

The current implementation includes:

- An Astro static site with a homepage overview and eight primary pages.
- Future-ready robot and news detail routes driven by Markdown collections.
- Shared header, footer, breadcrumbs, metadata, compact navigation, and keyboard-accessible controls.
- Responsive layouts for phone, iPad, and desktop widths, with a compact menu at narrow widths.
- A light and dark mode control that follows the operating system on every page load; a manual choice affects only the current document and is not stored.
- Header behavior that hides while scrolling down, returns while scrolling up, and remains available during navigation-triggered scrolling.
- Legacy redirects from the former homepage hashes and `/about-frc/` route.
- Content validation, safe media staging, static-output verification, and interaction tests.
- Optional integration with the independent `achievements/` runtime through stable page markers; removing that module does not prevent the framework from building.

Run development, testing, checking, and build commands from the project root so the selected content is validated and staged before Astro runs.

# 框架

框架模块负责 GHFRC 官网的页面结构、组件、路由、导航行为、响应式布局、无障碍基础和内容接口。它不保存 GHFRC 的私有正式内容，也不定义未来皮肤的具体视觉风格。

当前实现包括：

- 由首页汇总页和 8 个主要页面组成的 Astro 静态网站。
- 由 Markdown 内容集合驱动、可供未来使用的机器人和新闻详情路由。
- 全站共用的标题栏、页脚、面包屑、页面元数据、紧凑导航和键盘可操作控件。
- 适配手机、iPad 和桌面宽度的响应式布局，并在窄屏使用紧凑菜单。
- 每次加载页面时重新跟随操作系统的深色／浅色模式；访客手动切换只影响当前页面，不会保存。
- 向下滚动时隐藏、向上滚动时返回，并在导航触发滚动期间保持可用的标题栏行为。
- 从旧首页 Hash 和 `/about-frc/` 路径进入新页面的兼容跳转。
- 内容校验、安全媒体暂存、静态产物检查和交互测试。
- 通过稳定的页面标记可选接入独立 `achievements/` 运行时；完整移除该模块也不会阻止框架构建。

请从项目根目录运行开发、测试、检查和构建命令，以确保 Astro 启动前已经校验并暂存所选内容。

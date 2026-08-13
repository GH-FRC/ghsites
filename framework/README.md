# Framework

本模块负责 GHFRC 官网的页面结构、组件、导航行为、内容接口和基础黑白样式。

本模块不保存 GHFRC 的内部正式内容，也不包含正式皮肤。

当前实现包括：

- Astro 静态单页。
- TypeScript 内容接口与交互脚本。
- 从相邻 `content/` 模块读取 YAML 的 Astro Content Collection。
- 使用 CSS Custom Properties 定义的基础黑白框架样式。
- 导航定位、Logo 返回顶部和标题栏滚动行为测试。
- 跟随系统设置并支持会话内手动切换的深色／浅色模式。

请从总项目目录运行开发、测试、检查和构建命令，以确保内容暂存步骤同时执行。

# Achievements

The `achievements` module adds reusable, skin-independent achievement behavior to the website. It owns achievement progress, notification sequencing, the notification UI, and the original Web Audio notification sound.

The framework discovers the module through one optional initialization seam and explicit `data-achievement-section` markers. Every uniquely marked section present when the page initializes is part of the complete-browsing requirement. If the complete `achievements/` directory is removed, the framework continues to install, test, check, and build without achievement behavior.

## Public Interface

```ts
import { initializeAchievementSystem } from '@gh-frc/achievements';

initializeAchievementSystem();
```

The default implementation stores monotonic progress facts in `localStorage`, coordinates simultaneous page instances, and shares one session when initialized repeatedly in the same document. A notification is never exposed unless its paired sound starts. If the browser blocks audio, the notification remains pending until a later eligible interaction.

The module exports the `AchievementSoundPlayer` interface so the original synthesized sound can be replaced later without changing achievement rules or framework integration.

## Verification

From the project root:

```bash
npm --workspace @gh-frc/achievements test
```

# 成就系统

`achievements` 模块为官网提供可复用且不依赖皮肤的成就功能。本模块负责成就进度、通知排序、通知 UI 以及原创的 Web Audio 提示音。

框架通过一个可选初始化 seam 和明确的 `data-achievement-section` 标记发现本模块。页面初始化时存在的每个唯一标记区域都会被计入完整浏览要求。如果完整删除 `achievements/` 目录，框架仍然可以在不启用成就功能的情况下正常安装、测试、检查和构建。

## 公开接口

```ts
import { initializeAchievementSystem } from '@gh-frc/achievements';

initializeAchievementSystem();
```

默认实现使用 `localStorage` 保存只增不减的进度事实，协调同时打开的页面实例，并在同一 document 被重复初始化时共享一个 session。只有配对声音已经开始播放时，通知才会对访客显示。如果浏览器阻止音频，通知会保持待处理状态，直到后续符合条件的用户操作发生。

本模块导出 `AchievementSoundPlayer` interface，因此以后可以替换原创合成音效，而不需要修改成就规则或框架接入方式。

## 验证

在总项目目录运行：

```bash
npm --workspace @gh-frc/achievements test
```

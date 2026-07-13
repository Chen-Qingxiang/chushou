# Goal 进展

最后更新：2026-07-13

## 已完成

- 读取并分解总任务书。
- 检查工作区、Git 分支、远程、提交历史、Pages workflow 和全部运行源码。
- 确认审计开始时工作树干净；创建 `codex/goal-chushou-system` 工作分支。
- 完成 MVP 数据和界面事实审计，明确所有旧历史内容必须重新经证据门禁。
- 阅读本地 SongScope `AGENTS.md`、完整 design book 的核心章节和现有 Zod schema。
- 确定静态优先 workspace、独立 `chs:` ID、三层投影和证据门禁四项首批决策。
- 建立目标计划、审计、决策、研究日志、来源策略、引用规范和录入手册。
- 完成 TypeScript workspace、Zod schema、稳定 ID、受控词表、跨文件校验和确定性生成器。
- 迁移到 React 19 + Vite 8 正式应用，旧 HTML／CSS／JS 原型不再参与生产发布。
- 建立 59 个时期化官名概念、83 条主张和 97 条证据关联；reviewed 主张证据覆盖率为 100%。
- 建成首页、官名、制度地图、沿革、苏轼官履与任命详情、量化、解码器、比较、来源、学习、模拟和数据页面的真实路由。
- 完成简繁／拼音／轻量模糊搜索、证据抽屉、下载导出、深链接与应用内 404。
- 增加 6 条单元／集成测试和 5 条 Chromium 关键用户旅程；桌面和 390px 移动端完成首轮视觉复核。
- 将 Pages workflow 改为先执行格式、lint、严格类型、数据校验、单测、构建和 E2E，再发布经过验证的 `dist/`。

## 当前工作

- 扩充机构版本、方向关系与品秩骨架，让制度地图从诚实缺口提升为可证网络。
- 继续苏轼 coverage matrix，并增加王安石、司马光、章惇反例纵切。
- 完成比较器、路径模拟和数据下载的研究级交互与性能优化。

## 已运行证据

```text
npm run data:validate
Validated 0.1.0-research.1: 59 title concepts, 83 assertions, 97 evidence links.

npm run typecheck
npm run lint
npm test
Test Files 1 passed; Tests 6 passed.

npm run test:e2e
5 passed (Chromium)
```

## 下一步

1. 建立三省、枢密院、御史台、翰林学士院等机构版本与关系。
2. 补品秩方案并将已证官名连接到机构／品秩。
3. 加入三名反例人物的真实小切片。
4. 继续整理苏轼年谱材料可得性和明确的 coverage 缺口。

## 尚未声称完成的事项

- 苏轼官履尚未达到选定年谱全覆盖。
- 当前 59 个官名主要覆盖卷 161、162、164 的中央核心官，不等于全宋官名集。
- 机构关系、品秩、反例人物、完整比较器、性能预算和 WCAG 审计仍在执行计划内。

# 参与贡献

“除授”接受代码、数据、研究说明和可访问性改进。历史数据改动必须能让下一位研究者从结构化主张回到原文与版本定位；记录数量不能替代证据质量。

## 开始之前

需要 Node.js 24 和 npm。安装与完整本地门禁：

```bash
npm ci
npm run ci
npm run test:e2e
```

浏览器测试首次运行前可执行 `npx playwright install chromium`。`npm run ci` 包含格式、lint、严格类型、数据与 JSON Schema 校验、单元／集成测试、构建和静态性能预算。

## 数据改动

1. 先阅读 `docs/research/DATA_ENTRY_GUIDE.md`、`CITATION_GUIDE.md` 和 `SOURCE_STRATEGY.md`。
2. 只编辑 `data/curated/`；不得手改 `data/generated/` 或站点投影。
3. 使用 `chs:<kind>:<slug>` 稳定 ID，既有 ID 不因显示名称变化而重写。
4. 原文 passage、标准化 assertion、解释和界面白话分层保存。
5. reviewed／accepted 的实质主张必须有 supporting evidence link；不确定内容应标为 candidate、disputed、gap 或 blocked。
6. 任命动作与实际任事分别记录；无法解析的原文 span 必须保留，不能静默丢弃。
7. 修改后运行 `npm run data:generate`，提交确定性生成物与自动报告；若 schema 改变，再运行 `npm run schema:json`。

覆盖矩阵必须说明分母及其范围。无法取得合法全文、版本不明或尚未核对时，记录具体 blocker，并继续处理不依赖它的工作，不得以代表性条目声称完整。

## 代码改动

- 应用只消费生成投影，研究规则留在 schema／domain／ingest 层；
- 新路由须能直接刷新、键盘操作，并包含加载、空状态和错误状态；
- 新的实质交互应补单元或 Playwright 测试；
- 不降低 `tools/quality/performance-budget.ts` 的预算来掩盖回归；
- 自动 axe 检查不是人工 WCAG 审计的替代品，涉及交互变化时还应检查焦点顺序、可见焦点和移动端布局。

小而完整的提交最容易审阅。提交说明应解释改变的用户／研究结果，而不只列出文件名。

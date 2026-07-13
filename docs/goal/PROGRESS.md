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
- 建立 59 个官名概念、60 个时期版本、121 条主张和 140 条证据关联；reviewed 主张证据覆盖率为 100%。
- 建立 11 个机构、时期化机构版本和 4 条带方向／类型的关系，制度地图可按时期检查证据。
- 建立 3 个局部品秩方案、13 个阶位条目、3 条原文直载换官边和 1 条低置信度争议候选边。
- 将 coverage matrices 纳入 release schema；穷尽枚举《宋史》卷338的 38 条任官／身份语句，其中 13 条 partial、25 条 gap，每条均连到 passage。
- 核实孔凡礼《苏轼年谱》1998年中华书局三册本书目，并把权威年谱分母因合法全文不可得明确标为 blocked。
- 建成首页、官名、制度地图、沿革、苏轼官履与任命详情、量化、解码器、比较、来源、学习、模拟和数据页面的真实路由。
- 制度地图新增 URL 驱动的时期／范围筛选、节点聚焦和 80–120% 缩放；制度沿革支持时期 A／B 双向选择与证据化覆盖差异。
- “侍中”建立改制前后两个真实 usage version，用同一来源段落分别限制“高秩罕除”与改制后虚位／兼行职掌，领域测试证明同名不沿用静态解释。
- 多维政治位置页按中央核心程度、实际权力、名义品级、资望和皇帝信任相关信号显示可展开状态轨；事实、规则代理与 coverage gap 分开，无总分。
- 原文解码器统一调用领域层规则，能解析动作词、时间副词、时期候选、未知 span 与动作—官衔关系；UI 不再维护第二套解析逻辑。
- 来源页支持来源／人物／官名／时期筛选，并从来源反查 Passage→EvidenceLink→Assertion；所有页面头部可复制当前深链接。
- 任命详情补齐前后任命链、任命机关状态、官名版本关联的机构关系和明确的人物前任／同僚 coverage gap。
- 完成简繁／拼音／轻量模糊搜索、证据抽屉、下载导出、深链接与应用内 404。
- 比较器支持同一人物前后任命、两个官名按共同时间镜头，以及苏轼／王安石／司马光／章惇制度位置三种模式；选择状态进入 URL。
- 正式导出扩为 release JSON、manifest、官名／任命／证据／覆盖 CSV 和机器可读数据字典；CSV 逐行携带版本、许可和引用信息。
- 路径实验室可按 URL 回放四名人物的已发布任命序列，并逐步检查任事证据、处分／限制、未解析成分与时间精度；未成熟的通用晋升和概率规则保持锁定。
- 增加 14 条单元／集成测试和 19 条 Chromium 关键／无障碍旅程；1440px 桌面和 390px 移动端完成视觉复核。
- 将 Pages workflow 改为先执行格式、lint、严格类型、数据校验、单测、构建和 E2E，再发布经过验证的 `dist/`。
- 导出并提交完整 dataset JSON Schema；CI 会检测 schema 是否落后于 Zod 源。
- 建立静态性能预算，当前 HTML、JS、CSS、最大路由 chunk 与站点投影全部通过。
- 对 13 个代表性深链接完成 axe WCAG A／AA 与 console error 自动检查，并补齐搜索、证据侧栏、skip link 和移动导航的键盘旅程。
- 补齐贡献指南、代码／数据许可证、机器可读引用元数据、性能／无障碍报告与最终交付说明。
- 建立可复现 Lighthouse 移动模拟运行器；首页／官名详情／苏轼官履／制度地图／多维轨迹 Performance 为 90／98／98／98／98，Accessibility 均为 100。
- 补齐 README 生产构建截图与 Pages 目标地址；地址在 2026-07-13 仍为 404，需合并 `main` 后由 workflow 首次发布。

## 后续研究工作

- 继续扩充品秩方案覆盖，但保持局部 sequence 与全表绝对编号的区别。
- 在取得合法年谱文本前，按卷338 gap 优先补高价值真实 appointment；三名反例人物先保持诚实的小切片边界。
- 在固定辅助技术和网络环境中继续人工 WCAG／Lighthouse 基线抽查。
- GitHub Pages 的首次远端发布需要经授权推送并合并当前分支；本地不伪装为已上线。

## 已运行证据

```text
npm run data:validate
Validated 0.3.1-research.1: 59 title concepts, 121 assertions, 140 evidence links.

npm run typecheck
npm run lint
npm test
Test Files 1 passed; Tests 14 passed.

npm run test:e2e
19 passed (Chromium; includes named core flows, axe and keyboard journeys)

npm run quality:budget
7 static asset budgets passed.

npm run quality:lighthouse
Home 90/100; title detail 98/100; Su Shi career 98/100;
institution map 98/100; career metrics 98/100
(Performance/Accessibility; all Accessibility 100; mobile simulated throttling)
```

## 下一步（仅外部授权／材料阻塞）

1. 取得可合法使用的孔凡礼年谱纸本／数据库文本并建立权威分母；在此之前不声称完整。
2. 获得远端写入／合并授权后触发 Pages 首次发布并复核在线深链接。

不依赖外部授权的本地产品、数据门禁、文档、测试、视觉和性能验收已通过；详细矩阵见 `docs/goal/COMPLETION_AUDIT.md`。

## 尚未声称完成的事项

- 苏轼官履尚未达到选定年谱全覆盖。
- 当前 59 个官名主要覆盖卷 161、162、164 的中央核心官，不等于全宋官名集。
- 完整品秩表和通用概率路径规则仍未声称完成；自动无障碍检查也不等同于完整人工 WCAG 一致性审计。
- 三名反例人物目前各一条真实任命，只证明通用模型能够容纳，不是人物官履覆盖。

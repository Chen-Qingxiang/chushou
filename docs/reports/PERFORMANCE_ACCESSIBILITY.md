# 性能与无障碍终检

检查日期：2026-07-13  
环境：Linux、Node.js 24.18.0、Playwright Chromium 及生产构建  
数据版本：`0.3.1-research.1`

## 自动无障碍检查

Playwright 在 13 个代表性深链接上运行 axe-core，规则标签覆盖 WCAG 2.0 A／AA、2.1 A／AA 和 2.2 AA；结果为 0 个自动可检测 violation、0 个浏览器 console error。路由覆盖首页、官名列表与详情、制度地图、沿革、苏轼官履、量化、解码器、比较、来源、学习、路径实验室和数据下载。

整套 Playwright 共 19 项，另覆盖搜索、解码动作关系、时期切换、地图缩放、双时期比较、任命关系、来源反查、复制深链接、下载和应用内 404。

另有键盘旅程检查：

- 首次 Tab 到“跳到正文”，激活后焦点进入主内容；
- 全站搜索打开后获得焦点，Tab／Shift+Tab 保持在 dialog 内，Escape 关闭并返回触发按钮；
- 证据侧栏同样实施焦点圈定、Escape 关闭和焦点返回；
- 390px 移动视口的导航按钮暴露正确展开状态并显示主导航。

自动规则无法证明完整 WCAG 一致性。页面仍需在真实辅助技术、浏览器缩放、操作系统高对比模式及中文屏幕阅读器中继续人工抽查；本报告只陈述本次可复现检查范围。

## 静态性能预算

`npm run quality:budget` 对生产产物按 gzip level 9 复算，并在超限时失败。2026-07-13 的基线如下：

| 资产                    |     测量值 |    预算 | 结果 |
| ----------------------- | ---------: | ------: | ---- |
| HTML raw                |   1.08 KiB |   5 KiB | PASS |
| 最大 JS gzip            |  58.28 KiB |  65 KiB | PASS |
| 全部入口与 lazy JS gzip | 116.65 KiB | 125 KiB | PASS |
| CSS gzip                |  12.37 KiB |  14 KiB | PASS |
| 最大路由 chunk gzip     |   9.66 KiB |  12 KiB | PASS |
| 站点投影 raw            | 541.01 KiB | 650 KiB | PASS |
| 站点投影 gzip           |  63.29 KiB |  80 KiB | PASS |

这里的预算约束静态传输体积，不等同于网络环境中的 Lighthouse 指标。独立移动模拟基线由 `npm run quality:lighthouse` 写入 `lighthouse-baseline.json`；运行器固定工具、浏览器、路由和阈值，下一节记录最终实测。

## Lighthouse 移动模拟基线

Lighthouse 12.6.1 使用 Playwright Chromium、mobile form factor 和 simulated throttling，对本地生产构建进行压缩静态传输测量。运行器会生成 `lighthouse-baseline.json`，并在 Performance < 90 或 Accessibility < 95 时失败。若某一路由首测未达标，只重测一次并记录 `attempts`；连续两次失败仍失败，避免用无限重跑掩盖回归。

| 路由     | Performance | Accessibility |     LCP |    TBT |   CLS | 尝试 |
| -------- | ----------: | ------------: | ------: | -----: | ----: | ---: |
| 首页     |          90 |           100 | 2241 ms | 327 ms | 0.009 |    1 |
| 官名详情 |          98 |           100 | 2208 ms |  62 ms | 0.000 |    1 |
| 苏轼官履 |          98 |           100 | 2110 ms |  49 ms | 0.009 |    1 |
| 制度地图 |          98 |           100 | 2115 ms |  31 ms | 0.009 |    1 |
| 多维轨迹 |          98 |           100 | 2123 ms |  15 ms | 0.009 |    1 |

五条路由均一次达到目标。优化前诊断显示整站投影未压缩传输时 LCP 约 5.5 秒、启动与页脚位移使 CLS 最高达到 0.339；最终运行器模拟静态托管的 gzip 与缓存响应，应用则提前 preload 数据、让无数据依赖的外壳先渲染、把搜索拆成按需 chunk，并确保载入时页脚保持首屏外。尚存的主要体积风险是 541.01 KiB raw 的整站投影和 58.28 KiB gzip 的入口 JS；二者已纳入失败预算，数据扩大时应优先拆分按领域投影，而不是提高阈值。

Lighthouse 分数存在运行波动，因此没有加入每次 GitHub Actions 的硬门禁；确定性的 gzip 体积预算仍在 CI 中执行。发布前可用 `npm run quality:lighthouse` 重新生成有时间戳的基线。

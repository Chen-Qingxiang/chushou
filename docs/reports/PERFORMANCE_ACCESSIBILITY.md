# 性能与无障碍终检

检查日期：2026-07-13  
环境：Linux、Node.js 24.18.0、Playwright Chromium 及生产构建  
数据版本：`0.3.0-research.1`

## 自动无障碍检查

Playwright 在 13 个代表性深链接上运行 axe-core，规则标签覆盖 WCAG 2.0 A／AA、2.1 A／AA 和 2.2 AA；结果为 0 个自动可检测 violation、0 个浏览器 console error。路由覆盖首页、官名列表与详情、制度地图、沿革、苏轼官履、量化、解码器、比较、来源、学习、路径实验室和数据下载。

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
| HTML raw                |   0.81 KiB |   5 KiB | PASS |
| 最大 JS gzip            |  56.00 KiB |  65 KiB | PASS |
| 全部入口与 lazy JS gzip | 109.35 KiB | 125 KiB | PASS |
| CSS gzip                |  10.94 KiB |  14 KiB | PASS |
| 最大路由 chunk gzip     |   7.37 KiB |  12 KiB | PASS |
| 站点投影 raw            | 537.81 KiB | 650 KiB | PASS |
| 站点投影 gzip           |  62.91 KiB |  80 KiB | PASS |

这里的预算约束静态传输体积，不等同于网络环境中的 Lighthouse 指标。仓库目前没有稳定的受控 Lighthouse 运行器，因此不伪造 LCP、CLS 或性能分数；后续应在固定设备／网络节流配置上建立并保存独立基线。

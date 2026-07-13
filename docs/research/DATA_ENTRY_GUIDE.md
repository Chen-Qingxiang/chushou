# 数据录入手册

## 最小工作流

1. 建立或复用 `Source` 与 `Edition`；
2. 录入真实 `SourceLocator`，未知字段保持 `null`；
3. 保存必要 `Passage`，记录转录者、方法和状态；
4. 从 passage 提出 `Assertion`，标明提出者、方法、状态和适用时间；
5. 用 `EvidenceLink` 连接支持、反对或限定关系；
6. 通过人工复核后，才把断言投影为 title usage、appointment、service episode 等领域记录；
7. 运行 `npm run data:validate` 和 coverage 报告；
8. 检查生成 diff，确认没有无意新增的公开解释。

## 官名录入

- 先建立跨时期 `TitleConcept`，名称、异名、简繁、拼音只是可变属性；
- 每个制度阶段建立 `TitleUsageVersion`，记录有效期、类别、三层语义角色、职掌、机构、品秩和 assertion；
- 同名在不同阶段含义不同必须分版本；同一阶段有争议可并存多个 usage assertion；
- 常见搭配和上下级关系必须是显式关联，不写进不可查询的长段落。

## 任命与任职录入

- `AppointmentAction` 保存动作原文、动作类型、任命机关、时间和来源；
- `AppointmentComponent` 按原文范围和顺序拆分官、职、差遣、阶、勋、爵、地点、限定词和处分；
- 未解析文字保存 `unresolved` component，不删除；
- `ServiceEpisode` 单独记录是否赴任、实际起止、代理／权／试／守／行／兼／领和离任原因；
- 受命未赴、辞免、追赠、遥授、安置和不得签书公事都不得伪装为正常任职。

## 品秩与跨方案映射

- 每个 `Rank` 必须属于一个 `RankScheme`；`sequence` 只在该方案及其声明的覆盖范围内比较；
- 方案必须说明排序方向和覆盖状态，局部切片不得使用完整表的措辞；
- 跨制度方案的换官、等值或近似关系写入 `RankCrosswalk`，不把目标 rank 直接覆盖到源记录；
- 原文换官表可用 `explicit_reform_table`；同名只能建立 `same_label_candidate`，并按证据设置低置信度和争议说明；
- 不确定映射仍需 assertion 与 evidence；`disputed` 映射缺少 `disputeNote` 时 schema 直接拒绝。

## 时间录入

- 保存原始年号日期和相对时间文本；
- 标准化结果使用可能区间，不把年级精度伪装成 1 月 1 日精确日；
- `precision` 与 `qualification` 分开；
- 保存换算方法、版本和说明；仅知顺序时使用 sequence，不生成虚构年份。

## 编辑状态

- `incomplete`：必要字段或材料缺失；
- `provisional`：已有线索但未完成定位／交叉核对；
- `reviewed`：定位和语义已人工检查；
- `verified`：达到当前项目的完整复核标准；
- `disputed`：存在实质冲突且不应折叠。

所有状态都可以继续修订；状态变化需保留 `EditorialReview`。

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { deriveCareerSignals, type CareerSignalDimension } from "@chushou/domain";
import {
  actionLabels,
  appointmentPlace,
  dateLabel,
  placeLabel,
  preferredName,
  site,
  titleConceptForUsage,
  titleUsage,
  trackLabels,
} from "../data";
import { EvidenceButton } from "../evidence";
import { EmptyState, PageHeader, StatusBadge } from "../Page";

const componentLabels: Record<string, string> = {
  title: "官名",
  duty: "职务",
  rank: "身份／官阶",
  honor: "荣衔",
  place: "地点",
  modifier: "修饰词",
  punitive_status: "处分状态",
  restriction: "限制",
  unresolved: "未决成分",
};

const institutionRelationLabels: Record<string, string> = {
  reports_to: "上报",
  supervises: "监督",
  part_of: "隶属",
  coordinates_with: "协作",
  checks: "监察／牵制",
  appoints: "任命",
  parallel_to: "平行",
};

export function CareerPage() {
  const { personSlug = "su-shi" } = useParams();
  const [track, setTrack] = useState("all");
  const [view, setView] = useState<"timeline" | "route">("timeline");
  const person = site.people.find((item) => item.slug === personSlug);
  const personAppointments = site.appointments.filter(
    (appointment) => appointment.personId === person?.id,
  );
  const appointments = personAppointments.filter(
    (appointment) =>
      track === "all" ||
      appointment.components.some((component) => component.semanticTracks.includes(track as never)),
  );
  const places = [
    ...new Set(personAppointments.map(appointmentPlace).filter((place) => place !== "地点未定")),
  ];
  if (person === undefined)
    return (
      <div className="page-container">
        <EmptyState title="未找到这位人物">人物可能尚未进入受控数据集。</EmptyState>
      </div>
    );
  const isSuShi = person.slug === "su-shi";
  const personName = preferredName(person);
  const suCoverage = site.coverageMatrices.find(
    (matrix) => matrix.anchorKind === "official_biography",
  );
  const suCoverageLinked =
    suCoverage?.items.filter((item) => item.appointmentIds.length > 0).length ?? 0;

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="人物官履 · CAREER AS MODEL TEST"
        title={`${personName}的官履，不压成一条升降线。`}
        intro={
          isSuShi
            ? "这里分别保存授命、官衔成分、实际服务与居住／处分状态。卷338任官语句已经穷尽枚举，但只完成部分数据库对照；孔凡礼年谱的权威分母仍因全文可得性而阻塞。"
            : "这是用于检验通用模型的小型反例切片：只发布已经定位的任命，不把一条记录包装成完整生涯。"
        }
        actions={
          <Link className="button secondary-button" to="/compare">
            比较任命
          </Link>
        }
      />
      <section className="person-banner">
        <div className="person-monogram">{personName.slice(-1)}</div>
        <div>
          <span>{isSuShi ? "首个纵向压力测试" : "反例小切片"}</span>
          <h2>{personName}</h2>
          <p>{person.description.text}</p>
        </div>
        <dl>
          <div>
            <dt>任命动作</dt>
            <dd>{personAppointments.length}</dd>
          </div>
          <div>
            <dt>实际服务记录</dt>
            <dd>{personAppointments.flatMap((item) => item.serviceEpisodes).length}</dd>
          </div>
          <div>
            <dt>涉及地点</dt>
            <dd>{places.length}</dd>
          </div>
        </dl>
        <EvidenceButton assertionIds={[...person.assertionIds]} title={personName} />
      </section>
      <div className="career-toolbar">
        <div className="segmented-control">
          {["all", "identity_rank", "honor_expertise", "actual_duty", "political_status"].map(
            (item) => (
              <button
                type="button"
                key={item}
                className={track === item ? "is-active" : undefined}
                onClick={() => setTrack(item)}
              >
                {item === "all" ? "综合" : trackLabels[item]}
              </button>
            ),
          )}
        </div>
        <div className="view-toggle">
          <button
            type="button"
            className={view === "timeline" ? "is-active" : undefined}
            onClick={() => setView("timeline")}
          >
            时间线
          </button>
          <button
            type="button"
            className={view === "route" ? "is-active" : undefined}
            onClick={() => setView("route")}
          >
            地点序列
          </button>
        </div>
      </div>
      {view === "timeline" ? (
        appointments.length === 0 ? (
          <EmptyState title="这一轨暂无任命成分">
            切换到“综合”查看全部已发布记录；空白不表示历史上没有该类身份。
          </EmptyState>
        ) : (
          <section className="career-timeline">
            {appointments.map((appointment, index) => (
              <article className="career-node" key={appointment.id}>
                <div className="timeline-marker">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div className="career-node-date">
                  <strong>{dateLabel(appointment.time)}</strong>
                  <small>{appointment.time.originalText}</small>
                </div>
                <Link
                  className="career-node-card"
                  to={`/people/${person.slug}/appointments/${encodeURIComponent(appointment.id)}`}
                >
                  <div>
                    <div className="tag-row action-tags">
                      {appointment.actionTypes.map((action) => (
                        <span key={action}>{actionLabels[action] ?? action}</span>
                      ))}
                    </div>
                    <h3>{appointment.rawText}</h3>
                    <p>
                      {appointment.components
                        .map((component) => component.sourceSpan.text)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="career-card-meta">
                    <strong>{appointmentPlace(appointment)}</strong>
                    <StatusBadge status={appointment.editorialStatus} />
                    <small>
                      {appointment.serviceEpisodes.length > 0
                        ? `${appointment.serviceEpisodes.length} 条服务／状态记录`
                        : "不自动推定到任"}
                    </small>
                  </div>
                </Link>
              </article>
            ))}
          </section>
        )
      ) : (
        <section className="route-sequence">
          <header>
            <div>
              <p className="eyebrow">地点序列 · 非地理比例图</p>
              <h2>从任命地点看迁转与贬谪</h2>
            </div>
            <p>历史地理坐标尚未与 CHGIS 对齐，因此这里按传记顺序排列，不伪造经纬度或行政边界。</p>
          </header>
          <div className="route-line">
            {personAppointments
              .filter((item) => appointmentPlace(item) !== "地点未定")
              .map((appointment, index) => (
                <Link
                  to={`/people/${person.slug}/appointments/${encodeURIComponent(appointment.id)}`}
                  key={appointment.id}
                >
                  <span>{index + 1}</span>
                  <strong>{appointmentPlace(appointment)}</strong>
                  <small>{dateLabel(appointment.time)}</small>
                </Link>
              ))}
          </div>
        </section>
      )}
      <aside className="coverage-warning">
        <strong>覆盖说明</strong>
        {isSuShi ? (
          <p>
            《宋史》卷338当前枚举 {suCoverage?.items.length ?? 0} 条任官／身份语句，其中
            {suCoverageLinked} 条链接到 appointment，且仍全部为 partial。其余明确列为
            gap；孔凡礼年谱全文未取得前不计算完整生涯覆盖率。
          </p>
        ) : (
          <p>
            当前仅 {personAppointments.length}{" "}
            条已定位任命，用于检验人物、任命动作和官名版本能否复用；不提供完整生涯覆盖率。
          </p>
        )}
        <Link className="text-link" to="/data">
          查看覆盖矩阵与研究日志 →
        </Link>
      </aside>
    </div>
  );
}

export function AppointmentDetailPage() {
  const { appointmentId, personSlug } = useParams();
  const person = site.people.find((item) => item.slug === personSlug);
  const appointment = site.appointments.find(
    (item) => item.id === appointmentId && item.personId === person?.id,
  );
  if (appointment === undefined || person === undefined)
    return (
      <div className="page-container">
        <EmptyState title="未找到这条任命">链接可能已失效，或该记录尚未发布。</EmptyState>
      </div>
    );
  const previousAppointment =
    appointment.previousAppointmentId === null
      ? undefined
      : site.appointments.find((item) => item.id === appointment.previousAppointmentId);
  const nextAppointments = site.appointments.filter(
    (item) => item.previousAppointmentId === appointment.id,
  );
  const appointingAuthority = site.institutionVersions.find(
    (item) => item.id === appointment.appointingAuthorityInstitutionVersionId,
  );
  const appointingInstitution = site.institutions.find(
    (item) => item.id === appointingAuthority?.institutionId,
  );
  const usageInstitutionVersionIds = new Set(
    appointment.components.flatMap((component) => {
      const usage = titleUsage(component.titleUsageVersionId);
      return usage?.institutionVersionIds ?? [];
    }),
  );
  const institutionalRelations = site.institutionRelations.filter(
    (relation) =>
      usageInstitutionVersionIds.has(relation.subjectVersionId) ||
      usageInstitutionVersionIds.has(relation.objectVersionId),
  );
  const institutionForVersion = (versionId: string) => {
    const version = site.institutionVersions.find((item) => item.id === versionId);
    return site.institutions.find((item) => item.id === version?.institutionId);
  };
  const appointmentPath = (id: string) =>
    `/people/${person.slug}/appointments/${encodeURIComponent(id)}`;
  return (
    <div className="page-container detail-page">
      <nav className="breadcrumbs">
        <Link to={`/people/${person.slug}/career`}>{preferredName(person)}官履</Link>
        <span>/</span>
        <span>{dateLabel(appointment.time)}</span>
      </nav>
      <header className="appointment-header">
        <div>
          <p className="eyebrow">APPOINTMENT ACTION · {dateLabel(appointment.time)}</p>
          <h1>{appointment.rawText}</h1>
          <p>
            {appointment.time.originalText} · {appointmentPlace(appointment)}
          </p>
        </div>
        <div className="entity-meta">
          <StatusBadge status={appointment.editorialStatus} />
          <div className="tag-row action-tags">
            {appointment.actionTypes.map((action) => (
              <span key={action}>{actionLabels[action] ?? action}</span>
            ))}
          </div>
        </div>
      </header>
      <div className="appointment-layout">
        <div className="detail-main">
          <section className="decomposition-panel">
            <p className="block-label">原文结构拆解</p>
            <div className="raw-line" aria-label="任命原文拆解">
              {appointment.components.map((component) => (
                <span
                  className={`raw-component component-${component.componentType}`}
                  key={component.id}
                >
                  {component.sourceSpan.text}
                </span>
              ))}
            </div>
            <div className="component-detail-list">
              {appointment.components.map((component) => {
                const usage = titleUsage(component.titleUsageVersionId);
                const concept = titleConceptForUsage(component.titleUsageVersionId);
                return (
                  <article key={component.id}>
                    <span className={`component-swatch component-${component.componentType}`} />
                    <div>
                      <small>
                        {componentLabels[component.componentType] ?? component.componentType} · 字符{" "}
                        {component.sourceSpan.start}–{component.sourceSpan.end}
                      </small>
                      <h3>{component.sourceSpan.text}</h3>
                      <p>
                        {usage?.plainExplanation.text ??
                          (component.placeVersionId !== null
                            ? `${placeLabel(component.placeVersionId)}，作为任命地点记录。`
                            : "这段文本仍保持未决，不强行规范化。")}
                      </p>
                      <div className="tag-row">
                        {component.semanticTracks.map((track) => (
                          <span key={track}>{trackLabels[track] ?? track}</span>
                        ))}
                      </div>
                      {concept === undefined ? null : (
                        <Link className="text-link" to={`/titles/${concept.slug}`}>
                          打开官名版本 →
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
          <section className="service-panel">
            <p className="block-label">授命之后：是否实际任事？</p>
            {appointment.serviceEpisodes.length === 0 ? (
              <EmptyState title="没有服务记录">
                这不等于“必未到任”，只表示当前证据不足以自动生成实际任事。若原文明载“未至”，该否定信息保留在任命成分与注释中。
              </EmptyState>
            ) : (
              appointment.serviceEpisodes.map((episode) => (
                <article key={episode.id}>
                  <div>
                    <strong>
                      {episode.episodeType === "service"
                        ? "实际服务"
                        : episode.episodeType === "punitive_status"
                          ? "处分状态"
                          : "居住／其他状态"}
                    </strong>
                    <StatusBadge status={episode.editorialStatus} />
                  </div>
                  <p>
                    状态：{episode.serviceStatus} · {episode.time.originalText}
                  </p>
                  {episode.endReason === null ? null : <p>{episode.endReason.text}</p>}
                  <EvidenceButton
                    assertionIds={[...episode.assertionIds]}
                    title={`${appointment.rawText}：实际状态`}
                  />
                </article>
              ))
            )}
          </section>
          <section className="appointment-context-panel">
            <header>
              <div>
                <p className="block-label">前后变化与制度关系</p>
                <h2>只连接已经建模的关系</h2>
              </div>
              <p>前后任命链不等于同一职位的前任／后任；机构关系也不自动等于人物间关系。</p>
            </header>
            <div className="appointment-context-grid">
              <article>
                <span>上一任命动作</span>
                {previousAppointment === undefined ? (
                  <p>当前没有已发布的前序链接。</p>
                ) : (
                  <Link to={appointmentPath(previousAppointment.id)}>
                    <strong>{previousAppointment.rawText}</strong>
                    <small>{dateLabel(previousAppointment.time)}</small>
                  </Link>
                )}
              </article>
              <article>
                <span>下一任命动作</span>
                {nextAppointments.length === 0 ? (
                  <p>当前没有已发布的后序链接。</p>
                ) : (
                  nextAppointments.map((item) => (
                    <Link to={appointmentPath(item.id)} key={item.id}>
                      <strong>{item.rawText}</strong>
                      <small>{dateLabel(item.time)}</small>
                    </Link>
                  ))
                )}
              </article>
              <article>
                <span>任命机关</span>
                {appointingAuthority === undefined || appointingInstitution === undefined ? (
                  <p>当前证据未发布任命机关；不从动作词自动补造。</p>
                ) : (
                  <Link to={`/map?focus=${encodeURIComponent(appointingInstitution.id)}`}>
                    <strong>{preferredName(appointingInstitution)}</strong>
                    <small>{appointingAuthority.label}</small>
                  </Link>
                )}
              </article>
            </div>
            <div className="institutional-relation-list">
              <h3>官名版本关联的机构关系</h3>
              {institutionalRelations.length === 0 ? (
                <p className="context-gap">
                  当前任命尚无可发布的上报／协作／监察关系；这不是“没有关系”的历史结论。
                </p>
              ) : (
                institutionalRelations.map((relation) => {
                  const subject = institutionForVersion(relation.subjectVersionId);
                  const object = institutionForVersion(relation.objectVersionId);
                  return (
                    <article key={relation.id}>
                      <span>{preferredName(subject)}</span>
                      <strong>
                        →{" "}
                        {institutionRelationLabels[relation.relationType] ?? relation.relationType}{" "}
                        →
                      </strong>
                      <span>{preferredName(object)}</span>
                      <EvidenceButton
                        assertionIds={[...relation.assertionIds]}
                        title={`${preferredName(subject)}与${preferredName(object)}`}
                      />
                    </article>
                  );
                })
              )}
            </div>
            <aside className="person-relation-gap">
              <strong>人物关系覆盖缺口</strong>
              <p>
                当前 release
                未建立这一任命的同一职位前任／后任、同期上司、同僚或下属；不得由官名、时间接近或常识自动推断。
              </p>
            </aside>
          </section>
        </div>
        <aside className="detail-aside appointment-aside">
          <section>
            <p className="block-label">日期精度</p>
            <h3>{appointment.time.originalText}</h3>
            <p>
              {appointment.time.normalizedStart === null
                ? "无可靠绝对日期"
                : `${appointment.time.normalizedStart} — ${appointment.time.normalizedEnd}`}
            </p>
            <small>
              {appointment.time.qualification} · {appointment.time.conversionMethod ?? "未换算"}
            </small>
            <p className="small-note">{appointment.time.note}</p>
          </section>
          <section>
            <p className="block-label">证据门禁</p>
            <p>
              这条动作关联 {appointment.assertionIds.length} 项主张；只有关联支持性 passage 的
              reviewed／accepted 主张才能进入发布数据。
            </p>
            <EvidenceButton
              assertionIds={[...appointment.assertionIds]}
              title={appointment.rawText}
              label="打开完整证据链"
            />
          </section>
          <section>
            <p className="block-label">继续探索</p>
            <div className="aside-links">
              <Link to="/compare">
                <strong>与另一条任命比较</strong>
                <small>身份、荣衔、职务、地点和政治状态</small>
              </Link>
              <Link to="/decoder">
                <strong>在解码器重放原文</strong>
                <small>查看规则能识别什么、不能识别什么</small>
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function MetricsPage() {
  const actionCounts = Object.entries(
    site.appointments
      .flatMap((item) => item.actionTypes)
      .reduce<Record<string, number>>(
        (acc, action) => ({ ...acc, [action]: (acc[action] ?? 0) + 1 }),
        {},
      ),
  ).sort(([, left], [, right]) => right - left);
  const max = Math.max(...actionCounts.map(([, count]) => count), 1);
  const serviceCount = site.appointments.filter((item) =>
    item.serviceEpisodes.some((episode) => episode.episodeType === "service"),
  ).length;
  const metrics = site.appointments.flatMap((item) => item.metrics);
  const suShi = site.people.find((person) => person.slug === "su-shi");
  const suAppointments = site.appointments
    .filter((appointment) => appointment.personId === suShi?.id)
    .toSorted((left, right) => left.sequence - right.sequence);
  const signalsByAppointment = new Map(
    suAppointments.map((appointment) => [appointment.id, deriveCareerSignals(appointment, site)]),
  );
  const dimensions: Array<{
    id: CareerSignalDimension;
    label: string;
    note: string;
  }> = [
    { id: "centrality", label: "中央核心程度", note: "机构层级与地点结构信号" },
    { id: "actual_power", label: "实际权力", note: "服务记录与明载限制" },
    { id: "nominal_rank", label: "名义品级", note: "受控 Rank 显式连接" },
    { id: "prestige", label: "资望／荣衔", note: "荣誉资历轨原文成分" },
    { id: "imperial_trust", label: "皇帝信任相关", note: "动作代理或明确不判断" },
  ];
  return (
    <div className="page-container">
      <PageHeader
        eyebrow="量化探索 · EXPLICIT RUBRICS ONLY"
        title="可计算，不等于假装精确。"
        intro="五个维度分别展示史料事实、规则信号与覆盖缺口。没有可复核量尺时，以可展开的状态轨代替虚假折线；绝不生成一个总分。"
      />
      <div className="metric-overview">
        <article>
          <span>任命动作</span>
          <strong>{site.counts.appointments}</strong>
          <small>当前 release（含反例切片）</small>
        </article>
        <article>
          <span>有实际服务记录</span>
          <strong>{serviceCount}</strong>
          <small>动作与服务分表</small>
        </article>
        <article>
          <span>结构化主张</span>
          <strong>{site.counts.assertions}</strong>
          <small>{site.counts.evidenceLinks} 条证据关联</small>
        </article>
        <article>
          <span>数值化升降分</span>
          <strong>—</strong>
          <small>规则未建立，不输出</small>
        </article>
      </div>
      <section className="career-signal-panel" aria-labelledby="career-signal-heading">
        <header>
          <div>
            <p className="eyebrow">苏轼多维轨迹 · CATEGORICAL SIGNALS</p>
            <h2 id="career-signal-heading">同一次变化，在五个维度上分别是什么？</h2>
          </div>
          <p>
            每格都可展开方法与证据。横向是传记顺序，不等距代表时间；空缺不是零值，规则代理也不是心理事实。
          </p>
        </header>
        <div className="signal-legend" aria-label="信号类型图例">
          <span className="signal-source_fact">史料／结构事实</span>
          <span className="signal-structural_rule">透明规则信号</span>
          <span className="signal-coverage_gap">覆盖缺口</span>
        </div>
        <div className="career-signal-scroll" tabIndex={0}>
          <table className="career-signal-table">
            <caption className="visually-hidden">
              苏轼已发布任命的中央核心程度、实际权力、名义品级、资望与皇帝信任相关信号
            </caption>
            <thead>
              <tr>
                <th scope="col">维度</th>
                {suAppointments.map((appointment) => (
                  <th scope="col" key={appointment.id}>
                    <Link to={`/people/su-shi/appointments/${encodeURIComponent(appointment.id)}`}>
                      <small>{dateLabel(appointment.time)}</small>
                      <strong>{appointment.rawText}</strong>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dimensions.map((dimension) => (
                <tr key={dimension.id}>
                  <th scope="row">
                    <strong>{dimension.label}</strong>
                    <small>{dimension.note}</small>
                  </th>
                  {suAppointments.map((appointment) => {
                    const item = signalsByAppointment
                      .get(appointment.id)
                      ?.find((candidate) => candidate.dimension === dimension.id);
                    return (
                      <td key={appointment.id}>
                        {item === undefined ? null : (
                          <details className={`career-signal signal-${item.signalType}`}>
                            <summary>{item.label}</summary>
                            <p>{item.explanation}</p>
                            <small>
                              类型：
                              {item.signalType === "source_fact"
                                ? "史料／结构事实"
                                : item.signalType === "structural_rule"
                                  ? "规则计算"
                                  : "覆盖缺口"}
                              <br />
                              方法：{item.method}
                            </small>
                            <EvidenceButton
                              assertionIds={item.assertionIds}
                              title={`${dateLabel(appointment.time)} · ${dimension.label}`}
                              label="查看依据"
                            />
                          </details>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small-note">
          当前版本没有“政治位置总分”。只有
          TitleUsageVersion→InstitutionVersion、ServiceEpisode、Rank
          显式连接或动作词规则足够时才发布分类信号；研究性数值评定仍由 CareerMetricAssessment
          独立承载。
        </p>
      </section>
      <div className="metrics-grid">
        <section className="chart-panel">
          <p className="block-label">任命动作类型分布</p>
          <h2>动作词保留多值，不强压成“升／降”</h2>
          <div className="bar-chart">
            {actionCounts.map(([action, count]) => (
              <div className="bar-row" key={action}>
                <span>{actionLabels[action] ?? action}</span>
                <div>
                  <i style={{ width: `${(count / max) * 100}%` }} />
                </div>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="chart-panel">
          <p className="block-label">已发布的可计算指标</p>
          <h2>事实指标可以没有总分</h2>
          {metrics.length === 0 ? (
            <EmptyState title="尚无指标">待定义可复核分母与规则。</EmptyState>
          ) : (
            metrics.map((metric) => (
              <article className="fact-metric" key={metric.id}>
                <span>{metric.dimension}</span>
                <strong>{metric.value === null ? metric.label : String(metric.value)}</strong>
                <p>{metric.scaleDescription}</p>
                <EvidenceButton assertionIds={[...metric.assertionIds]} title={metric.label} />
              </article>
            ))
          )}
        </section>
      </div>
      <section className="rubric-table">
        <header>
          <p className="eyebrow">未来评分门槛</p>
          <h2>每一个数值都必须回答四件事</h2>
        </header>
        <div>
          <span>01</span>
          <strong>分母是什么？</strong>
          <p>是完整年谱、某一传记，还是当前样本？</p>
        </div>
        <div>
          <span>02</span>
          <strong>规则能否重算？</strong>
          <p>公式、映射表和版本必须公开。</p>
        </div>
        <div>
          <span>03</span>
          <strong>不确定性去哪了？</strong>
          <p>缺失与争议不自动归零。</p>
        </div>
        <div>
          <span>04</span>
          <strong>跨时期可比吗？</strong>
          <p>官名变化后不得直接沿用分值。</p>
        </div>
      </section>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { categoryLabels, preferredName, site, statusLabels, trackLabels } from "../data";
import { EvidenceButton } from "../evidence";
import { EmptyState, PageHeader, StatusBadge } from "../Page";

function titleUsages(titleId: string) {
  return site.titleUsageVersions.filter((usage) => usage.titleConceptId === titleId);
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function TitlesPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [period, setPeriod] = useState("all");
  const categories = [...new Set(site.titleUsageVersions.flatMap((usage) => usage.categories))];
  const filtered = useMemo(
    () =>
      site.titleConcepts.filter((title) => {
        const names = title.names.map((name) => name.text.toLocaleLowerCase("zh-CN")).join(" ");
        const usages = titleUsages(title.id);
        const queryMatches =
          query.trim() === "" || names.includes(query.trim().toLocaleLowerCase("zh-CN"));
        const categoryMatches =
          category === "all" ||
          usages.some((usage) => usage.categories.includes(category as never));
        const periodMatches =
          period === "all" || usages.some((usage) => usage.periodLensIds.includes(period as never));
        return queryMatches && categoryMatches && periodMatches;
      }),
    [category, period, query],
  );
  const filteredCsvUrl = useMemo(() => {
    const header = [
      "id",
      "preferred_name",
      "aliases",
      "usage_versions",
      "query_filter",
      "category_filter",
      "period_filter",
      "dataset_version",
      "schema_version",
      "data_license",
      "citation",
    ];
    const rows = filtered.map((title) => [
      title.id,
      preferredName(title),
      title.names.map((name) => name.text).join("|"),
      titleUsages(title.id).length,
      query,
      category,
      period,
      site.metadata.datasetVersion,
      site.metadata.schemaVersion,
      site.metadata.licenseData,
      site.metadata.citation,
    ]);
    const csv = `${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
    return `data:text/csv;charset=utf-8,${encodeURIComponent(`\uFEFF${csv}`)}`;
  }, [category, filtered, period, query]);

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="官名通解 · TITLE VOCABULARY"
        title="一个名称，必须带着时期解释。"
        intro="官名入口保持稳定；真正的性质、职掌与通俗解释存在带有效期的版本里。当前仅显示已经过证据门禁的研究种子。"
        actions={
          <div className="download-actions">
            <Link className="button secondary-button" to="/compare?mode=title">
              比较两个官名
            </Link>
            <a
              className="button primary-button"
              href={filteredCsvUrl}
              download={`chushou-filtered-titles-${site.metadata.datasetVersion}.csv`}
            >
              导出当前 {filtered.length} 项
            </a>
          </div>
        }
      />
      <section className="filter-bar" aria-label="官名筛选">
        <label className="wide-field">
          <span>搜索官名、异名或拼音</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="例如：通判、龍圖閣學士、tongpan"
          />
        </label>
        <label>
          <span>类型</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">全部类型</option>
            {categories.map((item) => (
              <option value={item} key={item}>
                {categoryLabels[item] ?? item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>时期镜头</span>
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="all">全部时期</option>
            {site.periodLenses.map((item) => (
              <option value={item.id} key={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </section>
      <div className="results-topline">
        <strong>{filtered.length}</strong> / {site.titleConcepts.length} 个官名概念{" "}
        <span>首批目标 50；未达标前不伪装为完整词典</span>
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="没有匹配的官名">清空筛选，或尝试繁简体和拼音。</EmptyState>
      ) : (
        <div className="title-catalog">
          {filtered.map((title) => {
            const usages = titleUsages(title.id);
            return (
              <Link className="title-catalog-card" to={`/titles/${title.slug}`} key={title.id}>
                <div className="catalog-card-top">
                  <StatusBadge status={title.editorialStatus} />
                  <span>{usages.length} 个版本</span>
                </div>
                <h2>{preferredName(title)}</h2>
                <p className="title-aliases">
                  {title.names
                    .filter((name) => name.kind !== "preferred")
                    .map((name) => name.text)
                    .join(" · ")}
                </p>
                <p>{usages[0]?.plainExplanation.text ?? title.scopeNote}</p>
                <div className="tag-row">
                  {[...new Set(usages.flatMap((usage) => usage.semanticTracks))].map((track) => (
                    <span key={track}>{trackLabels[track] ?? track}</span>
                  ))}
                </div>
                <small>{title.scopeNote}</small>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TitleDetailPage() {
  const { slug } = useParams();
  const title = site.titleConcepts.find((item) => item.slug === slug);
  if (title === undefined)
    return (
      <div className="page-container">
        <EmptyState title="未找到这个官名">它可能尚未进入受控词表。</EmptyState>
      </div>
    );
  const usages = titleUsages(title.id);
  const relatedAppointments = site.appointments.filter((appointment) =>
    appointment.components.some((component) =>
      usages.some((usage) => usage.id === component.titleUsageVersionId),
    ),
  );
  const relatedInstitutions = site.institutions.filter((institution) =>
    usages.some((usage) =>
      usage.institutionVersionIds.some(
        (versionId) =>
          site.institutionVersions.find((version) => version.id === versionId)?.institutionId ===
          institution.id,
      ),
    ),
  );

  return (
    <div className="page-container detail-page">
      <nav className="breadcrumbs" aria-label="面包屑">
        <Link to="/titles">官名</Link>
        <span>/</span>
        <span>{preferredName(title)}</span>
      </nav>
      <header className="entity-header">
        <div>
          <p className="eyebrow">TITLE CONCEPT · {title.slug}</p>
          <h1>{preferredName(title)}</h1>
          <p className="entity-aliases">
            {title.names
              .filter((name) => name.kind !== "preferred")
              .map((name) => name.text)
              .join(" · ")}
          </p>
        </div>
        <div className="entity-meta">
          <StatusBadge status={title.editorialStatus} />
          <span>{usages.length} 个时期化版本</span>
          <Link className="button secondary-button" to={`/compare?title=${title.slug}`}>
            加入比较
          </Link>
        </div>
      </header>
      <div className="detail-grid">
        <div className="detail-main">
          {usages.map((usage) => {
            const rank =
              usage.rankId === null
                ? undefined
                : site.ranks.find((item) => item.id === usage.rankId);
            const rankScheme = site.rankSchemes.find((scheme) => scheme.id === rank?.rankSchemeId);
            return (
              <article className="usage-panel" key={usage.id}>
                <div className="usage-heading">
                  <div>
                    <p className="eyebrow">有效版本</p>
                    <h2>{usage.label}</h2>
                  </div>
                  <StatusBadge status={usage.editorialStatus} />
                </div>
                <div className="version-period">
                  <strong>{usage.validTime.originalText}</strong>
                  <span>{usage.validTime.edtf ?? "绝对年代未定"}</span>
                </div>
                {rank === undefined || rankScheme === undefined ? null : (
                  <section className="rank-context">
                    <div>
                      <p className="block-label">品秩方案内定位</p>
                      <strong>{rank.label}</strong>
                      <span>
                        {rankScheme.label} · 切片序位 {rank.sequence ?? "未定"}
                        {rank.gradeText === null ? "" : ` · ${rank.gradeText}`}
                      </span>
                    </div>
                    <div>
                      <StatusBadge status={rankScheme.coverageStatus} />
                      <Link className="text-link" to="/data#rank-model">
                        查看跨方案映射 →
                      </Link>
                    </div>
                  </section>
                )}
                <div className="semantic-track-grid">
                  {usage.semanticTracks.map((track) => (
                    <div className={`semantic-track track-${track}`} key={track}>
                      <span>{trackLabels[track] ?? track}</span>
                      <strong>
                        {usage.categories.map((item) => categoryLabels[item] ?? item).join(" · ")}
                      </strong>
                    </div>
                  ))}
                </div>
                <section className="explanation-block">
                  <p className="block-label">一句话解释</p>
                  <p className="large-explanation">{usage.plainExplanation.text}</p>
                </section>
                <section className="explanation-block">
                  <p className="block-label">当前可证职掌</p>
                  {usage.functions.map((item) => (
                    <p key={item.text}>{item.text}</p>
                  ))}
                </section>
                <aside className="caveat">
                  <strong>⚑ 阅读边界</strong>
                  <p>{usage.caveat.text}</p>
                </aside>
                <EvidenceButton
                  assertionIds={[...usage.assertionIds]}
                  title={usage.label}
                  label="展开主张、引文与定位"
                />
              </article>
            );
          })}
        </div>
        <aside className="detail-aside">
          <section>
            <p className="block-label">概念范围</p>
            <p>{title.scopeNote}</p>
          </section>
          <section>
            <p className="block-label">语义层</p>
            <div className="tag-row">
              {[...new Set(usages.flatMap((usage) => usage.semanticTracks))].map((track) => (
                <span key={track}>{trackLabels[track] ?? track}</span>
              ))}
            </div>
          </section>
          {relatedInstitutions.length === 0 ? null : (
            <section>
              <p className="block-label">机构归属</p>
              <div className="aside-links">
                {relatedInstitutions.map((institution) => (
                  <Link
                    to={`/map?focus=${encodeURIComponent(institution.id)}`}
                    key={institution.id}
                  >
                    <strong>{preferredName(institution)}</strong>
                    <small>打开时期化机构节点与关系</small>
                  </Link>
                ))}
              </div>
            </section>
          )}
          <section>
            <p className="block-label">人物个案</p>
            {relatedAppointments.length === 0 ? (
              <p className="muted">当前无已核任命。</p>
            ) : (
              <div className="aside-links">
                {relatedAppointments.map((appointment) => {
                  const appointmentPerson = site.people.find(
                    (person) => person.id === appointment.personId,
                  );
                  return (
                    <Link
                      to={`/people/${appointmentPerson?.slug ?? "su-shi"}/appointments/${encodeURIComponent(appointment.id)}`}
                      key={appointment.id}
                    >
                      <strong>{appointment.rawText}</strong>
                      <small>
                        {preferredName(appointmentPerson)} · {appointment.time.originalText}
                      </small>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
          <section>
            <p className="block-label">版本状态</p>
            <p>
              {statusLabels[title.editorialStatus] ?? title.editorialStatus}
              。如果性质随时期变化，应增加版本，不覆盖旧解释。
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

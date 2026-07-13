import { useState, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { preferredName, site } from "../data";
import { EvidenceButton } from "../evidence";
import { EmptyState, PageHeader, StatusBadge } from "../Page";

function institutionScope(institutionId: string): "central" | "local" | "official_identity" {
  if (institutionId.includes("official-identity")) return "official_identity";
  if (institutionId.includes("prefectural")) return "local";
  return "central";
}

const relationLabels: Record<string, string> = {
  part_of: "隶属组合",
  coordinates_with: "协同奏事",
  reports_to: "上报",
  supervises: "监督",
  checks: "监察／制衡",
  appoints: "任命",
  parallel_to: "平行",
};

function periodsOverlap(
  left: { normalizedStart: string | null; normalizedEnd: string | null },
  right: { normalizedStart: string | null; normalizedEnd: string | null },
): boolean {
  return !(
    (left.normalizedEnd !== null &&
      right.normalizedStart !== null &&
      left.normalizedEnd < right.normalizedStart) ||
    (right.normalizedEnd !== null &&
      left.normalizedStart !== null &&
      right.normalizedEnd < left.normalizedStart)
  );
}

export function MapPage() {
  const [params, setParams] = useSearchParams();
  const [zoom, setZoom] = useState(100);
  const requestedScope = params.get("scope") ?? "all";
  const scope = ["all", "central", "local", "official_identity"].includes(requestedScope)
    ? requestedScope
    : "all";
  const periodId = params.get("period") ?? "all";
  const period = site.periodLenses.find((item) => item.id === periodId);
  const setParam = (key: string, value: string) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value === "all") next.delete(key);
      else next.set(key, value);
      return next;
    });
  };
  const visible = site.institutions.filter((institution) => {
    const scopeMatches = scope === "all" || institutionScope(institution.id) === scope;
    const periodMatches =
      period === undefined ||
      site.institutionVersions.some(
        (version) =>
          version.institutionId === institution.id &&
          periodsOverlap(version.validTime, period.validTime),
      );
    return scopeMatches && periodMatches;
  });
  const requestedId = params.get("focus") ?? "";
  const selected =
    visible.find((item) => item.id === requestedId) ?? visible[0] ?? site.institutions[0];
  const selectedId = selected?.id ?? "";
  const versions = site.institutionVersions.filter(
    (item) =>
      item.institutionId === selectedId &&
      (period === undefined || periodsOverlap(item.validTime, period.validTime)),
  );
  const visibleIds = new Set(visible.map((item) => item.id));
  const visibleVersionIds = new Set(
    site.institutionVersions
      .filter(
        (version) =>
          visibleIds.has(version.institutionId) &&
          (period === undefined || periodsOverlap(version.validTime, period.validTime)),
      )
      .map((version) => version.id),
  );
  const visibleRelations = site.institutionRelations.filter(
    (relation) =>
      visibleVersionIds.has(relation.subjectVersionId) &&
      visibleVersionIds.has(relation.objectVersionId) &&
      (period === undefined || periodsOverlap(relation.validTime, period.validTime)),
  );
  const institutionForVersion = (versionId: string) => {
    const institutionId = site.institutionVersions.find(
      (item) => item.id === versionId,
    )?.institutionId;
    return site.institutions.find((item) => item.id === institutionId);
  };
  const selectedVersionIds = new Set(versions.map((version) => version.id));
  const selectedRelations = site.institutionRelations.filter(
    (relation) =>
      (selectedVersionIds.has(relation.subjectVersionId) ||
        selectedVersionIds.has(relation.objectVersionId)) &&
      (period === undefined || periodsOverlap(relation.validTime, period.validTime)),
  );

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="制度地图 · INSTITUTION GRAPH"
        title="先把身份结构和实际行政结构分开。"
        intro="节点、版本和关系都来自已发布证据链。箭头只表示标注的关系类型，不暗示所有中央机构都处在单一上下等级中。"
      />
      <div className="map-toolbar">
        <div className="segmented-control" aria-label="机构范围">
          {["all", "central", "local", "official_identity"].map((item) => (
            <button
              type="button"
              key={item}
              className={scope === item ? "is-active" : undefined}
              onClick={() => setParam("scope", item)}
            >
              {
                (
                  {
                    all: "全部",
                    central: "中央",
                    local: "地方",
                    official_identity: "官员身份",
                  } as Record<string, string>
                )[item]
              }
            </button>
          ))}
        </div>
        <label className="map-period-select">
          <span>时期镜头</span>
          <select value={periodId} onChange={(event) => setParam("period", event.target.value)}>
            <option value="all">全部有效期</option>
            {site.periodLenses.map((item) => (
              <option value={item.id} key={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className="map-zoom" aria-label="地图缩放">
          <button
            type="button"
            aria-label="缩小制度地图"
            onClick={() => setZoom((value) => Math.max(80, value - 10))}
          >
            −
          </button>
          <output aria-live="polite">{zoom}%</output>
          <button
            type="button"
            aria-label="放大制度地图"
            onClick={() => setZoom((value) => Math.min(120, value + 10))}
          >
            +
          </button>
        </div>
        <p>
          <span className="legend-dot reviewed-dot" />
          {visible.length} 个已复核节点 · {visibleRelations.length} 条当前可见关系
        </p>
      </div>
      <div className="map-workspace">
        <section className="institution-canvas" aria-label="制度节点与有向关系图">
          <header className="canvas-heading">
            <div>
              <p className="eyebrow">VERSIONED NODES</p>
              <h2>机构节点</h2>
            </div>
            <span>选择节点查看有效版本与证据</span>
          </header>
          <div className="map-zoom-surface" style={{ "--map-zoom": zoom / 100 } as CSSProperties}>
            <div className="institution-node-grid">
              {visible.map((institution) => {
                const institutionKind = institutionScope(institution.id);
                return (
                  <button
                    className={`institution-node node-${institutionKind} ${institution.id === selectedId ? "is-active" : ""}`}
                    type="button"
                    key={institution.id}
                    onClick={() => setParam("focus", institution.id)}
                  >
                    <span>
                      {institutionKind === "official_identity"
                        ? "身份模型"
                        : institutionKind === "local"
                          ? "地方"
                          : "中央"}
                    </span>
                    <strong>{preferredName(institution)}</strong>
                    <small>
                      {
                        site.institutionVersions.filter(
                          (item) => item.institutionId === institution.id,
                        ).length
                      }{" "}
                      个有效版本
                    </small>
                  </button>
                );
              })}
            </div>
            <section className="relation-lane" aria-label="有向机构关系">
              <header>
                <p className="eyebrow">TYPED EDGES</p>
                <h3>有向关系</h3>
              </header>
              {visibleRelations.length === 0 ? (
                <p className="muted">当前筛选范围没有已核关系边。</p>
              ) : (
                visibleRelations.map((relation) => (
                  <article key={relation.id}>
                    <strong>
                      {preferredName(institutionForVersion(relation.subjectVersionId))}
                    </strong>
                    <span>
                      → {relationLabels[relation.relationType] ?? relation.relationType} →
                    </span>
                    <strong>
                      {preferredName(institutionForVersion(relation.objectVersionId))}
                    </strong>
                    <small>{relation.validTime.originalText}</small>
                  </article>
                ))
              )}
            </section>
            <div className="research-gap-node">
              <span>明确缺口</span>
              <strong>台谏、寺监与六部的更多时段关系</strong>
              <small>没有来源和有效期就不连线</small>
            </div>
          </div>
        </section>
        <aside className="map-detail-panel">
          {selected === undefined ? (
            <EmptyState title="未选择节点">从图上选择一个已复核机构。</EmptyState>
          ) : (
            <>
              <div className="panel-topline">
                <p className="eyebrow">机构详情</p>
                <StatusBadge status={selected.editorialStatus} />
              </div>
              <h2>{preferredName(selected)}</h2>
              <p className="muted">{selected.scopeNote}</p>
              {versions.map((version) => (
                <article className="institution-version" key={version.id}>
                  <h3>{version.label}</h3>
                  <p className="version-time">{version.validTime.originalText}</p>
                  {version.functions.map((claim) => (
                    <p key={claim.text}>{claim.text}</p>
                  ))}
                  <EvidenceButton assertionIds={[...version.assertionIds]} title={version.label} />
                </article>
              ))}
              {selectedRelations.length === 0 ? null : (
                <section className="selected-relations">
                  <p className="block-label">与此节点相连</p>
                  {selectedRelations.map((relation) => {
                    const outgoing = selectedVersionIds.has(relation.subjectVersionId);
                    const other = institutionForVersion(
                      outgoing ? relation.objectVersionId : relation.subjectVersionId,
                    );
                    return (
                      <article key={relation.id}>
                        <span>{outgoing ? "→" : "←"}</span>
                        <div>
                          <strong>
                            {relationLabels[relation.relationType] ?? relation.relationType}
                          </strong>
                          <p>
                            {preferredName(other)} · {relation.description.text}
                          </p>
                          <EvidenceButton
                            assertionIds={[...relation.assertionIds]}
                            title={relation.description.text}
                            label="核对关系证据"
                          />
                        </div>
                      </article>
                    );
                  })}
                </section>
              )}
              <div className="gap-box">
                <strong>图的诚实边界</strong>
                <p>
                  当前关系边都有有效期、方向、类型和证据；图中未出现的关系表示尚未发布，不表示历史上不存在。
                </p>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

export function ReformsPage() {
  const [params, setParams] = useSearchParams();
  const leftId = params.get("left") ?? site.periodLenses[0]?.id ?? "";
  const rightId = params.get("right") ?? site.periodLenses[1]?.id ?? leftId;
  const left = site.periodLenses.find((item) => item.id === leftId) ?? site.periodLenses[0];
  const right =
    site.periodLenses.find((item) => item.id === rightId) ?? site.periodLenses[1] ?? left;
  const setLens = (side: "left" | "right", value: string) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set(side, value);
      return next;
    });
  };
  const lensStats = (periodId: string) => {
    const lens = site.periodLenses.find((item) => item.id === periodId);
    if (lens === undefined) return { institutions: 0, titles: 0, ranks: 0, categories: "—" };
    const usages = site.titleUsageVersions.filter((usage) => usage.periodLensIds.includes(lens.id));
    return {
      institutions: site.institutionVersions.filter((version) =>
        periodsOverlap(version.validTime, lens.validTime),
      ).length,
      titles: usages.length,
      ranks: site.rankSchemes.filter((scheme) => periodsOverlap(scheme.validTime, lens.validTime))
        .length,
      categories: [...new Set(usages.flatMap((usage) => usage.categories))].join("、") || "—",
    };
  };
  const leftStats = lensStats(left?.id ?? "");
  const rightStats = lensStats(right?.id ?? "");
  const reform = site.reforms[0];
  return (
    <div className="page-container">
      <PageHeader
        eyebrow="制度沿革 · VERSIONED CHANGE"
        title="“元丰改制”不是一个改名按钮。"
        intro="时期只是浏览镜头；官名和机构各自保留真实有效期。改革跨年推进，不能把1080年当成所有制度变化的同一断点。"
      />
      <div className="period-rail" role="tablist" aria-label="时期镜头">
        {site.periodLenses.map((period) => (
          <button
            role="tab"
            aria-selected={period.id === right?.id}
            type="button"
            key={period.id}
            onClick={() => setLens("right", period.id)}
            className={period.id === right?.id ? "is-active" : undefined}
          >
            <span>{period.validTime.normalizedStart?.slice(0, 4) ?? "?"}</span>
            <strong>{period.label}</strong>
            <small>{period.validTime.edtf}</small>
          </button>
        ))}
      </div>
      <section className="lens-compare-controls" aria-label="选择两个制度时期">
        <label>
          <span>时期 A</span>
          <select value={left?.id} onChange={(event) => setLens("left", event.target.value)}>
            {site.periodLenses.map((period) => (
              <option value={period.id} key={period.id}>
                {period.label}
              </option>
            ))}
          </select>
        </label>
        <span aria-hidden="true">对照</span>
        <label>
          <span>时期 B</span>
          <select value={right?.id} onChange={(event) => setLens("right", event.target.value)}>
            {site.periodLenses.map((period) => (
              <option value={period.id} key={period.id}>
                {period.label}
              </option>
            ))}
          </select>
        </label>
      </section>
      {left === undefined || right === undefined ? null : (
        <>
          <section className="period-focus-grid">
            {[left, right].map((period, index) => (
              <article className="period-focus" key={`${index}-${period.id}`}>
                <div>
                  <p className="eyebrow">时期 {index === 0 ? "A" : "B"}</p>
                  <h2>{period.label}</h2>
                  <p className="large-explanation">{period.summary.text}</p>
                  <EvidenceButton
                    assertionIds={[...period.summary.assertionIds]}
                    title={period.label}
                  />
                </div>
                <aside>
                  <strong>阅读重点</strong>
                  <p>{period.focus.text}</p>
                  <small>{period.validTime.note}</small>
                </aside>
              </article>
            ))}
          </section>
          <section
            className="lens-difference-table"
            aria-label={`${left.label}与${right.label}比较`}
          >
            <header>
              <span>当前 release 可比项</span>
              <strong>{left.label}</strong>
              <strong>{right.label}</strong>
            </header>
            {[
              ["官名时期版本", leftStats.titles, rightStats.titles],
              ["有效机构版本", leftStats.institutions, rightStats.institutions],
              ["相交品秩方案", leftStats.ranks, rightStats.ranks],
              ["已发布官名类别", leftStats.categories, rightStats.categories],
            ].map(([label, before, after]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{before}</strong>
                <strong>{after}</strong>
              </div>
            ))}
            <p>
              这些数值只表示当前 release
              中有证据的版本覆盖，不表示历史制度规模；制度文本与实际运行的差异尚无足够断言时保持明确缺口。
            </p>
          </section>
        </>
      )}
      <section className="reform-comparison">
        <header>
          <p className="eyebrow">核心结构变化</p>
          <h2>{reform?.label ?? "元丰官制改革"}</h2>
          <p>{reform?.summary.text}</p>
        </header>
        <div className="before-after-grid">
          <article>
            <span>改制前的常见阅读顺序</span>
            <h3>官 · 职 · 差遣</h3>
            <ul>
              <li>
                <strong>官</strong>：重点看禄秩与叙位
              </li>
              <li>
                <strong>职</strong>：重点看文学与资望资格
              </li>
              <li>
                <strong>差遣</strong>：重点看内外实际治事
              </li>
            </ul>
          </article>
          <div className="change-arrow" aria-hidden="true">
            →
          </div>
          <article>
            <span>元丰改革后的关键问题</span>
            <h3>寄禄官 · 职事官</h3>
            <ul>
              <li>省、台、寺、监的空名被重整</li>
              <li>以阶承接一部分旧有身份序列</li>
              <li>通过《寄禄格》建立新的对应</li>
            </ul>
          </article>
        </div>
        {reform === undefined ? null : (
          <EvidenceButton
            assertionIds={[...reform.assertionIds]}
            title={reform.label}
            label="核对改革原文"
          />
        )}
      </section>
      <section className="method-callout">
        <div>
          <strong>不要这样做</strong>
          <p>把“同名”当“同义”，或者把一张时期卡直接写进每条记录的有效期。</p>
        </div>
        <div>
          <strong>除授的做法</strong>
          <p>镜头只负责浏览；版本记录自己的起止、精度、限定与证据。</p>
        </div>
        <Link className="text-link" to="/data">
          查看数据模型 →
        </Link>
      </section>
    </div>
  );
}

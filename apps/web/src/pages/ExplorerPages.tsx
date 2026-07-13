import { useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  actionLabels,
  appointmentPlace,
  dateLabel,
  downloadBase,
  preferredName,
  site,
  sourcePath,
  trackLabels,
} from "../data";
import { EvidenceButton } from "../evidence";
import { EmptyState, PageHeader, StatusBadge } from "../Page";

type DecodeMatch = {
  start: number;
  end: number;
  text: string;
  kind: "title" | "action";
  label: string;
  titleId: string | null;
  usageIds: string[];
  tracks: string[];
};
const decoderActions = [
  ["不得签书公事", "任事限制"],
  ["不得僉書公事", "任事限制"],
  ["责授", "责授"],
  ["責授", "责授"],
  ["安置", "安置"],
  ["贬", "贬"],
  ["貶", "贬"],
  ["拜", "拜"],
  ["除", "除"],
  ["迁", "迁"],
  ["遷", "迁"],
  ["徙", "徙"],
  ["复", "复"],
  ["復", "复"],
] as const;

function decodeInput(
  input: string,
  periodId: string,
): { matches: DecodeMatch[]; unknown: string[] } {
  const candidates: DecodeMatch[] = [];
  for (const title of site.titleConcepts) {
    const usages = site.titleUsageVersions.filter(
      (usage) =>
        usage.titleConceptId === title.id &&
        (periodId === "all" || usage.periodLensIds.includes(periodId as never)),
    );
    for (const name of title.names.filter(
      (item) => item.script !== "pinyin" && item.script !== "english",
    )) {
      let cursor = 0;
      while (cursor < input.length) {
        const start = input.indexOf(name.text, cursor);
        if (start < 0) break;
        candidates.push({
          start,
          end: start + name.text.length,
          text: name.text,
          kind: "title",
          label: preferredName(title),
          titleId: title.id,
          usageIds: usages.map((usage) => usage.id),
          tracks: [...new Set(usages.flatMap((usage) => usage.semanticTracks))],
        });
        cursor = start + name.text.length;
      }
    }
  }
  for (const [term, label] of decoderActions) {
    let cursor = 0;
    while (cursor < input.length) {
      const start = input.indexOf(term, cursor);
      if (start < 0) break;
      candidates.push({
        start,
        end: start + term.length,
        text: term,
        kind: "action",
        label,
        titleId: null,
        usageIds: [],
        tracks: [],
      });
      cursor = start + term.length;
    }
  }
  const matches: DecodeMatch[] = [];
  const occupied = new Set<number>();
  for (const candidate of candidates.sort(
    (a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start,
  )) {
    const positions = Array.from(
      { length: candidate.end - candidate.start },
      (_, index) => candidate.start + index,
    );
    if (positions.some((position) => occupied.has(position))) continue;
    positions.forEach((position) => occupied.add(position));
    matches.push(candidate);
  }
  matches.sort((a, b) => a.start - b.start);
  const unknown: string[] = [];
  let cursor = 0;
  for (const match of matches) {
    const gap = input.slice(cursor, match.start).replaceAll(/[\s、，。；：,.;:]+/gu, "");
    if (gap !== "") unknown.push(gap);
    cursor = match.end;
  }
  const tail = input.slice(cursor).replaceAll(/[\s、，。；：,.;:]+/gu, "");
  if (tail !== "") unknown.push(tail);
  return { matches, unknown };
}

export function DecoderPage() {
  const [input, setInput] = useState(
    "责授检校尚书水部员外郎充黄州团练副使，本州安置，不得签书公事",
  );
  const [period, setPeriod] = useState("chs:period:yuanfeng-reform");
  const decoded = useMemo(() => decodeInput(input, period), [input, period]);
  let cursor = 0;
  const fragments: ReactNode[] = [];
  decoded.matches.forEach((match) => {
    if (cursor < match.start)
      fragments.push(<span key={`gap-${cursor}`}>{input.slice(cursor, match.start)}</span>);
    fragments.push(
      <mark className={`decode-mark mark-${match.kind}`} key={`${match.start}-${match.end}`}>
        {input.slice(match.start, match.end)}
      </mark>,
    );
    cursor = match.end;
  });
  if (cursor < input.length) fragments.push(<span key="tail">{input.slice(cursor)}</span>);
  return (
    <div className="page-container">
      <PageHeader
        eyebrow="原文解码 · EXPLAINABLE CANDIDATES"
        title="机器可以提出候选，但不能替你篡改史料。"
        intro="解码器使用受控官名、异名和动作词做最长匹配；时期用于缩小版本候选。未识别文本和不确定性会保留，结果不会自动写回正式数据。"
      />
      <div className="decoder-layout">
        <section className="decoder-input-panel">
          <label>
            <span>任官原文或官衔串</span>
            <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={8} />
          </label>
          <div className="sample-buttons">
            <span>试试：</span>
            {[
              "朝奉郎、龙图阁学士、知杭州",
              "除大理评事、签书凤翔府判官",
              "以本官知英州，寻降一官，未至",
            ].map((sample) => (
              <button type="button" onClick={() => setInput(sample)} key={sample}>
                {sample.slice(0, 8)}…
              </button>
            ))}
          </div>
          <label>
            <span>解释时期</span>
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              <option value="all">不限定（可能多版本）</option>
              {site.periodLenses.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </section>
        <section className="decoder-result-panel">
          <div className="decoder-result-top">
            <p className="eyebrow">候选解析</p>
            <span>{decoded.matches.length} 个识别片段</span>
          </div>
          <p className="annotated-text">{fragments.length > 0 ? fragments : input}</p>
          <div className="decode-legend">
            <span>
              <i className="mark-title" />
              官名候选
            </span>
            <span>
              <i className="mark-action" />
              动作／限制
            </span>
          </div>
          <div className="decode-list">
            {decoded.matches.map((match) => (
              <article key={`${match.start}-${match.end}`}>
                <span className={`component-swatch mark-${match.kind}`} />
                <div>
                  <small>
                    {match.kind === "action"
                      ? "动作或限制词"
                      : `${match.usageIds.length} 个时期版本候选`}
                  </small>
                  <h3>
                    {match.text} <em>→ {match.label}</em>
                  </h3>
                  {match.kind === "title" ? (
                    <>
                      <div className="tag-row">
                        {match.tracks.map((track) => (
                          <span key={track}>{trackLabels[track] ?? track}</span>
                        ))}
                      </div>
                      {match.titleId === null ? null : (
                        <Link
                          className="text-link"
                          to={`/titles/${site.titleConcepts.find((item) => item.id === match.titleId)?.slug}`}
                        >
                          查看受控官名 →
                        </Link>
                      )}
                    </>
                  ) : (
                    <p>作为任命动作或政治状态信号保存，不与官名合并。</p>
                  )}
                </div>
              </article>
            ))}
          </div>
          {decoded.unknown.length > 0 ? (
            <aside className="unknown-box">
              <strong>未识别文本</strong>
              <p>{decoded.unknown.join(" · ")}</p>
              <small>这些片段不会被丢弃，也不会被猜成已有官名。</small>
            </aside>
          ) : null}
          <p className="decoder-warning">⚑ 可解释候选解析 · 不自动写入正式数据库</p>
        </section>
      </div>
    </div>
  );
}

function compareRows(appointment: (typeof site.appointments)[number]) {
  const byTrack = (track: string) =>
    appointment.components
      .filter((component) => component.semanticTracks.includes(track as never))
      .map((component) => component.sourceSpan.text)
      .join("、") || "—";
  return {
    rank: byTrack("identity_rank"),
    honor: byTrack("honor_expertise"),
    duty: byTrack("actual_duty"),
    political: byTrack("political_status"),
    place: appointmentPlace(appointment),
    service:
      appointment.serviceEpisodes.length > 0
        ? appointment.serviceEpisodes.map((item) => item.serviceStatus).join("、")
        : "无已发布服务记录",
  };
}

function appointmentPersonName(appointment: (typeof site.appointments)[number]): string {
  return preferredName(site.people.find((person) => person.id === appointment.personId));
}

export function ComparePage() {
  const [leftId, setLeftId] = useState(site.appointments[0]?.id ?? "");
  const [rightId, setRightId] = useState(
    site.appointments.find((item) => item.id.includes("huangzhou-punitive"))?.id ??
      site.appointments[1]?.id ??
      "",
  );
  const left = site.appointments.find((item) => item.id === leftId);
  const right = site.appointments.find((item) => item.id === rightId);
  const leftRows = left === undefined ? null : compareRows(left);
  const rightRows = right === undefined ? null : compareRows(right);
  const rowDefs = [
    [
      "date",
      "时间",
      left === undefined ? "—" : dateLabel(left.time),
      right === undefined ? "—" : dateLabel(right.time),
    ],
    [
      "action",
      "任命动作",
      left?.actionTypes.map((item) => actionLabels[item] ?? item).join("、") ?? "—",
      right?.actionTypes.map((item) => actionLabels[item] ?? item).join("、") ?? "—",
    ],
    ["rank", "身份／官阶", leftRows?.rank ?? "—", rightRows?.rank ?? "—"],
    ["honor", "荣衔／专长", leftRows?.honor ?? "—", rightRows?.honor ?? "—"],
    ["duty", "实际职务", leftRows?.duty ?? "—", rightRows?.duty ?? "—"],
    ["place", "地点", leftRows?.place ?? "—", rightRows?.place ?? "—"],
    ["political", "政治状态", leftRows?.political ?? "—", rightRows?.political ?? "—"],
    ["service", "实际任事证据", leftRows?.service ?? "—", rightRows?.service ?? "—"],
  ] as const;
  return (
    <div className="page-container">
      <PageHeader
        eyebrow="任命比较 · MULTI-TRACK"
        title="不要只问“哪个官更大”。"
        intro="比较同时展开身份、资望、实际工作、地点、政治状态和是否到任。任何一条轨道都不能替代其他轨道。"
      />
      <div className="compare-selectors">
        <label>
          <span>任命 A</span>
          <select value={leftId} onChange={(event) => setLeftId(event.target.value)}>
            {site.appointments.map((item) => (
              <option value={item.id} key={item.id}>
                {appointmentPersonName(item)} · {dateLabel(item.time)} · {item.rawText}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setLeftId(rightId);
            setRightId(leftId);
          }}
          aria-label="交换两条任命"
        >
          ⇄
        </button>
        <label>
          <span>任命 B</span>
          <select value={rightId} onChange={(event) => setRightId(event.target.value)}>
            {site.appointments.map((item) => (
              <option value={item.id} key={item.id}>
                {appointmentPersonName(item)} · {dateLabel(item.time)} · {item.rawText}
              </option>
            ))}
          </select>
        </label>
      </div>
      <section className="compare-table">
        <div className="compare-head">
          <span>观察维度</span>
          <div>
            <strong>{left?.rawText}</strong>
            <small>
              {left === undefined
                ? ""
                : `${appointmentPersonName(left)} · ${appointmentPlace(left)}`}
            </small>
          </div>
          <div>
            <strong>{right?.rawText}</strong>
            <small>
              {right === undefined
                ? ""
                : `${appointmentPersonName(right)} · ${appointmentPlace(right)}`}
            </small>
          </div>
        </div>
        {rowDefs.map(([key, label, leftValue, rightValue]) => (
          <div className={`compare-row compare-${key}`} key={key}>
            <strong>{label}</strong>
            <p>{leftValue}</p>
            <p>{rightValue}</p>
          </div>
        ))}
        <div className="compare-evidence">
          <span>证据</span>
          {left === undefined ? (
            <span />
          ) : (
            <EvidenceButton assertionIds={[...left.assertionIds]} title={left.rawText} />
          )}
          {right === undefined ? (
            <span />
          ) : (
            <EvidenceButton assertionIds={[...right.assertionIds]} title={right.rawText} />
          )}
        </div>
      </section>
    </div>
  );
}

export function SourcesPage() {
  return (
    <div className="page-container">
      <PageHeader
        eyebrow="资料与证据 · SOURCES"
        title="来源不是尾注仓库，而是系统的一等对象。"
        intro="作品、版本、定位和引文分层保存。数字转录可用于定位与检索；需要正式学术引用时仍应回查权威纸本或数据库版本。"
      />
      <div className="source-stats">
        <span>
          <strong>{site.sources.length}</strong> 种来源
        </span>
        <span>
          <strong>{site.sources.flatMap((item) => item.editions).length}</strong> 个版本记录
        </span>
        <span>
          <strong>
            {
              site.sources.flatMap((item) => item.editions.flatMap((edition) => edition.locators))
                .length
            }
          </strong>{" "}
          个定位点
        </span>
        <span>
          <strong>
            {
              site.sources.flatMap((item) =>
                item.editions.flatMap((edition) =>
                  edition.locators.flatMap((locator) => locator.passages),
                ),
              ).length
            }
          </strong>{" "}
          段引文
        </span>
      </div>
      <div className="sources-catalog">
        {site.sources.map((source) => {
          const locators = source.editions.flatMap((edition) => edition.locators);
          const passages = locators.flatMap((locator) => locator.passages);
          return (
            <Link className="source-card" to={sourcePath(source.id)} key={source.id}>
              <div>
                <span>
                  {source.sourceType === "modern_article"
                    ? "现代研究"
                    : source.sourceType === "contemporary_primary"
                      ? "当事人文献"
                      : "官修史书"}
                </span>
                <StatusBadge status={source.editorialStatus} />
              </div>
              <h2>{source.shortTitle}</h2>
              <p>{source.creator}</p>
              <p>{source.notes}</p>
              <footer>
                <span>{source.editions.length} 个版本</span>
                <span>{locators.length} 个定位</span>
                <span>{passages.length} 段引文</span>
              </footer>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function SourceDetailPage() {
  const { sourceId } = useParams();
  const source = site.sources.find((item) => item.id === sourceId);
  if (source === undefined)
    return (
      <div className="page-container">
        <EmptyState title="未找到来源">该来源可能尚未发布。</EmptyState>
      </div>
    );
  return (
    <div className="page-container detail-page">
      <nav className="breadcrumbs">
        <Link to="/sources">资料</Link>
        <span>/</span>
        <span>{source.shortTitle}</span>
      </nav>
      <header className="entity-header">
        <div>
          <p className="eyebrow">SOURCE · {source.sourceType}</p>
          <h1>{source.shortTitle}</h1>
          <p className="entity-aliases">{source.creator}</p>
        </div>
        <StatusBadge status={source.editorialStatus} />
      </header>
      <div className="detail-grid">
        <div className="detail-main">
          {source.editions.map((edition) => (
            <section className="edition-panel" key={edition.id}>
              <div className="usage-heading">
                <div>
                  <p className="eyebrow">版本</p>
                  <h2>{edition.label}</h2>
                </div>
                <a
                  className="button secondary-button"
                  href={edition.stableUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  打开版本 ↗
                </a>
              </div>
              <dl className="edition-meta">
                <div>
                  <dt>出版／平台</dt>
                  <dd>{edition.publisher}</dd>
                </div>
                <div>
                  <dt>访问日期</dt>
                  <dd>{edition.accessedAt}</dd>
                </div>
                <div>
                  <dt>许可</dt>
                  <dd>{edition.license ?? "未声明"}</dd>
                </div>
              </dl>
              <p className="small-note">{edition.rightsNote}</p>
              <div className="locator-list">
                {edition.locators.map((locator) => (
                  <article key={locator.id}>
                    <div>
                      <span>{locator.juan === null ? locator.section : `卷${locator.juan}`}</span>
                      <h3>{locator.label}</h3>
                    </div>
                    {locator.passages.map((passage) => (
                      <div className="passage" key={passage.id}>
                        <blockquote>{passage.originalText}</blockquote>
                        {passage.normalizedText === passage.originalText ? null : (
                          <details>
                            <summary>查看规范化检索文本</summary>
                            <p>{passage.normalizedText}</p>
                          </details>
                        )}
                        <small>{passage.note}</small>
                      </div>
                    ))}
                    <a
                      className="text-link"
                      href={locator.stableUrl ?? edition.stableUrl ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      打开定位 ↗
                    </a>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
        <aside className="detail-aside">
          <section>
            <p className="block-label">书目信息</p>
            <p>{source.bibliography}</p>
          </section>
          <section>
            <p className="block-label">使用说明</p>
            <p>{source.notes}</p>
          </section>
          <section>
            <p className="block-label">引用原则</p>
            <p>
              引文尽量短；保留原文与规范化文本；定位落到版本和卷／条目；版权受限现代材料只保存必要短引和书目。
            </p>
            <Link className="text-link" to="/data">
              查看引用规范 →
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function LearnPage() {
  const lessons = [
    {
      n: "01",
      title: "先辨动作",
      text: "除、授、拜、迁、徙、复、贬、安置说的是不同变化；一条记录可以多动作。",
      to: "/decoder",
    },
    {
      n: "02",
      title: "再拆官衔",
      text: "身份官阶、荣衔专长、实际职务、地点与政治状态分别归轨。",
      to: "/titles",
    },
    {
      n: "03",
      title: "追问是否任事",
      text: "授命不等于到任；需要服务记录，“未至”则明确阻断推定。",
      to: "/people/su-shi/career",
    },
    {
      n: "04",
      title: "回到证据",
      text: "区分史料明载、上下文推断与研究解释，并查看置信度。",
      to: "/sources",
    },
  ];
  return (
    <div className="page-container">
      <PageHeader
        eyebrow="学习路径 · 15 MINUTES"
        title="用四步，读懂一条宋代除授。"
        intro="这不是考试式背诵。每一步都可以进入真实数据页操作，再回到证据检查自己的理解。"
      />
      <div className="lesson-path">
        {lessons.map((lesson) => (
          <article key={lesson.n}>
            <span>{lesson.n}</span>
            <div>
              <h2>{lesson.title}</h2>
              <p>{lesson.text}</p>
              <Link className="text-link" to={lesson.to}>
                进入练习 →
              </Link>
            </div>
          </article>
        ))}
      </div>
      <section className="learning-example">
        <p className="eyebrow">贯穿例题</p>
        <h2>“责授……充黄州团练副使，本州安置，不得签书公事”</h2>
        <div>
          <article>
            <strong>责授</strong>
            <p>是处分性授命动作。</p>
          </article>
          <article>
            <strong>团练副使</strong>
            <p>在这个案中是处分组合的官衔成分。</p>
          </article>
          <article>
            <strong>本州安置</strong>
            <p>给出受限状态和所在地。</p>
          </article>
          <article>
            <strong>不得签书公事</strong>
            <p>直接限制实际任事，阻止“名号即工作”的误读。</p>
          </article>
        </div>
        <Link className="button primary-button" to="/decoder">
          把原文放进解码器
        </Link>
      </section>
    </div>
  );
}

export function SimulatorPage() {
  const [period, setPeriod] = useState(site.periodLenses[2]?.id ?? "all");
  const options = site.titleUsageVersions.filter(
    (usage) => period === "all" || usage.periodLensIds.includes(period as never),
  );
  const firstFor = (track: string) =>
    options.find((usage) => usage.semanticTracks.includes(track as never))?.id ?? "none";
  const [rank, setRank] = useState(firstFor("identity_rank"));
  const [honor, setHonor] = useState(firstFor("honor_expertise"));
  const [duty, setDuty] = useState(firstFor("actual_duty"));
  const chosen = [rank, honor, duty]
    .filter((id) => id !== "none")
    .map((id) => site.titleUsageVersions.find((usage) => usage.id === id))
    .filter((usage): usage is (typeof site.titleUsageVersions)[number] => usage !== undefined);
  const selectFor = (track: string, value: string, setter: (value: string) => void) => (
    <select value={value} onChange={(event) => setter(event.target.value)}>
      <option value="none">不选择</option>
      {options
        .filter((usage) => usage.semanticTracks.includes(track as never))
        .map((usage) => (
          <option value={usage.id} key={usage.id}>
            {usage.label}
          </option>
        ))}
    </select>
  );
  return (
    <div className="page-container">
      <PageHeader
        eyebrow="任命模拟器 · LEARNING SANDBOX"
        title="组合一纸除授，检查语义是否自洽。"
        intro="模拟器用于学习三轨模型，不制造历史事实，也不把结果写入数据库。可选项只来自当前已复核官名版本。"
      />
      <div className="simulator-grid">
        <section className="simulator-controls">
          <label>
            <span>时期镜头</span>
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              <option value="all">不限定</option>
              {site.periodLenses.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>身份与官阶</span>
            {selectFor("identity_rank", rank, setRank)}
          </label>
          <label>
            <span>荣衔与专长</span>
            {selectFor("honor_expertise", honor, setHonor)}
          </label>
          <label>
            <span>实际职务</span>
            {selectFor("actual_duty", duty, setDuty)}
          </label>
          <p className="small-note">
            切换时期后若旧选项不再有效，结果会明确提示版本冲突，不自动替换。
          </p>
        </section>
        <section className="simulator-output">
          <p className="eyebrow">学习性组合</p>
          <h2>
            {chosen
              .map((usage) => site.titleConcepts.find((title) => title.id === usage.titleConceptId))
              .map(preferredName)
              .join("、") || "请选择至少一个成分"}
          </h2>
          {chosen.map((usage) => (
            <article key={usage.id}>
              <span>
                {usage.semanticTracks.map((track) => trackLabels[track] ?? track).join(" · ")}
              </span>
              <strong>{usage.label}</strong>
              <p>{usage.plainExplanation.text}</p>
            </article>
          ))}
          {[rank, honor, duty].some(
            (id) => id !== "none" && !options.some((usage) => usage.id === id),
          ) ? (
            <aside className="unknown-box">
              <strong>时期冲突</strong>
              <p>至少一个选择不属于当前时期镜头，请重新选择。</p>
            </aside>
          ) : null}
          <p className="decoder-warning">这是一项教学组合，不对应真实任命。</p>
        </section>
      </div>
    </div>
  );
}

export function DataPage() {
  const titleProgress = Math.round((site.counts.reviewedTitleUsages / 50) * 100);
  return (
    <div className="page-container">
      <PageHeader
        eyebrow="数据与方法 · OPEN RESEARCH WORKFLOW"
        title="看得见成果，也看得见缺口。"
        intro="发布数据从受控 JSON 生成；schema、外键、证据门禁、原文 span、版本重叠与占位内容都会进入自动校验。当前状态是可核查种子，而非完成版。"
        actions={
          <div className="download-actions">
            <a className="button primary-button" href={`${downloadBase}/release.json`} download>
              下载 JSON
            </a>
            <a className="button secondary-button" href={`${downloadBase}/titles.csv`} download>
              下载官名 CSV
            </a>
          </div>
        }
      />
      <section className="progress-dashboard">
        <article>
          <div>
            <span>已复核官名版本</span>
            <strong>{site.counts.reviewedTitleUsages} / 50</strong>
          </div>
          <div className="progress-track">
            <i style={{ width: `${titleProgress}%` }} />
          </div>
          <p>首批词表目标；只统计 reviewed / verified。</p>
        </article>
        <article>
          <div>
            <span>苏轼任官覆盖</span>
            <strong>13 条 · partial</strong>
          </div>
          <div className="progress-track">
            <i style={{ width: "35%" }} />
          </div>
          <p>
            卷338首轮矩阵已入库；孔凡礼年谱尚未形成完整分母，因此 35%
            只表示工作阶段，不是史实覆盖率。
          </p>
        </article>
      </section>
      <div className="data-grid">
        <section className="quality-gates">
          <p className="eyebrow">自动质量门禁</p>
          <h2>什么错误会阻断发布？</h2>
          {[
            "全局稳定 ID 重复或外键断裂",
            "reviewed / accepted 主张没有支持性 passage",
            "任命原文拆解 span 与原文不完全一致",
            "同官名同角色版本有效期无解释重叠",
            "别名冲突未显式标记歧义",
            "生产数据出现示例、占位或 TODO 标记",
          ].map((item, index) => (
            <div key={item}>
              <span>0{index + 1}</span>
              <p>{item}</p>
              <b>CI 阻断</b>
            </div>
          ))}
        </section>
        <section className="schema-overview">
          <p className="eyebrow">核心对象</p>
          <h2>从文本到解释的最短链路</h2>
          <div className="schema-flow">
            <span>Source</span>
            <i>→</i>
            <span>Edition</span>
            <i>→</i>
            <span>Locator</span>
            <i>→</i>
            <span>Passage</span>
            <i>→</i>
            <span>Evidence</span>
            <i>→</i>
            <span>Assertion</span>
          </div>
          <p>领域实体引用 Assertion；通俗解释是单独的 Interpretation，不冒充史料原文。</p>
          <h3>任命与任事分离</h3>
          <div className="schema-flow compact">
            <span>AppointmentAction</span>
            <i>→</i>
            <span>Components</span>
            <i>↘</i>
            <span>ServiceEpisode</span>
          </div>
          <p>AppointmentAction 记录“授了什么”；ServiceEpisode 记录“是否实际做了”。</p>
        </section>
      </div>
      <section className="method-links">
        <article>
          <strong>来源策略</strong>
          <p>原典、年谱、现代研究与外部对齐各自承担不同角色。</p>
          <Link className="text-link" to="/sources">
            浏览来源 →
          </Link>
        </article>
        <article>
          <strong>争议处理</strong>
          <p>不覆盖分歧；用 assertion、evidence 与 review 显式保存。</p>
          <Link className="text-link" to="/reforms">
            看版本化解释 →
          </Link>
        </article>
        <article>
          <strong>可重复构建</strong>
          <p>发布 JSON、CSV 与站点来自同一份受控数据。</p>
          <a
            className="text-link"
            href="https://github.com/Chen-Qingxiang/chushou"
            target="_blank"
            rel="noreferrer"
          >
            查看仓库 ↗
          </a>
        </article>
      </section>
    </div>
  );
}

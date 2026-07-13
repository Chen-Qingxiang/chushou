import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  actionLabels,
  appointmentPlace,
  categoryLabels,
  dateLabel,
  preferredName,
  site,
  trackLabels,
} from "../data";
import { EvidenceButton } from "../evidence";
import { PageHeader } from "../Page";

type CompareMode = "appointment" | "title" | "person";
type CompareRow = {
  key: string;
  label: string;
  left: string;
  right: string;
};

function comparisonUrl(mode: CompareMode, left: string, right: string, period?: string): string {
  const params = new URLSearchParams({ mode, left, right });
  if (period !== undefined) params.set("period", period);
  return `/compare?${params.toString()}`;
}

function validSelection(
  candidate: string | null,
  options: Array<{ id: string }>,
  fallback: string,
) {
  return options.some((item) => item.id === candidate) ? (candidate ?? fallback) : fallback;
}

function ComparisonTable({
  leftTitle,
  rightTitle,
  leftSubtitle,
  rightSubtitle,
  rows,
  leftAssertionIds,
  rightAssertionIds,
}: {
  leftTitle: string;
  rightTitle: string;
  leftSubtitle: string;
  rightSubtitle: string;
  rows: CompareRow[];
  leftAssertionIds: Parameters<typeof EvidenceButton>[0]["assertionIds"];
  rightAssertionIds: Parameters<typeof EvidenceButton>[0]["assertionIds"];
}) {
  return (
    <>
      <p className="compare-scroll-hint">横向滑动可查看右侧比较列 →</p>
      <section className="compare-table" aria-label={`${leftTitle}与${rightTitle}比较`}>
        <div className="compare-head">
          <span>观察维度</span>
          <div>
            <strong>{leftTitle}</strong>
            <small>{leftSubtitle}</small>
          </div>
          <div>
            <strong>{rightTitle}</strong>
            <small>{rightSubtitle}</small>
          </div>
        </div>
        {rows.map((row) => (
          <div className={`compare-row compare-${row.key}`} key={row.key}>
            <strong>{row.label}</strong>
            <p>{row.left}</p>
            <p>{row.right}</p>
          </div>
        ))}
        <div className="compare-evidence">
          <span>证据</span>
          <EvidenceButton
            assertionIds={[...leftAssertionIds]}
            title={leftTitle}
            label="核对左列证据"
          />
          <EvidenceButton
            assertionIds={[...rightAssertionIds]}
            title={rightTitle}
            label="核对右列证据"
          />
        </div>
      </section>
    </>
  );
}

function appointmentPersonName(appointment: (typeof site.appointments)[number]): string {
  return preferredName(site.people.find((person) => person.id === appointment.personId));
}

function appointmentRows(appointment: (typeof site.appointments)[number]) {
  const byTrack = (track: string) =>
    appointment.components
      .filter((component) => component.semanticTracks.includes(track as never))
      .map((component) => component.sourceSpan.text)
      .join("、") || "—";
  return {
    date: dateLabel(appointment.time),
    action: appointment.actionTypes.map((item) => actionLabels[item] ?? item).join("、"),
    rank: byTrack("identity_rank"),
    honor: byTrack("honor_expertise"),
    duty: byTrack("actual_duty"),
    place: appointmentPlace(appointment),
    political: byTrack("political_status"),
    service:
      appointment.serviceEpisodes.length > 0
        ? appointment.serviceEpisodes.map((item) => item.serviceStatus).join("、")
        : "无已发布服务记录",
  };
}

function AppointmentComparison({ params }: { params: URLSearchParams }) {
  const navigate = useNavigate();
  const fallbackLeft = site.appointments[0]?.id ?? "";
  const fallbackRight =
    site.appointments.find((item) => item.id.includes("huangzhou-punitive"))?.id ??
    site.appointments[1]?.id ??
    fallbackLeft;
  const leftId = validSelection(params.get("left"), site.appointments, fallbackLeft);
  const rightId = validSelection(params.get("right"), site.appointments, fallbackRight);
  const left = site.appointments.find((item) => item.id === leftId) ?? site.appointments[0];
  const right = site.appointments.find((item) => item.id === rightId) ?? site.appointments[1];
  if (left === undefined || right === undefined) return null;
  const leftRows = appointmentRows(left);
  const rightRows = appointmentRows(right);
  const rows: CompareRow[] = [
    { key: "date", label: "时间", left: leftRows.date, right: rightRows.date },
    { key: "action", label: "任命动作", left: leftRows.action, right: rightRows.action },
    { key: "rank", label: "身份／官阶", left: leftRows.rank, right: rightRows.rank },
    { key: "honor", label: "荣衔／专长", left: leftRows.honor, right: rightRows.honor },
    { key: "duty", label: "实际职务", left: leftRows.duty, right: rightRows.duty },
    { key: "place", label: "地点", left: leftRows.place, right: rightRows.place },
    {
      key: "political",
      label: "政治状态",
      left: leftRows.political,
      right: rightRows.political,
    },
    {
      key: "service",
      label: "实际任事证据",
      left: leftRows.service,
      right: rightRows.service,
    },
  ];
  return (
    <>
      <div className="compare-selectors">
        <label>
          <span>任命 A</span>
          <select
            value={leftId}
            onChange={(event) =>
              void navigate(comparisonUrl("appointment", event.target.value, rightId), {
                replace: true,
              })
            }
          >
            {site.appointments.map((item) => (
              <option value={item.id} key={item.id}>
                {appointmentPersonName(item)} · {dateLabel(item.time)} · {item.rawText}
              </option>
            ))}
          </select>
        </label>
        <Link
          className="compare-swap"
          to={comparisonUrl("appointment", rightId, leftId)}
          aria-label="交换两条任命"
        >
          ⇄
        </Link>
        <label>
          <span>任命 B</span>
          <select
            value={rightId}
            onChange={(event) =>
              void navigate(comparisonUrl("appointment", leftId, event.target.value), {
                replace: true,
              })
            }
          >
            {site.appointments.map((item) => (
              <option value={item.id} key={item.id}>
                {appointmentPersonName(item)} · {dateLabel(item.time)} · {item.rawText}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ComparisonTable
        leftTitle={left.rawText}
        rightTitle={right.rawText}
        leftSubtitle={`${appointmentPersonName(left)} · ${appointmentPlace(left)}`}
        rightSubtitle={`${appointmentPersonName(right)} · ${appointmentPlace(right)}`}
        rows={rows}
        leftAssertionIds={left.assertionIds}
        rightAssertionIds={right.assertionIds}
      />
    </>
  );
}

function usageFor(titleId: string, periodId: string) {
  return site.titleUsageVersions.find(
    (usage) =>
      usage.titleConceptId === titleId &&
      (periodId === "all" || usage.periodLensIds.includes(periodId as never)),
  );
}

function usageInstitutions(usage: (typeof site.titleUsageVersions)[number] | undefined): string {
  if (usage === undefined) return "该时期镜头无已发布版本";
  const names = usage.institutionVersionIds
    .map((versionId) =>
      site.institutions.find(
        (institution) =>
          institution.id ===
          site.institutionVersions.find((version) => version.id === versionId)?.institutionId,
      ),
    )
    .map(preferredName);
  return [...new Set(names)].join("、") || "机构归属尚未发布";
}

function usageRank(usage: (typeof site.titleUsageVersions)[number] | undefined): string {
  const rank = site.ranks.find((item) => item.id === usage?.rankId);
  const scheme = site.rankSchemes.find((item) => item.id === rank?.rankSchemeId);
  if (rank === undefined || scheme === undefined) return "当前版本无可比品秩定位";
  return `${rank.label} · ${scheme.label} · 方案内序位 ${rank.sequence ?? "未定"}`;
}

function TitleComparison({ params }: { params: URLSearchParams }) {
  const navigate = useNavigate();
  const legacy = site.titleConcepts.find((item) => item.slug === params.get("title"));
  const fallbackLeft =
    legacy?.id ?? site.titleConcepts.find((item) => item.slug === "tongpan")?.id ?? "";
  const legacyPairingId = site.titleUsageVersions
    .find((usage) => usage.titleConceptId === legacy?.id)
    ?.commonPairingTitleIds.find((id) => id !== legacy?.id);
  const fallbackRight =
    legacyPairingId ??
    site.titleConcepts.find((item) => item.slug === "zhizhou" && item.id !== fallbackLeft)?.id ??
    site.titleConcepts.find((item) => item.id !== fallbackLeft)?.id ??
    fallbackLeft;
  const leftId = validSelection(params.get("left"), site.titleConcepts, fallbackLeft);
  const rightId = validSelection(params.get("right"), site.titleConcepts, fallbackRight);
  const periodId = validSelection(
    params.get("period"),
    [{ id: "all" }, ...site.periodLenses],
    "chs:period:yuanfeng-reform",
  );
  const left = site.titleConcepts.find((item) => item.id === leftId);
  const right = site.titleConcepts.find((item) => item.id === rightId);
  if (left === undefined || right === undefined) return null;
  const leftUsage = usageFor(leftId, periodId);
  const rightUsage = usageFor(rightId, periodId);
  const unavailable = "该时期镜头无已发布版本";
  const leftPairings = leftUsage?.commonPairingTitleIds
    .map((id) => preferredName(site.titleConcepts.find((item) => item.id === id)))
    .join("、");
  const rightPairings = rightUsage?.commonPairingTitleIds
    .map((id) => preferredName(site.titleConcepts.find((item) => item.id === id)))
    .join("、");
  const rows: CompareRow[] = [
    {
      key: "version",
      label: "有效版本",
      left: leftUsage?.label ?? unavailable,
      right: rightUsage?.label ?? unavailable,
    },
    {
      key: "date",
      label: "有效期",
      left: leftUsage?.validTime.originalText ?? unavailable,
      right: rightUsage?.validTime.originalText ?? unavailable,
    },
    {
      key: "category",
      label: "制度性质",
      left:
        leftUsage?.categories.map((item) => categoryLabels[item] ?? item).join("、") ?? unavailable,
      right:
        rightUsage?.categories.map((item) => categoryLabels[item] ?? item).join("、") ??
        unavailable,
    },
    {
      key: "tracks",
      label: "语义轨道",
      left:
        leftUsage?.semanticTracks.map((item) => trackLabels[item] ?? item).join("、") ??
        unavailable,
      right:
        rightUsage?.semanticTracks.map((item) => trackLabels[item] ?? item).join("、") ??
        unavailable,
    },
    {
      key: "institution",
      label: "机构归属",
      left: usageInstitutions(leftUsage),
      right: usageInstitutions(rightUsage),
    },
    {
      key: "rank",
      label: "品秩定位",
      left: usageRank(leftUsage),
      right: usageRank(rightUsage),
    },
    {
      key: "duty",
      label: "当前可证职掌",
      left: leftUsage?.functions.map((item) => item.text).join("；") ?? unavailable,
      right: rightUsage?.functions.map((item) => item.text).join("；") ?? unavailable,
    },
    {
      key: "pairing",
      label: "协作／配对线索",
      left: leftPairings === undefined || leftPairings === "" ? "无已发布线索" : leftPairings,
      right: rightPairings === undefined || rightPairings === "" ? "无已发布线索" : rightPairings,
    },
    {
      key: "caveat",
      label: "解释边界",
      left: leftUsage?.caveat.text ?? unavailable,
      right: rightUsage?.caveat.text ?? unavailable,
    },
  ];
  return (
    <>
      <label className="compare-period">
        <span>共同解释时期</span>
        <select
          value={periodId}
          onChange={(event) =>
            void navigate(comparisonUrl("title", leftId, rightId, event.target.value), {
              replace: true,
            })
          }
        >
          <option value="all">不限定（取首个已发布版本）</option>
          {site.periodLenses.map((period) => (
            <option value={period.id} key={period.id}>
              {period.label}
            </option>
          ))}
        </select>
      </label>
      <div className="compare-selectors">
        <label>
          <span>官名 A</span>
          <select
            value={leftId}
            onChange={(event) =>
              void navigate(comparisonUrl("title", event.target.value, rightId, periodId), {
                replace: true,
              })
            }
          >
            {site.titleConcepts.map((item) => (
              <option value={item.id} key={item.id}>
                {preferredName(item)}
              </option>
            ))}
          </select>
        </label>
        <Link
          className="compare-swap"
          to={comparisonUrl("title", rightId, leftId, periodId)}
          aria-label="交换两个官名"
        >
          ⇄
        </Link>
        <label>
          <span>官名 B</span>
          <select
            value={rightId}
            onChange={(event) =>
              void navigate(comparisonUrl("title", leftId, event.target.value, periodId), {
                replace: true,
              })
            }
          >
            {site.titleConcepts.map((item) => (
              <option value={item.id} key={item.id}>
                {preferredName(item)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ComparisonTable
        leftTitle={preferredName(left)}
        rightTitle={preferredName(right)}
        leftSubtitle={leftUsage?.label ?? unavailable}
        rightSubtitle={rightUsage?.label ?? unavailable}
        rows={rows}
        leftAssertionIds={leftUsage?.assertionIds ?? []}
        rightAssertionIds={rightUsage?.assertionIds ?? []}
      />
    </>
  );
}

function personSummary(personId: string) {
  const person = site.people.find((item) => item.id === personId);
  const appointments = site.appointments.filter((item) => item.personId === personId);
  const components = appointments.flatMap((item) => item.components);
  const byTrack = (track: string) =>
    [
      ...new Set(
        components
          .filter((component) => component.semanticTracks.includes(track as never))
          .map((component) => component.sourceSpan.text),
      ),
    ].join("、") || "—";
  const institutionNames = [
    ...new Set(
      components
        .map((component) =>
          site.titleUsageVersions.find((usage) => usage.id === component.titleUsageVersionId),
        )
        .flatMap((usage) => usage?.institutionVersionIds ?? [])
        .map((versionId) =>
          site.institutions.find(
            (institution) =>
              institution.id ===
              site.institutionVersions.find((version) => version.id === versionId)?.institutionId,
          ),
        )
        .map(preferredName),
    ),
  ];
  const matrix = site.coverageMatrices.find((item) =>
    item.items.some((coverage) => coverage.personId === personId),
  );
  const linked = matrix?.items.filter((item) => item.appointmentIds.length > 0).length ?? 0;
  const boundary =
    matrix === undefined
      ? `${appointments.length} 条已发布任命小切片；未建立完整生涯分母。`
      : `${linked}/${matrix.items.length} 条《宋史》锚点已对照；权威年谱分母仍 blocked。`;
  return {
    person,
    appointments,
    rows: {
      life: person?.lifeSpan?.originalText ?? "生卒信息未发布",
      scope: person?.description.text ?? "—",
      count: `${appointments.length} 条已发布任命`,
      range: appointments.map((item) => dateLabel(item.time)).join("、") || "—",
      rank: byTrack("identity_rank"),
      honor: byTrack("honor_expertise"),
      duty: byTrack("actual_duty"),
      political: byTrack("political_status"),
      institutions: institutionNames.join("、") || "—",
      boundary,
    },
    assertionIds: [
      ...(person?.assertionIds ?? []),
      ...appointments.flatMap((item) => item.assertionIds),
    ],
  };
}

function PersonComparison({ params }: { params: URLSearchParams }) {
  const navigate = useNavigate();
  const fallbackLeft = site.people.find((item) => item.slug === "su-shi")?.id ?? "";
  const fallbackRight = site.people.find((item) => item.slug === "wang-anshi")?.id ?? fallbackLeft;
  const leftId = validSelection(params.get("left"), site.people, fallbackLeft);
  const rightId = validSelection(params.get("right"), site.people, fallbackRight);
  const left = personSummary(leftId);
  const right = personSummary(rightId);
  if (left.person === undefined || right.person === undefined) return null;
  const rows: CompareRow[] = [
    { key: "life", label: "生卒", left: left.rows.life, right: right.rows.life },
    { key: "scope", label: "人物切片", left: left.rows.scope, right: right.rows.scope },
    { key: "count", label: "已发布任命", left: left.rows.count, right: right.rows.count },
    { key: "date", label: "已发布时点", left: left.rows.range, right: right.rows.range },
    { key: "rank", label: "身份／官阶", left: left.rows.rank, right: right.rows.rank },
    { key: "honor", label: "荣衔／专长", left: left.rows.honor, right: right.rows.honor },
    { key: "duty", label: "实际职务", left: left.rows.duty, right: right.rows.duty },
    {
      key: "institution",
      label: "制度位置",
      left: left.rows.institutions,
      right: right.rows.institutions,
    },
    {
      key: "political",
      label: "政治状态",
      left: left.rows.political,
      right: right.rows.political,
    },
    {
      key: "caveat",
      label: "覆盖边界",
      left: left.rows.boundary,
      right: right.rows.boundary,
    },
  ];
  return (
    <>
      <div className="compare-selectors">
        <label>
          <span>人物 A</span>
          <select
            value={leftId}
            onChange={(event) =>
              void navigate(comparisonUrl("person", event.target.value, rightId), {
                replace: true,
              })
            }
          >
            {site.people.map((item) => (
              <option value={item.id} key={item.id}>
                {preferredName(item)}
              </option>
            ))}
          </select>
        </label>
        <Link
          className="compare-swap"
          to={comparisonUrl("person", rightId, leftId)}
          aria-label="交换两个人物"
        >
          ⇄
        </Link>
        <label>
          <span>人物 B</span>
          <select
            value={rightId}
            onChange={(event) =>
              void navigate(comparisonUrl("person", leftId, event.target.value), {
                replace: true,
              })
            }
          >
            {site.people.map((item) => (
              <option value={item.id} key={item.id}>
                {preferredName(item)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ComparisonTable
        leftTitle={preferredName(left.person)}
        rightTitle={preferredName(right.person)}
        leftSubtitle={left.rows.boundary}
        rightSubtitle={right.rows.boundary}
        rows={rows}
        leftAssertionIds={left.assertionIds}
        rightAssertionIds={right.assertionIds}
      />
    </>
  );
}

export function ComparePage() {
  const [params] = useSearchParams();
  const requestedMode = params.get("mode");
  const mode: CompareMode =
    requestedMode === "title" || requestedMode === "person" || requestedMode === "appointment"
      ? requestedMode
      : params.has("title")
        ? "title"
        : "appointment";
  const appointmentLeft = site.appointments[0]?.id ?? "";
  const appointmentRight = site.appointments[1]?.id ?? appointmentLeft;
  const titleLeft = site.titleConcepts.find((item) => item.slug === "tongpan")?.id ?? "";
  const titleRight = site.titleConcepts.find((item) => item.slug === "zhizhou")?.id ?? titleLeft;
  const personLeft = site.people.find((item) => item.slug === "su-shi")?.id ?? "";
  const personRight = site.people.find((item) => item.slug === "wang-anshi")?.id ?? personLeft;
  const modes: Array<{ id: CompareMode; label: string; to: string }> = [
    {
      id: "appointment",
      label: "任命前后",
      to: comparisonUrl("appointment", appointmentLeft, appointmentRight),
    },
    {
      id: "title",
      label: "官名与时期",
      to: comparisonUrl("title", titleLeft, titleRight, "chs:period:yuanfeng-reform"),
    },
    {
      id: "person",
      label: "人物制度位置",
      to: comparisonUrl("person", personLeft, personRight),
    },
  ];
  return (
    <div className="page-container">
      <PageHeader
        eyebrow="多维比较 · EXPLAINABLE DIFFERENCE"
        title="不要只问“哪个官更大”。"
        intro="比较分别处理任命动作、时期化官名和人物制度位置；品秩只在注明的方案内成立，覆盖不足也会成为比较结果。"
      />
      <nav className="compare-modes" aria-label="比较对象">
        {modes.map((item) => (
          <Link
            to={item.to}
            className={mode === item.id ? "is-active" : undefined}
            aria-current={mode === item.id ? "page" : undefined}
            key={item.id}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {mode === "appointment" ? <AppointmentComparison params={params} /> : null}
      {mode === "title" ? <TitleComparison params={params} /> : null}
      {mode === "person" ? <PersonComparison params={params} /> : null}
      <p className="compare-method-note">
        比较表没有伪精确总分；“无已发布版本”与“未建立完整分母”是研究结果，不会被零值掩盖。
      </p>
    </div>
  );
}

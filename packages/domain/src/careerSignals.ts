import type { StableId } from "@chushou/schema";
import type { SiteProjection } from "./projection.js";

export type CareerSignalDimension =
  "centrality" | "actual_power" | "nominal_rank" | "prestige" | "imperial_trust";

export type CareerSignal = {
  dimension: CareerSignalDimension;
  signalType: "source_fact" | "structural_rule" | "coverage_gap";
  label: string;
  explanation: string;
  method: string;
  assertionIds: StableId[];
};

type Appointment = SiteProjection["appointments"][number];
type SignalContext = Pick<SiteProjection, "titleUsageVersions" | "institutionVersions" | "ranks">;

function uniqueIds(ids: readonly StableId[]): StableId[] {
  return [...new Set(ids)];
}

function signal(
  dimension: CareerSignalDimension,
  signalType: CareerSignal["signalType"],
  label: string,
  explanation: string,
  method: string,
  assertionIds: readonly StableId[],
): CareerSignal {
  return {
    dimension,
    signalType,
    label,
    explanation,
    method,
    assertionIds: uniqueIds(assertionIds),
  };
}

/**
 * Derive categorical, inspectable signals from the published appointment graph.
 * These signals deliberately do not assign numbers or claim that a proxy is a
 * psychological fact. A missing mapping remains a coverage gap.
 */
export function deriveCareerSignals(
  appointment: Appointment,
  context: SignalContext,
): CareerSignal[] {
  const usages = appointment.components
    .map((component) =>
      context.titleUsageVersions.find((usage) => usage.id === component.titleUsageVersionId),
    )
    .filter((usage): usage is SignalContext["titleUsageVersions"][number] => usage !== undefined);
  const institutionLevels = usages.flatMap((usage) =>
    usage.institutionVersionIds.flatMap((institutionId) => {
      const version = context.institutionVersions.find((item) => item.id === institutionId);
      return version === undefined ? [] : [version.level];
    }),
  );
  const hasCentralInstitution = institutionLevels.some((level) =>
    ["imperial", "central"].includes(level),
  );
  const hasLocalInstitution = institutionLevels.some((level) =>
    ["regional", "prefectural", "county"].includes(level),
  );
  const hasPlace = appointment.components.some((component) => component.placeVersionId !== null);
  const centrality =
    hasCentralInstitution && (hasLocalInstitution || hasPlace)
      ? signal(
          "centrality",
          "structural_rule",
          "中央机构关联＋地方对象",
          "官名版本连接中央机构，同时任命结构含地方机构或地点；这里只显示结构位置，不计算高低。",
          "title_usage_institution_level_and_place_presence_v1",
          [...appointment.assertionIds, ...usages.flatMap((usage) => usage.assertionIds)],
        )
      : hasCentralInstitution
        ? signal(
            "centrality",
            "structural_rule",
            "中央机构关联",
            "至少一项官名版本连接中央或皇帝层级机构；不据此推定实际接近决策核心的程度。",
            "title_usage_institution_level_v1",
            [...appointment.assertionIds, ...usages.flatMap((usage) => usage.assertionIds)],
          )
        : hasLocalInstitution || hasPlace
          ? signal(
              "centrality",
              "structural_rule",
              "地方机构／地点关联",
              "任命结构含地方机构或地点；未据此换算政治中心距离。",
              "local_institution_or_place_presence_v1",
              [...appointment.assertionIds, ...usages.flatMap((usage) => usage.assertionIds)],
            )
          : signal(
              "centrality",
              "coverage_gap",
              "中心度未评定",
              "当前官名版本与地点数据不足，不能判断其中央核心程度。",
              "no_supported_centrality_mapping",
              appointment.assertionIds,
            );

  const hasService = appointment.serviceEpisodes.some(
    (episode) => episode.episodeType === "service",
  );
  const hasRestriction =
    appointment.components.some((component) => component.componentType === "restriction") ||
    appointment.serviceEpisodes.some((episode) => episode.episodeType === "punitive_status");
  const serviceAssertions = appointment.serviceEpisodes.flatMap((episode) => episode.assertionIds);
  const actualPower = hasService
    ? signal(
        "actual_power",
        "source_fact",
        hasRestriction ? "任事记录＋明载限制" : "实际服务记录已发布",
        hasRestriction
          ? "数据同时保存实际服务／状态记录与任事限制；两者不相互抵消。"
          : "至少一条 ServiceEpisode 记录实际服务状态；不把授命动作本身当作到任。",
        "service_episode_presence_v1",
        [...appointment.assertionIds, ...serviceAssertions],
      )
    : hasRestriction
      ? signal(
          "actual_power",
          "source_fact",
          "处分／任事限制明载",
          "原文或状态记录明确保存处分与任事限制，不能按官名表面推定实际权力。",
          "restriction_component_or_episode_v1",
          [...appointment.assertionIds, ...serviceAssertions],
        )
      : signal(
          "actual_power",
          "coverage_gap",
          "实际任事待考",
          "授命动作已发布，但没有足以生成 ServiceEpisode 的到任／任事证据。",
          "no_service_episode",
          appointment.assertionIds,
        );

  const ranks = usages.flatMap((usage) => {
    const rank = context.ranks.find((item) => item.id === usage.rankId);
    return rank === undefined ? [] : [rank];
  });
  const hasIdentityComponent = appointment.components.some((component) =>
    component.semanticTracks.includes("identity_rank"),
  );
  const nominalRank =
    ranks.length > 0
      ? signal(
          "nominal_rank",
          "source_fact",
          [...new Set(ranks.map((rank) => `${rank.label}${rank.gradeText ?? ""}`))].join("、"),
          "官名版本已显式连接受控品秩表；显示原品秩文字，不跨体系换算总分。",
          "title_usage_rank_link_v1",
          [...appointment.assertionIds, ...ranks.flatMap((rank) => rank.assertionIds)],
        )
      : signal(
          "nominal_rank",
          "coverage_gap",
          hasIdentityComponent ? "有身份成分，品秩未对齐" : "未发布名义品级",
          hasIdentityComponent
            ? "任命含身份／官阶轨成分，但该版本尚未连接可核验 Rank。"
            : "当前任命未发布可用于名义品级判断的成分。",
          hasIdentityComponent ? "identity_component_without_rank_link" : "no_rank_component",
          appointment.assertionIds,
        );

  const honorComponents = appointment.components.filter((component) =>
    component.semanticTracks.includes("honor_expertise"),
  );
  const prestige =
    honorComponents.length > 0
      ? signal(
          "prestige",
          "source_fact",
          honorComponents.map((component) => component.sourceSpan.text).join("、"),
          "显示任命原文中已拆出的荣誉／资历成分；不把职名自动折算为资望分数。",
          "honor_expertise_component_presence_v1",
          honorComponents.flatMap((component) => component.assertionIds),
        )
      : signal(
          "prestige",
          "coverage_gap",
          "未发布荣誉／资历成分",
          "这表示当前任命结构没有已发布成分，不等于当事人历史上没有资望。",
          "no_honor_expertise_component",
          appointment.assertionIds,
        );

  const hasPunitiveAction = appointment.actionTypes.some((action) =>
    ["demote", "punitive_appoint", "place_under_restriction"].includes(action),
  );
  const hasReturnAction = appointment.actionTypes.some((action) =>
    ["recall", "restore"].includes(action),
  );
  const trust = hasReturnAction
    ? signal(
        "imperial_trust",
        "structural_rule",
        "恢复／召还动作信号",
        "这是任命动作的制度代理信号，不是对皇帝心理或长期信任度的事实判断。",
        "recall_or_restore_action_proxy_v1",
        appointment.assertionIds,
      )
    : hasPunitiveAction
      ? signal(
          "imperial_trust",
          "structural_rule",
          "责降／安置动作信号",
          "这是处分动作的制度代理信号，不等于可量化的皇帝信任分。",
          "punitive_action_proxy_v1",
          appointment.assertionIds,
        )
      : signal(
          "imperial_trust",
          "coverage_gap",
          "不作信任判断",
          "一般授命或迁转不足以单独证明皇帝信任程度。",
          "no_supported_imperial_trust_assessment",
          appointment.assertionIds,
        );

  return [centrality, actualPower, nominalRank, prestige, trust];
}

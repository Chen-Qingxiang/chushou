import {
  deriveCareerSignals,
  decodeAppointmentText,
  buildSearchRecords,
  buildSiteProjection,
  searchRecords,
} from "@chushou/domain";
import {
  curatedDatasetSchema,
  validateDatasetIntegrity,
  type CuratedDataset,
} from "@chushou/schema";
import { beforeAll, describe, expect, it } from "vitest";
import { generateArtifacts } from "./generate.js";
import { loadCuratedDataset } from "./load.js";

describe("curated research release", () => {
  let dataset: CuratedDataset;

  beforeAll(async () => {
    dataset = await loadCuratedDataset();
  });

  it("passes relational and evidence integrity gates", () => {
    expect(validateDatasetIntegrity(dataset)).toEqual([]);
    expect(dataset.titleConcepts.length).toBeGreaterThanOrEqual(50);
    expect(dataset.assertions.length).toBeGreaterThan(0);
    expect(dataset.evidenceLinks.length).toBeGreaterThan(dataset.assertions.length);
  });

  it("requires supporting passages for every reviewed assertion", () => {
    const broken = structuredClone(dataset);
    const reviewed = broken.assertions.find((assertion) => assertion.status === "reviewed");
    if (reviewed === undefined) throw new Error("Fixture requires a reviewed assertion");
    broken.evidenceLinks = broken.evidenceLinks.filter((link) => link.assertionId !== reviewed.id);

    const issues = validateDatasetIntegrity(broken);
    expect(
      issues.some(
        (issue) =>
          issue.code === "missing_supporting_evidence" && issue.message.includes(reviewed.id),
      ),
    ).toBe(true);
  });

  it("detects duplicate IDs, broken references, and incomplete citation locators", () => {
    const duplicate = structuredClone(dataset);
    const firstTitle = duplicate.titleConcepts[0];
    const secondTitle = duplicate.titleConcepts[1];
    if (firstTitle === undefined || secondTitle === undefined) {
      throw new Error("Fixture requires two titles");
    }
    secondTitle.id = firstTitle.id;
    expect(validateDatasetIntegrity(duplicate)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "duplicate_id" })]),
    );

    const brokenReference = structuredClone(dataset);
    const edition = brokenReference.editions[0];
    if (edition === undefined) throw new Error("Fixture requires an edition");
    edition.sourceId = "chs:source:does-not-exist";
    expect(validateDatasetIntegrity(brokenReference)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "missing_reference" })]),
    );

    const incompleteLocator = structuredClone(dataset);
    const locator = incompleteLocator.sourceLocators[0];
    if (locator === undefined) throw new Error("Fixture requires a locator");
    locator.volume = null;
    locator.juan = null;
    locator.section = null;
    locator.page = null;
    locator.entry = null;
    locator.paragraph = null;
    locator.anchor = null;
    locator.stableUrl = null;
    expect(validateDatasetIntegrity(incompleteLocator)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "citation_locator_incomplete" })]),
    );
  });

  it("rejects inverted date intervals, alias conflicts, version overlaps, and component gaps", () => {
    const invertedDate = structuredClone(dataset);
    const period = invertedDate.periodLenses[0];
    if (period === undefined) throw new Error("Fixture requires a period lens");
    period.validTime.normalizedStart = "1127-01-01";
    period.validTime.normalizedEnd = "0960-01-01";
    expect(curatedDatasetSchema.safeParse(invertedDate).success).toBe(false);

    const aliasConflict = structuredClone(dataset);
    const owner = aliasConflict.titleConcepts[0];
    const conflicting = aliasConflict.titleConcepts[1];
    if (owner?.names[0] === undefined || conflicting?.names[0] === undefined) {
      throw new Error("Fixture requires named titles");
    }
    conflicting.names[0].text = owner.names[0].text;
    conflicting.names[0].ambiguous = false;
    expect(validateDatasetIntegrity(aliasConflict)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "alias_conflict" })]),
    );

    const overlap = structuredClone(dataset);
    const pre = overlap.titleUsageVersions.find(
      (usage) => usage.id === "chs:title-usage:shizhong-pre-yuanfeng",
    );
    const post = overlap.titleUsageVersions.find(
      (usage) => usage.id === "chs:title-usage:shizhong-yuanfeng",
    );
    if (pre === undefined || post === undefined) {
      throw new Error("Fixture requires both 侍中 versions");
    }
    post.categories = [...pre.categories];
    post.semanticTracks = [...pre.semanticTracks];
    post.validTime.normalizedStart = pre.validTime.normalizedStart;
    expect(validateDatasetIntegrity(overlap)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "overlapping_title_versions" })]),
    );

    const componentGap = structuredClone(dataset);
    const appointmentId = componentGap.appointmentComponents[0]?.appointmentId;
    const components = componentGap.appointmentComponents.filter(
      (component) => component.appointmentId === appointmentId,
    );
    if (components[1] === undefined) throw new Error("Fixture requires a multi-part appointment");
    components[1].order = components[0]?.order ?? 1;
    expect(validateDatasetIntegrity(componentGap)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "component_order" })]),
    );
  });

  it("rejects placeholder language from a production corpus", () => {
    const broken = structuredClone(dataset);
    const firstSource = broken.sources[0];
    if (firstSource === undefined) throw new Error("Fixture requires a source");
    broken.sources[0] = { ...firstSource, notes: "TODO: replace this source" };

    expect(validateDatasetIntegrity(broken)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "placeholder_content" })]),
    );
  });

  it("projects appointments, evidence counts, and nested source locators", () => {
    const projection = buildSiteProjection(dataset);
    expect(projection.counts.titleConcepts).toBe(dataset.titleConcepts.length);
    expect(projection.appointments.every((appointment) => appointment.components.length > 0)).toBe(
      true,
    );
    expect(
      projection.sources.some((source) =>
        source.editions.some((edition) =>
          edition.locators.some((locator) => locator.passages.length > 0),
        ),
      ),
    ).toBe(true);
  });

  it("keeps three non-Su counterexamples on the same person and appointment model", () => {
    const counterexamples = dataset.people.filter((person) => person.slug !== "su-shi");
    expect(counterexamples.map((person) => person.slug).toSorted()).toEqual([
      "sima-guang",
      "wang-anshi",
      "zhang-dun",
    ]);
    expect(
      counterexamples.every((person) =>
        dataset.appointmentActions.some((appointment) => appointment.personId === person.id),
      ),
    ).toBe(true);
  });

  it("models rank order and cross-scheme mappings without a universal scalar", () => {
    expect(dataset.rankSchemes.length).toBeGreaterThanOrEqual(2);
    expect(
      dataset.rankSchemes.every((scheme) =>
        dataset.ranks.some((rank) => rank.rankSchemeId === scheme.id),
      ),
    ).toBe(true);
    expect(
      dataset.rankSchemes.some(
        (scheme) =>
          scheme.ordering !== "unordered" &&
          dataset.ranks.filter((rank) => rank.rankSchemeId === scheme.id).length >= 3,
      ),
    ).toBe(true);
    expect(
      dataset.rankCrosswalks.some(
        (crosswalk) => crosswalk.relationType === "replaced_by" && crosswalk.confidence === "high",
      ),
    ).toBe(true);
    expect(
      dataset.rankCrosswalks.some(
        (crosswalk) =>
          crosswalk.editorialStatus === "disputed" &&
          crosswalk.confidence === "low" &&
          crosswalk.disputeNote !== null,
      ),
    ).toBe(true);

    const broken = structuredClone(dataset);
    const crosswalk = broken.rankCrosswalks[0];
    if (crosswalk === undefined) throw new Error("Fixture requires a rank crosswalk");
    const sourceRank = broken.ranks.find((rank) => rank.id === crosswalk.sourceRankId);
    if (sourceRank === undefined) throw new Error("Fixture requires a crosswalk source rank");
    const sameSchemeTarget = broken.ranks.find(
      (rank) => rank.rankSchemeId === sourceRank.rankSchemeId && rank.id !== sourceRank.id,
    );
    if (sameSchemeTarget === undefined) throw new Error("Fixture requires a same-scheme rank pair");
    crosswalk.targetRankId = sameSchemeTarget.id;
    expect(validateDatasetIntegrity(broken)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "rank_crosswalk_same_scheme" })]),
    );
  });

  it("keeps period-specific meanings for the same title concept", () => {
    const shizhong = dataset.titleConcepts.find((title) => title.slug === "shizhong");
    const usages = dataset.titleUsageVersions
      .filter((usage) => usage.titleConceptId === shizhong?.id)
      .toSorted((left, right) =>
        (left.validTime.normalizedStart ?? "").localeCompare(right.validTime.normalizedStart ?? ""),
      );
    expect(usages).toHaveLength(2);
    expect(usages[0]).toMatchObject({
      id: "chs:title-usage:shizhong-pre-yuanfeng",
      semanticTracks: ["identity_rank", "political_status"],
    });
    expect(usages[1]).toMatchObject({
      id: "chs:title-usage:shizhong-yuanfeng",
      semanticTracks: ["actual_duty", "political_status"],
    });
  });

  it("separates service, non-assumption, punitive status, and categorical career signals", () => {
    const projection = buildSiteProjection(dataset);
    const yingzhou = projection.appointments.find((appointment) =>
      appointment.id.includes("yingzhou-not-assumed"),
    );
    const huangzhou = projection.appointments.find(
      (appointment) => appointment.id === "chs:appointment:su-shi-huangzhou",
    );
    if (yingzhou === undefined || huangzhou === undefined) {
      throw new Error("Fixture requires Yingzhou and Huangzhou appointments");
    }
    expect(yingzhou.serviceEpisodes).toHaveLength(0);
    expect(yingzhou.components.some((component) => component.sourceSpan.text === "未至")).toBe(
      true,
    );
    expect(
      huangzhou.serviceEpisodes.some((episode) => episode.episodeType === "punitive_status"),
    ).toBe(true);

    const signals = deriveCareerSignals(huangzhou, projection);
    const actualPower = signals.find((signal) => signal.dimension === "actual_power");
    const imperialTrust = signals.find((signal) => signal.dimension === "imperial_trust");
    expect(actualPower).toMatchObject({ signalType: "source_fact" });
    expect(actualPower?.label).toContain("限制");
    expect(imperialTrust).toMatchObject({ signalType: "structural_rule" });
    expect(signals).toHaveLength(5);
  });

  it("generates byte-identical release artifacts on repeated runs", async () => {
    const first = await generateArtifacts(dataset);
    const second = await generateArtifacts(dataset);
    expect(second).toEqual(first);
  });

  it("publishes an exhaustive biography ledger while blocking the unavailable chronology", () => {
    const authority = dataset.coverageMatrices.find(
      (matrix) => matrix.anchorKind === "authoritative_chronology",
    );
    const biography = dataset.coverageMatrices.find(
      (matrix) => matrix.anchorKind === "official_biography",
    );

    expect(authority).toMatchObject({
      completenessClaim: "blocked",
      items: [],
    });
    expect(authority?.blocker).toContain("可合法全文");
    expect(biography).toMatchObject({ completenessClaim: "exhaustive_for_anchor" });
    expect(biography?.items).toHaveLength(38);
    expect(biography?.items.filter((item) => item.coverageStatus === "partial")).toHaveLength(13);
    expect(biography?.items.filter((item) => item.coverageStatus === "gap")).toHaveLength(25);
    expect(biography?.items.every((item) => item.anchorPassageIds.length > 0)).toBe(true);

    const broken = structuredClone(dataset);
    const gap = broken.coverageMatrices
      .flatMap((matrix) => matrix.items)
      .find((item) => item.coverageStatus === "gap");
    if (gap === undefined) throw new Error("Fixture requires a coverage gap");
    gap.gapReason = null;
    expect(validateDatasetIntegrity(broken)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "coverage_gap_reason_required" })]),
    );
  });

  it("searches across traditional forms, pinyin aliases, and minor typos", () => {
    const records = buildSearchRecords(dataset);
    expect(searchRecords(records, "蘇軾")[0]?.label).toBe("苏轼");
    expect(searchRecords(records, "蘇軾年譜")[0]?.label).toBe("孔凡礼《苏轼年谱》");
    expect(searchRecords(records, "longtu ge xueshi")[0]?.label).toBe("龙图阁学士");
    expect(searchRecords(records, "參知政事")[0]?.label).toBe("参知政事");
  });

  it("decodes longest title phrases and keeps unknown text visible", () => {
    const result = decodeAppointmentText(
      dataset,
      "责授检校尚书水部员外郎充黄州团练副使，本州安置，不得签书公事",
      "1080-01-01",
    );

    expect(result.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "action", label: "责授" }),
        expect.objectContaining({ kind: "title", label: "团练副使" }),
        expect.objectContaining({ kind: "action", label: "任事限制" }),
      ]),
    );
    expect(result.unknownSpans.map((span) => span.text).join("")).toContain("检校尚书水部员外郎");
    expect(result.warning).toContain("不会自动写入");

    const sequence = decodeAppointmentText(
      dataset,
      "除龙图阁学士、知杭州，寻迁翰林学士承旨",
      "1089-01-01",
    );
    expect(sequence.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "temporal", text: "寻", label: "随后" }),
      ]),
    );
    expect(sequence.actionGroups).toHaveLength(2);
    expect(sequence.actionGroups[0]?.statement).toContain("除 → 龙图阁学士、知州");
    expect(sequence.actionGroups[1]?.statement).toContain("随后：迁 → 翰林学士承旨");
  });
});

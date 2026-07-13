import {
  decodeAppointmentText,
  buildSearchRecords,
  buildSiteProjection,
  searchRecords,
} from "@chushou/domain";
import { validateDatasetIntegrity, type CuratedDataset } from "@chushou/schema";
import { beforeAll, describe, expect, it } from "vitest";
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

  it("searches across traditional forms, pinyin aliases, and minor typos", () => {
    const records = buildSearchRecords(dataset);
    expect(searchRecords(records, "蘇軾")[0]?.label).toBe("苏轼");
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
  });
});

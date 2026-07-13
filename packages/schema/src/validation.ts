import type { ClaimText } from "./common.js";
import type { CuratedDataset } from "./dataset.js";
import type { StableId } from "./ids.js";

export type ValidationIssue = {
  code: string;
  path: string;
  message: string;
};

type IdRecord = { id: StableId };

const placeholderPattern = /(示例节点|占位|待补|placeholder|lorem|\bTODO\b)/iu;

function timeOverlaps(
  left: { normalizedStart: string | null; normalizedEnd: string | null },
  right: { normalizedStart: string | null; normalizedEnd: string | null },
): boolean {
  if (
    left.normalizedStart === null ||
    left.normalizedEnd === null ||
    right.normalizedStart === null ||
    right.normalizedEnd === null
  ) {
    return false;
  }
  return left.normalizedStart <= right.normalizedEnd && right.normalizedStart <= left.normalizedEnd;
}

function normalizeAlias(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("zh-CN").replaceAll(/\s+/gu, "");
}

export function validateDatasetIntegrity(dataset: CuratedDataset): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const collections: Array<[string, IdRecord[]]> = [
    ["periodLenses", dataset.periodLenses],
    ["reforms", dataset.reforms],
    ["sources", dataset.sources],
    ["editions", dataset.editions],
    ["sourceLocators", dataset.sourceLocators],
    ["passages", dataset.passages],
    ["assertions", dataset.assertions],
    ["evidenceLinks", dataset.evidenceLinks],
    ["interpretations", dataset.interpretations],
    ["editorialReviews", dataset.editorialReviews],
    ["externalIdentifiers", dataset.externalIdentifiers],
    ["people", dataset.people],
    ["titleConcepts", dataset.titleConcepts],
    ["titleUsageVersions", dataset.titleUsageVersions],
    ["institutions", dataset.institutions],
    ["institutionVersions", dataset.institutionVersions],
    ["institutionRelations", dataset.institutionRelations],
    ["rankSchemes", dataset.rankSchemes],
    ["ranks", dataset.ranks],
    ["rankCrosswalks", dataset.rankCrosswalks],
    ["places", dataset.places],
    ["placeVersions", dataset.placeVersions],
    ["appointmentActions", dataset.appointmentActions],
    ["appointmentComponents", dataset.appointmentComponents],
    ["serviceEpisodes", dataset.serviceEpisodes],
    ["careerMetricAssessments", dataset.careerMetricAssessments],
  ];

  const ids = new Set<StableId>();
  for (const [collectionName, records] of collections) {
    records.forEach((record, index) => {
      if (ids.has(record.id)) {
        issues.push({
          code: "duplicate_id",
          path: `${collectionName}.${index}.id`,
          message: `Duplicate global ID ${record.id}`,
        });
      }
      ids.add(record.id);
    });
  }

  const expectRef = (id: StableId | null, path: string): void => {
    if (id !== null && !ids.has(id)) {
      issues.push({ code: "missing_reference", path, message: `Missing reference ${id}` });
    }
  };

  const checkClaim = (claim: ClaimText | null, path: string): void => {
    if (claim === null) return;
    claim.assertionIds.forEach((id, index) => expectRef(id, `${path}.assertionIds.${index}`));
  };

  dataset.editions.forEach((record, index) =>
    expectRef(record.sourceId, `editions.${index}.sourceId`),
  );
  dataset.sourceLocators.forEach((record, index) =>
    expectRef(record.editionId, `sourceLocators.${index}.editionId`),
  );
  dataset.passages.forEach((record, index) =>
    expectRef(record.locatorId, `passages.${index}.locatorId`),
  );
  dataset.evidenceLinks.forEach((record, index) => {
    expectRef(record.assertionId, `evidenceLinks.${index}.assertionId`);
    expectRef(record.passageId, `evidenceLinks.${index}.passageId`);
  });
  dataset.assertions.forEach((record, index) => {
    expectRef(record.subjectId, `assertions.${index}.subjectId`);
    expectRef(record.objectEntityId, `assertions.${index}.objectEntityId`);
    if (record.status === "accepted" || record.status === "reviewed") {
      const hasSupport = dataset.evidenceLinks.some(
        (link) => link.assertionId === record.id && link.relation === "supports",
      );
      if (!hasSupport) {
        issues.push({
          code: "missing_supporting_evidence",
          path: `assertions.${index}`,
          message: `${record.id} is ${record.status} but has no supporting passage`,
        });
      }
    }
  });
  dataset.interpretations.forEach((record, index) => {
    expectRef(record.subjectId, `interpretations.${index}.subjectId`);
    record.assertionIds.forEach((id, assertionIndex) =>
      expectRef(id, `interpretations.${index}.assertionIds.${assertionIndex}`),
    );
  });
  dataset.editorialReviews.forEach((record, index) =>
    expectRef(record.subjectId, `editorialReviews.${index}.subjectId`),
  );
  dataset.externalIdentifiers.forEach((record, index) =>
    expectRef(record.entityId, `externalIdentifiers.${index}.entityId`),
  );

  dataset.periodLenses.forEach((record, index) => {
    checkClaim(record.summary, `periodLenses.${index}.summary`);
    checkClaim(record.focus, `periodLenses.${index}.focus`);
  });
  dataset.reforms.forEach((record, index) => {
    checkClaim(record.summary, `reforms.${index}.summary`);
    record.assertionIds.forEach((id, assertionIndex) =>
      expectRef(id, `reforms.${index}.assertionIds.${assertionIndex}`),
    );
  });
  dataset.people.forEach((record, index) => {
    checkClaim(record.description, `people.${index}.description`);
    record.assertionIds.forEach((id, assertionIndex) =>
      expectRef(id, `people.${index}.assertionIds.${assertionIndex}`),
    );
    record.externalIdentifierIds.forEach((id, externalIndex) =>
      expectRef(id, `people.${index}.externalIdentifierIds.${externalIndex}`),
    );
  });
  dataset.titleConcepts.forEach((record, index) =>
    record.externalIdentifierIds.forEach((id, externalIndex) =>
      expectRef(id, `titleConcepts.${index}.externalIdentifierIds.${externalIndex}`),
    ),
  );
  dataset.titleUsageVersions.forEach((record, index) => {
    expectRef(record.titleConceptId, `titleUsageVersions.${index}.titleConceptId`);
    record.periodLensIds.forEach((id, relationIndex) =>
      expectRef(id, `titleUsageVersions.${index}.periodLensIds.${relationIndex}`),
    );
    record.institutionVersionIds.forEach((id, relationIndex) =>
      expectRef(id, `titleUsageVersions.${index}.institutionVersionIds.${relationIndex}`),
    );
    expectRef(record.rankId, `titleUsageVersions.${index}.rankId`);
    record.functions.forEach((claim, claimIndex) =>
      checkClaim(claim, `titleUsageVersions.${index}.functions.${claimIndex}`),
    );
    checkClaim(record.plainExplanation, `titleUsageVersions.${index}.plainExplanation`);
    checkClaim(record.caveat, `titleUsageVersions.${index}.caveat`);
    record.commonPairingTitleIds.forEach((id, relationIndex) =>
      expectRef(id, `titleUsageVersions.${index}.commonPairingTitleIds.${relationIndex}`),
    );
    record.assertionIds.forEach((id, assertionIndex) =>
      expectRef(id, `titleUsageVersions.${index}.assertionIds.${assertionIndex}`),
    );
  });
  dataset.institutionVersions.forEach((record, index) => {
    expectRef(record.institutionId, `institutionVersions.${index}.institutionId`);
    record.functions.forEach((claim, claimIndex) =>
      checkClaim(claim, `institutionVersions.${index}.functions.${claimIndex}`),
    );
    record.assertionIds.forEach((id, assertionIndex) =>
      expectRef(id, `institutionVersions.${index}.assertionIds.${assertionIndex}`),
    );
  });
  dataset.institutionRelations.forEach((record, index) => {
    expectRef(record.subjectVersionId, `institutionRelations.${index}.subjectVersionId`);
    expectRef(record.objectVersionId, `institutionRelations.${index}.objectVersionId`);
    checkClaim(record.description, `institutionRelations.${index}.description`);
    record.assertionIds.forEach((id, assertionIndex) =>
      expectRef(id, `institutionRelations.${index}.assertionIds.${assertionIndex}`),
    );
  });
  dataset.rankSchemes.forEach((record, index) => {
    checkClaim(record.description, `rankSchemes.${index}.description`);
    record.assertionIds.forEach((id, assertionIndex) =>
      expectRef(id, `rankSchemes.${index}.assertionIds.${assertionIndex}`),
    );
  });
  dataset.ranks.forEach((record, index) => {
    expectRef(record.rankSchemeId, `ranks.${index}.rankSchemeId`);
    checkClaim(record.description, `ranks.${index}.description`);
    record.assertionIds.forEach((id, assertionIndex) =>
      expectRef(id, `ranks.${index}.assertionIds.${assertionIndex}`),
    );
  });
  dataset.rankCrosswalks.forEach((record, index) => {
    expectRef(record.sourceRankId, `rankCrosswalks.${index}.sourceRankId`);
    expectRef(record.targetRankId, `rankCrosswalks.${index}.targetRankId`);
    checkClaim(record.description, `rankCrosswalks.${index}.description`);
    record.assertionIds.forEach((id, assertionIndex) =>
      expectRef(id, `rankCrosswalks.${index}.assertionIds.${assertionIndex}`),
    );
    const sourceRank = dataset.ranks.find((rank) => rank.id === record.sourceRankId);
    const targetRank = dataset.ranks.find((rank) => rank.id === record.targetRankId);
    if (sourceRank !== undefined && targetRank?.rankSchemeId === sourceRank.rankSchemeId) {
      issues.push({
        code: "rank_crosswalk_same_scheme",
        path: `rankCrosswalks.${index}`,
        message: `${record.id} must connect ranks from different schemes`,
      });
    }
  });
  dataset.places.forEach((record, index) =>
    record.externalIdentifierIds.forEach((id, externalIndex) =>
      expectRef(id, `places.${index}.externalIdentifierIds.${externalIndex}`),
    ),
  );
  dataset.placeVersions.forEach((record, index) => {
    expectRef(record.placeId, `placeVersions.${index}.placeId`);
    expectRef(record.parentPlaceVersionId, `placeVersions.${index}.parentPlaceVersionId`);
    checkClaim(record.modernCorrespondence, `placeVersions.${index}.modernCorrespondence`);
    record.geometry?.assertionIds.forEach((id, assertionIndex) =>
      expectRef(id, `placeVersions.${index}.geometry.assertionIds.${assertionIndex}`),
    );
    record.assertionIds.forEach((id, assertionIndex) =>
      expectRef(id, `placeVersions.${index}.assertionIds.${assertionIndex}`),
    );
  });
  dataset.appointmentActions.forEach((record, index) => {
    expectRef(record.personId, `appointmentActions.${index}.personId`);
    expectRef(
      record.appointingAuthorityInstitutionVersionId,
      `appointmentActions.${index}.appointingAuthorityInstitutionVersionId`,
    );
    record.componentIds.forEach((id, componentIndex) =>
      expectRef(id, `appointmentActions.${index}.componentIds.${componentIndex}`),
    );
    record.serviceEpisodeIds.forEach((id, serviceIndex) =>
      expectRef(id, `appointmentActions.${index}.serviceEpisodeIds.${serviceIndex}`),
    );
    expectRef(record.previousAppointmentId, `appointmentActions.${index}.previousAppointmentId`);
    record.assertionIds.forEach((id, assertionIndex) =>
      expectRef(id, `appointmentActions.${index}.assertionIds.${assertionIndex}`),
    );
  });
  dataset.appointmentComponents.forEach((record, index) => {
    expectRef(record.appointmentId, `appointmentComponents.${index}.appointmentId`);
    expectRef(record.titleUsageVersionId, `appointmentComponents.${index}.titleUsageVersionId`);
    expectRef(record.placeVersionId, `appointmentComponents.${index}.placeVersionId`);
    record.assertionIds.forEach((id, assertionIndex) =>
      expectRef(id, `appointmentComponents.${index}.assertionIds.${assertionIndex}`),
    );
    const appointment = dataset.appointmentActions.find((item) => item.id === record.appointmentId);
    if (appointment !== undefined) {
      const actual = appointment.rawText.slice(record.sourceSpan.start, record.sourceSpan.end);
      if (actual !== record.sourceSpan.text) {
        issues.push({
          code: "source_span_mismatch",
          path: `appointmentComponents.${index}.sourceSpan`,
          message: `Expected “${actual}” from appointment rawText but found “${record.sourceSpan.text}”`,
        });
      }
    }
  });
  dataset.serviceEpisodes.forEach((record, index) => {
    expectRef(record.personId, `serviceEpisodes.${index}.personId`);
    expectRef(record.createdByAppointmentId, `serviceEpisodes.${index}.createdByAppointmentId`);
    expectRef(record.dutyTitleUsageVersionId, `serviceEpisodes.${index}.dutyTitleUsageVersionId`);
    record.placeVersionIds.forEach((id, placeIndex) =>
      expectRef(id, `serviceEpisodes.${index}.placeVersionIds.${placeIndex}`),
    );
    checkClaim(record.endReason, `serviceEpisodes.${index}.endReason`);
    record.assertionIds.forEach((id, assertionIndex) =>
      expectRef(id, `serviceEpisodes.${index}.assertionIds.${assertionIndex}`),
    );
    if (record.episodeType === "service" && record.dutyTitleUsageVersionId === null) {
      issues.push({
        code: "service_without_duty",
        path: `serviceEpisodes.${index}.dutyTitleUsageVersionId`,
        message: "A service episode requires an actual duty usage",
      });
    }
  });
  dataset.careerMetricAssessments.forEach((record, index) => {
    expectRef(record.subjectId, `careerMetricAssessments.${index}.subjectId`);
    record.assertionIds.forEach((id, assertionIndex) =>
      expectRef(id, `careerMetricAssessments.${index}.assertionIds.${assertionIndex}`),
    );
  });

  const appointmentGroups = new Map<StableId, CuratedDataset["appointmentComponents"]>();
  for (const component of dataset.appointmentComponents) {
    const group = appointmentGroups.get(component.appointmentId) ?? [];
    group.push(component);
    appointmentGroups.set(component.appointmentId, group);
  }
  for (const [appointmentId, components] of appointmentGroups) {
    const orders = components.map((component) => component.order).toSorted((a, b) => a - b);
    const expected = Array.from({ length: orders.length }, (_, index) => index + 1);
    if (orders.join(",") !== expected.join(",")) {
      issues.push({
        code: "component_order",
        path: `appointmentComponents.${appointmentId}`,
        message: `Component order must be unique and contiguous; found ${orders.join(", ")}`,
      });
    }
  }

  const aliasOwners = new Map<string, Array<{ id: StableId; ambiguous: boolean; text: string }>>();
  for (const title of dataset.titleConcepts) {
    for (const name of title.names) {
      const key = normalizeAlias(name.text);
      const owners = aliasOwners.get(key) ?? [];
      owners.push({ id: title.id, ambiguous: name.ambiguous, text: name.text });
      aliasOwners.set(key, owners);
    }
  }
  for (const owners of aliasOwners.values()) {
    const ownerIds = new Set(owners.map((owner) => owner.id));
    if (ownerIds.size > 1 && owners.some((owner) => !owner.ambiguous)) {
      issues.push({
        code: "alias_conflict",
        path: "titleConcepts.names",
        message: `Alias “${owners[0]?.text ?? ""}” belongs to multiple titles without ambiguity flags`,
      });
    }
  }

  for (let leftIndex = 0; leftIndex < dataset.titleUsageVersions.length; leftIndex += 1) {
    const left = dataset.titleUsageVersions[leftIndex];
    if (left === undefined) continue;
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < dataset.titleUsageVersions.length;
      rightIndex += 1
    ) {
      const right = dataset.titleUsageVersions[rightIndex];
      if (right?.titleConceptId !== left.titleConceptId) continue;
      const sameRole =
        left.categories.toSorted().join("|") === right.categories.toSorted().join("|") &&
        left.semanticTracks.toSorted().join("|") === right.semanticTracks.toSorted().join("|");
      if (
        sameRole &&
        timeOverlaps(left.validTime, right.validTime) &&
        left.editorialStatus !== "disputed" &&
        right.editorialStatus !== "disputed"
      ) {
        issues.push({
          code: "overlapping_title_versions",
          path: `titleUsageVersions.${leftIndex}`,
          message: `${left.id} overlaps ${right.id} for the same controlled role`,
        });
      }
    }
  }

  const serialized = JSON.stringify(dataset);
  const match = placeholderPattern.exec(serialized);
  if (match !== null) {
    issues.push({
      code: "placeholder_content",
      path: "dataset",
      message: `Production curated data contains banned placeholder marker “${match[0]}”`,
    });
  }

  return issues;
}

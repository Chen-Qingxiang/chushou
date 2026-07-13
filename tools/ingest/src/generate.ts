import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { buildSiteProjection } from "@chushou/domain";
import type { CuratedDataset } from "@chushou/schema";
import { generatedRoot } from "./paths.js";
import { csvCell, stableStringify } from "./serialize.js";

function hash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function rowsToCsv(rows: Array<Array<string | number | null>>): string {
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function preferredName(entity: { names: Array<{ text: string; kind: string }> } | undefined) {
  return (
    entity?.names.find((name) => name.kind === "preferred")?.text ?? entity?.names[0]?.text ?? ""
  );
}

function titleCsv(dataset: CuratedDataset): string {
  const header = [
    "id",
    "preferred_name",
    "aliases",
    "usage_versions",
    "editorial_status",
    "dataset_version",
  ];
  const rows = dataset.titleConcepts.map((title) => {
    const names = title.names.map((name) => name.text);
    const preferred = title.names.find((name) => name.kind === "preferred")?.text ?? names[0] ?? "";
    return [
      title.id,
      preferred,
      names.join("|"),
      dataset.titleUsageVersions.filter((usage) => usage.titleConceptId === title.id).length,
      title.editorialStatus,
      dataset.metadata.datasetVersion,
    ].map(csvCell);
  });
  return rowsToCsv([header, ...rows]);
}

function appointmentCsv(dataset: CuratedDataset): string {
  const header = [
    "id",
    "person_id",
    "person_name",
    "original_date",
    "normalized_start",
    "normalized_end",
    "date_precision",
    "action_types",
    "raw_text",
    "component_ids",
    "component_spans",
    "title_usage_ids",
    "place_version_ids",
    "service_statuses",
    "editorial_status",
    "dataset_version",
    "schema_version",
    "data_license",
    "citation",
  ];
  const rows = dataset.appointmentActions.map((appointment) => {
    const person = dataset.people.find((item) => item.id === appointment.personId);
    const components = dataset.appointmentComponents
      .filter((item) => item.appointmentId === appointment.id)
      .toSorted((left, right) => left.order - right.order);
    const services = dataset.serviceEpisodes.filter(
      (item) => item.createdByAppointmentId === appointment.id,
    );
    return [
      appointment.id,
      appointment.personId,
      preferredName(person),
      appointment.time.originalText,
      appointment.time.normalizedStart,
      appointment.time.normalizedEnd,
      appointment.time.precision,
      appointment.actionTypes.join("|"),
      appointment.rawText,
      components.map((item) => item.id).join("|"),
      components.map((item) => item.sourceSpan.text).join("|"),
      [
        ...new Set(
          components
            .map((item) => item.titleUsageVersionId)
            .filter((id): id is NonNullable<typeof id> => id !== null),
        ),
      ].join("|"),
      [
        ...new Set(
          components
            .map((item) => item.placeVersionId)
            .filter((id): id is NonNullable<typeof id> => id !== null),
        ),
      ].join("|"),
      [...new Set(services.map((item) => item.serviceStatus))].join("|"),
      appointment.editorialStatus,
      dataset.metadata.datasetVersion,
      dataset.metadata.schemaVersion,
      dataset.metadata.licenseData,
      dataset.metadata.citation,
    ];
  });
  return rowsToCsv([header, ...rows]);
}

function evidenceCsv(dataset: CuratedDataset): string {
  const header = [
    "evidence_id",
    "assertion_id",
    "subject_id",
    "predicate",
    "object_entity_id",
    "object_literal",
    "assertion_status",
    "assertion_method",
    "confidence",
    "passage_id",
    "passage_text",
    "source_id",
    "source_title",
    "edition_id",
    "locator_id",
    "locator_label",
    "stable_url",
    "relation",
    "basis",
    "directness",
    "dataset_version",
    "data_license",
    "citation",
  ];
  const rows = dataset.evidenceLinks.map((link) => {
    const assertion = dataset.assertions.find((item) => item.id === link.assertionId);
    const passage = dataset.passages.find((item) => item.id === link.passageId);
    const locator = dataset.sourceLocators.find((item) => item.id === passage?.locatorId);
    const edition = dataset.editions.find((item) => item.id === locator?.editionId);
    const source = dataset.sources.find((item) => item.id === edition?.sourceId);
    return [
      link.id,
      link.assertionId,
      assertion?.subjectId ?? "",
      assertion?.predicate ?? "",
      assertion?.objectEntityId ?? "",
      assertion?.objectLiteral === null || assertion?.objectLiteral === undefined
        ? ""
        : typeof assertion.objectLiteral === "object"
          ? JSON.stringify(assertion.objectLiteral)
          : String(assertion.objectLiteral),
      assertion?.status ?? "",
      assertion?.method ?? "",
      assertion?.confidence ?? "",
      link.passageId,
      passage?.originalText ?? "",
      source?.id ?? "",
      source?.shortTitle ?? "",
      edition?.id ?? "",
      locator?.id ?? "",
      locator?.label ?? "",
      locator?.stableUrl ?? edition?.stableUrl ?? "",
      link.relation,
      link.basis,
      link.directness,
      dataset.metadata.datasetVersion,
      dataset.metadata.licenseData,
      dataset.metadata.citation,
    ];
  });
  return rowsToCsv([header, ...rows]);
}

function coverageCsv(dataset: CuratedDataset): string {
  const header = [
    "matrix_id",
    "matrix_label",
    "anchor_source_id",
    "anchor_kind",
    "completeness_claim",
    "scope_definition",
    "blocker",
    "last_reviewed_at",
    "item_id",
    "person_id",
    "anchor_entry",
    "anchor_passage_ids",
    "original_date_text",
    "summary",
    "coverage_status",
    "appointment_ids",
    "evidence_status",
    "gap_reason",
    "dataset_version",
    "data_license",
    "citation",
  ];
  const rows = dataset.coverageMatrices.flatMap((matrix) => {
    const items = matrix.items.length === 0 ? [null] : matrix.items;
    return items.map((item) => [
      matrix.id,
      matrix.label,
      matrix.anchorSourceId,
      matrix.anchorKind,
      matrix.completenessClaim,
      matrix.scopeDefinition,
      matrix.blocker,
      matrix.lastReviewedAt,
      item?.id ?? "",
      item?.personId ?? "",
      item?.anchorEntry ?? "",
      item?.anchorPassageIds.join("|") ?? "",
      item?.originalDateText ?? "",
      item?.summary ?? "",
      item?.coverageStatus ?? "",
      item?.appointmentIds.join("|") ?? "",
      item?.evidenceStatus ?? "",
      item?.gapReason ?? "",
      dataset.metadata.datasetVersion,
      dataset.metadata.licenseData,
      dataset.metadata.citation,
    ]);
  });
  return rowsToCsv([header, ...rows]);
}

function dataDictionary(dataset: CuratedDataset): string {
  const entity = (
    description: string,
    primaryKey: string,
    fields: Array<{ name: string; meaning: string; references?: string }>,
  ) => ({ description, primaryKey, fields });
  return stableStringify({
    formatVersion: "1.0.0",
    datasetVersion: dataset.metadata.datasetVersion,
    schemaVersion: dataset.metadata.schemaVersion,
    license: dataset.metadata.licenseData,
    citation: dataset.metadata.citation,
    nullSemantics:
      "null means not applicable, unresolved, or not yet established according to the field schema; it never means zero.",
    entities: {
      titleConcepts: entity("跨时期稳定的官名词汇入口。", "id", [
        { name: "names", meaning: "首选名、异名、繁简体、拼音或外文名。" },
        { name: "scopeNote", meaning: "概念边界，不承载时期化职掌。" },
        { name: "editorialStatus", meaning: "编辑复核状态。" },
      ]),
      titleUsageVersions: entity("官名在特定有效期内的制度含义。", "id", [
        { name: "titleConceptId", meaning: "稳定官名入口。", references: "titleConcepts.id" },
        { name: "validTime", meaning: "原纪年、规范化边界、精度与换算说明。" },
        { name: "semanticTracks", meaning: "身份、资望、实职、地点或政治状态轨道。" },
        { name: "rankId", meaning: "仅在指定品秩方案内的定位。", references: "ranks.id" },
        { name: "assertionIds", meaning: "支持当前版本解释的主张。", references: "assertions.id" },
      ]),
      appointmentActions: entity("一次有序的任命、迁转、处分或恢复动作。", "id", [
        { name: "personId", meaning: "受命人物。", references: "people.id" },
        { name: "actionTypes", meaning: "一条记录可含多个受控动作。" },
        { name: "rawText", meaning: "用于成分 span 校验的任官原文。" },
        {
          name: "componentIds",
          meaning: "按原文顺序拆分的官衔成分。",
          references: "appointmentComponents.id",
        },
        {
          name: "serviceEpisodeIds",
          meaning: "与授命分离的实际任事记录。",
          references: "serviceEpisodes.id",
        },
      ]),
      appointmentComponents: entity("任命原文中有顺序且可回指 span 的语义成分。", "id", [
        { name: "appointmentId", meaning: "所属任命。", references: "appointmentActions.id" },
        { name: "sourceSpan", meaning: "原文起止位置和逐字文本。" },
        {
          name: "titleUsageVersionId",
          meaning: "解析后的时期化官名。",
          references: "titleUsageVersions.id",
        },
        { name: "resolutionStatus", meaning: "resolved、ambiguous 或 unresolved。" },
      ]),
      serviceEpisodes: entity("实际任事、居住、处分或荣誉状态的时间段。", "id", [
        {
          name: "createdByAppointmentId",
          meaning: "触发本阶段的任命，可为空。",
          references: "appointmentActions.id",
        },
        { name: "serviceStatus", meaning: "是否到任、未赴、推定或未知。" },
        { name: "time", meaning: "独立于授命时间的任事区间。" },
      ]),
      institutions: entity("跨时期稳定的机构入口。", "id", [
        { name: "names", meaning: "机构名称变体。" },
        { name: "scopeNote", meaning: "概念范围。" },
      ]),
      institutionVersions: entity("机构在特定时期的层级与职掌。", "id", [
        { name: "institutionId", meaning: "稳定机构入口。", references: "institutions.id" },
        { name: "validTime", meaning: "制度版本有效期。" },
        { name: "functions", meaning: "带主张引用的职掌。" },
      ]),
      ranks: entity("一个指定品秩方案内部的阶位。", "id", [
        { name: "rankSchemeId", meaning: "所属方案。", references: "rankSchemes.id" },
        { name: "sequence", meaning: "仅在所属方案内可比较的序位，可为空。" },
        { name: "gradeText", meaning: "史料中的品级文字，不等同于跨方案总分。" },
      ]),
      rankCrosswalks: entity("两个品秩方案之间有依据、有置信度的映射。", "id", [
        { name: "sourceRankId", meaning: "源阶位。", references: "ranks.id" },
        { name: "targetRankId", meaning: "目标阶位。", references: "ranks.id" },
        { name: "basis", meaning: "换官表、研究映射、语境推断或同名候选。" },
        { name: "disputeNote", meaning: "争议映射的显式边界。" },
      ]),
      assertions: entity("可独立审核的 subject-predicate-object 主张。", "id", [
        { name: "subjectId", meaning: "主张主体。" },
        { name: "objectEntityId", meaning: "实体宾语，与 objectLiteral 二选一。" },
        { name: "objectLiteral", meaning: "字面宾语，与 objectEntityId 二选一。" },
        { name: "method", meaning: "转录、人工整理、解释、推断或规则投影方法。" },
        { name: "confidence", meaning: "高、中、低置信度，不是概率。" },
      ]),
      evidenceLinks: entity("主张与具体引文之间的支持、反驳或限定关系。", "id", [
        { name: "assertionId", meaning: "被评估的主张。", references: "assertions.id" },
        { name: "passageId", meaning: "具体引文。", references: "passages.id" },
        { name: "directness", meaning: "direct、indirect 或 derived。" },
      ]),
      sources: entity("作品级来源记录，与版本、定位和引文分层。", "id", [
        { name: "bibliography", meaning: "可复用的完整书目信息。" },
        { name: "sourceType", meaning: "当事人文献、官修史书、现代研究等类型。" },
      ]),
      passages: entity("版本定位点下的最小可引用文本。", "id", [
        { name: "locatorId", meaning: "版本内定位。", references: "sourceLocators.id" },
        { name: "originalText", meaning: "保留的原文。" },
        { name: "normalizedText", meaning: "检索用规范化文本，不覆盖原文。" },
      ]),
      coverageMatrices: entity("以选定锚点定义分母并显式保存覆盖缺口。", "id", [
        { name: "completenessClaim", meaning: "对该锚点穷尽、初步或 blocked。" },
        { name: "scopeDefinition", meaning: "分母如何定义。" },
        { name: "blocker", meaning: "无法建立分母时的具体阻塞条件。" },
        { name: "items", meaning: "锚点条目及 covered、partial、gap 或 out_of_scope 状态。" },
      ]),
    },
    vocabularies: {
      editorialStatus: [
        ...new Set([
          ...dataset.titleConcepts.map((item) => item.editorialStatus),
          ...dataset.assertions.map((item) => item.editorialStatus),
        ]),
      ].toSorted(),
      semanticTracks: [
        ...new Set(dataset.titleUsageVersions.flatMap((item) => item.semanticTracks)),
      ].toSorted(),
      appointmentActionTypes: [
        ...new Set(dataset.appointmentActions.flatMap((item) => item.actionTypes)),
      ].toSorted(),
      coverageStatus: ["covered", "partial", "gap", "out_of_scope"],
    },
  });
}

export async function generateArtifacts(dataset: CuratedDataset): Promise<Record<string, string>> {
  const outputRoot = generatedRoot();
  await mkdir(outputRoot, { recursive: true });
  const site = stableStringify(buildSiteProjection(dataset));
  const release = stableStringify(dataset);
  const titles = titleCsv(dataset);
  const appointments = appointmentCsv(dataset);
  const evidence = evidenceCsv(dataset);
  const coverage = coverageCsv(dataset);
  const dictionary = dataDictionary(dataset);
  const files = {
    "site.json": site,
    "release.json": release,
    "titles.csv": titles,
    "appointments.csv": appointments,
    "evidence.csv": evidence,
    "coverage.csv": coverage,
    "data-dictionary.json": dictionary,
  };
  await Promise.all(
    Object.entries(files).map(async ([name, content]) => {
      await writeFile(`${outputRoot}/${name}`, content, "utf8");
    }),
  );
  const hashes = Object.fromEntries(
    Object.entries(files).map(([name, content]) => [name, `sha256:${hash(content)}`]),
  );
  const manifest = stableStringify({
    datasetVersion: dataset.metadata.datasetVersion,
    schemaVersion: dataset.metadata.schemaVersion,
    projectionVersion: dataset.metadata.projectionVersion,
    generatedAt: dataset.metadata.curatedAt,
    files: hashes,
  });
  await writeFile(`${outputRoot}/manifest.json`, manifest, "utf8");
  return hashes;
}

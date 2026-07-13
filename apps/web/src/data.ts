import type { SiteProjection } from "@chushou/domain";
import type { StableId } from "@chushou/schema";

async function loadSiteProjection(): Promise<SiteProjection> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/site.json`);
  if (!response.ok) {
    throw new Error(`Unable to load site projection (${response.status})`);
  }
  return (await response.json()) as SiteProjection;
}

export const site = await loadSiteProjection();

type NamedEntity = { names: Array<{ text: string; kind: string }> };

export function preferredName(entity: NamedEntity | undefined): string {
  if (entity === undefined) return "未识别";
  return (
    entity.names.find((name) => name.kind === "preferred")?.text ??
    entity.names[0]?.text ??
    "未命名"
  );
}

export function titleConceptForUsage(usageId: StableId | null) {
  if (usageId === null) return undefined;
  const usage = site.titleUsageVersions.find((item) => item.id === usageId);
  return site.titleConcepts.find((item) => item.id === usage?.titleConceptId);
}

export function titleUsage(usageId: StableId | null) {
  return usageId === null ? undefined : site.titleUsageVersions.find((item) => item.id === usageId);
}

export function placeLabel(versionId: StableId | null): string | null {
  if (versionId === null) return null;
  const version = site.placeVersions.find((item) => item.id === versionId);
  const place = site.places.find((item) => item.id === version?.placeId);
  return place === undefined ? (version?.label ?? null) : preferredName(place);
}

export function appointmentPlace(appointment: SiteProjection["appointments"][number]): string {
  const labels = appointment.components
    .map((component) => placeLabel(component.placeVersionId))
    .filter((label): label is string => label !== null);
  return [...new Set(labels)].join("、") || "地点未定";
}

export function dateLabel(date: SiteProjection["appointments"][number]["time"]): string {
  if (date.normalizedStart !== null) {
    const start = date.normalizedStart.slice(0, 4);
    const end = date.normalizedEnd?.slice(0, 4);
    return end !== undefined && end !== start ? `${start}–${end}` : start;
  }
  return date.originalText;
}

export const statusLabels: Record<string, string> = {
  verified: "已核验",
  reviewed: "已复核",
  provisional: "暂定",
  disputed: "有争议",
  incomplete: "未完整",
  complete: "完整",
  partial: "局部",
  sample: "样本",
  high: "高",
  medium: "中",
  low: "低",
  unknown: "未知",
};

export const trackLabels: Record<string, string> = {
  identity_rank: "身份／官阶",
  honor_expertise: "资望／专长",
  actual_duty: "实际职务",
  place: "地点",
  political_status: "政治状态",
};

export const categoryLabels: Record<string, string> = {
  civil_service_rank: "文官阶",
  military_service_rank: "武官阶",
  functional_office: "职事官",
  assignment: "差遣",
  acting_assignment: "权／试职",
  literary_title: "文翰职",
  academy_title: "馆阁职名",
  merit_title: "勋号",
  noble_title: "爵位",
  stipend_title: "食邑",
  ritual_title: "礼遇名号",
  punitive_status: "处分状态",
  retirement_status: "致仕状态",
  unresolved: "待辨析",
};

export const actionLabels: Record<string, string> = {
  appoint: "授命",
  confer: "授予",
  promote: "迁升",
  demote: "降官",
  transfer: "改任",
  change: "改官",
  punitive_appoint: "责授／贬授",
  place_under_restriction: "安置",
  restore: "恢复",
  recall: "召还",
  decline: "辞免",
  unknown: "动作未明",
};

export function sourcePath(id: StableId): string {
  return `/sources/${encodeURIComponent(id)}`;
}

export function recordPath(record: SiteProjection["searchIndex"][number]): string {
  if (record.kind === "title") {
    const title = site.titleConcepts.find((item) => item.id === record.id);
    return `/titles/${title?.slug ?? ""}`;
  }
  if (record.kind === "person") {
    const person = site.people.find((item) => item.id === record.id);
    return `/people/${person?.slug ?? "su-shi"}/career`;
  }
  if (record.kind === "source") return sourcePath(record.id);
  if (record.kind === "institution") return `/map?focus=${encodeURIComponent(record.id)}`;
  return `/people/su-shi/career?place=${encodeURIComponent(record.id)}`;
}

export function assertionRecords(ids: readonly StableId[]) {
  return ids
    .map((id) => site.assertions.find((assertion) => assertion.id === id))
    .filter(
      (assertion): assertion is SiteProjection["assertions"][number] => assertion !== undefined,
    );
}

export type EvidenceMaterial = {
  assertion: SiteProjection["assertions"][number];
  link: SiteProjection["evidenceLinks"][number];
  passage: SiteProjection["sources"][number]["editions"][number]["locators"][number]["passages"][number];
  locator: SiteProjection["sources"][number]["editions"][number]["locators"][number];
  edition: SiteProjection["sources"][number]["editions"][number];
  source: SiteProjection["sources"][number];
};

export function evidenceMaterials(assertionIds: readonly StableId[]): EvidenceMaterial[] {
  const wanted = new Set(assertionIds);
  const assertions = new Map(assertionRecords(assertionIds).map((item) => [item.id, item]));
  const materials: EvidenceMaterial[] = [];
  for (const link of site.evidenceLinks) {
    if (!wanted.has(link.assertionId)) continue;
    const assertion = assertions.get(link.assertionId);
    if (assertion === undefined) continue;
    for (const source of site.sources) {
      for (const edition of source.editions) {
        for (const locator of edition.locators) {
          const passage = locator.passages.find((item) => item.id === link.passageId);
          if (passage !== undefined)
            materials.push({ assertion, link, passage, locator, edition, source });
        }
      }
    }
  }
  return materials;
}

export const downloadBase = `${import.meta.env.BASE_URL}downloads`;

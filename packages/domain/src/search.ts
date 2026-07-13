import type { CuratedDataset, StableId } from "@chushou/schema";

export type SearchRecord = {
  id: StableId;
  kind: "title" | "person" | "institution" | "source" | "place";
  label: string;
  aliases: string[];
  searchText: string;
  status: string;
};

const commonTraditionalToSimplified: Record<string, string> = {
  蘇: "苏",
  軾: "轼",
  學: "学",
  龍: "龙",
  圖: "图",
  閣: "阁",
  職: "职",
  實: "实",
  員: "员",
  郎: "郎",
  書: "书",
  與: "与",
  為: "为",
  轉: "转",
  運: "运",
  知: "知",
};

export function normalizeSearchText(value: string): string {
  return Array.from(value.normalize("NFKC").toLocaleLowerCase("zh-CN"))
    .map((character) => commonTraditionalToSimplified[character] ?? character)
    .join("")
    .replaceAll(/[\s·・—_,，。；;：:（）()／/]+/gu, "");
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        (current[rightIndex - 1] ?? 0) + 1,
        (previous[rightIndex] ?? 0) + 1,
        (previous[rightIndex - 1] ?? 0) + substitutionCost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length] ?? Math.max(left.length, right.length);
}

export function buildSearchRecords(dataset: CuratedDataset): SearchRecord[] {
  const records: SearchRecord[] = [];
  for (const title of dataset.titleConcepts) {
    const aliases = title.names.map((name) => name.text);
    records.push({
      id: title.id,
      kind: "title",
      label:
        title.names.find((name) => name.kind === "preferred")?.text ?? aliases[0] ?? title.slug,
      aliases,
      searchText: aliases.map(normalizeSearchText).join(" "),
      status: title.editorialStatus,
    });
  }
  for (const person of dataset.people) {
    const aliases = person.names.map((name) => name.text);
    records.push({
      id: person.id,
      kind: "person",
      label:
        person.names.find((name) => name.kind === "preferred")?.text ?? aliases[0] ?? person.slug,
      aliases,
      searchText: aliases.map(normalizeSearchText).join(" "),
      status: person.editorialStatus,
    });
  }
  for (const institution of dataset.institutions) {
    const aliases = institution.names.map((name) => name.text);
    records.push({
      id: institution.id,
      kind: "institution",
      label:
        institution.names.find((name) => name.kind === "preferred")?.text ??
        aliases[0] ??
        institution.slug,
      aliases,
      searchText: aliases.map(normalizeSearchText).join(" "),
      status: institution.editorialStatus,
    });
  }
  for (const source of dataset.sources) {
    const aliases = [source.title, source.shortTitle];
    records.push({
      id: source.id,
      kind: "source",
      label: source.shortTitle,
      aliases,
      searchText: aliases.map(normalizeSearchText).join(" "),
      status: source.editorialStatus,
    });
  }
  for (const place of dataset.places) {
    const aliases = place.names.map((name) => name.text);
    records.push({
      id: place.id,
      kind: "place",
      label:
        place.names.find((name) => name.kind === "preferred")?.text ?? aliases[0] ?? place.slug,
      aliases,
      searchText: aliases.map(normalizeSearchText).join(" "),
      status: place.editorialStatus,
    });
  }
  return records.toSorted((left, right) => left.id.localeCompare(right.id));
}

export function searchRecords(records: SearchRecord[], query: string): SearchRecord[] {
  const normalized = normalizeSearchText(query);
  if (normalized.length === 0) return records;
  return records
    .map((record) => {
      const normalizedAliases = record.aliases.map(normalizeSearchText);
      const prefix = normalizedAliases.some((alias) => alias.startsWith(normalized));
      const includes = record.searchText.includes(normalized);
      const distance = Math.min(
        ...normalizedAliases.map((alias) => editDistance(alias, normalized)),
      );
      const score = prefix
        ? 0
        : includes
          ? 1
          : distance <= Math.max(1, Math.floor(normalized.length / 3))
            ? 2 + distance
            : 99;
      return { record, score };
    })
    .filter((item) => item.score < 99)
    .toSorted(
      (left, right) =>
        left.score - right.score || left.record.label.localeCompare(right.record.label, "zh-CN"),
    )
    .map((item) => item.record);
}

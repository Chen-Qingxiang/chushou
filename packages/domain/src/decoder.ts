import type { CuratedDataset, StableId } from "@chushou/schema";

export type DecoderMatch = {
  start: number;
  end: number;
  text: string;
  kind: "title" | "action" | "temporal";
  normalizedId: StableId | null;
  label: string;
  candidateUsageIds: StableId[];
  confidence: "high" | "medium" | "low";
};

export type DecodeResult = {
  input: string;
  matches: DecoderMatch[];
  unknownSpans: Array<{ start: number; end: number; text: string }>;
  statement: string;
  warning: string;
};

const actionTerms: Array<[string, string]> = [
  ["责授", "责授"],
  ["落职", "落职"],
  ["量移", "量移"],
  ["安置", "安置"],
  ["不得签书公事", "任事限制"],
  ["不得僉書公事", "任事限制"],
  ["除", "除"],
  ["授", "授"],
  ["拜", "拜"],
  ["迁", "迁"],
  ["遷", "迁"],
  ["徙", "徙"],
  ["改", "改"],
  ["权", "权"],
  ["權", "权"],
  ["试", "试"],
  ["試", "试"],
  ["守", "守"],
  ["行", "行"],
  ["罢", "罢"],
  ["罷", "罢"],
  ["免", "免"],
];

function usageAppliesAt(
  usage: CuratedDataset["titleUsageVersions"][number],
  at: string | null,
): boolean {
  if (at === null) return true;
  const { normalizedStart, normalizedEnd } = usage.validTime;
  return (
    (normalizedStart === null || normalizedStart <= at) &&
    (normalizedEnd === null || at <= normalizedEnd)
  );
}

export function decodeAppointmentText(
  dataset: CuratedDataset,
  input: string,
  at: string | null = null,
): DecodeResult {
  const candidates: DecoderMatch[] = [];
  for (const title of dataset.titleConcepts) {
    const usageIds = dataset.titleUsageVersions
      .filter((usage) => usage.titleConceptId === title.id && usageAppliesAt(usage, at))
      .map((usage) => usage.id);
    const preferred = title.names.find((name) => name.kind === "preferred")?.text ?? title.slug;
    for (const name of title.names) {
      if (name.script === "pinyin" || name.script === "english") continue;
      let from = 0;
      while (from < input.length) {
        const directStart = input.indexOf(name.text, from);
        if (directStart < 0) break;
        candidates.push({
          start: directStart,
          end: directStart + name.text.length,
          text: input.slice(directStart, directStart + name.text.length),
          kind: "title",
          normalizedId: title.id,
          label: preferred,
          candidateUsageIds: usageIds,
          confidence: usageIds.length === 1 ? "high" : usageIds.length > 1 ? "medium" : "low",
        });
        from = directStart + name.text.length;
      }
    }
  }
  for (const [term, label] of actionTerms) {
    let from = 0;
    while (from < input.length) {
      const start = input.indexOf(term, from);
      if (start < 0) break;
      candidates.push({
        start,
        end: start + term.length,
        text: term,
        kind: "action",
        normalizedId: null,
        label,
        candidateUsageIds: [],
        confidence: "high",
      });
      from = start + term.length;
    }
  }

  const matches: DecoderMatch[] = [];
  const occupied = new Set<number>();
  for (const candidate of candidates.toSorted(
    (left, right) => right.end - right.start - (left.end - left.start) || left.start - right.start,
  )) {
    const positions = Array.from(
      { length: candidate.end - candidate.start },
      (_, index) => candidate.start + index,
    );
    if (positions.some((position) => occupied.has(position))) continue;
    positions.forEach((position) => occupied.add(position));
    matches.push(candidate);
  }
  matches.sort((left, right) => left.start - right.start);

  const unknownSpans: DecodeResult["unknownSpans"] = [];
  let cursor = 0;
  for (const match of matches) {
    if (cursor < match.start) {
      const text = input.slice(cursor, match.start);
      if (!/^[\s、，。；：,.;:]+$/u.test(text))
        unknownSpans.push({ start: cursor, end: match.start, text });
    }
    cursor = Math.max(cursor, match.end);
  }
  if (cursor < input.length) {
    const text = input.slice(cursor);
    if (!/^[\s、，。；：,.;:]+$/u.test(text))
      unknownSpans.push({ start: cursor, end: input.length, text });
  }

  const actionLabels = matches
    .filter((match) => match.kind === "action")
    .map((match) => match.label);
  const titleLabels = matches.filter((match) => match.kind === "title").map((match) => match.label);
  const statement =
    titleLabels.length === 0
      ? "尚未识别出规范官名。"
      : `识别到${titleLabels.length}项官衔成分${actionLabels.length > 0 ? `和${actionLabels.length}项动作／限制词` : ""}；应按所选时期逐项核对。`;
  return {
    input,
    matches,
    unknownSpans,
    statement,
    warning: "这是可解释的候选解析，不会自动写入正式数据库。",
  };
}

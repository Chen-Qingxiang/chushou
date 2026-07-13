import type { CuratedDataset, StableId } from "@chushou/schema";

type DecoderCorpus = Pick<CuratedDataset, "places" | "titleConcepts" | "titleUsageVersions">;

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
  actionGroups: Array<{
    action: DecoderMatch;
    temporalCue: DecoderMatch | null;
    titles: DecoderMatch[];
    statement: string;
  }>;
  unknownSpans: Array<{ start: number; end: number; text: string }>;
  statement: string;
  warning: string;
};

const actionTerms: Array<[string, string]> = [
  ["责授", "责授"],
  ["落职", "落职"],
  ["量移", "量移"],
  ["安置", "安置"],
  ["未至", "未赴任／未到达"],
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
  ["复", "复"],
  ["復", "复"],
  ["贬", "贬"],
  ["貶", "贬"],
];

const temporalTerms: Array<[string, string]> = [
  ["既而", "其后发生"],
  ["未几", "不久以后"],
  ["明年", "次年"],
  ["逾月", "一月以后"],
  ["俄而", "不久以后"],
  ["寻", "随后"],
  ["尋", "随后"],
  ["旋", "随即／不久"],
  ["俄", "不久"],
  ["遂", "继而"],
  ["后", "其后"],
  ["後", "其后"],
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
  dataset: DecoderCorpus,
  input: string,
  at: string | null = null,
): DecodeResult {
  return decodeText(dataset, input, (usage) => usageAppliesAt(usage, at));
}

export function decodeAppointmentTextForPeriod(
  dataset: DecoderCorpus,
  input: string,
  periodId: StableId | null,
): DecodeResult {
  return decodeText(
    dataset,
    input,
    (usage) => periodId === null || usage.periodLensIds.includes(periodId),
  );
}

function decodeText(
  dataset: DecoderCorpus,
  input: string,
  usageApplies: (usage: DecoderCorpus["titleUsageVersions"][number]) => boolean,
): DecodeResult {
  const candidates: DecoderMatch[] = [];
  for (const title of dataset.titleConcepts) {
    const usageIds = dataset.titleUsageVersions
      .filter((usage) => usage.titleConceptId === title.id && usageApplies(usage))
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
  const prefectTitle = dataset.titleConcepts.find((title) =>
    title.names.some((name) => name.kind === "preferred" && name.text === "知州"),
  );
  if (prefectTitle !== undefined) {
    const usageIds = dataset.titleUsageVersions
      .filter((usage) => usage.titleConceptId === prefectTitle.id && usageApplies(usage))
      .map((usage) => usage.id);
    for (const place of dataset.places) {
      for (const name of place.names.filter(
        (variant) => variant.script !== "pinyin" && variant.script !== "english",
      )) {
        const term = `知${name.text}`;
        let from = 0;
        while (from < input.length) {
          const start = input.indexOf(term, from);
          if (start < 0) break;
          candidates.push({
            start,
            end: start + term.length,
            text: term,
            kind: "title",
            normalizedId: prefectTitle.id,
            label: "知州",
            candidateUsageIds: usageIds,
            confidence: "medium",
          });
          from = start + term.length;
        }
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
  for (const [term, label] of temporalTerms) {
    let from = 0;
    while (from < input.length) {
      const start = input.indexOf(term, from);
      if (start < 0) break;
      candidates.push({
        start,
        end: start + term.length,
        text: term,
        kind: "temporal",
        normalizedId: null,
        label,
        candidateUsageIds: [],
        confidence: "medium",
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
  const actions = matches.filter((match) => match.kind === "action");
  const actionGroups = actions.map((action, index) => {
    const previousAction = actions[index - 1];
    const nextAction = actions[index + 1];
    const segmentStart = previousAction?.end ?? 0;
    const segmentEnd = nextAction?.start ?? input.length;
    const temporalCue =
      matches.find(
        (match) =>
          match.kind === "temporal" && match.start >= segmentStart && match.end <= action.start,
      ) ?? null;
    const titles = matches.filter(
      (match) => match.kind === "title" && match.start >= action.end && match.end <= segmentEnd,
    );
    const target = titles.map((title) => title.label).join("、") || "尚未识别目标官衔";
    return {
      action,
      temporalCue,
      titles,
      statement: `${temporalCue === null ? "原文顺序" : temporalCue.label}：${action.label} → ${target}`,
    };
  });
  return {
    input,
    matches,
    actionGroups,
    unknownSpans,
    statement,
    warning: "这是可解释的候选解析，不会自动写入正式数据库。",
  };
}

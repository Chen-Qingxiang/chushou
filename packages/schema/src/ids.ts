import { z } from "zod";

export const idKinds = [
  "person",
  "title",
  "title-usage",
  "institution",
  "institution-version",
  "institution-relation",
  "rank-scheme",
  "rank",
  "rank-crosswalk",
  "appointment",
  "component",
  "service",
  "place",
  "place-version",
  "period",
  "reform",
  "source",
  "edition",
  "locator",
  "passage",
  "assertion",
  "evidence",
  "interpretation",
  "review",
  "metric",
  "external",
  "lesson",
  "rule",
] as const;

export type IdKind = (typeof idKinds)[number];
export type StableId = `chs:${IdKind}:${string}`;

const idKindPattern = idKinds.join("|");
export const stableIdSchema = z
  .string()
  .regex(
    new RegExp(`^chs:(${idKindPattern}):[a-z0-9][a-z0-9-]*$`),
    "ID must be a stable chs:type:slug identifier",
  ) as z.ZodType<StableId, string>;

export const idFor = (kind: IdKind) =>
  stableIdSchema.refine((value) => value.startsWith(`chs:${kind}:`), {
    message: `ID must use chs:${kind}:`,
  });

export function hasIdKind(value: string, kind: IdKind): boolean {
  return value.startsWith(`chs:${kind}:`);
}

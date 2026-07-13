import { z } from "zod";
import { stableIdSchema } from "./ids.js";
import {
  confidenceSchema,
  datePrecisionSchema,
  dateQualificationSchema,
  editorialStatusSchema,
} from "./vocabularies.js";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const historicalDateSchema = z
  .object({
    originalText: z.string().min(1),
    calendar: z.enum(["chinese_regnal", "gregorian_proleptic", "relative", "unknown"]),
    eraName: z.string().min(1).nullable(),
    eraYear: z.number().int().positive().nullable(),
    lunarMonth: z.number().int().min(1).max(12).nullable(),
    leapMonth: z.boolean().nullable(),
    lunarDay: z.string().min(1).nullable(),
    sexagenaryDay: z.string().min(1).nullable(),
    normalizedStart: isoDateSchema.nullable(),
    normalizedEnd: isoDateSchema.nullable(),
    precision: datePrecisionSchema,
    qualification: dateQualificationSchema,
    edtf: z.string().min(1).nullable(),
    conversionMethod: z.string().min(1).nullable(),
    conversionVersion: z.string().min(1).nullable(),
    note: z.string().min(1).nullable(),
  })
  .superRefine((value, context) => {
    if (
      value.normalizedStart !== null &&
      value.normalizedEnd !== null &&
      value.normalizedStart > value.normalizedEnd
    ) {
      context.addIssue({
        code: "custom",
        path: ["normalizedEnd"],
        message: "normalizedEnd cannot precede normalizedStart",
      });
    }
  });

export const nameVariantSchema = z.object({
  text: z.string().min(1),
  script: z.enum(["zh-Hans", "zh-Hant", "pinyin", "english", "other"]),
  kind: z.enum(["preferred", "full", "short", "variant", "historical", "translation"]),
  ambiguous: z.boolean().default(false),
});

export const claimTextSchema = z.object({
  text: z.string().min(1),
  assertionIds: z.array(stableIdSchema).min(1),
});

export const entityReferenceSchema = z.object({
  id: stableIdSchema,
  type: z.string().min(1),
});

export const reviewableSchema = z.object({
  editorialStatus: editorialStatusSchema,
  confidence: confidenceSchema,
  reviewIds: z.array(stableIdSchema),
});

export type HistoricalDate = z.infer<typeof historicalDateSchema>;
export type ClaimText = z.infer<typeof claimTextSchema>;

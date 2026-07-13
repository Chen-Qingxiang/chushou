import { z } from "zod";
import { historicalDateSchema } from "./common.js";
import { idFor, stableIdSchema } from "./ids.js";
import {
  assertionStatusSchema,
  confidenceSchema,
  editorialStatusSchema,
  evidenceBasisSchema,
  evidenceRelationSchema,
} from "./vocabularies.js";

export const assertionSchema = z
  .object({
    id: idFor("assertion"),
    subjectId: stableIdSchema,
    predicate: z.string().regex(/^[a-z][a-z0-9_]*$/),
    objectEntityId: stableIdSchema.nullable(),
    objectLiteral: z
      .union([z.string(), z.number(), z.boolean(), z.record(z.string(), z.unknown())])
      .nullable(),
    validTime: historicalDateSchema.nullable(),
    status: assertionStatusSchema,
    assertedBy: z.string().min(1),
    assertedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    method: z.enum([
      "source_transcription",
      "manual_curation",
      "scholarly_interpretation",
      "contextual_inference",
      "rule_projection",
      "external_alignment",
      "algorithmic_candidate",
    ]),
    rationale: z.string().min(1),
    confidence: confidenceSchema,
    editorialStatus: editorialStatusSchema,
  })
  .refine(
    (value) => (value.objectEntityId === null) !== (value.objectLiteral === null),
    "Assertion requires exactly one objectEntityId or objectLiteral",
  );

export const evidenceLinkSchema = z.object({
  id: idFor("evidence"),
  assertionId: idFor("assertion"),
  passageId: idFor("passage"),
  relation: evidenceRelationSchema,
  basis: evidenceBasisSchema,
  directness: z.enum(["direct", "indirect", "derived"]),
  note: z.string().min(1),
});

export const interpretationSchema = z.object({
  id: idFor("interpretation"),
  subjectId: stableIdSchema,
  kind: z.enum(["scholarly", "plain_language", "rule_generated", "editorial_note"]),
  text: z.string().min(1),
  assertionIds: z.array(idFor("assertion")).min(1),
  author: z.string().min(1),
  method: z.string().min(1),
  confidence: confidenceSchema,
  editorialStatus: editorialStatusSchema,
});

export const editorialReviewSchema = z.object({
  id: idFor("review"),
  subjectId: stableIdSchema,
  reviewer: z.string().min(1),
  reviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  outcome: editorialStatusSchema,
  note: z.string().min(1),
});

export type Assertion = z.infer<typeof assertionSchema>;
export type EvidenceLink = z.infer<typeof evidenceLinkSchema>;
export type Interpretation = z.infer<typeof interpretationSchema>;

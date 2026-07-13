import { z } from "zod";

export const editorialStatusSchema = z.enum([
  "verified",
  "reviewed",
  "provisional",
  "disputed",
  "incomplete",
]);

export const assertionStatusSchema = z.enum([
  "proposed",
  "reviewed",
  "accepted",
  "contested",
  "rejected",
  "superseded",
]);

export const evidenceRelationSchema = z.enum([
  "supports",
  "contradicts",
  "qualifies",
  "mentions",
  "derives_from",
  "corrects",
]);

export const evidenceBasisSchema = z.enum([
  "explicit_statement",
  "contextual_inference",
  "chronological_inference",
  "textual_variant",
  "secondary_scholarship",
  "external_alignment",
  "algorithmic_candidate",
]);

export const confidenceSchema = z.enum(["high", "medium", "low", "unknown"]);

export const semanticTrackSchema = z.enum([
  "identity_rank",
  "honor_expertise",
  "actual_duty",
  "place",
  "political_status",
]);

export const titleCategorySchema = z.enum([
  "civil_service_rank",
  "military_service_rank",
  "functional_office",
  "assignment",
  "acting_assignment",
  "literary_title",
  "academy_title",
  "merit_title",
  "noble_title",
  "stipend_title",
  "ritual_title",
  "punitive_status",
  "retirement_status",
  "unresolved",
]);

export const appointmentActionTypeSchema = z.enum([
  "appoint",
  "confer",
  "promote",
  "demote",
  "transfer",
  "change",
  "act",
  "try",
  "hold_above_rank",
  "hold_below_rank",
  "punitive_appoint",
  "dismiss",
  "remove_title",
  "remove_office",
  "relocate",
  "place_under_restriction",
  "restore",
  "recall",
  "decline",
  "posthumous_confer",
  "unknown",
]);

export const appointmentComponentTypeSchema = z.enum([
  "title",
  "duty",
  "rank",
  "honor",
  "merit",
  "nobility",
  "place",
  "modifier",
  "punitive_status",
  "restriction",
  "unresolved",
]);

export const serviceStatusSchema = z.enum([
  "attested",
  "probable",
  "inferred",
  "not_assumed",
  "declined",
  "remote",
  "honorary",
  "posthumous",
  "unknown",
  "disputed",
]);

export const datePrecisionSchema = z.enum([
  "day",
  "month",
  "season",
  "year",
  "reign_period",
  "interval",
  "ordered_only",
  "unknown",
]);

export const dateQualificationSchema = z.enum([
  "exact",
  "approximate",
  "uncertain",
  "approximate_and_uncertain",
  "inferred",
  "disputed",
  "unknown",
]);

export type EditorialStatus = z.infer<typeof editorialStatusSchema>;
export type SemanticTrack = z.infer<typeof semanticTrackSchema>;

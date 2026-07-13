import { z } from "zod";
import {
  appointmentActionSchema,
  appointmentComponentSchema,
  careerMetricAssessmentSchema,
  externalIdentifierSchema,
  institutionRelationSchema,
  institutionSchema,
  institutionVersionSchema,
  periodLensSchema,
  personSchema,
  placeSchema,
  placeVersionSchema,
  rankSchemeSchema,
  rankCrosswalkSchema,
  rankSchema,
  reformSchema,
  serviceEpisodeSchema,
  titleConceptSchema,
  titleUsageVersionSchema,
} from "./domain.js";
import {
  assertionSchema,
  editorialReviewSchema,
  evidenceLinkSchema,
  interpretationSchema,
} from "./evidence.js";
import { stableIdSchema } from "./ids.js";
import { editionSchema, passageSchema, sourceLocatorSchema, sourceSchema } from "./sources.js";

export const datasetMetadataSchema = z.object({
  datasetVersion: z.string().regex(/^\d+\.\d+\.\d+(-[a-z0-9.-]+)?$/),
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  projectionVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  vocabularyVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  title: z.string().min(1),
  description: z.string().min(1),
  releaseStage: z.enum(["research_preview", "release_candidate", "stable"]),
  curatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  licenseCode: z.string().min(1),
  licenseData: z.string().min(1),
  citation: z.string().min(1),
});

export const coverageItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9:-]+$/),
  personId: stableIdSchema,
  anchorSourceId: stableIdSchema,
  anchorPassageIds: z.array(stableIdSchema).min(1),
  anchorEntry: z.string().min(1),
  originalDateText: z.string().min(1).nullable(),
  summary: z.string().min(1),
  coverageStatus: z.enum(["covered", "partial", "gap", "out_of_scope"]),
  appointmentIds: z.array(stableIdSchema),
  evidenceStatus: z.enum(["verified", "reviewed", "provisional", "missing"]),
  gapReason: z.string().min(1).nullable(),
});

export const coverageMatrixSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  anchorSourceId: stableIdSchema,
  anchorKind: z.enum(["authoritative_chronology", "official_biography", "other"]),
  completenessClaim: z.enum(["exhaustive_for_anchor", "preliminary", "blocked"]),
  scopeDefinition: z.string().min(1),
  anchorBibliography: z.string().min(1),
  blocker: z.string().min(1).nullable(),
  lastReviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(coverageItemSchema),
});

export const curatedDatasetSchema = z.object({
  metadata: datasetMetadataSchema,
  periodLenses: z.array(periodLensSchema),
  reforms: z.array(reformSchema),
  sources: z.array(sourceSchema),
  editions: z.array(editionSchema),
  sourceLocators: z.array(sourceLocatorSchema),
  passages: z.array(passageSchema),
  assertions: z.array(assertionSchema),
  evidenceLinks: z.array(evidenceLinkSchema),
  interpretations: z.array(interpretationSchema),
  editorialReviews: z.array(editorialReviewSchema),
  externalIdentifiers: z.array(externalIdentifierSchema),
  people: z.array(personSchema),
  titleConcepts: z.array(titleConceptSchema),
  titleUsageVersions: z.array(titleUsageVersionSchema),
  institutions: z.array(institutionSchema),
  institutionVersions: z.array(institutionVersionSchema),
  institutionRelations: z.array(institutionRelationSchema),
  rankSchemes: z.array(rankSchemeSchema),
  ranks: z.array(rankSchema),
  rankCrosswalks: z.array(rankCrosswalkSchema),
  places: z.array(placeSchema),
  placeVersions: z.array(placeVersionSchema),
  appointmentActions: z.array(appointmentActionSchema),
  appointmentComponents: z.array(appointmentComponentSchema),
  serviceEpisodes: z.array(serviceEpisodeSchema),
  careerMetricAssessments: z.array(careerMetricAssessmentSchema),
  coverageMatrices: z.array(coverageMatrixSchema),
});

export const datasetFileManifestSchema = z.object({
  metadata: z.string().min(1),
  files: z.record(z.string(), z.union([z.string().min(1), z.array(z.string().min(1)).min(1)])),
});

export const publicIdListSchema = z.array(stableIdSchema);

export type CuratedDataset = z.infer<typeof curatedDatasetSchema>;
export type DatasetMetadata = z.infer<typeof datasetMetadataSchema>;
export type CoverageMatrix = z.infer<typeof coverageMatrixSchema>;

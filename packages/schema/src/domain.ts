import { z } from "zod";
import { claimTextSchema, historicalDateSchema, nameVariantSchema } from "./common.js";
import { idFor, stableIdSchema } from "./ids.js";
import {
  appointmentActionTypeSchema,
  appointmentComponentTypeSchema,
  confidenceSchema,
  editorialStatusSchema,
  semanticTrackSchema,
  serviceStatusSchema,
  titleCategorySchema,
} from "./vocabularies.js";

export const periodLensSchema = z.object({
  id: idFor("period"),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  validTime: historicalDateSchema,
  summary: claimTextSchema,
  focus: claimTextSchema,
  editorialStatus: editorialStatusSchema,
});

export const reformSchema = z.object({
  id: idFor("reform"),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  validTime: historicalDateSchema,
  summary: claimTextSchema,
  assertionIds: z.array(idFor("assertion")).min(1),
  editorialStatus: editorialStatusSchema,
});

export const externalIdentifierSchema = z.object({
  id: idFor("external"),
  entityId: stableIdSchema,
  authority: z.enum(["CBDB", "CHGIS", "CTP", "Wikidata", "VIAF", "other"]),
  externalId: z.string().min(1),
  externalUrl: z.url().nullable(),
  matchStatus: z.enum(["confirmed", "probable", "candidate", "rejected"]),
  checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().min(1),
});

export const personSchema = z.object({
  id: idFor("person"),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  names: z.array(nameVariantSchema).min(1),
  lifeSpan: historicalDateSchema.nullable(),
  description: claimTextSchema,
  assertionIds: z.array(idFor("assertion")).min(1),
  externalIdentifierIds: z.array(idFor("external")),
  editorialStatus: editorialStatusSchema,
});

export const titleConceptSchema = z.object({
  id: idFor("title"),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  names: z.array(nameVariantSchema).min(1),
  scopeNote: z.string().min(1),
  externalIdentifierIds: z.array(idFor("external")),
  editorialStatus: editorialStatusSchema,
});

export const titleUsageVersionSchema = z.object({
  id: idFor("title-usage"),
  titleConceptId: idFor("title"),
  label: z.string().min(1),
  validTime: historicalDateSchema,
  periodLensIds: z.array(idFor("period")),
  categories: z.array(titleCategorySchema).min(1),
  semanticTracks: z.array(semanticTrackSchema).min(1),
  institutionVersionIds: z.array(idFor("institution-version")),
  rankId: idFor("rank").nullable(),
  functions: z.array(claimTextSchema).min(1),
  plainExplanation: claimTextSchema,
  caveat: claimTextSchema,
  commonPairingTitleIds: z.array(idFor("title")),
  assertionIds: z.array(idFor("assertion")).min(1),
  editorialStatus: editorialStatusSchema,
});

export const institutionSchema = z.object({
  id: idFor("institution"),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  names: z.array(nameVariantSchema).min(1),
  scopeNote: z.string().min(1),
  editorialStatus: editorialStatusSchema,
});

export const institutionVersionSchema = z.object({
  id: idFor("institution-version"),
  institutionId: idFor("institution"),
  label: z.string().min(1),
  validTime: historicalDateSchema,
  level: z.enum(["imperial", "central", "regional", "prefectural", "county", "identity_system"]),
  functions: z.array(claimTextSchema).min(1),
  assertionIds: z.array(idFor("assertion")).min(1),
  editorialStatus: editorialStatusSchema,
});

export const institutionRelationSchema = z.object({
  id: idFor("institution-relation"),
  subjectVersionId: idFor("institution-version"),
  relationType: z.enum([
    "reports_to",
    "supervises",
    "part_of",
    "coordinates_with",
    "checks",
    "appoints",
    "parallel_to",
  ]),
  objectVersionId: idFor("institution-version"),
  validTime: historicalDateSchema,
  description: claimTextSchema,
  assertionIds: z.array(idFor("assertion")).min(1),
  editorialStatus: editorialStatusSchema,
});

export const rankSchemeSchema = z.object({
  id: idFor("rank-scheme"),
  label: z.string().min(1),
  schemeType: z.enum(["ordinal", "grade_table", "conversion_source", "other"]),
  ordering: z.enum(["lower_sequence_higher", "higher_sequence_higher", "unordered"]),
  coverageStatus: z.enum(["complete", "partial", "sample", "unknown"]),
  validTime: historicalDateSchema,
  description: claimTextSchema,
  assertionIds: z.array(idFor("assertion")).min(1),
  editorialStatus: editorialStatusSchema,
});

export const rankSchema = z.object({
  id: idFor("rank"),
  rankSchemeId: idFor("rank-scheme"),
  label: z.string().min(1),
  gradeText: z.string().min(1).nullable(),
  sequence: z.number().int().nonnegative().nullable(),
  validTime: historicalDateSchema,
  description: claimTextSchema,
  assertionIds: z.array(idFor("assertion")).min(1),
  editorialStatus: editorialStatusSchema,
});

export const rankCrosswalkSchema = z
  .object({
    id: idFor("rank-crosswalk"),
    sourceRankId: idFor("rank"),
    targetRankId: idFor("rank"),
    relationType: z.enum([
      "replaced_by",
      "equivalent_to",
      "approximate_equivalent_to",
      "broader_than",
      "narrower_than",
    ]),
    basis: z.enum([
      "explicit_reform_table",
      "scholarly_crosswalk",
      "contextual_inference",
      "same_label_candidate",
    ]),
    validTime: historicalDateSchema,
    description: claimTextSchema,
    confidence: confidenceSchema,
    disputeNote: z.string().min(1).nullable(),
    assertionIds: z.array(idFor("assertion")).min(1),
    editorialStatus: editorialStatusSchema,
  })
  .superRefine((value, context) => {
    if (value.sourceRankId === value.targetRankId) {
      context.addIssue({
        code: "custom",
        path: ["targetRankId"],
        message: "A rank crosswalk cannot point to itself",
      });
    }
    if (value.editorialStatus === "disputed" && value.disputeNote === null) {
      context.addIssue({
        code: "custom",
        path: ["disputeNote"],
        message: "A disputed rank crosswalk requires a dispute note",
      });
    }
  });

export const placeSchema = z.object({
  id: idFor("place"),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  names: z.array(nameVariantSchema).min(1),
  placeType: z.enum(["polity", "circuit", "prefecture", "county", "settlement", "site", "region"]),
  externalIdentifierIds: z.array(idFor("external")),
  editorialStatus: editorialStatusSchema,
});

export const placeVersionSchema = z.object({
  id: idFor("place-version"),
  placeId: idFor("place"),
  label: z.string().min(1),
  validTime: historicalDateSchema,
  parentPlaceVersionId: idFor("place-version").nullable(),
  seatLabel: z.string().min(1).nullable(),
  modernCorrespondence: claimTextSchema.nullable(),
  geometry: z
    .object({
      longitude: z.number().min(-180).max(180),
      latitude: z.number().min(-90).max(90),
      represents: z.enum(["historical_seat", "modern_proxy", "approximate_region"]),
      confidence: confidenceSchema,
      assertionIds: z.array(idFor("assertion")).min(1),
    })
    .nullable(),
  assertionIds: z.array(idFor("assertion")).min(1),
  editorialStatus: editorialStatusSchema,
});

export const appointmentComponentSchema = z.object({
  id: idFor("component"),
  appointmentId: idFor("appointment"),
  order: z.number().int().positive(),
  sourceSpan: z.object({
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    text: z.string().min(1),
  }),
  componentType: appointmentComponentTypeSchema,
  titleUsageVersionId: idFor("title-usage").nullable(),
  placeVersionId: idFor("place-version").nullable(),
  modifier: z.string().min(1).nullable(),
  semanticTracks: z.array(semanticTrackSchema),
  resolutionStatus: z.enum(["resolved", "ambiguous", "unresolved"]),
  assertionIds: z.array(idFor("assertion")).min(1),
  editorialStatus: editorialStatusSchema,
});

export const appointmentActionSchema = z.object({
  id: idFor("appointment"),
  personId: idFor("person"),
  actionTypes: z.array(appointmentActionTypeSchema).min(1),
  rawText: z.string().min(1),
  time: historicalDateSchema,
  appointingAuthorityInstitutionVersionId: idFor("institution-version").nullable(),
  componentIds: z.array(idFor("component")).min(1),
  serviceEpisodeIds: z.array(idFor("service")),
  previousAppointmentId: idFor("appointment").nullable(),
  sequence: z.number().int().nonnegative(),
  assertionIds: z.array(idFor("assertion")).min(1),
  editorialStatus: editorialStatusSchema,
});

export const serviceEpisodeSchema = z.object({
  id: idFor("service"),
  personId: idFor("person"),
  createdByAppointmentId: idFor("appointment").nullable(),
  episodeType: z.enum(["service", "residence", "punitive_status", "honorary_status"]),
  dutyTitleUsageVersionId: idFor("title-usage").nullable(),
  placeVersionIds: z.array(idFor("place-version")),
  time: historicalDateSchema,
  serviceStatus: serviceStatusSchema,
  modifiers: z.array(z.string().min(1)),
  endReason: claimTextSchema.nullable(),
  assertionIds: z.array(idFor("assertion")).min(1),
  editorialStatus: editorialStatusSchema,
});

export const careerMetricAssessmentSchema = z.object({
  id: idFor("metric"),
  subjectId: z.union([idFor("appointment"), idFor("service")]),
  dimension: z.enum([
    "centrality",
    "actual_power",
    "nominal_rank",
    "prestige",
    "imperial_trust",
    "geographic_distance",
    "punitive_restriction",
  ]),
  assessmentType: z.enum(["source_fact", "rule_calculation", "research_judgment"]),
  value: z.number().min(0).max(100).nullable(),
  label: z.string().min(1),
  scaleDescription: z.string().min(1),
  applicableTime: historicalDateSchema,
  evaluator: z.string().min(1),
  method: z.string().min(1),
  assertionIds: z.array(idFor("assertion")).min(1),
  confidence: confidenceSchema,
  editorialStatus: editorialStatusSchema,
});

export type Person = z.infer<typeof personSchema>;
export type TitleConcept = z.infer<typeof titleConceptSchema>;
export type TitleUsageVersion = z.infer<typeof titleUsageVersionSchema>;
export type AppointmentAction = z.infer<typeof appointmentActionSchema>;
export type AppointmentComponent = z.infer<typeof appointmentComponentSchema>;
export type ServiceEpisode = z.infer<typeof serviceEpisodeSchema>;
export type RankScheme = z.infer<typeof rankSchemeSchema>;
export type Rank = z.infer<typeof rankSchema>;
export type RankCrosswalk = z.infer<typeof rankCrosswalkSchema>;

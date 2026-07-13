import { z } from "zod";
import { idFor } from "./ids.js";
import { editorialStatusSchema } from "./vocabularies.js";

export const sourceSchema = z.object({
  id: idFor("source"),
  title: z.string().min(1),
  shortTitle: z.string().min(1),
  creator: z.string().min(1),
  sourceType: z.enum([
    "contemporary_primary",
    "official_history",
    "institutional_compilation",
    "later_compilation",
    "modern_monograph",
    "modern_article",
    "authority_database",
    "popular_reference",
  ]),
  language: z.string().min(1),
  bibliography: z.string().min(1),
  notes: z.string().min(1).nullable(),
  editorialStatus: editorialStatusSchema,
});

export const editionSchema = z.object({
  id: idFor("edition"),
  sourceId: idFor("source"),
  label: z.string().min(1),
  editor: z.string().min(1).nullable(),
  publisher: z.string().min(1).nullable(),
  publicationPlace: z.string().min(1).nullable(),
  publicationYear: z.string().min(1).nullable(),
  editionType: z.enum(["print", "facsimile", "digital_transcription", "database_record"]),
  stableUrl: z.url().nullable(),
  license: z.string().min(1).nullable(),
  rightsNote: z.string().min(1),
  accessedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  editorialStatus: editorialStatusSchema,
});

export const sourceLocatorSchema = z.object({
  id: idFor("locator"),
  editionId: idFor("edition"),
  volume: z.string().min(1).nullable(),
  juan: z.string().min(1).nullable(),
  section: z.string().min(1).nullable(),
  page: z.string().min(1).nullable(),
  entry: z.string().min(1).nullable(),
  paragraph: z.string().min(1).nullable(),
  anchor: z.string().min(1).nullable(),
  stableUrl: z.url().nullable(),
  label: z.string().min(1),
});

export const passageSchema = z.object({
  id: idFor("passage"),
  locatorId: idFor("locator"),
  originalText: z.string().min(1),
  normalizedText: z.string().min(1).nullable(),
  transcriptionMethod: z.enum(["edition_transcription", "manual", "ocr", "database_export"]),
  transcriptionStatus: editorialStatusSchema,
  transcribedBy: z.string().min(1),
  checkedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  note: z.string().min(1).nullable(),
});

export type Source = z.infer<typeof sourceSchema>;
export type Edition = z.infer<typeof editionSchema>;
export type SourceLocator = z.infer<typeof sourceLocatorSchema>;
export type Passage = z.infer<typeof passageSchema>;

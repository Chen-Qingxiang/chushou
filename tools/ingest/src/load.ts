import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  curatedDatasetSchema,
  datasetFileManifestSchema,
  type CuratedDataset,
} from "@chushou/schema";
import { curatedRoot } from "./paths.js";

const arrayKeys = [
  "periodLenses",
  "reforms",
  "sources",
  "editions",
  "sourceLocators",
  "passages",
  "assertions",
  "evidenceLinks",
  "interpretations",
  "editorialReviews",
  "externalIdentifiers",
  "people",
  "titleConcepts",
  "titleUsageVersions",
  "institutions",
  "institutionVersions",
  "institutionRelations",
  "rankSchemes",
  "ranks",
  "rankCrosswalks",
  "places",
  "placeVersions",
  "appointmentActions",
  "appointmentComponents",
  "serviceEpisodes",
  "careerMetricAssessments",
  "coverageMatrices",
] as const satisfies ReadonlyArray<keyof Omit<CuratedDataset, "metadata">>;

async function readJson(filePath: string): Promise<unknown> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as unknown;
}

export async function loadCuratedDataset(): Promise<CuratedDataset> {
  const root = curatedRoot();
  const manifest = datasetFileManifestSchema.parse(
    await readJson(path.join(root, "manifest.json")),
  );
  const metadata = await readJson(path.join(root, manifest.metadata));
  const entries = await Promise.all(
    arrayKeys.map(async (key) => {
      const file = manifest.files[key];
      if (file === undefined) throw new Error(`manifest is missing the ${key} file`);
      const files = Array.isArray(file) ? file : [file];
      const fragments = await Promise.all(files.map((item) => readJson(path.join(root, item))));
      const records: unknown[] = fragments.flatMap((fragment): unknown[] => {
        if (!Array.isArray(fragment)) throw new Error(`${key} fragment must contain a JSON array`);
        return fragment as unknown[];
      });
      return [key, records] as const;
    }),
  );
  return curatedDatasetSchema.parse({ metadata, ...Object.fromEntries(entries) });
}

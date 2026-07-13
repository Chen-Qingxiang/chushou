import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { buildSiteProjection } from "@chushou/domain";
import type { CuratedDataset } from "@chushou/schema";
import { generatedRoot } from "./paths.js";
import { csvCell, stableStringify } from "./serialize.js";

function hash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function titleCsv(dataset: CuratedDataset): string {
  const header = [
    "id",
    "preferred_name",
    "aliases",
    "usage_versions",
    "editorial_status",
    "dataset_version",
  ];
  const rows = dataset.titleConcepts.map((title) => {
    const names = title.names.map((name) => name.text);
    const preferred = title.names.find((name) => name.kind === "preferred")?.text ?? names[0] ?? "";
    return [
      title.id,
      preferred,
      names.join("|"),
      dataset.titleUsageVersions.filter((usage) => usage.titleConceptId === title.id).length,
      title.editorialStatus,
      dataset.metadata.datasetVersion,
    ].map(csvCell);
  });
  return `${[header, ...rows].map((row) => row.join(",")).join("\n")}\n`;
}

export async function generateArtifacts(dataset: CuratedDataset): Promise<Record<string, string>> {
  const outputRoot = generatedRoot();
  await mkdir(outputRoot, { recursive: true });
  const site = stableStringify(buildSiteProjection(dataset));
  const release = stableStringify(dataset);
  const titles = titleCsv(dataset);
  const files = {
    "site.json": site,
    "release.json": release,
    "titles.csv": titles,
  };
  await Promise.all(
    Object.entries(files).map(async ([name, content]) => {
      await writeFile(`${outputRoot}/${name}`, content, "utf8");
    }),
  );
  const hashes = Object.fromEntries(
    Object.entries(files).map(([name, content]) => [name, `sha256:${hash(content)}`]),
  );
  const manifest = stableStringify({
    datasetVersion: dataset.metadata.datasetVersion,
    schemaVersion: dataset.metadata.schemaVersion,
    projectionVersion: dataset.metadata.projectionVersion,
    generatedAt: dataset.metadata.curatedAt,
    files: hashes,
  });
  await writeFile(`${outputRoot}/manifest.json`, manifest, "utf8");
  return hashes;
}

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { buildSiteProjection } from "@chushou/domain";
import { curatedDatasetSchema, validateDatasetIntegrity } from "@chushou/schema";
import { z } from "zod";
import { generateArtifacts } from "./generate.js";
import { loadCuratedDataset } from "./load.js";
import { repoPath } from "./paths.js";
import { generateReports } from "./report.js";
import { stableStringify } from "./serialize.js";

async function validatedDataset() {
  const dataset = await loadCuratedDataset();
  const issues = validateDatasetIntegrity(dataset);
  if (issues.length > 0) {
    for (const issue of issues) console.error(`${issue.code} ${issue.path}: ${issue.message}`);
    throw new Error(`Dataset validation failed with ${issues.length} issue(s)`);
  }
  return dataset;
}

const schemaPath = repoPath("packages", "schema", "json-schema", "curated-dataset.schema.json");

function generatedSchema(): string {
  return stableStringify(z.toJSONSchema(curatedDatasetSchema));
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? "validate";
  const dataset = await validatedDataset();
  if (command === "validate") {
    console.log(
      `Validated ${dataset.metadata.datasetVersion}: ${dataset.titleConcepts.length} title concepts, ${dataset.assertions.length} assertions, ${dataset.evidenceLinks.length} evidence links.`,
    );
    return;
  }
  if (command === "generate") {
    const hashes = await generateArtifacts(dataset);
    await generateReports(dataset);
    console.log(`Generated ${Object.keys(hashes).length} release artifacts and research reports.`);
    return;
  }
  if (command === "report") {
    await generateReports(dataset);
    console.log("Generated coverage and data-quality reports.");
    return;
  }
  if (command === "schema") {
    await mkdir(repoPath("packages", "schema", "json-schema"), { recursive: true });
    await writeFile(schemaPath, generatedSchema(), "utf8");
    console.log("Generated curated dataset JSON Schema.");
    return;
  }
  if (command === "schema-check") {
    const committedSchema = await readFile(schemaPath, "utf8");
    const normalizedCommittedSchema = stableStringify(JSON.parse(committedSchema) as unknown);
    if (normalizedCommittedSchema !== generatedSchema()) {
      throw new Error("Committed JSON Schema is stale; run npm run schema:json.");
    }
    console.log("Committed curated dataset JSON Schema is current.");
    return;
  }
  if (command === "projection-check") {
    buildSiteProjection(dataset);
    console.log("Projection built successfully.");
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

await main();

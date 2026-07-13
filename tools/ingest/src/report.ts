import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CuratedDataset } from "@chushou/schema";
import { format } from "prettier";
import { reportRoot } from "./paths.js";

export async function generateReports(dataset: CuratedDataset): Promise<void> {
  const root = reportRoot();
  await mkdir(root, { recursive: true });
  const supportedAssertions = dataset.assertions.filter((assertion) =>
    dataset.evidenceLinks.some(
      (link) => link.assertionId === assertion.id && link.relation === "supports",
    ),
  ).length;
  const reviewedUsages = dataset.titleUsageVersions.filter((usage) =>
    ["reviewed", "verified"].includes(usage.editorialStatus),
  ).length;
  const quality = `# Data quality report\n\nGenerated from dataset ${dataset.metadata.datasetVersion}.\n\n| Measure | Count |\n| --- | ---: |\n| Title concepts | ${dataset.titleConcepts.length} |\n| Title usage versions | ${dataset.titleUsageVersions.length} |\n| Reviewed or verified title usages | ${reviewedUsages} |\n| Rank schemes | ${dataset.rankSchemes.length} |\n| Rank entries | ${dataset.ranks.length} |\n| Rank crosswalks | ${dataset.rankCrosswalks.length} |\n| Appointment actions | ${dataset.appointmentActions.length} |\n| Service episodes | ${dataset.serviceEpisodes.length} |\n| Sources | ${dataset.sources.length} |\n| Passages | ${dataset.passages.length} |\n| Assertions | ${dataset.assertions.length} |\n| Assertions with supporting evidence | ${supportedAssertions} |\n| Evidence links | ${dataset.evidenceLinks.length} |\n\n## Gate\n\nSchema and cross-file validation passed before this report was generated. A reviewed or accepted assertion without supporting evidence fails the build.\n`;
  await writeFile(
    path.join(root, "data-quality.md"),
    await format(quality, { parser: "markdown" }),
    "utf8",
  );

  const sections = dataset.coverageMatrices.map((matrix) => {
    const counts = Object.fromEntries(
      ["covered", "partial", "gap", "out_of_scope"].map((status) => [
        status,
        matrix.items.filter((item) => item.coverageStatus === status).length,
      ]),
    );
    const rows = matrix.items
      .map(
        (item) =>
          `| ${item.anchorEntry} | ${item.summary} | ${item.coverageStatus} | ${item.evidenceStatus} | ${item.appointmentIds.join("、") || "—"} | ${item.gapReason ?? "—"} |`,
      )
      .join("\n");
    return `## ${matrix.label}\n\n${matrix.scopeDefinition}\n\nAnchor: ${matrix.anchorBibliography}\n\n- Anchor kind: ${matrix.anchorKind}\n- Completeness claim: ${matrix.completenessClaim}\n- Blocker: ${matrix.blocker ?? "—"}\n- Covered: ${counts.covered ?? 0}\n- Partial: ${counts.partial ?? 0}\n- Gap: ${counts.gap ?? 0}\n- Out of scope: ${counts.out_of_scope ?? 0}\n\n| Anchor entry | Summary | Coverage | Evidence | Appointments | Gap reason |\n| --- | --- | --- | --- | --- | --- |\n${rows}`;
  });
  const coverage = `# Coverage report\n\nGenerated from dataset ${dataset.metadata.datasetVersion}; last report input review dates are recorded per matrix.\n\n${sections.join("\n\n")}\n`;
  await writeFile(
    path.join(root, "coverage.md"),
    await format(coverage, { parser: "markdown" }),
    "utf8",
  );
}

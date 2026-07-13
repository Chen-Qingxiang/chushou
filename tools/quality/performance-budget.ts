import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { gzipSync } from "node:zlib";

const root = process.cwd();
const dist = path.join(root, "dist");
const assets = path.join(dist, "assets");
const files = await readdir(assets);

async function size(file: string) {
  const content = await readFile(file);
  return { raw: content.byteLength, gzip: gzipSync(content, { level: 9 }).byteLength };
}

const jsFiles = files.filter((file) => file.endsWith(".js"));
const cssFiles = files.filter((file) => file.endsWith(".css"));
const jsSizes = await Promise.all(
  jsFiles.map(async (file) => ({ file, ...(await size(path.join(assets, file))) })),
);
const cssSizes = await Promise.all(
  cssFiles.map(async (file) => ({ file, ...(await size(path.join(assets, file))) })),
);
const siteData = await size(path.join(dist, "data", "site.json"));
const htmlRaw = (await stat(path.join(dist, "index.html"))).size;
const routeChunks = jsSizes.filter(
  ({ file }) =>
    /(?:Page|Pages)-/u.test(file) && !file.startsWith("Page-") && !file.startsWith("App-"),
);

const measurements = {
  htmlRaw,
  largestJsGzip: Math.max(...jsSizes.map((item) => item.gzip)),
  totalJsGzip: jsSizes.reduce((total, item) => total + item.gzip, 0),
  totalCssGzip: cssSizes.reduce((total, item) => total + item.gzip, 0),
  largestRouteGzip: Math.max(...routeChunks.map((item) => item.gzip)),
  siteDataRaw: siteData.raw,
  siteDataGzip: siteData.gzip,
};

const budgets: Record<keyof typeof measurements, number> = {
  htmlRaw: 5 * 1024,
  largestJsGzip: 65 * 1024,
  totalJsGzip: 125 * 1024,
  totalCssGzip: 14 * 1024,
  largestRouteGzip: 12 * 1024,
  siteDataRaw: 650 * 1024,
  siteDataGzip: 80 * 1024,
};

const labels: Record<keyof typeof measurements, string> = {
  htmlRaw: "HTML raw",
  largestJsGzip: "largest JS gzip",
  totalJsGzip: "all lazy + entry JS gzip",
  totalCssGzip: "CSS gzip",
  largestRouteGzip: "largest route chunk gzip",
  siteDataRaw: "site projection raw",
  siteDataGzip: "site projection gzip",
};

const failures: string[] = [];
for (const key of Object.keys(measurements) as Array<keyof typeof measurements>) {
  const measured = measurements[key];
  const budget = budgets[key];
  const status = measured <= budget ? "PASS" : "FAIL";
  console.log(
    `${status} ${labels[key]}: ${(measured / 1024).toFixed(2)} KiB / ${(budget / 1024).toFixed(2)} KiB`,
  );
  if (measured > budget) failures.push(`${labels[key]} exceeded by ${measured - budget} bytes`);
}

if (failures.length > 0) {
  throw new Error(`Performance budget failed:\n${failures.join("\n")}`);
}

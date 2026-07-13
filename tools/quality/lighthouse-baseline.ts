import { createServer, type ServerResponse } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { gzipSync } from "node:zlib";
import { chromium } from "@playwright/test";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const root = process.cwd();
const dist = path.join(root, "dist");
const reportPath = path.join(root, "docs", "reports", "lighthouse-baseline.json");
const routes = [
  { name: "home", path: "/chushou/" },
  { name: "title-detail", path: "/chushou/titles/canzhi-zhengshi" },
  { name: "su-shi-career", path: "/chushou/people/su-shi/career" },
] as const;

const mimeTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function send(
  response: ServerResponse,
  status: number,
  body: Buffer,
  file: string,
  acceptsGzip: boolean,
): void {
  const extension = path.extname(file);
  const isHashedAsset = file.includes(`${path.sep}assets${path.sep}`);
  const isCompressible = new Set([".css", ".csv", ".html", ".js", ".json", ".map", ".svg"]).has(
    extension,
  );
  const encodedBody = acceptsGzip && isCompressible ? gzipSync(body, { level: 9 }) : body;
  response.writeHead(status, {
    "Cache-Control":
      extension === ".html"
        ? "no-cache"
        : isHashedAsset
          ? "public, max-age=31536000, immutable"
          : "public, max-age=600",
    "Content-Type": mimeTypes[extension] ?? "application/octet-stream",
    ...(encodedBody === body ? {} : { "Content-Encoding": "gzip", Vary: "Accept-Encoding" }),
  });
  response.end(encodedBody);
}

const server = createServer((request, response) => {
  void (async () => {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    const relative = pathname.startsWith("/chushou/")
      ? pathname.slice("/chushou/".length)
      : pathname.slice(1);
    const requestedFile = path.resolve(dist, relative);
    const isAsset = path.extname(relative) !== "";
    const file = isAsset ? requestedFile : path.join(dist, "index.html");

    if (!file.startsWith(`${dist}${path.sep}`) && file !== path.join(dist, "index.html")) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    try {
      send(
        response,
        200,
        await readFile(file),
        file,
        request.headers["accept-encoding"]?.includes("gzip") ?? false,
      );
    } catch {
      response.writeHead(404).end("Not found");
    }
  })();
});

await new Promise<void>((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

const address = server.address();
if (address === null || typeof address === "string") throw new Error("Local audit server failed.");

const chrome = await launch({
  chromePath: process.env.CHROME_PATH ?? chromium.executablePath(),
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"],
  userDataDir: false,
  logLevel: "silent",
});

const results: Array<{
  name: string;
  path: string;
  performance: number;
  accessibility: number;
  largestContentfulPaintMs: number | null;
  totalBlockingTimeMs: number | null;
  cumulativeLayoutShift: number | null;
}> = [];

try {
  for (const route of routes) {
    const url = `http://127.0.0.1:${address.port}${route.path}`;
    const result = await lighthouse(url, {
      port: chrome.port,
      logLevel: "error",
      onlyCategories: ["performance", "accessibility"],
      formFactor: "mobile",
      throttlingMethod: "simulate",
    });
    if (result === undefined) throw new Error(`Lighthouse returned no result for ${route.path}.`);
    if (process.env.LIGHTHOUSE_DEBUG === "1") {
      await writeFile(
        path.join("/tmp", `chushou-lighthouse-${route.name}.json`),
        `${JSON.stringify(result.lhr)}\n`,
        "utf8",
      );
    }

    const score = (category: "performance" | "accessibility") =>
      Math.round((result.lhr.categories[category]?.score ?? 0) * 100);
    const metric = (id: string) => result.lhr.audits[id]?.numericValue ?? null;
    const row = {
      ...route,
      performance: score("performance"),
      accessibility: score("accessibility"),
      largestContentfulPaintMs: metric("largest-contentful-paint"),
      totalBlockingTimeMs: metric("total-blocking-time"),
      cumulativeLayoutShift: metric("cumulative-layout-shift"),
    };
    results.push(row);
    console.log(
      `${route.name}: Performance ${row.performance}, Accessibility ${row.accessibility}`,
    );
  }
} finally {
  chrome.kill();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
}

const lighthousePackage = JSON.parse(
  await readFile(path.join(root, "node_modules", "lighthouse", "package.json"), "utf8"),
) as { version: string };
const baseline = {
  measuredAt: new Date().toISOString(),
  environment: {
    node: process.version,
    lighthouse: lighthousePackage.version,
    browser: "Playwright Chromium",
    formFactor: "mobile",
    throttlingMethod: "simulate",
  },
  thresholds: { performance: 90, accessibility: 95 },
  results,
};
await writeFile(reportPath, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");

const failures = results.flatMap((result) => [
  ...(result.performance < baseline.thresholds.performance
    ? [`${result.name} Performance ${result.performance}`]
    : []),
  ...(result.accessibility < baseline.thresholds.accessibility
    ? [`${result.name} Accessibility ${result.accessibility}`]
    : []),
]);
if (failures.length > 0) {
  throw new Error(`Lighthouse thresholds failed:\n${failures.join("\n")}`);
}

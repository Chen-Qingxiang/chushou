import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(appRoot, "../..");
const outputRoot = path.resolve(repositoryRoot, "dist");

function researchArtifacts(): Plugin {
  return {
    name: "chushou-research-artifacts",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url !== "/chushou/data/site.json" && request.url !== "/data/site.json") {
          next();
          return;
        }
        try {
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(await readFile(path.join(repositoryRoot, "data/generated/site.json")));
        } catch (error) {
          next(error);
        }
      });
    },
    async closeBundle() {
      await Promise.all([
        mkdir(path.join(outputRoot, "downloads"), { recursive: true }),
        mkdir(path.join(outputRoot, "data"), { recursive: true }),
      ]);
      await Promise.all([
        copyFile(path.join(outputRoot, "index.html"), path.join(outputRoot, "404.html")),
        copyFile(
          path.join(repositoryRoot, "data/generated/release.json"),
          path.join(outputRoot, "downloads/release.json"),
        ),
        copyFile(
          path.join(repositoryRoot, "data/generated/titles.csv"),
          path.join(outputRoot, "downloads/titles.csv"),
        ),
        copyFile(
          path.join(repositoryRoot, "data/generated/site.json"),
          path.join(outputRoot, "data/site.json"),
        ),
      ]);
    },
  };
}

export default defineConfig({
  root: appRoot,
  base: "/chushou/",
  plugins: [react(), researchArtifacts()],
  server: {
    fs: { allow: [repositoryRoot] },
  },
  build: {
    target: "es2022",
    outDir: outputRoot,
    emptyOutDir: true,
    sourcemap: true,
  },
});

import { defineConfig, devices } from "@playwright/test";
import process from "node:process";

const isCi = process.env.CI !== undefined;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  ...(isCi ? { workers: 1 } : {}),
  reporter: isCi ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4173/chushou/",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command:
      "npm run build && npm run preview --workspace @chushou/web -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173/chushou/",
    reuseExistingServer: !isCi,
    timeout: 120_000,
  },
});

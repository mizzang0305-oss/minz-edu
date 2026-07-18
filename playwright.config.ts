import { defineConfig, devices } from "@playwright/test";

const playwrightPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const playwrightBaseUrl = `http://127.0.0.1:${playwrightPort}`;
const useDevelopmentServer = process.env.PLAYWRIGHT_DEV_SERVER === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: playwrightBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: useDevelopmentServer
      ? `npm run dev -- --port ${playwrightPort}`
      : `npm run build && npm run start -- --port ${playwrightPort}`,
    url: playwrightBaseUrl,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
    timeout: 180_000,
  },
  projects: [
    { name: "chromium", testIgnore: /mobile-compat\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "tablet-768", testIgnore: /mobile-compat\.spec\.ts/, use: { viewport: { width: 768, height: 1024 } } },
    { name: "mobile-360", testIgnore: /mobile-compat\.spec\.ts/, use: { viewport: { width: 360, height: 800 } } },
    { name: "iphone-se", testMatch: /mobile-compat\.spec\.ts/, use: { ...devices["iPhone SE"], browserName: "chromium" } },
    { name: "iphone-16-pro", testMatch: /mobile-compat\.spec\.ts/, use: { ...devices["iPhone 16 Pro"], browserName: "chromium" } },
    { name: "iphone-16-pro-landscape", testMatch: /mobile-compat\.spec\.ts/, use: { ...devices["iPhone 16 Pro landscape"], browserName: "chromium" } },
    { name: "galaxy-s24", testMatch: /mobile-compat\.spec\.ts/, use: { ...devices["Galaxy S24"], browserName: "chromium" } },
    { name: "galaxy-s24-landscape", testMatch: /mobile-compat\.spec\.ts/, use: { ...devices["Galaxy S24 landscape"], browserName: "chromium" } },
    { name: "galaxy-z-fold-6", testMatch: /mobile-compat\.spec\.ts/, use: { ...devices["Galaxy Z Fold 6"], browserName: "chromium" } },
    { name: "galaxy-tab-s9", testMatch: /mobile-compat\.spec\.ts/, use: { ...devices["Galaxy Tab S9"], browserName: "chromium" } },
  ],
});

import { expect, test } from "@playwright/test";
import path from "node:path";

const screenshotProjects = new Set(["iphone-16-pro", "galaxy-s24"]);

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test("아이폰·갤럭시 화면과 터치 조작이 안전 영역 안에서 동작한다", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /viewport-fit=cover/);
  await expectNoHorizontalOverflow(page);

  if (screenshotProjects.has(testInfo.project.name)) {
    await page.screenshot({ path: path.join(process.cwd(), "output", "playwright", `device-home-${testInfo.project.name}.png`), fullPage: false });
  }

  await page.goto("/setup");
  await expectNoHorizontalOverflow(page);
  const textControlFontSizes = await page.locator('input:not([type="radio"]):not([type="checkbox"]):not([type="range"]), select, textarea').evaluateAll((elements) =>
    elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
  );
  expect(textControlFontSizes.every((fontSize) => fontSize >= 16)).toBe(true);

  await page.goto("/battle");
  const moveButtons = page.locator(".touch-dpad button");
  await expect(moveButtons.first()).toBeEnabled({ timeout: 10_000 });
  await expectNoHorizontalOverflow(page);
  const touchTargets = await moveButtons.evaluateAll((buttons) => buttons.map((button) => {
    const rect = button.getBoundingClientRect();
    return { width: rect.width, height: rect.height, touchAction: getComputedStyle(button).touchAction };
  }));
  expect(touchTargets.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
  expect(touchTargets.every(({ touchAction }) => touchAction === "none")).toBe(true);

  await page.evaluate(() => {
    window.dispatchEvent(new Event("pagehide"));
    window.dispatchEvent(new Event("pageshow"));
    window.dispatchEvent(new Event("orientationchange"));
  });
  await expectNoHorizontalOverflow(page);

  if (screenshotProjects.has(testInfo.project.name)) {
    await page.screenshot({ path: path.join(process.cwd(), "output", "playwright", `device-battle-${testInfo.project.name}.png`), fullPage: false });
  }
});

test("자녀 전환 기록을 유지하며 오프라인 앱 재실행 후 복구한다", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const makeData = (displayName: string, coins: number, schoolLevel: "kindergarten" | "elementary", grade: number) => ({
      version: 5,
      playerProfile: { displayName, schoolLevel, grade },
      parentSettings: { playerName: displayName, schoolLevel, grade },
      inventory: { coins, badges: [] },
    });
    localStorage.setItem("minz-learning-game", JSON.stringify(makeData("민표", 70, "elementary", 5)));
    localStorage.setItem("minz-learning-game:child_offline", JSON.stringify(makeData("오프라인테스트", 35, "kindergarten", 5)));
    localStorage.setItem("minz-active-child-profile", "child_offline");
  });
  await page.goto("/inventory", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "오프라인테스트의 보물 가방" })).toBeVisible();
  await page.goto("/world", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("오프라인테스트", { exact: true }).first()).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });

  await context.setOffline(true);
  try {
    await page.close();
    const restarted = await context.newPage();
    await restarted.goto("/world", { waitUntil: "domcontentloaded" });
    await expect(restarted.getByText("오프라인테스트", { exact: true }).first()).toBeVisible();
    await restarted.evaluate(() => localStorage.setItem("minz-active-child-profile", "primary"));
    await restarted.close();

    const primaryRestart = await context.newPage();
    await primaryRestart.goto("/inventory", { waitUntil: "domcontentloaded" });
    await expect(primaryRestart.getByRole("heading", { name: "민표의 보물 가방" })).toBeVisible();
    await expect(primaryRestart.getByText("70", { exact: true })).toBeVisible();
    await primaryRestart.close();
  } finally {
    await context.setOffline(false);
  }
});

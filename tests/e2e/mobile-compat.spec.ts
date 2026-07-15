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

import { expect, test } from "@playwright/test";
import path from "node:path";

test("같은 기기 2인 협동 전투와 새로고침 저장", async ({ page }, testInfo) => {
  await page.goto("/setup");
  await page.getByRole("radio", { name: /친구와 같은 화면/ }).check();
  await page.getByLabel("친구 이름").fill("하람");
  await page.getByRole("button", { name: "설정 저장하고 모험 지도로" }).click();
  await expect(page).toHaveURL(/\/world$/);
  await page.getByRole("link", { name: "숫자 숲 입장" }).click();
  await page.getByRole("button", { name: "전투 시작" }).click();
  await expect(page.getByTestId("phaser-stage")).toBeVisible();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: path.join(process.cwd(), "output", "playwright", `coop-battle-${testInfo.project.name}.png`), fullPage: true });
  await page.getByRole("button", { name: "1번째 블록 옮기기" }).click();
  await page.getByRole("button", { name: "2번째 블록 옮기기" }).click();
  await page.getByRole("button", { name: "10칸 방어막 열기" }).click();
  await page.getByRole("button", { name: "5", exact: true }).click();
  await page.getByRole("button", { name: /8 \+ 2 \+ 5/ }).click();
  await page.getByRole("button", { name: "민표 준비 번개 힘" }).click();
  await page.getByRole("button", { name: "하람 준비 불꽃 힘" }).click();
  await expect(page.getByRole("link", { name: "보물과 오늘의 생각 보기" })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("link", { name: "보물과 오늘의 생각 보기" }).click();
  await expect(page).toHaveURL(/\/result$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: /멋진 작전이었어/ })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({
    path: path.join(process.cwd(), "output", "playwright", `coop-result-${testInfo.project.name}.png`),
    fullPage: testInfo.project.name !== "mobile-360",
  });
  await page.getByPlaceholder(/두 드래곤/).fill("두 드래곤이 합쳐질 때가 멋졌어!");
  await page.getByRole("button", { name: "내 생각 보관하기" }).click();
  await expect(page.getByText("오늘의 생각을 이 기기에 보관했어.")).toBeVisible();
  await page.reload();
  await expect(page.locator("textarea")).toHaveValue("두 드래곤이 합쳐질 때가 멋졌어!");
});

test("1인 전투는 플레이어 한 명의 필살기로 끝난다", async ({ page }) => {
  await page.goto("/setup");
  await page.getByRole("radio", { name: /혼자 모험/ }).check();
  await page.getByRole("button", { name: "설정 저장하고 모험 지도로" }).click();
  await expect(page).toHaveURL(/\/world$/);
  await page.getByRole("link", { name: "숫자 숲 입장" }).click();
  await page.getByRole("button", { name: "전투 시작" }).click();
  await page.getByRole("button", { name: "1번째 블록 옮기기" }).click();
  await page.getByRole("button", { name: "2번째 블록 옮기기" }).click();
  await page.getByRole("button", { name: "10칸 방어막 열기" }).click();
  await page.getByRole("button", { name: "15", exact: true }).click();
  await page.getByRole("button", { name: /8 \+ 2 \+ 5/ }).click();
  await page.getByRole("button", { name: "민표 준비 번개 힘" }).click();
  await expect(page.getByRole("heading", { name: "숫자 보스의 약점을 발견했어!" })).toBeVisible({ timeout: 10_000 });
});

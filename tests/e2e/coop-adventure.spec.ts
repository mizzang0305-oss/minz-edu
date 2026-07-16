import { expect, test } from "@playwright/test";
import path from "node:path";

async function finishExploration(page: import("@playwright/test").Page) {
  const talk = page.getByRole("button", { name: /숲길잡이 루미에게 말 걸기/ });
  await expect(talk).toBeVisible({ timeout: 10_000 });
  await talk.click();
  const moveRight = page.getByRole("button", { name: "오른쪽으로 이동" });
  await expect(moveRight).toBeEnabled({ timeout: 10_000 });
  await moveRight.dispatchEvent("pointerdown", { pointerId: 1, pointerType: "touch" });
  await page.waitForTimeout(700);
  await moveRight.dispatchEvent("pointerup", { pointerId: 1, pointerType: "touch" });
  await expect(page.getByRole("button", { name: "숲 보물 상자 열기" })).toBeVisible();
  await page.getByRole("button", { name: "숲 보물 상자 열기" }).click();
  await moveRight.dispatchEvent("pointerdown", { pointerId: 2, pointerType: "touch" });
  await page.waitForTimeout(3_700);
  await moveRight.dispatchEvent("pointerup", { pointerId: 2, pointerType: "touch" });
  const secretPrompt = page.getByRole("button", { name: /숨은 별길 조사하기/ });
  if (await secretPrompt.isVisible()) await secretPrompt.click();
  const bossPrompt = page.getByRole("button", { name: /잠든 씨앗 슬라임에게 도전하기/ });
  await expect(bossPrompt).toBeVisible();
  await bossPrompt.click();
}

async function saveSetupAndOpenWorld(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "저장하고 주별 학습 목표 고르기" }).click();
  await expect(page).toHaveURL(/\/goals$/);
  await page.getByRole("button", { name: "이 목표로 모험 시작" }).first().click();
  await expect(page).toHaveURL(/\/world$/);
}

test("같은 기기 2인 협동 전투와 새로고침 저장", async ({ page }, testInfo) => {
  await page.goto("/setup");
  await page.getByRole("radio", { name: /친구와 같은 화면/ }).check();
  await page.getByLabel("친구 이름").fill("하람");
  await saveSetupAndOpenWorld(page);
  await page.getByRole("link", { name: "숫자 숲 입장" }).click();
  await expect(page.getByRole("button", { name: "오른쪽으로 이동" })).toBeEnabled({ timeout: 10_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(process.cwd(), "output", "playwright", `rpg-explore-${testInfo.project.name}.png`), fullPage: false });
  await finishExploration(page);
  await expect(page.getByTestId("phaser-stage")).toBeVisible();
  await page.waitForTimeout(500);
  if ((page.viewportSize()?.width ?? 999) <= 900) {
    const stageBox = await page.getByTestId("phaser-stage").boundingBox();
    const missionBox = await page.locator(".mission-panel").boundingBox();
    const visualBox = await page.locator(".battle-visual").boundingBox();
    expect(stageBox).not.toBeNull();
    expect(missionBox).not.toBeNull();
    expect(visualBox).not.toBeNull();
    expect(stageBox!.y).toBeGreaterThanOrEqual(0);
    expect(stageBox!.height).toBeGreaterThanOrEqual(page.viewportSize()!.height * 0.85);
    expect(missionBox!.y).toBeGreaterThan(stageBox!.y);
    expect(missionBox!.y).toBeGreaterThan(page.viewportSize()!.height * 0.5);
    expect(missionBox!.y).toBeLessThan(page.viewportSize()!.height);
    expect(missionBox!.y + missionBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
    expect(missionBox!.y).toBeGreaterThanOrEqual(visualBox!.y);
    expect(missionBox!.y + missionBox!.height).toBeLessThanOrEqual(visualBox!.y + visualBox!.height + 1);
  }
  await expect(page.getByTestId("battle-command-console")).toBeVisible();
  await expect(page.locator(".battle-visual > .battle-overlay-dock > .battle-command-console")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: path.join(process.cwd(), "output", "playwright", `coop-battle-${testInfo.project.name}.png`), fullPage: false });
  await expect(page.getByText(/씨앗 파동 (준비|접근)/)).toBeVisible();
  await page.getByRole("button", { name: "5", exact: true }).click();
  await expect(page.getByText(/보호막이 막아 줬어/)).toBeVisible();
  await expect(page.getByText(/방어 17/)).toBeVisible();
  await page.getByRole("button", { name: "50", exact: true }).click();
  await expect(page.getByText(/50, 회피 성공!/)).toBeVisible();
  await page.screenshot({ path: path.join(process.cwd(), "output", "playwright", `learning-feedback-${testInfo.project.name}.png`), fullPage: false });
  await page.getByRole("button", { name: "470", exact: true }).click();
  await page.getByRole("button", { name: "632", exact: true }).click();
  await page.getByRole("button", { name: "민표 준비 번개 힘" }).click();
  await page.getByRole("button", { name: "하람 준비 불꽃 힘" }).click();
  await expect(page.getByRole("link", { name: "보물과 오늘의 생각 보기" })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("link", { name: "보물과 오늘의 생각 보기" }).click();
  await expect(page).toHaveURL(/\/result$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: /친구가 됐어/ })).toBeVisible();
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
  await page.getByRole("link", { name: "획득한 보물 가방 열기" }).click();
  await expect(page.getByRole("heading", { name: "민표의 보물 가방" })).toBeVisible();
  await expect(page.locator(".inventory-grid article")).toHaveCount(5);
  await expect(page.getByText("다시 도전 용기 배지")).toBeVisible();
  await page.screenshot({ path: path.join(process.cwd(), "output", "playwright", `inventory-${testInfo.project.name}.png`), fullPage: testInfo.project.name !== "mobile-360" });
  await page.getByRole("link", { name: "스테이지 지도" }).click();
  await expect(page.getByRole("link", { name: /단어섬 출정/ })).toBeVisible();
  await page.screenshot({ path: path.join(process.cwd(), "output", "playwright", `world-stage2-unlocked-${testInfo.project.name}.png`), fullPage: testInfo.project.name !== "mobile-360" });
  await page.goto("/parent/observation");
  await expect(page.getByRole("heading", { name: "2인 모험 관찰 기록" })).toBeVisible();
  await expect(page.getByText("게임이 자동 기록한 협력 행동")).toBeVisible();
  await page.locator('input[name="turnClarity"][value="4"]').check();
  await page.locator('input[name="waitComfort"][value="4"]').check();
  await page.getByRole("radio", { name: "분명히 있었음" }).check();
  await page.locator('input[name="specialSatisfaction"][value="5"]').check();
  await page.getByRole("checkbox", { name: /다시 하자/ }).check();
  await page.getByPlaceholder(/친구 차례에는/).fill("차례를 스스로 넘기고 합동 스킬에서 함께 웃었음");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(process.cwd(), "output", "playwright", `coop-observation-${testInfo.project.name}.png`),
    fullPage: testInfo.project.name !== "mobile-360",
  });
  await page.getByRole("button", { name: "관찰 기록 저장" }).click();
  await expect(page.getByText("이 기기에 관찰 기록을 저장했습니다.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.reload();
  await expect(page.getByPlaceholder(/친구 차례에는/)).toHaveValue("차례를 스스로 넘기고 합동 스킬에서 함께 웃었음");
});

test("1인 전투는 플레이어 한 명의 필살기로 끝난다", async ({ page }) => {
  await page.goto("/setup");
  await page.getByRole("radio", { name: /혼자 모험/ }).check();
  await saveSetupAndOpenWorld(page);
  await page.getByRole("link", { name: "숫자 숲 입장" }).click();
  await finishExploration(page);
  await page.getByRole("button", { name: "50", exact: true }).click();
  await page.getByRole("button", { name: "470", exact: true }).click();
  await page.getByRole("button", { name: "632", exact: true }).click();
  await page.getByRole("button", { name: "민표 준비 번개 힘" }).click();
  await expect(page.getByRole("heading", { name: /친구가 됐어/ })).toBeVisible({ timeout: 10_000 });
});

test("유아수학 단계를 고르고 연령별 전투를 시작한다", async ({ page }) => {
  await page.goto("/setup");
  await page.getByLabel("학습 단계").selectOption("kindergarten");
  await expect(page.getByLabel("나이")).toHaveValue("5");
  await page.getByRole("button", { name: "저장하고 주별 학습 목표 고르기" }).click();
  await expect(page).toHaveURL(/\/goals$/);
  await expect(page.getByText("유아수학").first()).toBeVisible();
  await expect(page.getByText("8주차부터", { exact: true })).toBeVisible();
  await expect(page.getByText("9주차부터", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "이 목표로 모험 시작" }).first().click();
  await expect(page).toHaveURL(/\/world$/);
  await page.goto("/battle");
  await expect(page.getByText(/유아 5세 · 목표/)).toBeVisible();
  await finishExploration(page);
  await expect(page.getByRole("heading", { name: "토끼가 3마리 있어요. 모두 몇 마리일까요?" })).toBeVisible();
});

test("터치 취소 후 캐릭터 이동이 고착되지 않는다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "대표 브라우저에서 포인터 취소 수명주기를 검사");
  await page.goto("/setup");
  await saveSetupAndOpenWorld(page);
  await page.getByRole("link", { name: "숫자 숲 입장" }).click();
  const moveRight = page.getByRole("button", { name: "오른쪽으로 이동" });
  await expect(moveRight).toBeEnabled({ timeout: 10_000 });
  await moveRight.dispatchEvent("pointerdown", { pointerId: 7, pointerType: "touch" });
  await page.waitForTimeout(200);
  await moveRight.dispatchEvent("pointercancel", { pointerId: 7, pointerType: "touch" });
  await page.waitForTimeout(2_000);
  await expect(page.locator(".rpg-quest-overlay strong")).toHaveText("길잡이와 대화하기");
});

test("주별 목표를 진단하고 이미 아는 목표를 건너뛸 수 있다", async ({ page }) => {
  await page.goto("/goals");
  await expect(page.getByRole("heading", { name: "이번 주에 배울 목표를 골라요" })).toBeVisible();
  expect(await page.locator(".week-goal-card").count()).toBe(16);
  await page.getByRole("button", { name: "이미 아는지 확인" }).first().click();
  await expect(page).toHaveURL(/\/training\?mode=diagnostic/);
  await page.getByRole("button", { name: "50", exact: true }).click();
  await page.getByRole("button", { name: "470", exact: true }).click();
  await page.getByRole("button", { name: "632", exact: true }).click();
  await expect(page.getByRole("heading", { name: /게임 내 준비됨/ })).toBeVisible();
  await page.getByRole("link", { name: "다음 주차 고르기" }).click();
  await expect(page.locator(".week-goal-card").first()).toContainText("게임 내 준비됨");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

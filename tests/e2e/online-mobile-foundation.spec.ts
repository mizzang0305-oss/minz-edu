import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";

const firebaseConfigured =
  existsSync(".firebase-web-config.json") && existsSync(".firebase-admin-key.json");

test("보호자 계정 화면은 Firebase 연결 상태를 정확히 보여준다", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: /Google 계정 하나로/ })).toBeVisible();
  const signInButton = page.getByRole("button", { name: "보호자 Google 계정으로 계속" });
  if (firebaseConfigured) {
    await expect(signInButton).toBeEnabled();
  } else {
    await expect(signInButton).toBeDisabled();
    await expect(page.getByText(/Firebase 환경값을 연결하면/)).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("로그인 전 온라인 친구 방은 보호자 계정을 요구한다", async ({ page }) => {
  await page.goto("/room");

  await expect(page.getByRole("heading", { name: /보호자 계정 연결 후/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "보호자 Google 로그인" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("자녀 선택 화면은 로그인 전 보호자 인증으로 안전하게 돌아간다", async ({ page }) => {
  await page.goto("/children");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: /Google 계정 하나로/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("인증 세션 API는 인증 정보 없이 닫힌 상태로 실패한다", async ({ request }) => {
  const response = await request.post("/api/auth/session", {
    data: { idToken: "not-a-token", csrfToken: "not-a-token" },
  });

  expect(response.status()).toBe(firebaseConfigured ? 403 : 503);

  const legacyClientTokenResponse = await request.get("/api/auth/client-token");
  expect(legacyClientTokenResponse.status()).toBe(405);

  const clientTokenResponse = await request.post("/api/auth/client-token", {
    data: { csrfToken: "not-a-token" },
  });
  expect(clientTokenResponse.status()).toBe(firebaseConfigured ? 403 : 503);

  const roomResponse = await request.post("/api/rooms", {
    data: { childProfileId: "primary", csrfToken: "not-a-token" },
  });
  expect(roomResponse.status()).toBe(401);

  const presenceResponse = await request.post(
    "/api/rooms/00000000-0000-4000-8000-000000000000/presence",
    { data: { csrfToken: "not-a-token" } },
  );
  expect(presenceResponse.status()).toBe(401);
});

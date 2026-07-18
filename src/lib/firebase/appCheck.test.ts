import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FirebaseApp } from "firebase/app";

const { initializeAppCheckMock, providerMock } = vi.hoisted(() => ({
  initializeAppCheckMock: vi.fn(),
  providerMock: vi.fn(),
}));

vi.mock("firebase/app-check", () => ({
  initializeAppCheck: initializeAppCheckMock,
  ReCaptchaEnterpriseProvider: providerMock,
}));

const app = { name: "test-app" } as FirebaseApp;

async function loadBootstrap() {
  const appCheckModule = await import("./appCheck");
  return appCheckModule.bootstrapFirebaseAppCheckMonitoring;
}

describe("Firebase App Check monitoring bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    initializeAppCheckMock.mockReset();
    providerMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("stays disabled when the public site key is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY", "replace-me");
    const bootstrap = await loadBootstrap();

    expect(bootstrap(app)).toBe("skipped-unconfigured");
    expect(initializeAppCheckMock).not.toHaveBeenCalled();
  });

  it("does not load reCAPTCHA when Firebase emulators are enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY", "public-site-key");
    vi.stubEnv("NEXT_PUBLIC_USE_FIREBASE_EMULATORS", "true");
    const bootstrap = await loadBootstrap();

    expect(bootstrap(app)).toBe("skipped-emulator");
    expect(initializeAppCheckMock).not.toHaveBeenCalled();
  });

  it("initializes Enterprise attestation once with token refresh", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY", "public-site-key");
    const bootstrap = await loadBootstrap();

    expect(bootstrap(app)).toBe("initialized");
    expect(bootstrap(app)).toBe("initialized");
    expect(providerMock).toHaveBeenCalledOnce();
    expect(providerMock).toHaveBeenCalledWith("public-site-key");
    expect(initializeAppCheckMock).toHaveBeenCalledOnce();
    expect(initializeAppCheckMock).toHaveBeenCalledWith(
      app,
      expect.objectContaining({ isTokenAutoRefreshEnabled: true }),
    );
  });

  it("fails open without logging site keys or raw provider errors", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY", "public-site-key");
    initializeAppCheckMock.mockImplementationOnce(() => {
      throw Object.assign(new Error("provider details"), {
        code: "appCheck/recaptcha-error",
      });
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const bootstrap = await loadBootstrap();

    expect(bootstrap(app)).toBe("failed-open");
    expect(bootstrap(app)).toBe("failed-open");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("fail-open"),
      { code: "appCheck/recaptcha-error" },
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain("public-site-key");
    expect(JSON.stringify(warn.mock.calls)).not.toContain("provider details");
    expect(warn).toHaveBeenCalledOnce();
  });

  it("accepts the Fast Refresh already-initialized state", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY", "public-site-key");
    initializeAppCheckMock.mockImplementationOnce(() => {
      throw { code: "appCheck/already-initialized" };
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const bootstrap = await loadBootstrap();

    expect(bootstrap(app)).toBe("initialized");
    expect(warn).not.toHaveBeenCalled();
  });
});

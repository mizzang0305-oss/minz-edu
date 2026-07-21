import { startLearningBattleServer } from "./app";

const port = readPort(process.env.COLYSEUS_PORT, 2567);
const host = process.env.COLYSEUS_HOST?.trim() || "127.0.0.1";
const allowedOrigins = process.env.COLYSEUS_ALLOWED_ORIGINS
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const simulatedLatencyMs = readPort(process.env.COLYSEUS_SIMULATED_LATENCY_MS, 0);

async function main() {
  const running = await startLearningBattleServer({ host, port, allowedOrigins, simulatedLatencyMs });
  console.log(`[minz-coop] listening on ${running.endpoint}`);

  let stopping = false;
  async function stop(signal: string) {
    if (stopping) return;
    stopping = true;
    console.log(`[minz-coop] ${signal} received; stopping safely`);
    await running.stop();
    process.exit(0);
  }

  process.once("SIGINT", () => void stop("SIGINT"));
  process.once("SIGTERM", () => void stop("SIGTERM"));
}

void main().catch((error) => {
  console.error("[minz-coop] failed to start", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});

function readPort(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 65_535 ? parsed : fallback;
}

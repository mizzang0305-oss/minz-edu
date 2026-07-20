import { matchMaker, Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import {
  LEARNING_BATTLE_ROOM_NAME,
  LearningBattleRoom,
} from "./LearningBattleRoom";

export type LearningBattleServerOptions = {
  host?: string;
  port?: number;
  allowedOrigins?: string[];
  simulatedLatencyMs?: number;
};

export async function startLearningBattleServer(options: LearningBattleServerOptions = {}) {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 2567;
  const restoreCors = configureCors(options.allowedOrigins);
  const server = new Server({
    transport: new WebSocketTransport(),
    gracefullyShutdown: false,
    greet: false,
  });
  server.define(LEARNING_BATTLE_ROOM_NAME, LearningBattleRoom);

  try {
    await server.listen(port, host);
  } catch (error) {
    restoreCors();
    throw error;
  }

  if ((options.simulatedLatencyMs ?? 0) > 0) {
    server.simulateLatency(options.simulatedLatencyMs ?? 0);
  }

  const address = server.transport.server?.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  let stopped = false;
  return {
    server,
    host,
    port: actualPort,
    endpoint: `http://${host}:${actualPort}`,
    async stop() {
      if (stopped) return;
      stopped = true;
      server.simulateLatency(0);
      await server.gracefullyShutdown(false);
      restoreCors();
    },
  };
}

function configureCors(allowedOrigins: string[] | undefined) {
  const originalGetCorsHeaders = matchMaker.controller.getCorsHeaders;
  const explicitOrigins = new Set((allowedOrigins ?? []).map((origin) => origin.trim()).filter(Boolean));

  matchMaker.controller.getCorsHeaders = (headers: Headers) => {
    const origin = headers.get("origin");
    return {
      "Access-Control-Allow-Origin": isAllowedOrigin(origin, explicitOrigins) ? origin! : "null",
      "Vary": "Origin",
    };
  };

  return () => {
    matchMaker.controller.getCorsHeaders = originalGetCorsHeaders;
  };
}

function isAllowedOrigin(origin: string | null, explicitOrigins: Set<string>) {
  if (!origin) return false;
  if (explicitOrigins.size > 0) return explicitOrigins.has(origin);
  try {
    const url = new URL(origin);
    return url.protocol === "http:"
      && (url.hostname === "127.0.0.1" || url.hostname === "localhost");
  } catch {
    return false;
  }
}

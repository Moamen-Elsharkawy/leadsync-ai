import type { Server } from "node:http";
import type { FollowUpService } from "../services/followUpService.js";
import { logger } from "../utils/logger.js";

export interface ShutdownDeps {
  bot: { stop(reason?: string): void };
  adminServer: Pick<Server, "close">;
  followUpService: Pick<FollowUpService, "stop">;
  exit?: (code: number) => void;
  timeoutMs?: number;
}

export function createShutdownHandler(
  deps: ShutdownDeps,
): (signal: string) => void {
  const exit = deps.exit ?? process.exit;
  const timeoutMs = deps.timeoutMs ?? 10000;
  let isShuttingDown = false;

  return (signal: string): void => {
    if (isShuttingDown) {
      logger.warn("Shutdown already in progress", { signal });
      return;
    }

    isShuttingDown = true;
    logger.info(`Shutting down after ${signal}`);

    try {
      deps.followUpService.stop();
    } catch (error) {
      logger.error("Failed to stop follow-up scheduler", { error });
    }

    try {
      deps.bot.stop(signal);
    } catch (error) {
      logger.error("Failed to stop Telegram bot", { error });
    }

    const forceExitTimer = setTimeout(() => {
      logger.error("Graceful shutdown timed out", { signal, timeoutMs });
      exit(1);
    }, timeoutMs);
    forceExitTimer.unref?.();

    try {
      deps.adminServer.close((error?: Error) => {
        clearTimeout(forceExitTimer);
        if (error) {
          logger.error("Failed to close admin server", { error });
          exit(1);
          return;
        }

        exit(0);
      });
    } catch (error) {
      clearTimeout(forceExitTimer);
      logger.error("Failed to close admin server", { error });
      exit(1);
    }
  };
}

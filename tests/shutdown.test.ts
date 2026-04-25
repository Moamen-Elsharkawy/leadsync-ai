import { afterEach, describe, expect, it, vi } from "vitest";
import { createShutdownHandler } from "../src/runtime/shutdown.js";

describe("shutdown", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("stops follow-ups, stops the bot, closes the server, and exits once", () => {
    const bot = { stop: vi.fn() };
    const followUpService = { stop: vi.fn() };
    const adminServer = {
      close: vi.fn((callback: (error?: Error) => void) => {
        callback();
        return adminServer;
      }),
    };
    const exit = vi.fn();
    const shutdown = createShutdownHandler({
      bot,
      followUpService,
      adminServer,
      exit,
    });

    shutdown("SIGINT");
    shutdown("SIGTERM");

    expect(followUpService.stop).toHaveBeenCalledTimes(1);
    expect(bot.stop).toHaveBeenCalledWith("SIGINT");
    expect(adminServer.close).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it("forces exit if the admin server does not close in time", () => {
    vi.useFakeTimers();
    const exit = vi.fn();
    const shutdown = createShutdownHandler({
      bot: { stop: vi.fn() },
      followUpService: { stop: vi.fn() },
      adminServer: {
        close: vi.fn(() => undefined),
      },
      exit,
      timeoutMs: 100,
    });

    shutdown("SIGTERM");
    vi.advanceTimersByTime(101);

    expect(exit).toHaveBeenCalledWith(1);
  });
});

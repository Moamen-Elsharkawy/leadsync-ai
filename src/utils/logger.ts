export const logger = {
  info(message: string, meta?: unknown): void {
    log("info", redactSecrets(message), meta);
  },
  warn(message: string, meta?: unknown): void {
    log("warn", redactSecrets(message), meta);
  },
  error(message: string, meta?: unknown): void {
    log("error", redactSecrets(message), meta);
  },
};

function log(
  level: "info" | "warn" | "error",
  message: string,
  meta?: unknown,
): void {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...(meta === undefined ? {} : { meta: sanitizeForLog(meta) }),
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function sanitizeForLog(value: unknown): unknown {
  return sanitizeValue(value, new WeakSet<object>());
}

export function redactSecrets(value: string): string {
  let redacted = value
    .replace(/\b(sk-or-v1-[A-Za-z0-9_-]{8,})\b/g, (match) =>
      maskSecret(match, "sk-or-v1-"),
    )
    .replace(
      /\b(\d{5,}):([A-Za-z0-9_-]{8,})\b/g,
      (_match, botId: string, token: string) =>
        `${botId}:****${token.slice(-4)}`,
    )
    .replace(
      /(https?:\/\/)([^/\s:@]+):([^@\s/]+)@/gi,
      (_match, protocol: string) => `${protocol}****:****@`,
    );

  for (const secret of knownSecrets()) {
    redacted = redacted.split(secret).join(maskSecret(secret));
  }

  return redacted;
}

function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value instanceof Error) {
    return sanitizeError(value);
  }

  if (typeof value === "string") {
    return redactSecrets(value);
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]";
    }

    seen.add(value);
    const clean: Record<string, unknown> = {};

    for (const [key, raw] of Object.entries(value)) {
      clean[key] = isSensitiveKey(key)
        ? maskSecret(String(raw ?? ""))
        : sanitizeValue(raw, seen);
    }

    seen.delete(value);
    return clean;
  }

  return redactSecrets(String(value));
}

function sanitizeError(error: Error): Record<string, unknown> {
  const errorLike = error as Error & {
    status?: unknown;
    code?: unknown;
    response?: unknown;
  };

  return {
    name: error.name,
    message: redactSecrets(error.message),
    ...(errorLike.status === undefined
      ? {}
      : { status: sanitizeValue(errorLike.status, new WeakSet<object>()) }),
    ...(errorLike.code === undefined
      ? {}
      : { code: sanitizeValue(errorLike.code, new WeakSet<object>()) }),
  };
}

function knownSecrets(): string[] {
  return [
    process.env.OPENROUTER_API_KEY,
    process.env.TELEGRAM_BOT_TOKEN,
    process.env.GOOGLE_SHEETS_WEBAPP_SECRET,
    process.env.ADMIN_PASSWORD,
  ].filter((value): value is string => Boolean(value && value.length >= 6));
}

function isSensitiveKey(key: string): boolean {
  return /secret|token|password|api[_-]?key|authorization|cookie/i.test(key);
}

function maskSecret(value: string, prefix = ""): string {
  if (!value) {
    return "[redacted]";
  }

  const suffix = value.slice(-4);
  return `${prefix}****${suffix}`;
}

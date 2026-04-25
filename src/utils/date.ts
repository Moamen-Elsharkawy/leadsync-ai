export function nowIso(): string {
  return new Date().toISOString();
}

export function addHoursIso(hours: number, from = new Date()): string {
  return new Date(from.getTime() + hours * 60 * 60 * 1000).toISOString();
}

export function isIsoDue(value: string, now = new Date()): boolean {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.getTime() <= now.getTime();
}

export function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

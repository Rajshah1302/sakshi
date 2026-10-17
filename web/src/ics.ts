import type { LocalVault } from "./store";

function toIcsDate(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function clean(value: string): string {
  return value.replace(/[\n\r,;]/g, " ");
}

export function reminderIcs(vault: LocalVault): string {
  const start = toIcsDate(vault.deadlineMs);
  const end = toIcsDate(vault.deadlineMs + 30 * 60 * 1000);
  const stamp = toIcsDate(Date.now());
  const title = clean(vault.title || "Sakshi vault");
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sakshi//Reminder//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${vault.vaultKey}@sakshi`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:Check in to Sakshi: ${title}`,
    "DESCRIPTION:If you miss this deadline, the switch releases the vault to your guardians.",
    `URL:${origin}/vaults/${vault.vaultKey}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Check in to Sakshi",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

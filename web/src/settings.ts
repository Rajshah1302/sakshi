export interface Settings {
  defaultIntervalS: number;
}

const KEY = "sakshi:settings:v1";

export const DEFAULT_SETTINGS: Settings = { defaultIntervalS: 60 };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const interval = Number(parsed.defaultIntervalS);
    return { defaultIntervalS: Number.isFinite(interval) && interval >= 2 ? interval : DEFAULT_SETTINGS.defaultIntervalS };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(KEY, JSON.stringify(settings));
}

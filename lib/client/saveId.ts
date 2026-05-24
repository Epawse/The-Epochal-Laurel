const STORAGE_KEY = "epochal-laurel-save-id";

export function getSaveId(): string | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const override = params.get("save");
  if (override) {
    localStorage.setItem(STORAGE_KEY, override);
    return override;
  }

  return localStorage.getItem(STORAGE_KEY);
}

export function setSaveId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id);
}

export function clearSaveId(): void {
  localStorage.removeItem(STORAGE_KEY);
}

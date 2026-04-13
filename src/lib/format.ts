export function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function joinTags(value: string[]): string {
  return value.filter(Boolean).join(", ");
}

export function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toJsonText(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2);
}

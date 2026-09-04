export function formatDistance(distanceM: number | null): string | null {
  if (distanceM === null) return null;
  if (distanceM < 1000) return `${Math.max(1, Math.round(distanceM))} m`;
  return `${Math.max(0.1, distanceM / 1000).toFixed(1)} km`;
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function compactText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

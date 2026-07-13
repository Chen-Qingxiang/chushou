export function stableStringify(value: unknown, space = 2): string {
  const normalize = (current: unknown): unknown => {
    if (Array.isArray(current)) return current.map(normalize);
    if (current !== null && typeof current === "object") {
      return Object.fromEntries(
        Object.entries(current)
          .toSorted(([left], [right]) => left.localeCompare(right))
          .map(([key, child]) => [key, normalize(child)]),
      );
    }
    return current;
  };
  return `${JSON.stringify(normalize(value), null, space)}\n`;
}

export function csvCell(value: string | number | null): string {
  if (value === null) return "";
  const text = String(value);
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

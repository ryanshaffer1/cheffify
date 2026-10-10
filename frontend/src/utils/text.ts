export const normalizeDisplayName = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toLowerCase()
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function asUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new Error(`${field} must be a valid UUID`);
  }
  return value;
}

export function asTrimmedString(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new Error(`${field} length must be between ${min} and ${max}`);
  }
  return trimmed;
}

export function asStringArray(value: unknown, field: string, allowed: Set<string>, maxItems = 8): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new Error(`${field} must be an array with at most ${maxItems} items`);
  }
  return value.map((item) => {
    if (typeof item !== 'string' || !allowed.has(item)) {
      throw new Error(`${field} contains an unsupported value`);
    }
    return item;
  });
}

export function validationError(message: string) {
  return { error: message };
}

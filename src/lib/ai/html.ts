export function extractGeneratedHtml(response: string): string | null {
  const fenced = response.match(/```(?:html)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || response.trim();
  if (!candidate) return null;

  const doctypeIndex = candidate.search(/<!doctype html>/i);
  const htmlIndex = candidate.search(/<html[\s>]/i);
  const start = doctypeIndex >= 0 ? doctypeIndex : htmlIndex;
  if (start < 0) return null;

  const sliced = candidate.slice(start).trim();
  if (!/<\/html>\s*$/i.test(sliced)) return null;
  if (!/<script[^>]+type=["']text\/babel["']/i.test(sliced)) return null;
  if (sliced.length < 500 || sliced.length > 500000) return null;
  return sliced;
}

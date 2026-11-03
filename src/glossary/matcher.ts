import type { Term } from '@/engine/content/schema';

/** A run of text, and the term it names if it is one. */
export interface TextSegment {
  readonly text: string;
  readonly termId?: string;
}

/**
 * Builds a function that splits text into plain runs and registered terms. Matching ignores
 * case, takes whole words only, and prefers the longest form ("magnetic fields" over
 * "magnetic field").
 */
export function createTermMatcher(terms: readonly Term[]): (text: string) => TextSegment[] {
  const owners = new Map<string, string>();
  for (const term of terms) {
    for (const form of [term.name, ...term.forms]) owners.set(form.toLowerCase(), term.id);
  }
  if (owners.size === 0) return (text) => [{ text }];

  const alternatives = [...owners.keys()]
    .sort((a, b) => b.length - a.length)
    .map((form) => form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${alternatives.join('|')})(?![\\p{L}\\p{N}])`,
    'giu',
  );

  return (text) => {
    const segments: TextSegment[] = [];
    let cursor = 0;
    for (const match of text.matchAll(pattern)) {
      if (match.index > cursor) segments.push({ text: text.slice(cursor, match.index) });
      segments.push({ text: match[0], termId: owners.get(match[0].toLowerCase()) });
      cursor = match.index + match[0].length;
    }
    if (cursor < text.length) segments.push({ text: text.slice(cursor) });
    return segments;
  };
}

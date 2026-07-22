/**
 * Extracts inline #tags (and @mentions) from note content.
 * Tags may contain unicode letters, numbers and underscores.
 * Leading `#`/`@` is stripped; results are returned lower-cased & de-duped.
 */
export function parseTags(content: string): string[] {
  const matches = content.match(/[#@]([\p{L}\p{N}_]+)/gu) ?? [];
  const seen = new Set<string>();
  for (const m of matches) {
    seen.add(m.slice(1).toLowerCase());
  }
  return Array.from(seen);
}

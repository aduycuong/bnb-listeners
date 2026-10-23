import { stripVietnameseDiacritics } from "@/lib/common/strip-vietnamese-diacritics";

function squash(text: string): string {
  return stripVietnameseDiacritics(text.normalize("NFC")).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

/**
 * How alike two spellings are once accents, case, spaces and punctuation are
 * gone: 1 for the same letters, 0 for nothing in common. "chelia vita" and
 * "Trellia Vista" score about 0.67, "treleco" (Trellia Cove) about 0.42.
 */
export function nameSimilarity(a: string, b: string): number {
  const left = squash(a);
  const right = squash(b);
  const longest = Math.max(left.length, right.length);
  return longest === 0 ? 1 : 1 - editDistance(left, right) / longest;
}

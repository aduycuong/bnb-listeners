import { SYNTHETIC_CONFIG } from "../config";
import { pickOne, type SeededRandom } from "./create-seeded-random";
import { stripDiacritics } from "./strip-diacritics";

export type DegradedText = {
  text: string;
  /** `no-diacritics` and/or `typo`; empty when the text is untouched. */
  degraded: string[];
};

/**
 * Makes LLM text a little messier, as real comments are: missing diacritics
 * and the odd typo. Applied to comments and replies only.
 */
export function degradeText(random: SeededRandom, text: string): DegradedText {
  const { stripDiacriticsRate, typoRate } = SYNTHETIC_CONFIG.noise;
  const degraded: string[] = [];
  let result = text;

  if (random() < typoRate) {
    const typo = introduceTypo(random, result);
    if (typo !== result) {
      result = typo;
      degraded.push("typo");
    }
  }

  if (random() < stripDiacriticsRate) {
    result = stripDiacritics(result);
    degraded.push("no-diacritics");
  }

  return { text: result, degraded };
}

/** Swaps two adjacent letters inside one longer word. */
function introduceTypo(random: SeededRandom, text: string): string {
  const words = text.split(" ");
  const candidates = words
    .map((word, index) => ({ word, index }))
    .filter(({ word }) => /^\p{L}{4,}$/u.test(word));

  if (candidates.length === 0) return text;

  const { word, index } = pickOne(random, candidates);
  const at = 1 + Math.floor(random() * (word.length - 2));
  const chars = [...word];
  [chars[at], chars[at + 1]] = [chars[at + 1], chars[at]];
  words[index] = chars.join("");

  return words.join(" ");
}

import { SYNTHETIC_CONFIG } from "../config";
import type { PersonaSnapshot, PlannedAuthor, PlannedThread } from "../types";
import {
  pickOne,
  type SeededRandom,
} from "../utils/create-seeded-random";
import { makeVietnameseName } from "../utils/make-vietnamese-name";

type AssignThreadAuthorsParams = {
  threads: PlannedThread[];
  /** Existing synthetic authors per persona id; new authors are appended. */
  pools: Map<string, PlannedAuthor[]>;
  random: SeededRandom;
};

/**
 * Gives every planned item an author. An individual persona reuses one of its
 * existing authors (so a name keeps posting across threads) or gets a new
 * one; an organization persona is always the same single account. Noise
 * items such as spam come from throwaway authors with no persona.
 */
export function assignThreadAuthors(params: AssignThreadAuthorsParams): void {
  for (const thread of params.threads) {
    const usedInThread = new Set<string>();
    const post = thread.items[0];

    for (const item of thread.items) {
      if (item.byPostAuthor) {
        item.author = post.author;
        continue;
      }

      item.author = item.persona
        ? pickPersonaAuthor(params, item.persona, usedInThread)
        : createNoiseAuthor(params.random);
      usedInThread.add(item.author.externalId);
    }
  }
}

function pickPersonaAuthor(
  params: AssignThreadAuthorsParams,
  persona: PersonaSnapshot,
  usedInThread: Set<string>,
): PlannedAuthor {
  const { random, pools } = params;
  const pool = pools.get(persona.id) ?? [];
  pools.set(persona.id, pool);

  if (persona.kind === "organization") {
    const existing = pool[0];
    if (existing) return existing;

    const author = {
      externalId: `syn-author:${persona.templateKey ?? persona.id}`,
      name: persona.name,
      personaId: persona.id,
      followerCount: 5000,
    };
    pool.push(author);
    return author;
  }

  const reusable = pool.filter((author) => !usedInThread.has(author.externalId));
  if (reusable.length > 0 && random() < SYNTHETIC_CONFIG.plan.reuseAuthorRate) {
    return pickOne(random, reusable);
  }

  const author: PlannedAuthor = {
    externalId: `syn-author:${persona.templateKey ?? persona.id.slice(0, 8)}:${randomHex(random)}`,
    name: makeVietnameseName(random),
    personaId: persona.id,
    // Heavy tail from 1 to ~3000 followers.
    followerCount: Math.floor(Math.exp(random() * Math.log(3000))),
  };
  pool.push(author);
  return author;
}

function createNoiseAuthor(random: SeededRandom): PlannedAuthor {
  return {
    externalId: `syn-author:noise:${randomHex(random)}`,
    name: makeVietnameseName(random),
    personaId: null,
    followerCount: Math.floor(random() * 200),
  };
}

function randomHex(random: SeededRandom): string {
  return Math.floor(random() * 0xffffffff)
    .toString(16)
    .padStart(8, "0");
}

import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import { InvalidInputError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { isTopicStageKind } from "@/lib/topics/config";
import { refreshTopicStats } from "@/lib/topics/services/refresh-topic-stats";

import type { DeleteContentItemsParams, DeleteContentItemsResult } from "../types";

/** Matches the largest admin page, with room to select across a few pages. */
export const MAX_DELETE_CONTENT_ITEMS = 500;

const contentItemIdSchema = z.uuid();

type AffectedTopic = {
  projectId: string;
  kind: string;
  topicId: string;
};

type DeleteRow = {
  deleted: number | string;
  requested_found: number | string;
  topics: unknown;
};

/**
 * Deletes content items and the comments/replies under them.
 *
 * `content_items.parent_id` and `root_id` are `ON DELETE SET NULL`, so a plain
 * delete of a post would leave its thread in place with those links cleared.
 * This walks both links and deletes the thread in the same statement.
 *
 * Postgres then cascades engagement snapshots, refresh schedules, mentions
 * (and their enrichments, sentiments, entities, aspects, extractions, terms,
 * topic memberships and embeddings), item labels and label-sample memberships.
 * Topic counts and centroids are recomputed afterwards. Authors, sources,
 * collect runs and the raw payload archive stay.
 */
export async function deleteContentItems(
  params: DeleteContentItemsParams,
): Promise<DeleteContentItemsResult> {
  const ids = [...new Set(params.ids)];
  if (ids.length === 0) {
    throw new InvalidInputError("Choose at least one content item.");
  }
  if (ids.length > MAX_DELETE_CONTENT_ITEMS) {
    throw new InvalidInputError(
      `Delete at most ${MAX_DELETE_CONTENT_ITEMS} content items at a time.`,
    );
  }
  if (ids.some((id) => !contentItemIdSchema.safeParse(id).success)) {
    throw new InvalidInputError("Content item id must be a UUID.");
  }

  const { rows } = await db.execute<DeleteRow>(sql`
    with recursive doomed as (
      select id
      from content_items
      where id = any(${uuidArray(ids)})
      union
      select c.id
      from content_items c
      inner join doomed d
        on c.parent_id = d.id
        or (c.root_id = d.id and c.id <> d.id)
    ),
    cleared_roots as (
      update mentions
      set root_item_id = null,
          updated_at = now()
      where root_item_id in (select id from doomed)
        and content_item_id not in (select id from doomed)
      returning id
    ),
    affected as (
      select distinct t.project_id, t.kind, t.id as topic_id
      from mentions m
      inner join mention_topics mt on mt.mention_id = m.id
      inner join topics t on t.id = mt.topic_id
      where m.content_item_id in (select id from doomed)
    ),
    removed as (
      delete from content_items
      where id in (select id from doomed)
      returning id
    )
    select
      (select count(*)::int from removed) as deleted,
      (select count(*)::int from doomed where id = any(${uuidArray(ids)})) as requested_found,
      coalesce(
        (select json_agg(json_build_object(
          'projectId', project_id,
          'kind', kind,
          'topicId', topic_id
        )) from affected),
        '[]'::json
      ) as topics,
      (select count(*)::int from cleared_roots) as cleared_roots
  `);

  const row = rows[0];
  const deleted = asCount(row?.deleted);
  const requestedFound = asCount(row?.requested_found);
  await refreshAffectedTopics(parseTopics(row?.topics));

  return {
    requested: ids.length,
    requestedFound,
    deleted,
    descendants: Math.max(0, deleted - requestedFound),
  };
}

/** A Postgres uuid[] literal. Ids are checked before this is built. */
function uuidArray(ids: string[]): SQL {
  return sql`${`{${ids.join(",")}}`}::uuid[]`;
}

function asCount(value: unknown): number {
  const count = typeof value === "number" ? value : Number(value);
  return Number.isFinite(count) ? count : 0;
}

function parseTopics(value: unknown): AffectedTopic[] {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const topic = entry as Record<string, unknown>;
    if (
      typeof topic.projectId !== "string" ||
      typeof topic.kind !== "string" ||
      typeof topic.topicId !== "string"
    ) {
      return [];
    }
    return [{ projectId: topic.projectId, kind: topic.kind, topicId: topic.topicId }];
  });
}

async function refreshAffectedTopics(topics: AffectedTopic[]): Promise<void> {
  const groups = new Map<string, { projectId: string; kind: string; topicIds: string[] }>();
  for (const topic of topics) {
    const key = `${topic.projectId}:${topic.kind}`;
    const group = groups.get(key) ?? {
      projectId: topic.projectId,
      kind: topic.kind,
      topicIds: [],
    };
    group.topicIds.push(topic.topicId);
    groups.set(key, group);
  }

  await Promise.all(
    [...groups.values()].map((group) =>
      isTopicStageKind(group.kind)
        ? refreshTopicStats({
            projectId: group.projectId,
            kind: group.kind,
            topicIds: group.topicIds,
          })
        : recountTopics(group.topicIds),
    ),
  );
}

/** Kinds the topic stage does not own still need a live mention count. */
async function recountTopics(topicIds: string[]): Promise<void> {
  if (topicIds.length === 0) return;
  await db.execute(sql`
    update topics t
    set mention_count = coalesce(s.mentions, 0),
        updated_at = now()
    from (select unnest(${uuidArray(topicIds)}) as id) picked
    left join (
      select mt.topic_id, (count(*) filter (where m.is_relevant))::int as mentions
      from mention_topics mt
      inner join mentions m on m.id = mt.mention_id
      where mt.topic_id = any(${uuidArray(topicIds)})
      group by mt.topic_id
    ) s on s.topic_id = picked.id
    where t.id = picked.id
  `);
}

import { and, asc, eq, sql, type SQL } from "drizzle-orm";

import { alertRules, alerts, projectAspects, projectEntities, projects } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import {
  effectiveSentimentJoins,
  effectiveSentimentSql,
} from "@/lib/enrichment/utils/effective-sentiment-sql";
import { engagementSql } from "@/lib/metrics/utils/engagement-sql";
import type { AlertRuleKind } from "@/lib/projects/alert-templates";
import { listeningProjectFilter } from "@/lib/projects/utils/listening-project-filter";

import { VIRAL_LOOKBACK_MS, VIRAL_POST_LIMIT, alertLevelForKind } from "../config";
import type { AlertHit, AlertPayload, EvaluateAlertsParams, EvaluateAlertsResult } from "../types";
import { alertBucket, alertWindowRange, safeTimeZone } from "../utils/alert-bucket";
import { alertRecipients, wantsAlertEmail } from "../utils/alert-delivery";
import { alertScopeTargets, type AlertScopeTarget } from "../utils/alert-scope";
import { countFires, deviationFires, growthFires, shareFires } from "../utils/decide-alert";
import {
  keywordAlertCopy,
  negativeShareAlertCopy,
  priceAlertCopy,
  questionAlertCopy,
  viralAlertCopy,
  volumeAlertCopy,
} from "../utils/format-alert-copy";
import { parseStoredAlertRule, type StoredAlertRule } from "../utils/parse-stored-alert-rule";
import { sendAlertEmail } from "./send-alert-email";

type ProjectRow = {
  id: string;
  name: string;
  timezone: string;
  notificationConfig: {
    channels?: string[];
    recipients?: string[];
    reportSchedule?: string;
  };
  caseConfig: Record<string, unknown>;
};

type CountRow = {
  current_count: number | string | null;
  previous_count: number | string | null;
  negative: number | string | null;
  classified: number | string | null;
  mention_ids: unknown;
};

type Draft = {
  dedupeKey: string;
  bucket: string;
  windowStart: Date;
  title: string;
  body: string;
  mentionIds: string[];
  payload: AlertPayload;
};

/**
 * Evaluate enabled alert rules. Reads mentions directly. Email is the only channel that sends;
 * a firing is still stored when email is off, unconfigured, or rejected.
 */
export async function evaluateAlerts(params: EvaluateAlertsParams): Promise<EvaluateAlertsResult> {
  const now = params.now ?? new Date();
  const projectRows = await loadProjects(params.projectId);
  const hits: AlertHit[] = [];
  let created = 0;
  let emailed = 0;
  let emailFailed = 0;

  for (const project of projectRows) {
    const projectHits = await evaluateProject(project, params.dryRun, now);
    for (const hit of projectHits) {
      hits.push(hit.hit);
      if (hit.created) created += 1;
      if (hit.hit.outcome === "emailed") emailed += 1;
      if (hit.hit.outcome === "email_failed") emailFailed += 1;
    }
  }

  return { projects: projectRows.length, created, emailed, emailFailed, hits };
}

async function loadProjects(projectId: string | undefined): Promise<ProjectRow[]> {
  const columns = {
    id: projects.id,
    name: projects.name,
    timezone: projects.timezone,
    notificationConfig: projects.notificationConfig,
    caseConfig: projects.caseConfig,
  };
  if (!projectId) return db.select(columns).from(projects).where(listeningProjectFilter);
  const rows = await db.select(columns).from(projects).where(eq(projects.id, projectId));
  if (!rows[0]) throw new NotFoundError("projects", projectId);
  return rows;
}

async function evaluateProject(project: ProjectRow, dryRun: boolean, now: Date) {
  const [rules, entities, aspects] = await Promise.all([
    db
      .select()
      .from(alertRules)
      .where(and(eq(alertRules.projectId, project.id), eq(alertRules.enabled, true)))
      .orderBy(asc(alertRules.sortOrder)),
    db
      .select({ id: projectEntities.id, name: projectEntities.name, role: projectEntities.role })
      .from(projectEntities)
      .where(eq(projectEntities.projectId, project.id)),
    db
      .select({ id: projectAspects.id, name: projectAspects.name })
      .from(projectAspects)
      .where(eq(projectAspects.projectId, project.id)),
  ]);
  const recorded: { hit: AlertHit; created: boolean }[] = [];
  const recipients = alertRecipients(project.notificationConfig.recipients);
  const priceRef = priceRefOf(project.caseConfig);

  for (const rule of rules) {
    const parsed = parseStoredAlertRule(rule.kind, rule.params);
    if (!parsed) continue;
    const wantsEmail = wantsAlertEmail(rule.channels, project.notificationConfig.channels);
    for (const target of alertScopeTargets(parsed.scope, entities, aspects)) {
      const drafts = await draftsFor(project, parsed, target, priceRef, now);
      for (const draft of drafts) {
        const saved = await recordAlert({
          project,
          ruleId: rule.id,
          kind: parsed.kind,
          draft,
          wantsEmail,
          recipients,
          dryRun,
          now,
        });
        if (saved) recorded.push(saved);
      }
    }
  }

  return recorded;
}

async function draftsFor(
  project: ProjectRow,
  rule: StoredAlertRule,
  target: AlertScopeTarget,
  priceRef: number | null,
  now: Date,
): Promise<Draft[]> {
  if (rule.kind === "viral_post") return viralDrafts(project.id, rule, target, now);
  if (rule.kind === "price_deviation") {
    return priceDrafts(project.id, rule, target, priceRef, now, project.timezone);
  }
  if (!rule.window) return [];
  if (rule.kind === "keyword_hit" && rule.keywords.length === 0) return [];

  const range = alertWindowRange(rule.window, now);
  const counts = rule.kind === "buyer_questions_growth"
    ? await countQuestions(project.id, target, range)
    : await countMentions(
        project.id,
        target,
        range,
        rule.kind === "keyword_hit" ? rule.keywords : [],
      );
  const bucket = alertBucket(rule.window, now, project.timezone);
  const base = {
    dedupeKey: target.dedupeKey,
    bucket,
    windowStart: range.start,
    mentionIds: asIds(counts.mention_ids),
  };

  if (rule.kind === "volume_growth" || rule.kind === "buyer_questions_growth") {
    const decision = growthFires({
      current: counts.current,
      previous: counts.previous,
      threshold: rule.threshold,
      minMentions: rule.minMentions,
    });
    if (!decision.fires || decision.growth == null) return [];
    const copy = rule.kind === "volume_growth"
      ? volumeAlertCopy({
          scopeLabel: target.label,
          window: rule.window,
          current: counts.current,
          growth: decision.growth,
          threshold: rule.threshold,
        })
      : questionAlertCopy({
          scopeLabel: target.label,
          window: rule.window,
          current: counts.current,
          growth: decision.growth,
          threshold: rule.threshold,
        });
    return [{
      ...base,
      ...copy,
      payload: payload(rule, target, {
        current: counts.current,
        previous: counts.previous,
        growth: decision.growth,
      }),
    }];
  }

  if (rule.kind === "negative_share") {
    const decision = shareFires({
      part: counts.negative,
      total: counts.classified,
      threshold: rule.threshold,
      minMentions: rule.minMentions,
    });
    if (!decision.fires || decision.share == null) return [];
    return [{
      ...base,
      ...negativeShareAlertCopy({
        scopeLabel: target.label,
        window: rule.window,
        share: decision.share,
        classified: counts.classified,
        threshold: rule.threshold,
      }),
      payload: payload(rule, target, { share: decision.share, current: counts.classified }),
    }];
  }

  if (rule.kind !== "keyword_hit") return [];
  if (!countFires(counts.current, rule.threshold)) return [];
  return [{
    ...base,
    ...keywordAlertCopy({
      scopeLabel: target.label,
      window: rule.window,
      count: counts.current,
      keywords: rule.keywords,
      threshold: rule.threshold,
    }),
    payload: payload(rule, target, { current: counts.current, keywords: rule.keywords }),
  }];
}

async function viralDrafts(
  projectId: string,
  rule: StoredAlertRule,
  target: AlertScopeTarget,
  now: Date,
): Promise<Draft[]> {
  const start = new Date(now.getTime() - VIRAL_LOOKBACK_MS);
  const { rows } = await db.execute<{
    mention_id: string;
    content_item_id: string;
    engagement: number | string;
    excerpt: string | null;
  }>(sql`
    select m.id::text as mention_id, ci.id::text as content_item_id,
      ${engagementSql(sql`ci`)}::int as engagement,
      left(regexp_replace(ci.text, '[[:space:]]+', ' ', 'g'), 160) as excerpt
    from mentions m
    join content_items ci on ci.id = m.content_item_id
    where m.project_id = ${projectId}::uuid
      and m.is_relevant
      and m.kind = 'post'
      and m.published_at >= ${start.toISOString()}::timestamptz
      and m.published_at < ${now.toISOString()}::timestamptz
      and ${scopeFilter(target)}
      and ${engagementSql(sql`ci`)} >= ${rule.threshold}
    order by engagement desc
    limit ${VIRAL_POST_LIMIT}
  `);

  return rows.map((row) => {
    const engagement = asNumber(row.engagement);
    const excerpt = (row.excerpt ?? "").trim();
    return {
      dedupeKey: `${target.dedupeKey}:${row.content_item_id}`,
      bucket: "once",
      windowStart: start,
      mentionIds: [row.mention_id],
      ...viralAlertCopy({
        scopeLabel: target.label,
        engagement,
        threshold: rule.threshold,
        excerpt,
      }),
      payload: payload(rule, target, { engagement, current: engagement }),
    };
  });
}

async function priceDrafts(
  projectId: string,
  rule: StoredAlertRule,
  target: AlertScopeTarget,
  priceRef: number | null,
  now: Date,
  timeZone: string,
): Promise<Draft[]> {
  if (priceRef == null || !rule.window) return [];
  const range = alertWindowRange(rule.window, now);
  const { rows } = await db.execute<{
    mention_id: string;
    amount: number | string;
  }>(sql`
    select m.id::text as mention_id, (x.data->>'amount')::double precision as amount
    from mention_extractions x
    join mentions m on m.id = x.mention_id
    where m.project_id = ${projectId}::uuid
      and m.is_relevant
      and x.schema_key = 'price_quote'
      and x.data->>'unit' = 'trieu_m2'
      and x.data->>'kind' = 'rao_ban'
      and jsonb_typeof(x.data->'amount') = 'number'
      and m.published_at >= ${range.start.toISOString()}::timestamptz
      and m.published_at < ${range.end.toISOString()}::timestamptz
      and ${scopeFilter(target)}
  `);

  const deviant = rows
    .map((row) => ({
      mentionId: row.mention_id,
      amount: asNumber(row.amount),
      ...deviationFires(asNumber(row.amount), priceRef, rule.threshold),
    }))
    .filter((row) => row.fires && row.deviation != null)
    .sort((a, b) => (b.deviation ?? 0) - (a.deviation ?? 0));
  const worst = deviant[0];
  if (!worst || worst.deviation == null) return [];

  return [{
    dedupeKey: target.dedupeKey,
    bucket: alertBucket(rule.window, now, timeZone),
    windowStart: range.start,
    mentionIds: deviant.slice(0, 8).map((row) => row.mentionId),
    ...priceAlertCopy({
      scopeLabel: target.label,
      amount: worst.amount,
      deviation: worst.deviation,
      priceRef,
      threshold: rule.threshold,
      quoteCount: deviant.length,
    }),
    payload: payload(rule, target, {
      amount: worst.amount,
      deviation: worst.deviation,
      priceRef,
      quoteCount: deviant.length,
    }),
  }];
}

async function countMentions(
  projectId: string,
  target: AlertScopeTarget,
  range: { start: Date; end: Date; previousStart: Date },
  keywords: string[],
) {
  const keyword = keywords.length ? sql`and ${keywordFilter(keywords)}` : sql``;
  const { rows } = await db.execute<CountRow>(sql`
    select
      (count(*) filter (where m.published_at >= ${range.start.toISOString()}::timestamptz))::int as current_count,
      (count(*) filter (where m.published_at < ${range.start.toISOString()}::timestamptz))::int as previous_count,
      (count(*) filter (
        where m.published_at >= ${range.start.toISOString()}::timestamptz
          and ${effectiveSentimentSql} = 'negative'
      ))::int as negative,
      (count(*) filter (
        where m.published_at >= ${range.start.toISOString()}::timestamptz
          and ${effectiveSentimentSql} is not null
      ))::int as classified,
      (array_agg(m.id::text order by m.published_at desc nulls last)
        filter (where m.published_at >= ${range.start.toISOString()}::timestamptz))[1:8] as mention_ids
    from mentions m
    join content_items ci on ci.id = m.content_item_id
    ${effectiveSentimentJoins}
    where m.project_id = ${projectId}::uuid
      and m.is_relevant
      and m.published_at >= ${range.previousStart.toISOString()}::timestamptz
      and m.published_at < ${range.end.toISOString()}::timestamptz
      and ${scopeFilter(target)}
      ${keyword}
  `);
  return readCounts(rows[0]);
}

async function countQuestions(
  projectId: string,
  target: AlertScopeTarget,
  range: { start: Date; end: Date; previousStart: Date },
) {
  const { rows } = await db.execute<CountRow>(sql`
    select
      (count(*) filter (where m.published_at >= ${range.start.toISOString()}::timestamptz))::int as current_count,
      (count(*) filter (where m.published_at < ${range.start.toISOString()}::timestamptz))::int as previous_count,
      0::int as negative,
      0::int as classified,
      (array_agg(m.id::text order by m.published_at desc nulls last)
        filter (where m.published_at >= ${range.start.toISOString()}::timestamptz))[1:8] as mention_ids
    from mention_extractions x
    join mentions m on m.id = x.mention_id
    where m.project_id = ${projectId}::uuid
      and m.is_relevant
      and x.schema_key = 'buyer_question'
      and m.published_at >= ${range.previousStart.toISOString()}::timestamptz
      and m.published_at < ${range.end.toISOString()}::timestamptz
      and ${scopeFilter(target)}
  `);
  return readCounts(rows[0]);
}

function scopeFilter(target: AlertScopeTarget): SQL {
  if (target.entityId) {
    return sql`exists (
      select 1 from mention_entities me
      where me.mention_id = m.id and me.entity_id = ${target.entityId}::uuid
    )`;
  }
  if (target.aspectId) {
    return sql`(
      exists (
        select 1 from item_labels il
        join project_aspects pa on pa.id = ${target.aspectId}::uuid
        where il.project_id = m.project_id
          and il.content_item_id = m.content_item_id
          and il.aspect_keys is not null
          and il.aspect_keys @> jsonb_build_array(pa.key)
      )
      or (
        not exists (
          select 1 from item_labels il
          where il.project_id = m.project_id
            and il.content_item_id = m.content_item_id
            and il.aspect_keys is not null
        )
        and exists (
          select 1 from mention_aspects ma
          where ma.mention_id = m.id and ma.aspect_id = ${target.aspectId}::uuid
        )
      )
    )`;
  }
  return sql`true`;
}

function keywordFilter(keywords: string[]): SQL {
  const clauses = keywords.map(
    (keyword) => sql`strpos(lower(ci.text), lower(${keyword})) > 0`,
  );
  return sql`(${sql.join(clauses, sql` or `)})`;
}

async function recordAlert(input: {
  project: ProjectRow;
  ruleId: string;
  kind: AlertRuleKind;
  draft: Draft;
  wantsEmail: boolean;
  recipients: string[];
  dryRun: boolean;
  now: Date;
}): Promise<{ hit: AlertHit; created: boolean } | null> {
  const existing = await findAlert(input.ruleId, input.draft.dedupeKey, input.draft.bucket);
  if (existing) {
    if (input.dryRun || !input.wantsEmail || existing.status !== "open") return null;
    await db
      .update(alerts)
      .set({
        title: input.draft.title,
        body: input.draft.body,
        payload: input.draft.payload as Record<string, unknown>,
        mentionIds: input.draft.mentionIds,
      })
      .where(eq(alerts.id, existing.id));
    const delivery = await deliver(existing.id, input);
    return { hit: toHit(input, delivery), created: false };
  }
  if (input.dryRun) return { hit: toHit(input, { outcome: "dry_run", emailError: null }), created: false };

  const inserted = await db
    .insert(alerts)
    .values({
      projectId: input.project.id,
      ruleId: input.ruleId,
      kind: input.kind,
      level: alertLevelForKind(input.kind),
      title: input.draft.title,
      body: input.draft.body,
      status: "open",
      payload: input.draft.payload as Record<string, unknown>,
      mentionIds: input.draft.mentionIds,
      dedupeKey: input.draft.dedupeKey,
      bucket: input.draft.bucket,
      windowStart: input.draft.windowStart,
      triggeredAt: input.now,
    })
    .onConflictDoNothing({ target: [alerts.ruleId, alerts.dedupeKey, alerts.bucket] })
    .returning({ id: alerts.id });
  const row = inserted[0];
  if (!row) return null;
  const delivery = await deliver(row.id, input);
  return { hit: toHit(input, delivery), created: true };
}

async function findAlert(ruleId: string, dedupeKey: string, bucket: string) {
  const [row] = await db
    .select({ id: alerts.id, status: alerts.status })
    .from(alerts)
    .where(and(eq(alerts.ruleId, ruleId), eq(alerts.dedupeKey, dedupeKey), eq(alerts.bucket, bucket)))
    .limit(1);
  return row ?? null;
}

async function deliver(
  alertId: string,
  input: {
    project: ProjectRow;
    draft: Draft;
    wantsEmail: boolean;
    recipients: string[];
    now: Date;
  },
): Promise<{ outcome: AlertHit["outcome"]; emailError: string | null }> {
  if (!input.wantsEmail) return { outcome: "recorded", emailError: null };
  if (input.recipients.length === 0) {
    const emailError = "Chưa có email nhận cảnh báo.";
    await db.update(alerts).set({ status: "email_failed", emailError }).where(eq(alerts.id, alertId));
    return { outcome: "email_failed", emailError };
  }

  const zone = safeTimeZone(input.project.timezone);
  const when = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: zone,
  }).format(input.now);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const text = [
    input.draft.body,
    "",
    `Dự án: ${input.project.name}`,
    `Thời điểm: ${when}`,
    appUrl ? `Mở ứng dụng: ${appUrl}` : "",
  ]
    .filter((line) => line !== "")
    .join("\n");

  try {
    await sendAlertEmail({
      to: input.recipients,
      subject: `[BNB Listening] ${input.project.name}: ${input.draft.title}`.slice(0, 180),
      text,
    });
    await db
      .update(alerts)
      .set({ status: "emailed", emailedAt: new Date(), emailError: null })
      .where(eq(alerts.id, alertId));
    return { outcome: "emailed", emailError: null };
  } catch (error) {
    const emailError = (error instanceof Error ? error.message : "Gửi email thất bại.").slice(0, 500);
    await db.update(alerts).set({ status: "email_failed", emailError }).where(eq(alerts.id, alertId));
    return { outcome: "email_failed", emailError };
  }
}

function toHit(
  input: { project: ProjectRow; draft: Draft },
  delivery: { outcome: AlertHit["outcome"]; emailError: string | null },
): AlertHit {
  return {
    projectName: input.project.name,
    title: input.draft.title,
    body: input.draft.body,
    outcome: delivery.outcome,
    emailError: delivery.emailError,
  };
}

function payload(
  rule: StoredAlertRule,
  target: AlertScopeTarget,
  extra: Omit<AlertPayload, "scopeLabel" | "threshold" | "window">,
): AlertPayload {
  return {
    scopeLabel: target.label,
    threshold: rule.threshold,
    window: rule.window,
    ...extra,
  };
}

function priceRefOf(caseConfig: Record<string, unknown>) {
  const value = caseConfig.priceRef;
  return typeof value === "number" && value > 0 ? value : null;
}

function readCounts(row: CountRow | undefined) {
  return {
    current: asNumber(row?.current_count),
    previous: asNumber(row?.previous_count),
    negative: asNumber(row?.negative),
    classified: asNumber(row?.classified),
    mention_ids: row?.mention_ids,
  };
}

function asNumber(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function asIds(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  if (typeof value === "string" && value.startsWith("{") && value.endsWith("}")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((item) => item.replaceAll('"', "").trim())
      .filter(Boolean);
  }
  return [];
}

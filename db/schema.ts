import { sql } from "drizzle-orm";
import {
  pgVector1024,
  pgVector1536,
  tsvector,
} from "@/db/pgvector";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    firebaseUid: text("firebase_uid").notNull().unique(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    name: text("name").notNull(),
    slug: text("slug"),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dataCollectionScope: text("data_collection_scope")
      .notNull()
      .default("tin tức và dữ liệu về bất động sản"),
    autoCreateTopics: boolean("auto_create_topics").notNull().default(true),
    topicLanguage: text("topic_language").notNull().default("auto"),
    topicCriteria: text("topic_criteria").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("workspaces_slug_idx").on(table.slug),
    index("workspaces_owner_user_id_idx").on(table.ownerUserId),
  ],
);

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permission: text("permission").notNull(),
    grantedBy: uuid("granted_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index("workspace_members_user_id_idx").on(table.userId),
  ],
);

export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    jobType: text("job_type").notNull(),
    cronConfig: jsonb("cron_config")
      .$type<{ cron: string; timezone: string }>()
      .notNull()
      .default({ cron: "", timezone: "UTC" }),
    enabled: boolean("enabled").notNull().default(true),
    params: jsonb("params")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_jobs_workspace_name").on(table.workspaceId, table.name),
    index("idx_jobs_workspace_id").on(table.workspaceId),
    index("idx_jobs_enabled").on(table.enabled),
    index("idx_jobs_job_type").on(table.jobType),
  ],
);

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

export const jobRuns = pgTable(
  "job_runs",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("running"),
    runType: text("run_type").notNull(),
    result: jsonb("result").$type<Record<string, unknown>>(),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_job_runs_job_id").on(table.jobId),
    index("idx_job_runs_started_at").on(table.startedAt.desc()),
    index("idx_job_runs_status").on(table.status),
    index("idx_job_runs_job_started").on(table.jobId, table.startedAt.desc()),
    index("idx_job_runs_run_type").on(table.runType),
  ],
);

export type JobRun = typeof jobRuns.$inferSelect;
export type NewJobRun = typeof jobRuns.$inferInsert;

export const systemSchedules = pgTable(
  "system_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    scheduleId: text("schedule_id").notNull(),
    jobName: text("job_name").notNull(),
    cronConfig: jsonb("cron_config")
      .$type<{ cron: string; timezone: string }>()
      .notNull()
      .default({ cron: "", timezone: "UTC" }),
    description: text("description"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_system_schedules_schedule_id").on(table.scheduleId),
    uniqueIndex("idx_system_schedules_job_name").on(table.jobName),
    index("idx_system_schedules_enabled").on(table.enabled),
  ],
);

export type SystemSchedule = typeof systemSchedules.$inferSelect;
export type NewSystemSchedule = typeof systemSchedules.$inferInsert;

export const systemScheduleRuns = pgTable(
  "system_schedule_runs",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    systemScheduleId: uuid("system_schedule_id")
      .notNull()
      .references(() => systemSchedules.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("running"),
    trigger: text("trigger").notNull().default("scheduled"),
    result: jsonb("result").$type<Record<string, unknown>>(),
    error: text("error"),
    qstashMessageId: text("qstash_message_id"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_system_schedule_runs_schedule_started").on(
      table.systemScheduleId,
      table.startedAt.desc(),
    ),
    index("idx_system_schedule_runs_started_at").on(table.startedAt.desc()),
    index("idx_system_schedule_runs_status").on(table.status),
    index("idx_system_schedule_runs_workspace_id").on(table.workspaceId),
  ],
);

export type SystemScheduleRun = typeof systemScheduleRuns.$inferSelect;
export type NewSystemScheduleRun = typeof systemScheduleRuns.$inferInsert;

export const workspaceTaskRuns = pgTable(
  "workspace_task_runs",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    taskType: text("task_type").notNull(),
    status: text("status").notNull().default("pending"),
    params: jsonb("params")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    result: jsonb("result").$type<Record<string, unknown>>(),
    error: text("error"),
    triggeredBy: uuid("triggered_by").references(() => users.id, {
      onDelete: "set null",
    }),
    trigger: text("trigger").notNull().default("manual"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_workspace_task_runs_workspace_started").on(
      table.workspaceId,
      table.startedAt.desc(),
    ),
    index("idx_workspace_task_runs_workspace_status").on(
      table.workspaceId,
      table.status,
    ),
    index("idx_workspace_task_runs_task_type_started").on(
      table.taskType,
      table.startedAt.desc(),
    ),
  ],
);

export type WorkspaceTaskRun = typeof workspaceTaskRuns.$inferSelect;
export type NewWorkspaceTaskRun = typeof workspaceTaskRuns.$inferInsert;

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    docType: text("doc_type").notNull(),
    sourceKey: text("source_key").notNull(),
    sourceName: text("source_name").notNull(),
    sourceId: text("source_id").notNull(),
    title: text("title"),
    rawContent: text("raw_content").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    embeddingStatus: text("embedding_status").notNull().default("pending"),
    qualityScore: real("quality_score"),
    /**
     * Platform-neutral engagement counters, refreshed on every upsert without
     * re-embedding. Facebook reactions, TikTok collects, X bookmarks and other
     * platform-specific counters stay in `metadata`.
     */
    likeCount: integer("like_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    shareCount: integer("share_count").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),
    /**
     * Comment-signal tallies from the `comments` table. Updated by
     * score-document-comments after batch LLM scoring — never triggers a re-embed.
     *
     * Role tallies count every scored comment. Stance tallies only count
     * comments with role = `debate`. A post is "debated" when both
     * agree_count and disagree_count are > 0.
     */
    debateCount: integer("debate_count").notNull().default(0),
    answerCount: integer("answer_count").notNull().default(0),
    infoCount: integer("info_count").notNull().default(0),
    agreeCount: integer("agree_count").notNull().default(0),
    disagreeCount: integer("disagree_count").notNull().default(0),
    neutralCount: integer("neutral_count").notNull().default(0),
    jobRunId: uuid("job_run_id").references(() => jobRuns.id, {
      onDelete: "set null",
    }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_documents_workspace_source").on(
      table.workspaceId,
      table.docType,
      table.sourceKey,
      table.sourceId,
    ),
    index("idx_documents_workspace_id").on(table.workspaceId),
    index("idx_documents_doc_type").on(table.docType),
    index("idx_documents_source_key").on(table.docType, table.sourceKey),
    index("idx_documents_published_at").on(table.publishedAt.desc()),
    index("idx_documents_created_at").on(table.createdAt.desc()),
    index("idx_documents_metadata").using(
      "gin",
      sql`${table.metadata} jsonb_path_ops`,
    ),
    index("idx_documents_status")
      .on(table.embeddingStatus)
      .where(sql`${table.embeddingStatus} <> 'chunked'`),
    index("idx_documents_quality_score").on(table.qualityScore),
    index("idx_documents_job_run_id").on(table.jobRunId),
    index("idx_documents_job_id").on(table.jobId),
    index("idx_documents_workspace_job").on(table.workspaceId, table.jobId),
    index("idx_documents_backfill_scan")
      .on(table.workspaceId, table.publishedAt, table.id)
      .where(sql`${table.publishedAt} IS NOT NULL`),
    index("idx_documents_engagement").on(
      table.workspaceId,
      table.likeCount.desc(),
    ),
    index("idx_documents_debate").on(
      table.workspaceId,
      table.disagreeCount.desc(),
      table.agreeCount.desc(),
    ),
  ],
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

/**
 * Social-media comments on a parent post (`documents` with doc_type = post).
 *
 * Kept out of the document pipeline on purpose: short comments must not run
 * through per-row score / classify / embed. Stance is scored in batches by
 * score-document-comments; substantive comments are later rolled into a
 * companion `discussion` document for retrieval.
 */
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    /** Platform comment id — unique per parent document. */
    sourceId: text("source_id").notNull(),
    authorName: text("author_name"),
    authorId: text("author_id"),
    content: text("content").notNull(),
    likeCount: integer("like_count").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /**
     * Communicative role of the comment. Null until scored.
     * Values: `debate` | `answer` | `info` | `other`.
     */
    role: text("role"),
    /**
     * Relative to the parent post. Only meaningful when role = `debate`;
     * null for other roles and until scored.
     * Values: `agree` | `disagree` | `neutral`.
     */
    stance: text("stance"),
    /**
     * True when the comment carries content worth retrieving (argument,
     * answer, or useful information). False for noise. Null until scored.
     */
    isSubstantive: boolean("is_substantive"),
    scoredAt: timestamp("scored_at", { withTimezone: true }),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_comments_document_source").on(
      table.documentId,
      table.sourceId,
    ),
    index("idx_comments_workspace_id").on(table.workspaceId),
    index("idx_comments_document_id").on(table.documentId),
    index("idx_comments_role").on(table.documentId, table.role),
    index("idx_comments_stance").on(table.documentId, table.stance),
    index("idx_comments_unscored")
      .on(table.documentId)
      .where(sql`${table.scoredAt} IS NULL`),
  ],
);

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    embedding: pgVector1536("embedding").notNull(),
    docType: text("doc_type").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    contentTsv: tsvector("content_tsv").generatedAlwaysAs(
      (): ReturnType<typeof sql> => sql`to_tsvector('simple', content)`,
    ),
    embeddingModel: text("embedding_model")
      .notNull()
      .default("text-embedding-3-small"),
    embeddingVersion: text("embedding_version").notNull().default("v1"),
    contentType: text("content_type").notNull().default("text"),
    mediaUrl: text("media_url"),
    mediaMetadata: jsonb("media_metadata").$type<Record<string, unknown>>(),
    embeddingMultimodal: pgVector1024("embedding_multimodal"),
    topicIds: uuid("topic_ids").array().default([]),
    qualityScore: real("quality_score"),
    /** Denormalized from documents by trg_sync_chunk_engagement — filter/sort without a join. */
    likeCount: integer("like_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    shareCount: integer("share_count").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_chunks_embedding_hnsw")
      .using("hnsw", table.embedding.op("vector_cosine_ops"))
      .with({ m: 16, ef_construction: 64 }),
    index("idx_chunks_embedding_mm_hnsw")
      .using("hnsw", table.embeddingMultimodal.op("vector_cosine_ops"))
      .with({ m: 16, ef_construction: 64 })
      .where(sql`${table.embeddingMultimodal} IS NOT NULL`),
    index("idx_chunks_content_tsv").using("gin", table.contentTsv),
    index("idx_chunks_topic_ids").using("gin", table.topicIds),
    index("idx_chunks_doc_type").on(table.docType),
    index("idx_chunks_content_type").on(table.contentType),
    index("idx_chunks_published_at").on(table.publishedAt.desc()),
    index("idx_chunks_metadata").using(
      "gin",
      sql`${table.metadata} jsonb_path_ops`,
    ),
    index("idx_chunks_document_id").on(table.documentId),
    index("idx_chunks_type_recency").on(
      table.docType,
      table.publishedAt.desc(),
    ),
    index("idx_chunks_quality_score").on(table.qualityScore),
    index("idx_chunks_like_count").on(table.likeCount.desc()),
  ],
);

export type Chunk = typeof chunks.$inferSelect;
export type NewChunk = typeof chunks.$inferInsert;

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdBy: text("created_by").notNull().default("admin"),
    sourceDocumentId: uuid("source_document_id").references(
      () => documents.id,
      { onDelete: "set null" },
    ),
    listeningStartedAt: timestamp("listening_started_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    activeBackfillRunId: uuid("active_backfill_run_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_topics_workspace_name").on(table.workspaceId, table.name),
    index("idx_topics_workspace_id").on(table.workspaceId),
    index("idx_topics_source_document").on(table.sourceDocumentId),
    index("idx_topics_active_backfill_run").on(table.activeBackfillRunId),
  ],
);

export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;

export const documentTopics = pgTable(
  "document_topics",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    confidence: real("confidence").notNull().default(1),
    assignedBy: text("assigned_by").notNull().default("llm_classifier"),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.documentId, table.topicId] }),
    index("idx_document_topics_topic").on(table.topicId),
    index("idx_document_topics_document").on(table.documentId),
  ],
);

export type DocumentTopic = typeof documentTopics.$inferSelect;
export type NewDocumentTopic = typeof documentTopics.$inferInsert;

export const topicBackfillRuns = pgTable(
  "topic_backfill_runs",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    newListeningStartedAt: timestamp("new_listening_started_at", {
      withTimezone: true,
    }).notNull(),
    scanEndAt: timestamp("scan_end_at", { withTimezone: true }).notNull(),
    model: text("model").notNull(),
    qualityMin: real("quality_min").notNull(),
    includeAlreadyAssigned: boolean("include_already_assigned")
      .notNull()
      .default(false),
    confidenceMin: real("confidence_min").notNull(),
    estimate: jsonb("estimate")
      .$type<{
        documentCount: number;
        inputTokens: number;
        outputTokens: number;
        costUsd: number;
      }>()
      .notNull(),
    result: jsonb("result")
      .$type<{
        documentsScanned: number;
        documentsMatched: number;
        documentsSkipped: number;
        inputTokens: number;
        outputTokens: number;
        costUsd: number;
        cursor: { publishedAt: string; documentId: string } | null;
        cancelledAt?: string;
      }>()
      .notNull()
      .default({
        documentsScanned: 0,
        documentsMatched: 0,
        documentsSkipped: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        cursor: null,
      }),
    error: text("error"),
    triggeredBy: uuid("triggered_by").references(() => users.id, {
      onDelete: "set null",
    }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_topic_backfill_runs_topic_started").on(
      table.topicId,
      table.startedAt.desc(),
    ),
    index("idx_topic_backfill_runs_workspace_started").on(
      table.workspaceId,
      table.startedAt.desc(),
    ),
    uniqueIndex("idx_topic_backfill_one_active")
      .on(table.topicId)
      .where(sql`${table.status} IN ('pending', 'running')`),
  ],
);

export type TopicBackfillRun = typeof topicBackfillRuns.$inferSelect;
export type NewTopicBackfillRun = typeof topicBackfillRuns.$inferInsert;

// ---------------------------------------------------------------------------
// Date dimension — static calendar table, seeded once for ~10–20 years.
// Pre-computes week_start / month_start / quarter_start / year_start so
// rollup GROUP BY never needs runtime date_trunc calls.
// ---------------------------------------------------------------------------

export const dimDates = pgTable("dim_dates", {
  dateKey: date("date_key").primaryKey().notNull(),
  year: integer("year").notNull(),
  quarter: integer("quarter").notNull(),       // 1–4
  month: integer("month").notNull(),           // 1–12
  week: integer("week").notNull(),             // ISO week 1–53
  dayOfWeek: integer("day_of_week").notNull(), // 1=Mon … 7=Sun
  dayOfYear: integer("day_of_year").notNull(), // 1–366
  isWeekend: boolean("is_weekend").notNull(),
  weekStart: date("week_start").notNull(),       // Monday of ISO week
  monthStart: date("month_start").notNull(),     // first day of month
  quarterStart: date("quarter_start").notNull(), // first day of quarter
  yearStart: date("year_start").notNull(),       // first day of year
});

export type DimDate = typeof dimDates.$inferSelect;
export type NewDimDate = typeof dimDates.$inferInsert;

// ---------------------------------------------------------------------------
// Daily fact table — one row per (topic, date).
// Source of truth for all digest metrics.
// Arbitrary-range queries (e.g. Aug 15 – Sep 30) run directly against this.
// ---------------------------------------------------------------------------

export const topicDigestDaily = pgTable(
  "topic_digest_daily",
  {
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    dateKey: date("date_key")
      .notNull()
      .references(() => dimDates.dateKey),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),

    // Metrics
    docCount: integer("doc_count").notNull().default(0),
    avgQualityScore: real("avg_quality_score"),
    trendScore: real("trend_score"), // doc_count × avg_quality × recency_weight(day)

    // Processing / cache state
    isStale: boolean("is_stale").notNull().default(true),
    // true when row was invalidated by a bulk taxonomy op (merge/split topics).
    // Normal recompute job skips these; a separate low-priority bulk drain job
    // processes them with a smaller LIMIT so burst traffic doesn't crowd out
    // day-to-day invalidations.
    isBulkStale: boolean("is_bulk_stale").notNull().default(false),
    /** Queue position for FIFO recompute; compared to processing_started_at at finalize. */
    staleSince: timestamp("stale_since", { withTimezone: true }),
    processing: boolean("processing").notNull().default(false),
    processingStartedAt: timestamp("processing_started_at", {
      withTimezone: true,
    }),
    computedAt: timestamp("computed_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.topicId, table.dateKey, table.jobId] }),
    // rolling-window topic cards + sparkline
    index("idx_topic_digest_daily_job_date").on(
      table.jobId,
      table.dateKey,
      table.topicId,
    ),
    // "all topics on a date" — used by ranking after daily recompute
    index("idx_topic_digest_daily_date").on(table.dateKey, table.topicId),
    // normal recompute job queue — excludes bulk-stale rows
    index("idx_topic_digest_daily_stale")
      .on(table.staleSince)
      .where(
        sql`${table.isStale} = true AND ${table.isBulkStale} = false AND ${table.processing} = false`,
      ),
    // bulk drain job queue — only rows flagged by taxonomy ops
    index("idx_topic_digest_daily_bulk_stale")
      .on(table.staleSince)
      .where(
        sql`${table.isStale} = true AND ${table.isBulkStale} = true AND ${table.processing} = false`,
      ),
  ],
);

export type TopicDigestDaily = typeof topicDigestDaily.$inferSelect;
export type NewTopicDigestDaily = typeof topicDigestDaily.$inferInsert;

export const workspaceApiKeys = pgTable(
  "workspace_api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    unkeyKeyId: text("unkey_key_id").notNull().unique(),
    name: text("name").notNull(),
    keyStart: text("key_start").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_workspace_api_keys_workspace_id").on(table.workspaceId),
    uniqueIndex("idx_workspace_api_keys_unkey_key_id").on(table.unkeyKeyId),
  ],
);

export type WorkspaceApiKey = typeof workspaceApiKeys.$inferSelect;
export type NewWorkspaceApiKey = typeof workspaceApiKeys.$inferInsert;

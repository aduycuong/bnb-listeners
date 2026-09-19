import { sql } from "drizzle-orm";
import {
  pgVector1024,
  pgVector1536,
  tsvector,
} from "@/db/pgvector";
import {
  type AnyPgColumn,
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
    autoCreateTerms: boolean("auto_create_terms").notNull().default(true),
    termLanguage: text("term_language").notNull().default("auto"),
    termCriteria: text("term_criteria").notNull().default(""),
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

export const dataSources = pgTable(
  "data_sources",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sourceType: text("source_type").notNull(),
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
    uniqueIndex("idx_data_sources_workspace_name").on(
      table.workspaceId,
      table.name,
    ),
    index("idx_data_sources_workspace_id").on(table.workspaceId),
    index("idx_data_sources_enabled").on(table.enabled),
    index("idx_data_sources_source_type").on(table.sourceType),
  ],
);

export type DataSource = typeof dataSources.$inferSelect;
export type NewDataSource = typeof dataSources.$inferInsert;

export const dataSourceGroups = pgTable(
  "data_source_groups",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_data_source_groups_workspace_name").on(
      table.workspaceId,
      table.name,
    ),
    index("idx_data_source_groups_workspace_id").on(table.workspaceId),
  ],
);

export type DataSourceGroup = typeof dataSourceGroups.$inferSelect;
export type NewDataSourceGroup = typeof dataSourceGroups.$inferInsert;

export const dataSourceGroupMembers = pgTable(
  "data_source_group_members",
  {
    dataSourceGroupId: uuid("data_source_group_id")
      .notNull()
      .references(() => dataSourceGroups.id, { onDelete: "cascade" }),
    dataSourceId: uuid("data_source_id")
      .notNull()
      .references(() => dataSources.id, { onDelete: "cascade" }),
    assignedBy: text("assigned_by").notNull().default("admin"),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.dataSourceGroupId, table.dataSourceId],
    }),
    index("idx_data_source_group_members_data_source").on(table.dataSourceId),
  ],
);

export type DataSourceGroupMember =
  typeof dataSourceGroupMembers.$inferSelect;
export type NewDataSourceGroupMember =
  typeof dataSourceGroupMembers.$inferInsert;

export const sourceRuns = pgTable(
  "source_runs",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    dataSourceId: uuid("data_source_id")
      .notNull()
      .references(() => dataSources.id, { onDelete: "cascade" }),
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
    index("idx_source_runs_data_source_id").on(table.dataSourceId),
    index("idx_source_runs_started_at").on(table.startedAt.desc()),
    index("idx_source_runs_status").on(table.status),
    index("idx_source_runs_data_source_started").on(
      table.dataSourceId,
      table.startedAt.desc(),
    ),
    index("idx_source_runs_run_type").on(table.runType),
  ],
);

export type SourceRun = typeof sourceRuns.$inferSelect;
export type NewSourceRun = typeof sourceRuns.$inferInsert;

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
    sourceOriginKey: text("source_origin_key").notNull(),
    sourceOriginName: text("source_origin_name").notNull(),
    sourceItemId: text("source_item_id").notNull(),
    /** Optional; social posts have none — the UI renders author + date instead. */
    title: text("title"),
    rawContent: text("raw_content").notNull(),
    /** Display name of the post author, mirrored from `metadata.authorName`. */
    authorName: text("author_name"),
    /**
     * For `discussion` documents: the post this discussion was built from.
     * Null for every other doc type. Deleting the parent removes the discussion.
     */
    parentDocumentId: uuid("parent_document_id").references(
      (): AnyPgColumn => documents.id,
      { onDelete: "cascade" },
    ),
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
    sourceRunId: uuid("source_run_id").references(() => sourceRuns.id, {
      onDelete: "set null",
    }),
    dataSourceId: uuid("data_source_id")
      .notNull()
      .references(() => dataSources.id, { onDelete: "cascade" }),
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
      table.sourceOriginKey,
      table.sourceItemId,
    ),
    index("idx_documents_workspace_id").on(table.workspaceId),
    index("idx_documents_doc_type").on(table.docType),
    index("idx_documents_source_origin_key").on(
      table.docType,
      table.sourceOriginKey,
    ),
    index("idx_documents_published_at").on(table.publishedAt.desc()),
    index("idx_documents_created_at").on(table.createdAt.desc()),
    index("idx_documents_workspace_created_at").on(
      table.workspaceId,
      table.createdAt.desc(),
    ),
    index("idx_documents_metadata").using(
      "gin",
      sql`${table.metadata} jsonb_path_ops`,
    ),
    index("idx_documents_status")
      .on(table.embeddingStatus)
      .where(sql`${table.embeddingStatus} <> 'chunked'`),
    index("idx_documents_quality_score").on(table.qualityScore),
    index("idx_documents_source_run_id").on(table.sourceRunId),
    index("idx_documents_parent_document_id").on(table.parentDocumentId),
    index("idx_documents_data_source_id").on(table.dataSourceId),
    index("idx_documents_workspace_data_source").on(
      table.workspaceId,
      table.dataSourceId,
    ),
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
    sourceItemId: text("source_item_id").notNull(),
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
    uniqueIndex("idx_comments_document_source_item").on(
      table.documentId,
      table.sourceItemId,
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

/**
 * Scorable units of a document: one text part (the whole body) plus one part
 * per image and video. Each part is scored independently by an LLM on
 * relevance and detail; only parts with both scores above the threshold become
 * chunks. Rebuilt (delete-then-insert) on every process-document run.
 */
export const documentParts = pgTable(
  "document_parts",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    partIndex: integer("part_index").notNull(),
    /** `text` | `image` | `video` */
    contentType: text("content_type").notNull(),
    /** Text body for text parts; original source URL for media parts. */
    value: text("value").notNull(),
    /** R2 object key after the media was archived. Media parts only. */
    storageKey: text("storage_key"),
    /** Stable public URL on R2 — what vision scoring and embedding actually read. */
    storageUrl: text("storage_url"),
    /** LLM scores normalised to [0, 1]. Null until scored. */
    relevanceScore: real("relevance_score"),
    detailScore: real("detail_score"),
    /** (relevance + detail) / 2 — denormalised for querying. */
    partScore: real("part_score"),
    /** LLM description of the information the part carries; media chunk content. */
    summary: text("summary"),
    /** True when both scores meet their thresholds. */
    isEligible: boolean("is_eligible").notNull().default(false),
    /** `llm` | `placeholder` | `failed` — how the score was produced. */
    scoreSource: text("score_source"),
    /** Failure reason when score_source = failed (download, vision, …). */
    scoreError: text("score_error"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    scoredAt: timestamp("scored_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_document_parts_document_index").on(
      table.documentId,
      table.partIndex,
    ),
    index("idx_document_parts_document_id").on(table.documentId),
    index("idx_document_parts_eligible").on(
      table.documentId,
      table.isEligible,
    ),
  ],
);

export type DocumentPart = typeof documentParts.$inferSelect;
export type NewDocumentPart = typeof documentParts.$inferInsert;

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    /** Part this chunk was built from. Null for chunks predating document_parts. */
    partId: uuid("part_id").references(() => documentParts.id, {
      onDelete: "set null",
    }),
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
    termIds: uuid("term_ids").array().default([]),
    /** Part score of the document_part this chunk came from. */
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
    index("idx_chunks_term_ids").using("gin", table.termIds),
    index("idx_chunks_doc_type").on(table.docType),
    index("idx_chunks_content_type").on(table.contentType),
    index("idx_chunks_published_at").on(table.publishedAt.desc()),
    index("idx_chunks_metadata").using(
      "gin",
      sql`${table.metadata} jsonb_path_ops`,
    ),
    index("idx_chunks_document_id").on(table.documentId),
    index("idx_chunks_part_id").on(table.partId),
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

export const terms = pgTable(
  "terms",
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
    searchTsv: tsvector("search_tsv").generatedAlwaysAs(
      (): ReturnType<typeof sql> =>
        sql`to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, ''))`,
    ),
    /**
     * Embedding of `name + description` used to match LLM-proposed terms
     * against existing ones during classification. Null until embedded
     * (backfill with `npm run terms:embed`).
     */
    embedding: pgVector1536("embedding"),
    embeddingModel: text("embedding_model"),
  },
  (table) => [
    uniqueIndex("idx_terms_workspace_name").on(table.workspaceId, table.name),
    index("idx_terms_workspace_id").on(table.workspaceId),
    index("idx_terms_source_document").on(table.sourceDocumentId),
    index("idx_terms_active_backfill_run").on(table.activeBackfillRunId),
    index("idx_terms_search_tsv").using("gin", table.searchTsv),
    index("idx_terms_embedding_hnsw")
      .using("hnsw", table.embedding.op("vector_cosine_ops"))
      .with({ m: 16, ef_construction: 64 })
      .where(sql`${table.embedding} IS NOT NULL`),
  ],
);

export type Term = typeof terms.$inferSelect;
export type NewTerm = typeof terms.$inferInsert;

export const termGroups = pgTable(
  "term_groups",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    activeMemberRebuildRunId: uuid("active_member_rebuild_run_id"),
  },
  (table) => [
    uniqueIndex("idx_term_groups_workspace_name").on(
      table.workspaceId,
      table.name,
    ),
    index("idx_term_groups_workspace_id").on(table.workspaceId),
    index("idx_term_groups_active_member_rebuild_run").on(
      table.activeMemberRebuildRunId,
    ),
  ],
);

export type TermGroup = typeof termGroups.$inferSelect;
export type NewTermGroup = typeof termGroups.$inferInsert;

export const termGroupMembers = pgTable(
  "term_group_members",
  {
    termGroupId: uuid("term_group_id")
      .notNull()
      .references(() => termGroups.id, { onDelete: "cascade" }),
    termId: uuid("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    assignedBy: text("assigned_by").notNull().default("admin"),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.termGroupId, table.termId] }),
    index("idx_term_group_members_term").on(table.termId),
  ],
);

export type TermGroupMember = typeof termGroupMembers.$inferSelect;
export type NewTermGroupMember = typeof termGroupMembers.$inferInsert;

export const documentTerms = pgTable(
  "document_terms",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    termId: uuid("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    confidence: real("confidence").notNull().default(1),
    assignedBy: text("assigned_by").notNull().default("llm_classifier"),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.documentId, table.termId] }),
    index("idx_document_terms_term").on(table.termId),
    index("idx_document_terms_document").on(table.documentId),
  ],
);

export type DocumentTerm = typeof documentTerms.$inferSelect;
export type NewDocumentTerm = typeof documentTerms.$inferInsert;

export const termBackfillRuns = pgTable(
  "term_backfill_runs",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    termId: uuid("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
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
        documentsUnmatched?: number;
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
        documentsUnmatched: 0,
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
    index("idx_term_backfill_runs_term_started").on(
      table.termId,
      table.startedAt.desc(),
    ),
    index("idx_term_backfill_runs_workspace_started").on(
      table.workspaceId,
      table.startedAt.desc(),
    ),
    uniqueIndex("idx_term_backfill_one_active")
      .on(table.termId)
      .where(sql`${table.status} IN ('pending', 'running')`),
  ],
);

export type TermBackfillRun = typeof termBackfillRuns.$inferSelect;
export type NewTermBackfillRun = typeof termBackfillRuns.$inferInsert;

export const termGroupMemberRebuildRuns = pgTable(
  "term_group_member_rebuild_runs",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    termGroupId: uuid("term_group_id")
      .notNull()
      .references(() => termGroups.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    model: text("model").notNull(),
    includeAlreadyMembers: boolean("include_already_members")
      .notNull()
      .default(false),
    removeNonMatching: boolean("remove_non_matching")
      .notNull()
      .default(false),
    enableWebResearch: boolean("enable_web_research")
      .notNull()
      .default(true),
    confidenceMin: real("confidence_min").notNull(),
    estimate: jsonb("estimate")
      .$type<{
        termCount: number;
        inputTokens: number;
        outputTokens: number;
        costUsd: number;
      }>()
      .notNull(),
    result: jsonb("result")
      .$type<{
        termsScanned: number;
        termsMatched: number;
        termsRemoved: number;
        webQueries: number;
        inputTokens: number;
        outputTokens: number;
        costUsd: number;
        cursor: { createdAt: string; termId: string } | null;
        cancelledAt?: string;
      }>()
      .notNull()
      .default({
        termsScanned: 0,
        termsMatched: 0,
        termsRemoved: 0,
        webQueries: 0,
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
    index("idx_term_group_member_rebuild_runs_group_started").on(
      table.termGroupId,
      table.startedAt.desc(),
    ),
    index("idx_term_group_member_rebuild_runs_workspace_started").on(
      table.workspaceId,
      table.startedAt.desc(),
    ),
    uniqueIndex("idx_term_group_member_rebuild_one_active")
      .on(table.termGroupId)
      .where(sql`${table.status} IN ('pending', 'running')`),
  ],
);

export type TermGroupMemberRebuildRun =
  typeof termGroupMemberRebuildRuns.$inferSelect;
export type NewTermGroupMemberRebuildRun =
  typeof termGroupMemberRebuildRuns.$inferInsert;

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
// Daily fact table — one row per (term, date).
// Source of truth for all digest metrics.
// Arbitrary-range queries (e.g. Aug 15 – Sep 30) run directly against this.
// ---------------------------------------------------------------------------

export const termDigestDaily = pgTable(
  "term_digest_daily",
  {
    termId: uuid("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    dateKey: date("date_key")
      .notNull()
      .references(() => dimDates.dateKey),
    dataSourceId: uuid("data_source_id")
      .notNull()
      .references(() => dataSources.id, { onDelete: "cascade" }),

    // Metrics
    docCount: integer("doc_count").notNull().default(0),
    avgQualityScore: real("avg_quality_score"),
    trendScore: real("trend_score"), // doc_count × avg_quality × recency_weight(day)

    // Processing / cache state
    isStale: boolean("is_stale").notNull().default(true),
    // true when row was invalidated by a bulk taxonomy op (merge/split terms).
    // Normal recompute dataSource skips these; a separate low-priority bulk drain dataSource
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
    primaryKey({ columns: [table.termId, table.dateKey, table.dataSourceId] }),
    // rolling-window term cards + sparkline
    index("idx_term_digest_daily_data_source_date").on(
      table.dataSourceId,
      table.dateKey,
      table.termId,
    ),
    // "all terms on a date" — used by ranking after daily recompute
    index("idx_term_digest_daily_date").on(table.dateKey, table.termId),
    // normal recompute dataSource queue — excludes bulk-stale rows
    index("idx_term_digest_daily_stale")
      .on(table.staleSince)
      .where(
        sql`${table.isStale} = true AND ${table.isBulkStale} = false AND ${table.processing} = false`,
      ),
    // bulk drain dataSource queue — only rows flagged by taxonomy ops
    index("idx_term_digest_daily_bulk_stale")
      .on(table.staleSince)
      .where(
        sql`${table.isStale} = true AND ${table.isBulkStale} = true AND ${table.processing} = false`,
      ),
  ],
);

export type TermDigestDaily = typeof termDigestDaily.$inferSelect;
export type NewTermDigestDaily = typeof termDigestDaily.$inferInsert;

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

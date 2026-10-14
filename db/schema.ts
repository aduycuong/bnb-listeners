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

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    autoCreateTerms: boolean("auto_create_terms").notNull().default(true),
    termLanguage: text("term_language").notNull().default("auto"),
    termCriteria: text("term_criteria").notNull().default(""),
    /** Real estate case id, see `lib/projects/project-cases.ts` and docs/decisions.md D10. */
    listeningCase: text("case").notNull().default("project"),
    /** live | sandbox; live projects only follow `origin = connector` sources. */
    mode: text("mode").notNull().default("live"),
    timezone: text("timezone").notNull().default("Asia/Ho_Chi_Minh"),
    /** Bumped on every config change (entities, queries, aspects, sources, case config). */
    configVersion: integer("config_version").notNull().default(1),
    /** Case-specific fields, validated by the case's zod schema. */
    caseConfig: jsonb("case_config")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    /** Demo projects render the sample dashboard instead of real data. */
    isDemo: boolean("is_demo").notNull().default(false),
    /** Default alert channels, recipients and the AI report schedule. */
    notificationConfig: jsonb("notification_config")
      .$type<{
        channels?: string[];
        recipients?: string[];
        reportSchedule?: string;
      }>()
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
    uniqueIndex("projects_workspace_name_idx").on(
      table.workspaceId,
      table.name,
    ),
    index("projects_workspace_id_idx").on(table.workspaceId),
  ],
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

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
    /** Part score of the document_part this chunk came from. */
    qualityScore: real("quality_score"),
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
  ],
);

export type Chunk = typeof chunks.$inferSelect;
export type NewChunk = typeof chunks.$inferInsert;

export const terms = pgTable(
  "terms",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
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
    uniqueIndex("idx_terms_project_name").on(table.projectId, table.name),
    index("idx_terms_project_id").on(table.projectId),
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

export const researchRuns = pgTable(
  "research_runs",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    query: text("query").notNull(),
    context: text("context"),
    clarificationMode: text("clarification_mode").notNull().default("ask"),
    clarifications: jsonb("clarifications").$type<
      Array<{ question: string; answer: string }>
    >(),
    background: text("background"),
    depth: text("depth").notNull().default("standard"),
    result: jsonb("result").$type<{
      report: string;
      sources: Array<{
        index: number;
        kind: "internal" | "web" | "analytics";
        ref: string;
        title: string;
        docType?: string;
        publishedAt: string | null;
      }>;
      iterations: number;
      findingCount: number;
    }>(),
    error: text("error"),
    reportHtml: text("report_html"),
    htmlStatus: text("html_status"),
    htmlError: text("html_error"),
    htmlModel: text("html_model"),
    htmlFinishedAt: timestamp("html_finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_research_runs_workspace_created").on(
      table.workspaceId,
      table.createdAt.desc(),
    ),
  ],
);

export type ResearchRun = typeof researchRuns.$inferSelect;
export type NewResearchRun = typeof researchRuns.$inferInsert;

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

// ---------------------------------------------------------------------------
// Social listening raw store (L1). Shared across workspaces; see docs/data-model.md.
// `origin`: connector | synthetic | legacy_import.
// ---------------------------------------------------------------------------

/** Where content is published: a Facebook page or group, a channel, a news site. */
export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    platform: text("platform").notNull(),
    sourceType: text("source_type").notNull(),
    externalId: text("external_id").notNull(),
    url: text("url"),
    name: text("name"),
    followerCount: integer("follower_count"),
    memberCount: integer("member_count"),
    /** hot | normal | low | paused; drives how often the source is collected. */
    activityTier: text("activity_tier").notNull().default("normal"),
    /** When true, post runs do not recompute `activity_tier`. */
    activityTierLocked: boolean("activity_tier_locked").notNull().default(false),
    /** Max Bright Data records per calendar month across all runs; null = unlimited. */
    monthlyRecordLimit: integer("monthly_record_limit"),
    origin: text("origin").notNull().default("connector"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    lastCollectedAt: timestamp("last_collected_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("sources_platform_external_id_idx").on(
      table.platform,
      table.externalId,
    ),
    index("sources_origin_idx").on(table.origin),
  ],
);

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;

/**
 * A reusable kind of person (or organization) that the synthetic connector
 * writes as. See docs/synthetic-data.md.
 */
export const personas = pgTable(
  "personas",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    /** Stable key of a seeded template persona; null for hand-made or generated ones. */
    templateKey: text("template_key"),
    name: text("name").notNull(),
    /** individual | organization */
    kind: text("kind").notNull().default("individual"),
    /** One or two sentences; the whole persona must stay near 150 prompt tokens. */
    description: text("description").notNull(),
    /** Free-text writing voice. */
    tone: text("tone").notNull().default(""),
    /** Aspects this persona cares about, e.g. `giá`, `pháp lý`, `tiến độ`. */
    concerns: jsonb("concerns").$type<string[]>().notNull().default([]),
    /** Room for richer traits later without a migration. */
    attributes: jsonb("attributes")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    version: integer("version").notNull().default(1),
    /** template | manual | llm_generated */
    source: text("source").notNull().default("manual"),
    /** draft | approved */
    reviewStatus: text("review_status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("personas_template_key_idx").on(table.templateKey),
  ],
);

export type Persona = typeof personas.$inferSelect;
export type NewPersona = typeof personas.$inferInsert;

/** A set of personas with weights that stands for one community. */
export const personaPanels = pgTable(
  "persona_panels",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    /** Stable key of a seeded template panel; null for hand-made ones. */
    templateKey: text("template_key"),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("persona_panels_template_key_idx").on(table.templateKey),
  ],
);

export type PersonaPanel = typeof personaPanels.$inferSelect;
export type NewPersonaPanel = typeof personaPanels.$inferInsert;

export const personaPanelMembers = pgTable(
  "persona_panel_members",
  {
    panelId: uuid("panel_id")
      .notNull()
      .references(() => personaPanels.id, { onDelete: "cascade" }),
    personaId: uuid("persona_id")
      .notNull()
      .references(() => personas.id, { onDelete: "cascade" }),
    /** Relative share within the panel; code normalizes, it need not sum to 1. */
    weight: real("weight").notNull().default(1),
  },
  (table) => [
    primaryKey({ columns: [table.panelId, table.personaId] }),
    index("persona_panel_members_persona_id_idx").on(table.personaId),
  ],
);

export type PersonaPanelMember = typeof personaPanelMembers.$inferSelect;
export type NewPersonaPanelMember = typeof personaPanelMembers.$inferInsert;

/** The account that published a content item. */
export const authors = pgTable(
  "authors",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    platform: text("platform").notNull(),
    externalId: text("external_id").notNull(),
    name: text("name"),
    url: text("url"),
    avatarUrl: text("avatar_url"),
    followerCount: integer("follower_count"),
    /** kol | agency | community | brand | individual | media; set later by the LLM or by hand. */
    authorType: text("author_type"),
    /** Synthetic authors only: the persona this author was created from. */
    personaId: uuid("persona_id").references(() => personas.id, {
      onDelete: "set null",
    }),
    origin: text("origin").notNull().default("connector"),
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
    uniqueIndex("authors_platform_external_id_idx").on(
      table.platform,
      table.externalId,
    ),
    index("authors_persona_id_idx").on(table.personaId),
  ],
);

export type Author = typeof authors.$inferSelect;
export type NewAuthor = typeof authors.$inferInsert;

/** One connector run. The raw payload is archived under `payload_key`. */
export const collectRuns = pgTable(
  "collect_runs",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    /** Connector key, e.g. `facebook-posts`, `facebook-comments`. */
    connector: text("connector").notNull(),
    sourceId: uuid("source_id").references(() => sources.id, {
      onDelete: "set null",
    }),
    params: jsonb("params")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    /** pending | running | success | failed */
    status: text("status").notNull().default("pending"),
    workflowRunId: text("workflow_run_id"),
    /** Provider job id, e.g. the Bright Data snapshot id. */
    externalJobId: text("external_job_id"),
    /** Object key of the raw payload in payload storage (R2 today). */
    payloadKey: text("payload_key"),
    itemCount: integer("item_count"),
    /** Normalize outcome counts: inserted / updated / skipped. */
    stats: jsonb("stats").$type<Record<string, unknown>>(),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("collect_runs_source_created_idx").on(
      table.sourceId,
      table.createdAt.desc(),
    ),
    index("collect_runs_status_idx").on(table.status),
    index("collect_runs_external_job_id_idx").on(table.externalJobId),
  ],
);

export type CollectRun = typeof collectRuns.$inferSelect;
export type NewCollectRun = typeof collectRuns.$inferInsert;

export type ContentItemMedia = {
  type: "image" | "video";
  url: string;
};

/** Posts, comments and replies in one table; `parent_id` / `root_id` form the thread. */
export const contentItems = pgTable(
  "content_items",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    /** post | comment | reply | article | video | listing */
    kind: text("kind").notNull(),
    platform: text("platform").notNull(),
    sourceId: uuid("source_id").references(() => sources.id, {
      onDelete: "set null",
    }),
    authorId: uuid("author_id").references(() => authors.id, {
      onDelete: "set null",
    }),
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => contentItems.id,
      { onDelete: "set null" },
    ),
    rootId: uuid("root_id").references((): AnyPgColumn => contentItems.id, {
      onDelete: "set null",
    }),
    externalId: text("external_id").notNull(),
    url: text("url"),
    text: text("text").notNull().default(""),
    media: jsonb("media").$type<ContentItemMedia[]>().notNull().default([]),
    language: text("language"),
    /** Hash of the normalized text; unchanged text keeps downstream analysis cached. */
    contentHash: text("content_hash").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastCollectedAt: timestamp("last_collected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Latest engagement; history lives in `engagement_snapshots`. */
    likeCount: integer("like_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    shareCount: integer("share_count").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),
    reactions: jsonb("reactions").$type<Record<string, number>>(),
    origin: text("origin").notNull().default("connector"),
    collectRunId: uuid("collect_run_id").references(() => collectRuns.id, {
      onDelete: "set null",
    }),
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
    uniqueIndex("content_items_platform_external_id_idx").on(
      table.platform,
      table.externalId,
    ),
    index("content_items_source_published_idx").on(
      table.sourceId,
      table.publishedAt.desc(),
    ),
    index("content_items_published_at_idx").on(table.publishedAt.desc()),
    index("content_items_parent_id_idx").on(table.parentId),
    index("content_items_root_id_idx").on(table.rootId),
    index("content_items_author_id_idx").on(table.authorId),
    index("content_items_collect_run_id_idx").on(table.collectRunId),
    index("content_items_origin_idx").on(table.origin),
  ],
);

export type ContentItem = typeof contentItems.$inferSelect;
export type NewContentItem = typeof contentItems.$inferInsert;

/** Engagement time series, one row per item per collect run. */
export const engagementSnapshots = pgTable(
  "engagement_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    collectRunId: uuid("collect_run_id").references(() => collectRuns.id, {
      onDelete: "set null",
    }),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    likeCount: integer("like_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    shareCount: integer("share_count").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),
    reactions: jsonb("reactions").$type<Record<string, number>>(),
  },
  (table) => [
    index("engagement_snapshots_item_captured_idx").on(
      table.contentItemId,
      table.capturedAt.desc(),
    ),
    // Re-running a normalize step for the same run must not duplicate snapshots.
    uniqueIndex("engagement_snapshots_item_run_idx").on(
      table.contentItemId,
      table.collectRunId,
    ),
  ],
);

export type EngagementSnapshot = typeof engagementSnapshots.$inferSelect;
export type NewEngagementSnapshot = typeof engagementSnapshots.$inferInsert;

/**
 * Next comment-refresh checkpoint of a post. The row is deleted once the post
 * has passed its last checkpoint.
 */
export const itemRefreshSchedules = pgTable(
  "item_refresh_schedules",
  {
    contentItemId: uuid("content_item_id")
      .primaryKey()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    nextRefreshAt: timestamp("next_refresh_at", { withTimezone: true }).notNull(),
    /** Checkpoint being waited for, in hours after `published_at` (e.g. 6, 24, 72). */
    checkpointHours: integer("checkpoint_hours").notNull(),
    /** `num_comments` when comments were last collected; null = never collected. */
    commentsCollectedCount: integer("comments_collected_count"),
    commentsCollectedAt: timestamp("comments_collected_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("item_refresh_schedules_next_refresh_at_idx").on(table.nextRefreshAt),
  ],
);

export type ItemRefreshSchedule = typeof itemRefreshSchedules.$inferSelect;
export type NewItemRefreshSchedule = typeof itemRefreshSchedules.$inferInsert;

// ---------------------------------------------------------------------------
// L2 — Project config. See docs/data-model.md and docs/decisions.md D10.
// ---------------------------------------------------------------------------

/** A brand, project, competitor or area that a project listens for. */
export const projectEntities = pgTable(
  "project_entities",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** primary | competitor | product | person | area */
    role: text("role").notNull(),
    name: text("name").notNull(),
    aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
    color: text("color"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("project_entities_project_id_idx").on(table.projectId)],
);

export type ProjectEntity = typeof projectEntities.$inferSelect;
export type NewProjectEntity = typeof projectEntities.$inferInsert;

/** Lexical rule that turns a raw content item into a mention of the project. */
export const projectQueries = pgTable(
  "project_queries",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id").references(() => projectEntities.id, {
      onDelete: "cascade",
    }),
    /** Any one of these terms must appear. */
    include: jsonb("include").$type<string[]>().notNull().default([]),
    /** When non-empty, at least one of these must also appear. */
    withTerms: jsonb("with_terms").$type<string[]>().notNull().default([]),
    /** None of these may appear. */
    exclude: jsonb("exclude").$type<string[]>().notNull().default([]),
    /** Max words between an `include` and a `with` term; null = anywhere in the item. */
    proximity: integer("proximity"),
    /** Bumped when include / with / exclude / proximity change; triggers re-matching. */
    version: integer("version").notNull().default(1),
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
    index("project_queries_project_id_idx").on(table.projectId),
    index("project_queries_entity_id_idx").on(table.entityId),
  ],
);

export type ProjectQuery = typeof projectQueries.$inferSelect;
export type NewProjectQuery = typeof projectQueries.$inferInsert;

/** Aspect a project measures sentiment on (pháp lý, tiến độ, giá…). */
export const projectAspects = pgTable(
  "project_aspects",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Stable slug, e.g. `legal`; template aspects keep the template key. */
    key: text("key").notNull(),
    name: text("name").notNull(),
    /** Guidance for the Enrich prompt. */
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("project_aspects_project_key_idx").on(table.projectId, table.key),
  ],
);

export type ProjectAspect = typeof projectAspects.$inferSelect;
export type NewProjectAspect = typeof projectAspects.$inferInsert;

/** Sources a project follows; required for Facebook, which has no keyword search. */
export const projectSources = pgTable(
  "project_sources",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.sourceId] }),
    index("project_sources_source_id_idx").on(table.sourceId),
  ],
);

export type ProjectSource = typeof projectSources.$inferSelect;
export type NewProjectSource = typeof projectSources.$inferInsert;

// ---------------------------------------------------------------------------
// L5 — Outputs. Rules are configured now; evaluation starts in phase 6.
// ---------------------------------------------------------------------------

/** One alert rule of a project; `kind` comes from `lib/projects/alert-templates.ts`. */
export const alertRules = pgTable(
  "alert_rules",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** volume_growth | negative_share | viral_post | keyword_hit | price_deviation | buyer_questions_growth */
    kind: text("kind").notNull(),
    /** `{ scope, threshold, window, minMentions, keywords }`, validated per kind. */
    params: jsonb("params")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    /** Overrides `projects.notification_config.channels`; null = project default. */
    channels: jsonb("channels").$type<string[]>(),
    enabled: boolean("enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("alert_rules_project_id_idx").on(table.projectId)],
);

export type AlertRule = typeof alertRules.$inferSelect;
export type NewAlertRule = typeof alertRules.$inferInsert;

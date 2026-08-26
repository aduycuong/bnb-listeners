import { sql } from "drizzle-orm";
import {
  pgVector1024,
  pgVector1536,
  tsvector,
} from "@/db/pgvector";
import {
  boolean,
  foreignKey,
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
    topicScope: text("topic_scope")
      .notNull()
      .default("tin tức và dữ liệu về bất động sản"),
    topicLanguage: text("topic_language").notNull().default("auto"),
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
    isDuplicate: boolean("is_duplicate").notNull().default(false),
    canonicalId: uuid("canonical_id"),
    jobRunId: uuid("job_run_id").references(() => jobRuns.id, {
      onDelete: "set null",
    }),
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
    index("idx_documents_is_duplicate").on(table.isDuplicate),
    index("idx_documents_job_run_id").on(table.jobRunId),
    foreignKey({
      columns: [table.canonicalId],
      foreignColumns: [table.id],
    }),
  ],
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

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
    parentId: uuid("parent_id"),
    description: text("description"),
    verified: boolean("verified").notNull().default(false),
    createdBy: text("created_by").notNull().default("admin"),
    sourceDocumentId: uuid("source_document_id").references(
      () => documents.id,
      { onDelete: "set null" },
    ),
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
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
    }),
    index("idx_topics_parent").on(table.parentId),
    index("idx_topics_verified").on(table.verified),
    index("idx_topics_source_document").on(table.sourceDocumentId),
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

export const topicDigests = pgTable(
  "topic_digests",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    summary: text("summary"),
    sourceChunkIds: uuid("source_chunk_ids").array(),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    docCount: integer("doc_count"),
    avgQualityScore: real("avg_quality_score"),
    trendScore: real("trend_score"),
    trendRank: integer("trend_rank"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_topic_digests_topic").on(table.topicId, table.periodEnd.desc()),
    index("idx_topic_digests_trend").on(
      table.periodStart,
      table.trendScore,
    ),
  ],
);

export type TopicDigest = typeof topicDigests.$inferSelect;
export type NewTopicDigest = typeof topicDigests.$inferInsert;

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
  ],
);

export type JobRun = typeof jobRuns.$inferSelect;
export type NewJobRun = typeof jobRuns.$inferInsert;

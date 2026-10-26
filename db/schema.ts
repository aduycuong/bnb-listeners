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
  unique,
  uniqueIndex,
  uuid,
  foreignKey,
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
    /** Real estate case id, see `lib/projects/project-cases.ts` and docs/decisions.md D10. */
    listeningCase: text("case").notNull().default("project"),
    /** Version of the case definition the project runs on; the user decides when to upgrade. */
    caseVersion: integer("case_version").notNull().default(1),
    timezone: text("timezone").notNull().default("Asia/Ho_Chi_Minh"),
    /** Bumped on every config change (entities, queries, aspects, sources, case config). */
    configVersion: integer("config_version").notNull().default(1),
    /** Case-specific fields, validated by the case's zod schema. */
    caseConfig: jsonb("case_config")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    /** Hash of query ids + versions and sources at the last full match; null = never matched. */
    matchSignature: text("match_signature"),
    matchedAt: timestamp("matched_at", { withTimezone: true }),
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
    /** What the key may do (`API_KEY_SCOPES`, D27). */
    scopes: jsonb("scopes").$type<string[]>().notNull().default(["reports:read", "mentions:read"]),
    /** Projects the key may use; null is every project of the workspace. */
    projectIds: jsonb("project_ids").$type<string[]>(),
    /** Calls run as this member; keys made before D27 have none and run as the owner. */
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
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

/**
 * Admin overrides of app-wide settings, one row per settings group. A group
 * without a row uses the defaults in code; see `lib/settings/registry.ts`.
 */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey().notNull(),
  /** The whole group, validated by the group's schema on read and write. */
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type AppSetting = typeof appSettings.$inferSelect;
export type NewAppSetting = typeof appSettings.$inferInsert;

// ---------------------------------------------------------------------------
// Social listening raw store (L1). Shared across workspaces; see .ai/database-schema.md.
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
    /** Max Bright Data records per day (Vietnam time) across all runs; null = unlimited. */
    dailyRecordLimit: integer("daily_record_limit"),
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

export type ContentItemMedia =
  | {
      type: "image" | "video";
      url: string;
    }
  | {
      /**
       * What is said in a video. Match and Enrich read `text` with the item's
       * own text; `url` is the archived subtitle file (null when archiving failed).
       */
      type: "transcript";
      url: string | null;
      /** Corrected text when `correction` is set, else as recognized. */
      text: string;
      language: string | null;
      /** `asr`: speech recognition by the platform; `creator`: written by the author. */
      source: "asr" | "creator";
      /** The text as recognized, kept once a correction changed `text`. */
      rawText?: string;
      /** Last LLM correction of misheard names; absent until one ran. */
      correction?: TranscriptCorrection;
    };

export type TranscriptCorrection = {
  model: string;
  /** Hash of prompt version, model, threshold and glossary; a new glossary makes it stale. */
  signature: string;
  replacements: { from: string; to: string }[];
  correctedAt: string;
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
    /** Hash of the normalized text and transcript; unchanged content keeps downstream analysis cached. */
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
// L2 — Project config. See .ai/database-schema.md and docs/decisions.md D10.
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
    /** Include terms that are easy to confuse; a match on them alone needs LLM confirmation. */
    ambiguous: jsonb("ambiguous").$type<string[]>().notNull().default([]),
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
// L5 — Outputs. Rules are configured in the project wizard. The hourly
// evaluator in `lib/alerts` writes `alerts` and sends email only.
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

/** One firing of an alert rule. The same rule and scope fire at most once per bucket. */
export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => alertRules.id, { onDelete: "cascade" }),
    /** Same catalog as `alert_rules.kind`, copied so a fired row stays readable. */
    kind: text("kind").notNull(),
    /** high | med | low */
    level: text("level").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** open = recorded without email; emailed; email_failed */
    status: text("status").notNull().default("open"),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    mentionIds: jsonb("mention_ids").$type<string[]>().notNull().default([]),
    /** project, an entity or aspect id, or those plus a content item for a viral post. */
    dedupeKey: text("dedupe_key").notNull(),
    /** Hour, day or 7-day bucket, or `once` for a viral post. */
    bucket: text("bucket").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    triggeredAt: timestamp("triggered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    emailedAt: timestamp("emailed_at", { withTimezone: true }),
    emailError: text("email_error"),
  },
  (table) => [
    uniqueIndex("alerts_rule_bucket_uidx").on(table.ruleId, table.dedupeKey, table.bucket),
    index("alerts_project_triggered_idx").on(table.projectId, table.triggeredAt),
  ],
);

export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;

/**
 * AI report of one project and period (D29): numbers frozen at generation, sections written
 * by the model with mention citations. Generating again overwrites the row.
 */
export const aiReports = pgTable(
  "ai_reports",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** `rolling`, `custom` or a calendar type (`day`, `week`, `month`, `quarter`, `year`). */
    periodType: text("period_type").notNull(),
    /** First and last day of the period in the project's timezone. */
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    /** The period had ended when the report was generated. */
    complete: boolean("complete").notNull(),
    /** Snapshot of the metrics the report was written from (`ReportMetrics`). */
    metrics: jsonb("metrics").$type<Record<string, unknown>>().notNull(),
    /** Summary, highlights, risks and recommendations (`ReportSections`). */
    sections: jsonb("sections").$type<Record<string, unknown>>().notNull(),
    /** Cited mentions with an excerpt, so the report reads the same later (`ReportCitation[]`). */
    citations: jsonb("citations").$type<Record<string, unknown>[]>().notNull().default([]),
    /** Checks that failed, e.g. a number not found in the snapshot. */
    warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costUsd: real("cost_usd").notNull().default(0),
    /** `schedule`, `user`, `script` or `mcp`. */
    trigger: text("trigger").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("ai_reports_period_key").on(table.projectId, table.periodType, table.periodStart),
  ],
);

export type AiReport = typeof aiReports.$inferSelect;
export type NewAiReport = typeof aiReports.$inferInsert;

// ---------------------------------------------------------------------------
// L3 — Analysis. See .ai/database-schema.md and docs/decisions.md D11.
// ---------------------------------------------------------------------------

/** A content item that matched a project. Candidates rejected by the LLM stay with `is_relevant = false`. */
export const mentions = pgTable(
  "mentions",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    rootItemId: uuid("root_item_id"),
    /** post | comment | reply | … copied from the item. */
    kind: text("kind").notNull(),
    platform: text("platform").notNull(),
    sourceId: uuid("source_id"),
    authorId: uuid("author_id"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    origin: text("origin").notNull(),
    matchedQueryIds: jsonb("matched_query_ids").$type<string[]>().notNull().default([]),
    /** Entities the item is about; for context mentions, the root post's entities. */
    matchedEntityIds: jsonb("matched_entity_ids").$type<string[]>().notNull().default([]),
    /** Terms found in the item text (empty for context mentions). */
    matchedTerms: jsonb("matched_terms").$type<string[]>().notNull().default([]),
    /**
     * direct: the item names the entity. context: it sits under a matching post.
     * manual: Match missed it and a labeler marked it relevant.
     */
    matchType: text("match_type").notNull(),
    /** lexical: tier 1 alone. llm: confirmed or rejected by tier 2. user: added by a labeler. */
    matchTier: text("match_tier").notNull(),
    /** Effective relevance used by metrics: the label when there is one, else Match's decision. */
    isRelevant: boolean("is_relevant").notNull(),
    /** Match's own decision, kept for evaluation; null for manual mentions. */
    autoIsRelevant: boolean("auto_is_relevant"),
    /** Tier 2 explanation, kept for review. */
    matchReason: text("match_reason"),
    matchSignature: text("match_signature").notNull(),
    userCorrected: boolean("user_corrected").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("mentions_project_item_idx").on(table.projectId, table.contentItemId),
    index("mentions_project_published_idx").on(table.projectId, table.publishedAt),
    index("mentions_project_root_idx").on(table.projectId, table.rootItemId),
    index("mentions_content_item_id_idx").on(table.contentItemId),
  ],
);

export type Mention = typeof mentions.$inferSelect;
export type NewMention = typeof mentions.$inferInsert;

/** Cached tier 2 decisions, shared by projects with the same entity definition. */
export const matchJudgments = pgTable("match_judgments", {
  /** sha256 of item content hash, root content hash, entity terms and prompt version. */
  cacheKey: text("cache_key").primaryKey(),
  isRelevant: boolean("is_relevant").notNull(),
  reason: text("reason"),
  model: text("model").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type MatchJudgment = typeof matchJudgments.$inferSelect;
export type NewMatchJudgment = typeof matchJudgments.$inferInsert;

/** A labeler's answer for one item in one project; kept apart from Match output (docs/decisions.md D13). */
export const itemLabels = pgTable(
  "item_labels",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    isRelevant: boolean("is_relevant").notNull(),
    /** positive | neutral | negative; null when not labeled. */
    sentiment: text("sentiment"),
    /** Aspect keys of the project; null when not labeled, [] for "no aspect". */
    aspectKeys: jsonb("aspect_keys").$type<string[]>(),
    /** Set when the label was given in a random sample; only these count in evaluation. */
    sampleId: uuid("sample_id").references(() => labelSamples.id, { onDelete: "set null" }),
    labeledBy: uuid("labeled_by").references(() => users.id, { onDelete: "set null" }),
    labeledAt: timestamp("labeled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("item_labels_project_item_idx").on(table.projectId, table.contentItemId),
    index("item_labels_sample_id_idx").on(table.sampleId),
  ],
);

export type ItemLabel = typeof itemLabels.$inferSelect;
export type NewItemLabel = typeof itemLabels.$inferInsert;

/** A stratified random sample of a project's items to label. */
export const labelSamples = pgTable(
  "label_samples",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** match: relevance of all items (strata). enrich: sentiment and aspects of relevant mentions. */
    kind: text("kind").notNull().default("match"),
    /** Per stratum: `{ population, sampled }` at sampling time, for weighted recall. */
    strata: jsonb("strata")
      .$type<Record<string, { population: number; sampled: number }>>()
      .notNull()
      .default({}),
    /** Match signature when sampled; strata are defined against it. */
    matchSignature: text("match_signature"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("label_samples_project_id_idx").on(table.projectId)],
);

export type LabelSample = typeof labelSamples.$inferSelect;
export type NewLabelSample = typeof labelSamples.$inferInsert;

export const labelSampleItems = pgTable(
  "label_sample_items",
  {
    sampleId: uuid("sample_id")
      .notNull()
      .references(() => labelSamples.id, { onDelete: "cascade" }),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    /** relevant | rejected | unmatched: Match's decision when sampled. */
    stratum: text("stratum").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.sampleId, table.contentItemId] }),
    index("label_sample_items_sample_position_idx").on(table.sampleId, table.position),
  ],
);

export type LabelSampleItem = typeof labelSampleItems.$inferSelect;
export type NewLabelSampleItem = typeof labelSampleItems.$inferInsert;

// ---------------------------------------------------------------------------
// L3 — Enrich. One row of `mention_enrichments` per mention and enricher key
// tracks when each output was produced; the outputs live in their own tables.
// Keys come from `lib/enrichment/registry.ts` (docs/decisions.md D18).
// ---------------------------------------------------------------------------

/** Enrichers a project runs; seeded from the case template, toggled per project (D18). */
export const projectEnrichers = pgTable(
  "project_enrichers",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Key of `ENRICHER_REGISTRY`. */
    enricherKey: text("enricher_key").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    /** Settings of this enricher for this project, part of its signature. */
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.enricherKey] })],
);

export type ProjectEnricher = typeof projectEnrichers.$inferSelect;
export type NewProjectEnricher = typeof projectEnrichers.$inferInsert;

/**
 * State of one enricher for one mention. A mention is enriched again for a key
 * when it has no row, the row failed, or `signature` / `content_hash` differ
 * from the current ones. Mentions that are not relevant have no rows.
 */
export const mentionEnrichments = pgTable(
  "mention_enrichments",
  {
    mentionId: uuid("mention_id")
      .notNull()
      .references(() => mentions.id, { onDelete: "cascade" }),
    enricherKey: text("enricher_key").notNull(),
    /** pending (stage input ready) | done | failed | waiting (offered to a stage, not placed yet) */
    status: text("status").notNull(),
    /** Signature of the enricher when it ran: version, model and the project config it depends on. */
    signature: text("signature"),
    /** Item content hash when it ran; a changed text runs again. */
    contentHash: text("content_hash"),
    /** Model used; null for code stages. */
    model: text("model"),
    error: text("error"),
    enrichedAt: timestamp("enriched_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    primaryKey({ columns: [table.mentionId, table.enricherKey] }),
    index("mention_enrichments_key_status_idx").on(table.enricherKey, table.status),
  ],
);

export type MentionEnrichment = typeof mentionEnrichments.$inferSelect;
export type NewMentionEnrichment = typeof mentionEnrichments.$inferInsert;

/**
 * Enrich's sentiment of a mention. The effective sentiment is the label when
 * there is one (`item_labels.sentiment`), else this row (D13/D14).
 */
export const mentionSentiments = pgTable("mention_sentiments", {
  mentionId: uuid("mention_id")
    .primaryKey()
    .references(() => mentions.id, { onDelete: "cascade" }),
  /** positive | neutral | negative */
  sentiment: text("sentiment").notNull(),
  /** -1 (very negative) to 1 (very positive). */
  sentimentScore: real("sentiment_score").notNull(),
  emotion: text("emotion"),
});

export type MentionSentiment = typeof mentionSentiments.$inferSelect;
export type NewMentionSentiment = typeof mentionSentiments.$inferInsert;

/** Sentiment toward each entity a mention talks about (SoV, competitor comparison). */
export const mentionEntities = pgTable(
  "mention_entities",
  {
    mentionId: uuid("mention_id")
      .notNull()
      .references(() => mentions.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => projectEntities.id, { onDelete: "cascade" }),
    sentiment: text("sentiment").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.mentionId, table.entityId] }),
    index("mention_entities_entity_id_idx").on(table.entityId),
  ],
);

export type MentionEntity = typeof mentionEntities.$inferSelect;
export type NewMentionEntity = typeof mentionEntities.$inferInsert;

/**
 * Aspects of a mention from Enrich. Labeled aspects live in
 * `item_labels.aspect_keys` and take precedence when not null (D14).
 */
export const mentionAspects = pgTable(
  "mention_aspects",
  {
    mentionId: uuid("mention_id")
      .notNull()
      .references(() => mentions.id, { onDelete: "cascade" }),
    aspectId: uuid("aspect_id")
      .notNull()
      .references(() => projectAspects.id, { onDelete: "cascade" }),
    sentiment: text("sentiment"),
  },
  (table) => [
    primaryKey({ columns: [table.mentionId, table.aspectId] }),
    index("mention_aspects_aspect_id_idx").on(table.aspectId),
  ],
);

export type MentionAspect = typeof mentionAspects.$inferSelect;
export type NewMentionAspect = typeof mentionAspects.$inferInsert;

/**
 * Raw per-mention output of the LLM enrichers that is not a reference to a
 * configured row: case extractions (`price_quote`, `buyer_question`, …) and
 * the inputs of code stages (`topic_hint`, `terms`). `schema_key` is the
 * enricher key; `data` is validated by the enricher's zod schema (D14/D18).
 */
export const mentionExtractions = pgTable(
  "mention_extractions",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    mentionId: uuid("mention_id")
      .notNull()
      .references(() => mentions.id, { onDelete: "cascade" }),
    schemaKey: text("schema_key").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  },
  (table) => [
    index("mention_extractions_mention_id_idx").on(table.mentionId),
    index("mention_extractions_schema_key_idx").on(table.schemaKey),
  ],
);

export type MentionExtraction = typeof mentionExtractions.$inferSelect;
export type NewMentionExtraction = typeof mentionExtractions.$inferInsert;

/**
 * Terms a mention names, indexed by the `terms_index` stage from the raw
 * `terms` extraction after normalization, filtering and the dictionary (D16/D18).
 * `kind`: keyword | place | brand | org.
 */
export const mentionTerms = pgTable(
  "mention_terms",
  {
    mentionId: uuid("mention_id")
      .notNull()
      .references(() => mentions.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    /** Normalized (NFC, lowercase, single spaces; diacritics kept), mapped through the dictionary. */
    term: text("term").notNull(),
    /** As the model wrote it, shown in the cloud. */
    text: text("text").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.mentionId, table.kind, table.term] }),
    index("mention_terms_kind_term_idx").on(table.kind, table.term),
  ],
);

export type MentionTerm = typeof mentionTerms.$inferSelect;
export type NewMentionTerm = typeof mentionTerms.$inferInsert;

/**
 * Synonyms and hidden terms for the `terms_index` stage. `scope_type = project`
 * rows belong to one project; `workspace` rows (e.g. place names) are shared.
 */
export const termDictionary = pgTable(
  "term_dictionary",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    /** workspace | project */
    scopeType: text("scope_type").notNull(),
    scopeId: uuid("scope_id").notNull(),
    kind: text("kind").notNull(),
    /** Normalized canonical term that the aliases map to. */
    canonical: text("canonical").notNull(),
    /** Normalized variants mapped to `canonical`. */
    aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
    /** Hidden terms are dropped from the index. */
    hidden: boolean("hidden").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("term_dictionary_scope_kind_canonical_idx").on(
      table.scopeType,
      table.scopeId,
      table.kind,
      table.canonical,
    ),
  ],
);

export type TermDictionaryEntry = typeof termDictionary.$inferSelect;
export type NewTermDictionaryEntry = typeof termDictionary.$inferInsert;

/**
 * A group of mentions of a project, named by the LLM (D15/D18). `kind` says
 * what is grouped: `topic` (from `topic_hint`), `buyer_question` (from the
 * extraction), later `argument`.
 */
export const topics = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** topic | buyer_question | argument */
    kind: text("kind").notNull().default("topic"),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    /** Aspect most of the group's mentions discuss when it was created; null if none dominates. */
    aspectId: uuid("aspect_id").references(() => projectAspects.id, { onDelete: "set null" }),
    /** active | hidden (still receives mentions) | merged */
    status: text("status").notNull().default("active"),
    mergedIntoId: uuid("merged_into_id").references((): AnyPgColumn => topics.id, {
      onDelete: "set null",
    }),
    /** Mean embedding of the group's relevant mentions; close groups are checked for a merge. */
    centroid: pgVector1536("centroid"),
    /** Relevant mentions in the group, refreshed after each run. */
    mentionCount: integer("mention_count").notNull().default(0),
    /** Kind-specific fields, e.g. `{ answered, answerUrl }` for buyer questions. */
    attributes: jsonb("attributes").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("topics_project_kind_status_idx").on(table.projectId, table.kind, table.status),
    uniqueIndex("topics_id_kind_idx").on(table.id, table.kind),
  ],
);

export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;

/**
 * The group of a mention, at most one per `kind` (D15/D18). `kind` repeats
 * `topics.kind` so the key can hold that rule; the stage keeps them equal.
 */
export const mentionTopics = pgTable(
  "mention_topics",
  {
    mentionId: uuid("mention_id")
      .notNull()
      .references(() => mentions.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("topic"),
    topicId: uuid("topic_id").notNull(),
    /** 1 when assigned by the LLM. */
    confidence: real("confidence").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.mentionId, table.kind] }),
    index("mention_topics_topic_id_idx").on(table.topicId),
    foreignKey({
      columns: [table.topicId, table.kind],
      foreignColumns: [topics.id, topics.kind],
      name: "mention_topics_topic_kind_fk",
    }).onDelete("cascade"),
  ],
);

export type MentionTopic = typeof mentionTopics.$inferSelect;
export type NewMentionTopic = typeof mentionTopics.$inferInsert;

/** Embeddings of mention text, one per kind; `topic_hint` and `buyer_question` for grouping (D15). */
export const mentionEmbeddings = pgTable(
  "mention_embeddings",
  {
    mentionId: uuid("mention_id")
      .notNull()
      .references(() => mentions.id, { onDelete: "cascade" }),
    /** topic_hint | buyer_question */
    kind: text("kind").notNull(),
    model: text("model").notNull(),
    /** Hash of the embedded text; a changed text is embedded again. */
    textHash: text("text_hash").notNull(),
    embedding: pgVector1536("embedding").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.mentionId, table.kind] })],
);

export type MentionEmbedding = typeof mentionEmbeddings.$inferSelect;
export type NewMentionEmbedding = typeof mentionEmbeddings.$inferInsert;

// ---------------------------------------------------------------------------
// L4 — Aggregates (docs/decisions.md D28). Daily counts of relevant mentions per
// project, day of the project's timezone and source; recomputed per (project, day)
// from L3 by `lib/metrics/services/refresh-project-metrics-daily.ts`. Only counts
// are stored: NSS, shares and SoV are computed from sums of any period.
// ---------------------------------------------------------------------------

export const projectMetricsDaily = pgTable(
  "project_metrics_daily",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Day of `mentions.published_at` in the project's timezone. */
    dateKey: date("date_key").notNull(),
    sourceId: uuid("source_id").references(() => sources.id, { onDelete: "set null" }),
    /** Own mentions (D26): enriched to at least one non-competitor entity. */
    mentions: integer("mentions").notNull().default(0),
    posts: integer("posts").notNull().default(0),
    engagement: integer("engagement").notNull().default(0),
    positive: integer("positive").notNull().default(0),
    neutral: integer("neutral").notNull().default(0),
    negative: integer("negative").notNull().default(0),
    /** Own mentions without a sentiment yet. */
    unknown: integer("unknown").notNull().default(0),
    /** Own mentions per emotion, `{ [emotion]: count }`. */
    emotions: jsonb("emotions").$type<Record<string, number>>().notNull().default({}),
    /** Relevant mentions naming a primary or product entity, and any tracked entity (SoV). */
    sovPrimary: integer("sov_primary").notNull().default(0),
    sovTracked: integer("sov_tracked").notNull().default(0),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Upserts keep two refreshes of the same days from adding rows twice.
    unique("project_metrics_daily_key")
      .on(table.projectId, table.dateKey, table.sourceId)
      .nullsNotDistinct(),
  ],
);

export type ProjectMetricsDaily = typeof projectMetricsDaily.$inferSelect;
export type NewProjectMetricsDaily = typeof projectMetricsDaily.$inferInsert;

/** Own mentions per effective aspect (D14) and day, with the aspect's sentiment. */
export const projectAspectDaily = pgTable(
  "project_aspect_daily",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    dateKey: date("date_key").notNull(),
    aspectId: uuid("aspect_id")
      .notNull()
      .references(() => projectAspects.id, { onDelete: "cascade" }),
    mentions: integer("mentions").notNull().default(0),
    positive: integer("positive").notNull().default(0),
    neutral: integer("neutral").notNull().default(0),
    negative: integer("negative").notNull().default(0),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("project_aspect_daily_key").on(table.projectId, table.dateKey, table.aspectId),
  ],
);

export type ProjectAspectDaily = typeof projectAspectDaily.$inferSelect;
export type NewProjectAspectDaily = typeof projectAspectDaily.$inferInsert;

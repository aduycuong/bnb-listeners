import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { previewMatches } from "@/lib/matching/services/preview-matches";

const termsSchema = z.array(z.string().trim().min(1).max(80)).max(30).default([]);

const matchPreviewRequestBodySchema = z.object({
  sourceIds: z.array(z.uuid()).max(100),
  entities: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        name: z.string().trim().max(120),
        aliases: termsSchema,
        ambiguousAliases: termsSchema,
        withTerms: termsSchema,
        exclude: termsSchema,
      }),
    )
    .max(60),
});

export const POST = createApiHandler(
  { requestBody: matchPreviewRequestBodySchema },
  (params) =>
    previewMatches({
      sourceIds: params.sourceIds,
      entities: params.entities.filter((entity) => entity.name.length > 0),
    }),
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);

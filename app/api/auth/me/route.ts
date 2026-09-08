import { createApiHandler } from "@/lib/exposers/create-api-handler";

export const GET = createApiHandler(
  {},
  async (_params, ctx) => ({
    id: ctx.userId,
    role: ctx.role ?? "user",
  }),
  { allowedRoles: ["user", "admin"], requireWorkspace: false },
);

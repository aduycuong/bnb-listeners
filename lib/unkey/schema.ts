import { z } from "zod";

import { API_KEY_SCOPES } from "./constants";

/** Body of the create and update key routes, and values of the key dialog. */
export const workspaceKeyBodySchema = z.object({
  name: z.string().trim().min(1, "Nhập tên key").max(64, "Tối đa 64 ký tự"),
  scopes: z.array(z.enum(API_KEY_SCOPES)).min(1, "Chọn ít nhất một quyền"),
  /** Null: every project of the workspace. */
  projectIds: z.array(z.uuid()).min(1, "Chọn ít nhất một project").nullable(),
});

export type WorkspaceKeyBody = z.infer<typeof workspaceKeyBodySchema>;

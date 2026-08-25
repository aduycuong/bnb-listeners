"use server";

import { createServerAction } from "@/lib/exposers/create-server-action";
import { syncSession, signOut as signOutService } from "./services";

export const syncSessionAction = createServerAction<
  (idToken: string) => Promise<void>
>(syncSession, { allowedRoles: ["*"] });

export const signOutAction = createServerAction(signOutService, {
  allowedRoles: ["*"],
});

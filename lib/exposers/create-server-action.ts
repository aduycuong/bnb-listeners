/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSession } from "@/lib/auth";

import { checkRolePermission, type AllowedRoles } from "./check-role-permission";

export type CreateServerActionOptions = {
  allowedRoles: AllowedRoles;
};

export function createServerAction<TFn extends (...args: any[]) => any>(
  serviceFn: TFn,
  options: CreateServerActionOptions,
): TFn {
  const { allowedRoles } = options;

  return (async (...args: Parameters<TFn>) => {
    const session = await getSession();
    checkRolePermission(session, allowedRoles);
    return serviceFn(...args);
  }) as TFn;
}

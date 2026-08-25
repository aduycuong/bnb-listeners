import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth/session";
import { APIError } from "@/lib/exposers/api-error";
import {
  X_WORKSPACE_ID_HEADER,
  type WorkspacePermission,
} from "@/lib/workspaces/constants";
import { assertWorkspaceAccess } from "@/lib/workspaces/services/assert-workspace-access";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import { checkRolePermission, type AllowedRoles } from "./check-role-permission";

export function getApiQueryParams(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  return Object.fromEntries(sp.entries());
}

export async function getApiBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export type CreateApiHandlerOptions = {
  allowedRoles: AllowedRoles;
  requireWorkspace?: boolean;
  minWorkspacePermission?: WorkspacePermission;
};

export async function getApiSession(
  request: NextRequest,
): Promise<SessionUser> {
  void request;
  const session = await getSession();
  if (!session) {
    throw new APIError("Unauthorized", "Unauthorized", 401);
  }
  return session;
}

function extractWorkspaceId(
  request: NextRequest,
  routeParams: Record<string, string>,
): string | null {
  const headerWorkspaceId = request.headers.get(X_WORKSPACE_ID_HEADER)?.trim();
  if (headerWorkspaceId) {
    return headerWorkspaceId;
  }

  const routeWorkspaceId = routeParams.workspaceId?.trim();
  return routeWorkspaceId || null;
}

async function resolveWorkspaceContext(params: {
  session: SessionUser;
  request: NextRequest;
  routeParams: Record<string, string>;
  requireWorkspace: boolean;
  minWorkspacePermission: WorkspacePermission;
}): Promise<WorkspaceContext> {
  const workspaceId = extractWorkspaceId(params.request, params.routeParams);

  if (!workspaceId) {
    if (params.requireWorkspace) {
      throw new APIError(
        "ERR_WORKSPACE_ID_REQUIRED",
        "X-Workspace-Id header is required.",
        400,
      );
    }

    return {
      userId: params.session.id,
      workspaceId: "",
      permission: "owner",
      role: params.session.role,
    };
  }

  const permission = await assertWorkspaceAccess({
    userId: params.session.id,
    workspaceId,
    minPermission: params.minWorkspacePermission,
  });

  return {
    userId: params.session.id,
    workspaceId,
    permission,
    role: params.session.role,
  };
}

export function createApiHandler<Params, Body, SearchParams, Result>(
  schemas: {
    queryParams?: z.ZodSchema<SearchParams>;
    parameters?: z.ZodSchema<Params>;
    requestBody?: z.ZodSchema<Body>;
  },
  handler: (
    allParams: Params & Body & SearchParams,
    ctx: WorkspaceContext,
  ) => Promise<Result>,
  options: CreateApiHandlerOptions = { allowedRoles: [] },
) {
  const requireWorkspace = options.requireWorkspace ?? true;
  const minWorkspacePermission = options.minWorkspacePermission ?? "read";

  return async (
    request: NextRequest,
    ctx?: { params?: Promise<unknown> },
  ) => {
    try {
      const session = await getApiSession(request);
      if (options.allowedRoles.length > 0) {
        checkRolePermission(session, options.allowedRoles);
      }

      const body = await getApiBody(request);
      const routeParams = ctx?.params
        ? ((await ctx.params) as Record<string, string>)
        : {};
      const queryParams = getApiQueryParams(request);
      const parsedParams = schemas.parameters
        ? schemas.parameters.parse(routeParams)
        : {};
      const parsedBody = schemas.requestBody
        ? schemas.requestBody.parse(body)
        : {};
      const parsedQueryParams = schemas.queryParams
        ? schemas.queryParams.parse(queryParams)
        : {};
      const allParams = { ...parsedParams, ...parsedBody, ...parsedQueryParams };

      const workspaceContext = await resolveWorkspaceContext({
        session,
        request,
        routeParams,
        requireWorkspace,
        minWorkspacePermission,
      });

      const result = await handler(
        allParams as Params & Body & SearchParams,
        workspaceContext,
      );

      if (result instanceof Response) {
        return result;
      }

      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const first = error.issues[0];
        const message =
          first && "message" in first ? String(first.message) : "Invalid input";
        return Response.json({ error: message }, { status: 400 });
      }
      if (error instanceof APIError) {
        return Response.json(
          { error: error.code, message: error.message },
          { status: error.statusCode },
        );
      }

      console.error(error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

export type { WorkspaceContext };

import { createClient } from "npm:@supabase/supabase-js@2.119.0";

type Membership = {
  workspace_id: string;
  user_id: string;
  role: "analyst" | "reviewer";
  active: boolean;
};

type Dependencies = {
  env?: (name: string) => string | undefined;
  createClient?: (url: string, key: string, options: Record<string, unknown>) => any;
  createRequestId?: () => string;
};

type AuthResult =
  | {
      ok: true;
      user: { id: string; email?: string };
      membership: Membership;
      client: any;
      requestId: string;
    }
  | {
      ok: false;
      response: Response;
    };

function errorResponse(
  status: number,
  code: string,
  message: string,
  requestId: string,
): Response {
  return new Response(
    JSON.stringify({
      error: { code, message, requestId },
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
      },
    },
  );
}

export async function requireWorkspaceMember(
  request: Request,
  workspaceId: string,
  allowedRoles: Array<"analyst" | "reviewer"> = [],
  dependencies: Dependencies = {},
): Promise<AuthResult> {
  const requestId = (dependencies.createRequestId ?? crypto.randomUUID)();

  const authorization = request.headers.get("Authorization") ?? "";
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
  const token = tokenMatch?.[1]?.trim();

  if (!token) {
    return {
      ok: false,
      response: errorResponse(
        401,
        "UNAUTHENTICATED",
        "A valid Bearer token is required.",
        requestId,
      ),
    };
  }

  if (!workspaceId?.trim()) {
    return {
      ok: false,
      response: errorResponse(
        400,
        "WORKSPACE_REQUIRED",
        "A workspace ID is required.",
        requestId,
      ),
    };
  }

  const env = dependencies.env ?? ((name: string) => Deno.env.get(name));
  const url = env("SUPABASE_URL");
  const publishableKey =
    env("SUPABASE_PUBLISHABLE_KEY") ?? env("SUPABASE_ANON_KEY");

  if (!url || !publishableKey) {
    return {
      ok: false,
      response: errorResponse(
        503,
        "AUTH_CONFIGURATION_ERROR",
        "Authentication is not configured on this server.",
        requestId,
      ),
    };
  }

  const makeClient = dependencies.createClient ?? createClient;

  const client = makeClient(url, publishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  let user: { id: string; email?: string };

  try {
    const { data, error } = await client.auth.getUser(token);

    if (error || !data?.user?.id) {
      return {
        ok: false,
        response: errorResponse(
          401,
          "INVALID_TOKEN",
          "The supplied session is invalid or expired.",
          requestId,
        ),
      };
    }

    user = {
      id: data.user.id,
      email: data.user.email,
    };
  } catch {
    return {
      ok: false,
      response: errorResponse(
        503,
        "AUTH_SERVICE_UNAVAILABLE",
        "Unable to verify the session. Please retry.",
        requestId,
      ),
    };
  }

  let membership: Membership | null;

  try {
    const result = await client
      .from("workspace_members")
      .select("workspace_id, user_id, role, active")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (result.error) {
      return {
        ok: false,
        response: errorResponse(
          503,
          "MEMBERSHIP_CHECK_FAILED",
          "Unable to verify workspace access. Please retry.",
          requestId,
        ),
      };
    }

    membership = result.data;
  } catch {
    return {
      ok: false,
      response: errorResponse(
        503,
        "MEMBERSHIP_CHECK_FAILED",
        "Unable to verify workspace access. Please retry.",
        requestId,
      ),
    };
  }

  if (!membership || membership.user_id !== user.id || !membership.active) {
    return {
      ok: false,
      response: errorResponse(
        403,
        "WORKSPACE_ACCESS_DENIED",
        "You do not have active access to this workspace.",
        requestId,
      ),
    };
  }

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(membership.role)
  ) {
    return {
      ok: false,
      response: errorResponse(
        403,
        "INSUFFICIENT_ROLE",
        "Your workspace role does not permit this action.",
        requestId,
      ),
    };
  }

  return {
    ok: true,
    user,
    membership,
    client,
    requestId,
  };
}

export function notFoundResponse(requestId: string): Response {
  return errorResponse(
    404,
    "NOT_FOUND",
    "The requested resource was not found.",
    requestId,
  );
}

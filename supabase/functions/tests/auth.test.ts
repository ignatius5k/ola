import { assertEquals } from "jsr:@std/assert@1";
import { requireWorkspaceMember } from "../_shared/auth.ts";

const USER_ID = "user-analyst-1";
const WORKSPACE_ID = "workspace-1";

function makeRequest(token?: string): Request {
  return new Request("http://localhost/test", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function dependencies(options: {
  user?: { id: string; email?: string } | null;
  authError?: boolean;
  membership?: any;
  membershipError?: boolean;
} = {}) {
  const membershipQuery = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    async maybeSingle() {
      return {
        data: options.membership ?? null,
        error: options.membershipError ? new Error("Database unavailable") : null,
      };
    },
  };

  const client = {
    auth: {
      async getUser() {
        return {
          data: {
            user: options.user === undefined
              ? { id: USER_ID, email: "analyst@example.test" }
              : options.user,
          },
          error: options.authError ? new Error("Invalid token") : null,
        };
      },
    },
    from(table: string) {
      assertEquals(table, "workspace_members");
      return membershipQuery;
    },
  };

  return {
    env: (name: string) => ({
      SUPABASE_URL: "http://localhost:54321",
      SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
    })[name],
    createClient: () => client,
    createRequestId: () => "test-request-id",
  };
}

Deno.test("missing Bearer token returns 401", async () => {
  const result = await requireWorkspaceMember(
    makeRequest(),
    WORKSPACE_ID,
    [],
    dependencies(),
  );

  assertEquals(result.ok, false);

  if (!result.ok) {
    assertEquals(result.response.status, 401);
    assertEquals(result.response.headers.get("X-Request-Id"), "test-request-id");
  }
});

Deno.test("invalid Auth token returns 401", async () => {
  const result = await requireWorkspaceMember(
    makeRequest("invalid-token"),
    WORKSPACE_ID,
    [],
    dependencies({ authError: true }),
  );

  assertEquals(result.ok, false);

  if (!result.ok) {
    assertEquals(result.response.status, 401);
  }
});

Deno.test("active Analyst membership is accepted", async () => {
  const result = await requireWorkspaceMember(
    makeRequest("valid-token"),
    WORKSPACE_ID,
    ["analyst", "reviewer"],
    dependencies({
      membership: {
        workspace_id: WORKSPACE_ID,
        user_id: USER_ID,
        role: "analyst",
        active: true,
      },
    }),
  );

  assertEquals(result.ok, true);

  if (result.ok) {
    assertEquals(result.user.id, USER_ID);
    assertEquals(result.membership.role, "analyst");
  }
});

Deno.test("missing active membership returns 403", async () => {
  const result = await requireWorkspaceMember(
    makeRequest("valid-token"),
    WORKSPACE_ID,
    [],
    dependencies({ membership: null }),
  );

  assertEquals(result.ok, false);

  if (!result.ok) {
    assertEquals(result.response.status, 403);
  }
});

Deno.test("Analyst cannot satisfy a Reviewer-only requirement", async () => {
  const result = await requireWorkspaceMember(
    makeRequest("valid-token"),
    WORKSPACE_ID,
    ["reviewer"],
    dependencies({
      membership: {
        workspace_id: WORKSPACE_ID,
        user_id: USER_ID,
        role: "analyst",
        active: true,
      },
    }),
  );

  assertEquals(result.ok, false);

  if (!result.ok) {
    assertEquals(result.response.status, 403);
  }
});

Deno.test("membership database failure returns retryable 503", async () => {
  const result = await requireWorkspaceMember(
    makeRequest("valid-token"),
    WORKSPACE_ID,
    [],
    dependencies({ membershipError: true }),
  );

  assertEquals(result.ok, false);

  if (!result.ok) {
    assertEquals(result.response.status, 503);
  }
});

Deno.test("missing server configuration returns 503", async () => {
  const result = await requireWorkspaceMember(
    makeRequest("valid-token"),
    WORKSPACE_ID,
    [],
    {
      env: () => undefined,
      createRequestId: () => "test-request-id",
    },
  );

  assertEquals(result.ok, false);

  if (!result.ok) {
    assertEquals(result.response.status, 503);
  }
});

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return {};

  return Object.fromEntries(
    fs.readFileSync(path, "utf8")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("#") && line.includes("="))
      .map(line => {
        const index = line.indexOf("=");
        return [
          line.slice(0, index).trim(),
          line.slice(index + 1).trim().replace(/^["']|["']$/g, ""),
        ];
      }),
  );
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Local-only Ola demo account bootstrap");
  console.log("Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OLA_ANALYST_PASSWORD, OLA_REVIEWER_PASSWORD");
  process.exit(0);
}

const env = {
  ...loadEnvFile(".env.bootstrap.local"),
  ...process.env,
};

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  OLA_ANALYST_PASSWORD,
  OLA_REVIEWER_PASSWORD,
} = env;

if (
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY ||
  !OLA_ANALYST_PASSWORD ||
  !OLA_REVIEWER_PASSWORD
) {
  console.error("Missing required settings in .env.bootstrap.local.");
  process.exit(1);
}

if (
  !SUPABASE_URL.startsWith("http://127.0.0.1:") &&
  !SUPABASE_URL.startsWith("http://localhost:")
) {
  console.error("Bootstrap is restricted to local Supabase.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const workspaceId = "8ebd5f4b-89ec-55b9-9e6d-ed58be293aa1";

const accounts = [
  {
    email: "bootstrap-analyst@ola.local",
    displayName: "Bootstrap Analyst",
    role: "analyst",
    password: OLA_ANALYST_PASSWORD,
  },
  {
    email: "bootstrap-reviewer@ola.local",
    displayName: "Bootstrap Reviewer",
    role: "reviewer",
    password: OLA_REVIEWER_PASSWORD,
  },
];

const { data: listData, error: listError } =
  await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

if (listError) {
  console.error("Unable to retrieve Auth users:", listError.message);
  process.exit(1);
}

for (const account of accounts) {
  const existing = listData.users.find(
    user => user.email?.toLowerCase() === account.email.toLowerCase(),
  );

  let user;

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(
      existing.id,
      {
        password: account.password,
        email_confirm: true,
        user_metadata: { display_name: account.displayName },
      },
    );

    if (error) {
      console.error(`Unable to update ${account.role}:`, error.message);
      process.exit(1);
    }

    user = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { display_name: account.displayName },
    });

    if (error) {
      console.error(`Unable to create ${account.role}:`, error.message);
      process.exit(1);
    }

    user = data.user;
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      user_id: user.id,
      display_name: account.displayName,
    });

  if (profileError) {
    console.error(`Profile setup failed for ${account.role}:`, profileError.message);
    process.exit(1);
  }

  const { error: membershipError } = await supabase
    .from("workspace_members")
    .upsert({
      workspace_id: workspaceId,
      user_id: user.id,
      role: account.role,
      active: true,
    });

  if (membershipError) {
    console.error(`Membership setup failed for ${account.role}:`, membershipError.message);
    process.exit(1);
  }

  console.log(`Configured ${account.role} account.`);
}

console.log("Both local demo accounts are ready.");
# Ola Authentication

## Overview

Ola uses Supabase Auth email/password sessions and active workspace membership.

- Signed-out users can only access the sign-in screen.
- Active workspace members can enter the application.
- Users without active membership are denied access.
- workspace_members.role is the authorization source of truth.
- profiles.display_name is display information only.
- Browser local storage must not grant identity, workspace access, or roles.

Public account registration is disabled. Hosted invitation delivery and SMTP configuration are handled separately under SCRUM-52.

## Local prerequisites

- Node.js and npm
- Docker Desktop
- Docker Desktop running
- Supabase CLI 3.0.0
- Deno 2.x

## Start local Supabase

Run:

    npx supabase start
    npx supabase status

## Frontend environment

Create .env.local using .env.example as a reference.

Required variables:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

Never put the service-role key in a VITE_ variable.

## Local test accounts

The bootstrap script creates or updates synthetic local accounts and their workspace memberships.

Required private variables in .env.bootstrap.local:

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- OLA_ANALYST_PASSWORD
- OLA_REVIEWER_PASSWORD

Keep this file private and out of version control. Use the bootstrap script only against the local development project.

Run:

    node scripts/bootstrap-demo-users.mjs --help
    node scripts/bootstrap-demo-users.mjs

## Authentication tests

Run:

    deno test --allow-env --allow-net supabase/functions/tests/auth.test.ts
    npm test
    npm run build

## Authorization rules

Backend handlers must:

1. Read the Bearer token from the request.
2. Verify the token using Supabase Auth.
3. Resolve the user's current active workspace membership.
4. Check the required role using workspace_members.role.
5. Return 401 for missing or invalid identity.
6. Return 403 when the user lacks the required active membership or role.
7. Return 404 when a requested record is outside the user's workspace.

Never trust a client-provided role, user ID, or workspace membership as proof of authorization.
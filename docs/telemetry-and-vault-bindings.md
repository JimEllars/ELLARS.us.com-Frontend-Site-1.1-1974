# Telemetry and Vault: the five bindings, in the order they unblock each other

**Status at the last measurement:** the client is correct and the sinks are not.
`npm run probe` prints, on every run:

```
ok   /api/telemetry → names which sinks accepted the batch
       accepted but stored nowhere: kv, d1, analytics unbound (open item 1b) — the queue is correct, the sink is not
```

That sentence is the whole of items 1b, 2 and 2b in one line. This document is how to
make it change, in an order where each step is verifiable before the next one starts.

Everything here is a dashboard action. Nothing in this document requires a code change,
and nothing in it can be done by CI — which is why the plan has carried these items for so
long while the application side was repaired around them.

---

## 0. What is being fixed, and why order matters

| # | Gap | Effect today | Verified by |
|---|---|---|---|
| 1b | No D1 / KV / Analytics Engine binding | every telemetry event is answered `202` and stored nowhere | `npm run probe` (note line above) |
| 2 | RLS on `axim_vault` and `ellars-media` unverified | possibly every Vault row is readable/deletable by any anon-key holder | a service-role query, not a probe |
| 2b | `axim_vault` does not exist in the live project | every dashboard Vault call answers `PGRST205` | `curl` against PostgREST |

Order: **1b → 2b → 2**. Binding storage first means the telemetry you produce while
verifying the rest is actually kept. Creating the table (2b) before checking policies (2)
means the policies are written against a table that exists, rather than a legacy one with
no tenant column.

---

## 1. Bind the telemetry sinks (item 1b)

Do this in the Cloudflare dashboard: **Pages → `ellars-us-com-frontend-site-1-1-1974` →
Settings → Functions → Bindings**, in the **Production** environment.

### 1a. D1 — the queryable rows

1. **Storage & Databases → D1 → Create database**, name it `ellars-telemetry`. Note the
   database id.
2. Apply the schema, in order. Both files are in the repo:

   ```bash
   npx wrangler d1 execute ellars-telemetry --remote --file=migrations/0001_create_telemetry_table.sql
   npx wrangler d1 execute ellars-telemetry --remote --file=migrations/0002_telemetry_hardening.sql
   ```

   `wrangler` needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the shell. That
   token is not stored in this workspace — use a token scoped to D1 write for this account,
   and delete it afterwards.
3. In the Pages project, add binding **type `D1 database`**, **variable name `DB`** (the
   handler reads `env.DB`), and select `ellars-telemetry`.

### 1b. KV — the raw batch retention

1. **Storage & Databases → KV → Create namespace**, name it `ellars-telemetry-raw`.
2. Pages bindings: type **`KV namespace`**, **variable name `TELEMETRY_KV`** (the handler
   reads `env.TELEMETRY_KV`). Records expire after 30 days — the number `/privacy` Version 3
   publishes.

### 1c. Analytics Engine — the time series

1. **Storage & Databases → Analytics Engine → Create dataset**, name it
   `ellars_telemetry`.
2. Pages bindings: type **`Analytics Engine`**, **variable name `ANALYTICS`**
   (the handler reads `env.ANALYTICS`). The dataset name is bound, not read from env.

### 1d. The salt

The handler hashes the caller's IP with `env.TELEMETRY_SALT` and falls back to a
hard-coded string when it is absent. Set it:

1. Pages → **Settings → Variables and Secrets → Add**, name `TELEMETRY_SALT`, type
   **Secret**, value: 32+ random bytes (e.g. `openssl rand -hex 32`).

   ⚠️ Rotating this changes every IP hash. That is the point of a salt, and it is also why
   `/privacy` says the hash "cannot be reversed" rather than claiming stability over time.

### 1e. Verify — no code, no deploy

The bindings take effect on the next deployment, so trigger one (any merge, or
**Deployments → Retry deployment**), then:

```bash
npm run probe
```

Expect the note to change to:

```
ok   /api/telemetry → names which sinks accepted the batch
       stored by kv, d1, analytics
```

Partial credit is visible and honest: `stored by d1` means the other two are still unbound.
**A sink reported as `bound but failing` fails the probe** — that is a defect, unlike an
absent binding.

Then confirm a row actually exists:

```bash
npx wrangler d1 execute ellars-telemetry --remote \
  --command="SELECT event_type, timestamp, country, received_at FROM telemetry ORDER BY received_at DESC LIMIT 5"
```

The `probe_binding_check` row is the probe's own, inserted once per run with
`component_origin: DEPLOYMENT_PROBE`. Filter it out when counting reader events.

---

## 2. Create `axim_vault` (item 2b)

The live project has `ecosystem_vault` (id, created_at, updated_at — **no tenant column**)
and `telemetry_logs`. The client expects `axim_vault` with `app_id`, and answering
`PGRST205` on every call is why the dashboard's Vault, publisher and media surfaces have
never worked against production.

1. In the Supabase SQL editor, run `context/axim-vault-migration.sql` from this workspace
   (it is **not** in the repo — copy it to `migrations/0003_axim_vault.sql` first, so the
   schema is versioned like the D1 ones).
2. Set the tenancy claim on the operator user, because the policies read `app_id` from
   `app_metadata` rather than from the request:

   ```sql
   update auth.users
      set raw_app_meta_data = raw_app_meta_data || '{"app_id":"ellars.us.com"}'::jsonb
    where email = '<operator email>';
   ```

3. Verify the shape:

   ```bash
   curl -s "$SUPABASE_URL/rest/v1/axim_vault?select=id,app_id&limit=1" \
     -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY"
   ```

   Expect `200 []` (an empty table), **not** `404 PGRST205`.

---

## 3. Verify RLS, then trust it (item 2)

An empty result proves nothing: a table with RLS on and no policy also returns `[]`, and a
table with RLS *off* returns `[]` when it is empty. The only way to tell them apart is to
ask as two different identities.

1. **As the anon key** (what any visitor holds):

   ```bash
   curl -s -w '\n%{http_code}\n' "$SUPABASE_URL/rest/v1/axim_vault?select=*" \
     -H "apikey: $SUPABASE_ANON_KEY"
   ```

   Expect `[]` **and** `200`. A non-empty body is a live data leak.

2. **As a row owner** (a signed-in member's JWT): expect only that member's rows.

3. **As a second member**: expect *none* of the first member's rows. This is the check that
   actually tests the policy — `owner_id = auth.uid()` — rather than the table's existence.

4. Confirm the policies exist and are enabled:

   ```sql
   select tablename, policyname, cmd, qual
     from pg_policies
    where schemaname = 'public' and tablename in ('axim_vault', 'ellars-media');
   select relname, relrowsecurity from pg_class where relname = 'axim_vault';
   ```

   `relrowsecurity` must be `true`, and every policy's `qual` must reference `auth.uid()`.

5. Delete nothing until step 3.3 passes with a second identity. `deleteVaultItem` is a
   one-line deletion for any holder of the anon key if the policy is wrong.

---

## 4. What is still open after all of this

- **Item 1** — `SUPABASE_URL` / `VITE_SUPABASE_URL` are set to
  `https://<ref>.supabase.co/rest/v1/` rather than the bare origin. Sprint 2.9 normalises it
  in code, so this is belt-and-braces; correct it in **Settings → Variables** anyway.
- **Item 1c** — the anon key is scoped to Production only, so every preview deployment runs
  with auth dead and `/dashboard` cannot be exercised from a pull request. Add it to the
  **Preview** environment (never `service_role`), then
  `npm run probe -- --base=<preview url>` verifies it.
- **Item 3** — two services hold `SUPABASE_JWT_SECRET`, so any holder can forge tokens that
  satisfy every policy written above. Asymmetric keys/JWKS, then rotate, then scope the
  service role. This is the item that makes items 2 and 2b matter: policies are only as
  strong as the trust root behind the token.

---

## 5. Why this cannot be automated from here

Every step above is a write to infrastructure this repository does not own credentials for.
The probe can *measure* the result — that is what `sinkVerdict` exists for — and the plan
records the measurement, but the binding itself is a human action with a token that should
never pass through an agent's shell.

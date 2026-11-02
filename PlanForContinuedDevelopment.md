# Plan For Continued Development

_Documented standard: every cycle logs what changed, what it fixed, and what it deliberately left open. Open items carry the reason they are open, so the next engineer does not re-litigate a decision or re-describe a symptom as a fix._

---

## Sprint 2.6 — P0 stability and a mechanical verification gate

**Branch:** `fix/p0-stability-and-ci-gate` · **Base:** `d1cf950` (main)

### Why this cycle

Main was deployed but three of the four P0 defects from the code audit were still live in it, and there was no CI at all — so "merge when the checks are green" had nothing to check. This cycle establishes the gate, then fixes what the gate can see.

### Shipped

**Verification gate (`.github/workflows/verify.yml`)**
- `eslint --max-warnings=0`, then `npm run build`, on every PR and every push to main.
- Asserts build artifacts exist: `dist/index.html`, `dist/200.html` (the Cloudflare SPA fallback), `dist/sw.js`, `dist/_headers`, `dist/_redirects`.
- Fails the build if `api.axim.us.com` or `w3schools.com` appear in shipped code or in an active `_headers`/`_redirects` directive. The "no legacy infrastructure" rule is now enforced by a machine rather than by a paragraph in a protocol document.
- Fails if `dist/index.html` links more than one web app manifest.

**Telemetry was dead twice over** — `functions/api/telemetry.js`, `src/hooks/useTelemetry.js`
- Root cause 1 (client): `flushQueue()` returned early on `if (!apiKey)`, where `apiKey` came from `VITE_AXIM_API_KEY`. That variable is not in `.env.example`, not set in Cloudflare Pages, and not used by the edge function. Nothing was ever sent.
- Root cause 2 (edge): the handler returned at the top of `onRequestPost` when `env.DB` was absent, which skipped the KV write, the Analytics Engine write and the upstream forward — every sink was downstream of the D1 guard.
- Fixes: telemetry is same-origin only via a module constant (the `VITE_AXIM_API_URL` override and its "retry against the legacy host" fallback are gone); the client bearer token is gone; KV, D1 and Analytics Engine are three independently guarded sinks; the response is `202` carrying per-sink state plus a `degraded` flag.
- Privacy: `client_ip` stores a salted truncated SHA-256 instead of the address, and `user_agent` is no longer written. 64 KiB body cap, 50-record batch cap, CORS origin allowlist instead of `*`. The raw-IP forward of the caller's `Authorization` header to the dead AXiM host is deleted.
- `migrations/0002_telemetry_hardening.sql`: indexes on `timestamp`, `(event_type, timestamp)`, `session_id`, `received_at`; 90-day retention; backfill nulling raw addresses already stored.

**A refresh no longer logs the user out** — `src/lib/api.js`, `src/App.jsx`, `src/components/common/ProtectedRoute.jsx`, `src/store/useAppStore.js`
- `loginUser()` now calls `supabase.auth.setSession({access_token, refresh_token})`. Previously login bypassed supabase-js entirely, so `getSession()` was permanently `null`, `onAuthStateChange` never fired, and the refresh token was thrown away.
- `verifySession()` distinguishes a real session, a hard guest (401/403) and a **transient** guest (timeout/transport). Collapsing a timeout into "logged out" was one of the three compounding defects.
- `ProtectedRoute`'s predicate was `if (!session)` — but `verifySession()` never returns null, so expired tokens were never cleared by the guard whose job that was. Now `if (!session || session.isGuest)`, with transient failures explicitly preserving the session.
- Removed the `window.location.href = '/login'` full reload on Supabase 401s; the store is cleared and `ProtectedRoute` does the router-native `<Navigate>`.
- Dropped the dead `ellars_auth_token` read in the store — nothing ever wrote that key.

**CSP and embed hardening** — `public/_headers`, `src/components/intel/ArticleDetail.jsx`
- `connect-src 'https:'` (permitted exfiltration to any HTTPS host) replaced with an explicit host list. `media-src` w3schools.com residue removed. `frame-src` now carries the video origins, which is what makes Sprint 2.2's rich media actually render — DOMPurify was approving iframes the browser then refused to draw.
- Added HSTS (2 years, preload), Permissions-Policy, COOP, `frame-ancestors`, `base-uri`, `form-action`, `manifest-src`; dropped the meaningless `/functions/*` cache rule.
- The iframe allow-list used `src.startsWith('https://www.youtube.com')`, which also matches `https://www.youtube.com.attacker.tld/x`. Now parsed-origin comparison plus a strict `customer-*.cloudflarestream.com` regex, and allow-listed iframes are sandboxed.
- Deleted `src/components/home/Podcast.jsx`: imported nowhere, and its audio track pointed at the w3schools sample video.

**Vault pagination** — `src/lib/api.js`, `src/pages/Dashboard.jsx`
- Added `&order=created_at.desc`; range requests without an explicit order can duplicate or skip rows.
- `Content-Range: */0` produced `NaN`, rendered as "DISPLAYING N OF NaN".
- `hasMore` is derived from the server total instead of "a full page means there is more", which left a dead Load More click on any final page of exactly 20 rows.
- Load More is no longer gated on the client-filtered list, so filtering to a status with no rows on page 1 can no longer make pages 2+ unreachable.

**PWA identity** — `vite.config.js`, `index.html`, `public/`
- One manifest instead of two. `public/manifest.json` deleted; the generated `/manifest.webmanifest` is authoritative.
- The four icon files the manifest referenced were never committed. Composed and committed them (192, 512, maskable 512, apple-touch-icon 180, 32x32, SVG mask icon) in the established void/yellow-electric palette, with a proper `any`/`maskable` split.
- Replaced starter-repo keywords with the platform's policy vocabulary.

**Measurement:** a client event now reaches the edge. A D1 row is written **only if the binding exists** — so the first action after deploy is to confirm `/api/telemetry` returns `sinks.d1 === "ok"` rather than `"unbound"`.

---

## Sprint 2.7 — Discoverability, edge correctness, and payload weight

**Branch:** `feature/discoverability-and-edge-404` · **Base:** `1e64040`

### Shipped

**Titles were being overwritten on every route** — `src/components/Layout.jsx`
- The layout emitted its own `<title>` for the whole app. React Helmet mounts child instances before the parent's, so the layout won the dedupe: every page shipped "James Ellars | Business Development & Community Leader" in the tab, in search results and in bookmarks even though each page had a correct title. Removed.

**One static canonical declared the entire site a duplicate of the homepage** — `src/components/common/CanonicalUrl.jsx`, `index.html`
- `index.html` hard-coded `https://ellars.us.com` as the canonical on every URL, so `/platform`, `/about` and every dispatch were duplicates of `/`. A single `<CanonicalUrl />` inside the Router now emits canonical + `og:url` per route, normalising trailing slashes and dropping query strings and fragments.
- Trade-off recorded: the canonical is now emitted by JS, so a crawler that does not execute JS sees no canonical at all. Absent is better than wrong, and Google renders. If raw-HTML canonicals are needed, the fix is a crawler-facing rewrite in a Pages Function middleware.

**No `robots.txt`, no sitemap** — `public/robots.txt`, `functions/sitemap.xml.js`
- `robots.txt` now disallows `/dashboard`, `/login`, `/api/` and `/200.html`, allows the preview crawlers explicitly and points at the sitemap. Dispatch URLs are deliberately *not* disallowed, because a disallowed URL cannot pass its signals to its canonical target.
- `/sitemap.xml` is a Pages Function: 4 static routes, 6 directive slugs, every published dispatch, `s-maxage=3600`.
- WordPress timestamps are naive and are pinned to UTC (otherwise the same post yields a different `lastmod` per colo). Entities are decoded before re-escaping — WordPress sends `Siphon Economy &amp; You`, and escaping that verbatim produces `&amp;amp;`, which renders literally in a preview. Both verified against real WordPress values.

**Unknown `/api/*` paths returned the SPA shell with a 200** — `functions/api/[[path]].js`
- The `/* /index.html 200` catch-all is correct for the SPA but meant a misspelled API path looked like a healthy HTML response, so client error handling could never see a 404. The catch-all is now a JSON 404 with `no-store`. Pages Functions take precedence over `_redirects`, so `/api/telemetry` is unaffected.

**The entry bundle was 599 kB because of one import** — `src/common/SafeIcon.jsx`, `vite.config.js`, `package.json`
- `import * as FiIcons from 'react-icons/fi'` bundled the whole feather set for a string lookup. Replaced with an explicit registry of the 40 icons in use. Entry chunk 599 kB → 175 kB raw (171 kB → 48.5 kB gzip); vendor chunks split so returning visitors keep React and Supabase in cache.
- `Vote` had no `FiVote` export and had always rendered the fallback warning triangle; it now maps to `FiTarget`.
- Removed 6 unused packages (`ethers`, `echarts`, `echarts-for-react`, `date-fns`, `playwright`, `@questlabs/react-sdk`) — 156 transitive packages out of the install — and moved `eslint-plugin-react` to devDependencies. `package.json` is no longer named `quest-react-starter`.

---

## Sprint 2.8 — The build had no Supabase credential, so auth was dead in production

**Branch:** `feature/discoverability-and-edge-404` (continued) · **Base:** `1e64040`

### Why this cycle

Buttoning up 2.7 turned up a live P0 that none of the previous cycles had noticed, because nothing about it is loud: the deployed bundle contains **no Supabase SDK at all**.

### Shipped

**Root cause: a publishable key read at build time**

- `src/lib/supabase.js` created the client at module scope from `import.meta.env.VITE_SUPABASE_ANON_KEY`. The Pages project has no such variable, so Vite inlined an empty string, `createClient(...)` became dead code, and the bundler tree-shook `@supabase/supabase-js` out of the artifact. The tell was there all along: a `vendor-supabase` chunk of **0.05 kB** and a `Generated an empty chunk` warning that nobody read.
- With `supabase === null`, `verifySession()` returned a transient guest on every load, `onAuthStateChange` never subscribed, `setSession` never ran, and all ten `apikey` headers in `api.js` carried `undefined`. Supabase answers that with `UNAUTHORIZED_MISSING_API_KEY`, so **login, `/dashboard`, the Vault and media upload were non-functional in production** while every public page — WordPress feed, telemetry, static routes — looked perfectly healthy. Verified against the live artifact: no `GoTrueClient`, no auth-js strings, 178 kB entry chunk.

**Fix: configuration is resolved at runtime, not baked at build**
- `functions/api/config.js` (new): serves `{ supabaseUrl, supabaseAnonKey }` from the Pages runtime binding. Accepts `SUPABASE_ANON_KEY` (preferred), `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_KEY` or `VITE_SUPABASE_ANON_KEY`. Returns **503 `configured:false`** when unbound rather than a 200 with an empty key, and **refuses to serve a `service_role` key** (it decodes the JWT's `role` claim) because that key bypasses RLS and would hand every visitor full database access. Cached 300 s: one fetch per session, key rotation still takes effect.
- `src/lib/supabase.js` (rewritten): `getSupabaseConfig()` resolves the build-time variable first (fast path, still supported), then `/api/config` with a 4 s abort; the result is memoised. `getSupabase()` memoises the **promise**, so the singleton survives concurrent boot callers — the Web Locks constraint the previous cycle fixed is preserved, not weakened. The SDK is now imported **dynamically**, so it lands in its own async chunk instead of the entry bundle and can no longer be tree-shaken away when the key arrives at runtime.
- Failure is now loud: one `console.error` plus a `SUPABASE_CONFIG_MISSING` telemetry event (`severity: CRITICAL`), fired once per page load.
- `src/lib/api.js`: all ten `apikey` headers and eleven base-URL template strings resolve through the memoised config. `loginUser()` refuses early with "Sign-in is unavailable on this deployment…" instead of forwarding a literal `undefined` apikey and calling the resulting 401 bad credentials. `verifySession()` treats an unconfigured deployment as **transient**, so it can never clear a persisted session. The `fetchWithRetry` 401 branch compared against the removed `SUPABASE_URL` constant — it would have thrown a `ReferenceError` on the first session-expiry 401 — and now matches on `.supabase.co`.
- `src/App.jsx`: the auth subscription attaches when the client resolves, with a `disposed` guard so an unmounted effect cannot leak a `setToken` callback.

**Verification**
- `scripts/smoke-functions.mjs` (new, `npm run test:functions`): 22 assertions over `/api/config` (unbound → 503, alias handling, `service_role` refusal, cache headers) and the sitemap helpers (no double-escaped entities, naive WordPress timestamps pinned to UTC). Wired into CI as a gate — this is the first test floor in the repo.
- New CI guard: **fails the build if no `GoTrueClient` appears in `dist/assets`**. A key-less build can no longer ship a site whose auth is silently dead.
- `wrangler pages dev` end-to-end, both configurations: with a binding, `/api/config` → 200, the SDK chunk is fetched at runtime, `/api/unknown` → JSON 404, `/sitemap.xml` → 65 URLs (4 static + 6 directives + 55 live dispatches, every `lastmod` zoned, no `&amp;amp;`). Without a binding, `/api/config` → 503, the public site still renders, and `/login` shows the honest message instead of a mystery 401.

### Cleanup carried in the same branch

- `src/components/Layout.jsx`: `<div>` and the skip link had been collapsed onto one line by the 2.7 edit. Restored, and the skip link is restyled to the brand palette (`bg-void` / `text-yellow-electric`) instead of `bg-blue-600`.
- `src/App.jsx`: removed the second skip link. It pointed at `#content`, an id no element has ever carried, so keyboard users got two tab stops and the first went nowhere. `Layout` owns the single link, targeting the real `#main-content`.
- `vite.config.js`: dropped the `vendor-supabase` manual-chunk entry that produced the empty chunk; `@supabase/supabase-js` is a dynamic import now, so Rollup emits it correctly on its own.
- `eslint.config.js`: lints `*.mjs` at `ecmaVersion: 2022` (top-level await in the smoke script), so the new script is covered by the same zero-warning gate.
- `.env.example`: documents both classes of variable — `VITE_*` inlined at build time vs bare names read at runtime by Functions — and says plainly that `SUPABASE_ANON_KEY` is required.

### Required action before this is live

Bind **`SUPABASE_ANON_KEY`** (the publishable/anon key, never `service_role`) in the Pages project environment, Production *and* Preview. Until then `/api/config` answers 503 and the site behaves exactly as it does today: public pages fine, auth dead — but now it says so.

### Measurement

`curl -s https://ellars.us.com/api/config | jq .configured` → `true`. Then a hard refresh on `/dashboard` stays on `/dashboard`.

---

## Sprint 2.9 — A missing chunk hash was answered with the HTML shell, and the project URL was the REST endpoint

**Branch:** `fix/edge-asset-404-and-config-url` · **Base:** `95bfbf1`

### Why this cycle

Two defects found while verifying the production deploy of 2.8. Both are the same shape as everything else this month: nothing throws, nothing looks wrong, and the damage is invisible until someone loads the site at the wrong moment.

**1. A missing hashed asset returned `index.html` with a 200**
- `public/_redirects` is a single `/* /index.html 200`. That is right for SPA routes and wrong for `/assets/*`. Request `https://ellars.us.com/assets/index-doesnotexist123.js` and the response is **200 `text/html`** with the app shell — because a hashed asset that 404s is not a typo, it is a stale reference.
- Concretely observed: after the 2.8 merge, a document served from the service-worker cache referenced the previous release's entry chunk. The browser fetched that hash, received `<!doctype html>` where a module was expected, refused to execute it, and rendered a **white page** with a MIME-type error in a console nobody opens. Two releases were live on different colos at the same time; every client in that window is exposed.
- `functions/assets/[[path]].js` (new) proxies real assets through untouched — content type and the `immutable` cache rule are the asset's own — and turns a miss into a real **404 `text/plain`, `no-store`**, which a module loader fails cleanly and a recovery path can recognise. Static assets still win the fast path; only misses reach the Worker.

**2. The bound Supabase project URL is the PostgREST endpoint, not the origin**
- The Pages project binds `SUPABASE_URL` as `https://pvbcdndqjguzqeafhwhw.supabase.co/rest/v1/`, and `VITE_SUPABASE_URL` is inlined at build time with the same value. supabase-js appends its own paths, so the client inside the shipped bundle asks for `…/rest/v1/auth/v1/token`. Measured: that URL answers **404**; the correct base answers **400** ("invalid credentials", i.e. alive). **Login is broken in production for this reason**, independently of the missing-key defect fixed in 2.8.
- Both resolvers now normalise to the project origin, stripping `/rest/v1`, `/auth/v1`, `/storage/v1`, `/realtime/v1` and `/functions/v1`, trailing slashes and any query/fragment. `functions/api/config.js` and `src/lib/supabase.js` carry the same guard, because a plausible-looking wrong binding must not be able to break the client.
- Unparseable values fall back to the default project rather than shipping a broken base URL.

### Tests

- `scripts/smoke-functions.mjs` → **33 assertions** (was 22). New: asset handler passthrough keeps content type and `immutable`; a miss returns 404/`no-store`/`nosniff`; no `ASSETS` binding degrades to 404 rather than throwing; `/api/config` strips `rest/v1`, `auth/v1` and trailing slashes, and falls back on an unparseable URL.

### Verified

- `wrangler pages dev`: a real hashed asset is served with `application/javascript` and its immutable cache header; `/api/config` returns a normalised origin.
- Production probe recorded above: 404 on the malformed auth path, 400 on the correct one.

### Note for the next engineer

`_redirects` cannot express "serve index.html only when no file exists". If a future route under `/assets/`, `/images/` or any other static directory must behave like an asset, it needs the same Function treatment — otherwise it silently inherits the SPA shell.

---

## Open items (prioritised, with the blocker on each)

| # | Item | Blocker | Notes |
|---|---|---|---|
| 1 | **Supabase env values in the Pages project** | Cloudflare dashboard | The anon key *is* bound (verified: `/api/config` → `configured:true`), but `SUPABASE_URL` **and** `VITE_SUPABASE_URL` are set to `https://<ref>.supabase.co/rest/v1/`. Sprint 2.9 normalises it client- and edge-side; the binding should still be corrected to the bare origin so the guard becomes belt-and-braces. |
| 1b | **D1 binding for telemetry** | Cloudflare dashboard | Without it the handler now reports `d1: "unbound"` and `degraded: true` instead of pretending success. Apply `migrations/0001` + `0002` first. |
| 2 | **RLS on `axim_vault` + `ellars-media`** | Database access | Every Vault read/write is raw PostgREST with the anon key. If RLS is not user-scoped, `deleteVaultItem` is a one-line deletion for any anon-key holder. **Verify before any further Vault work.** |
| 3 | **JWT trust root** | Infrastructure | `axim-passport-api` and `axim-seo-worker` both hold `SUPABASE_JWT_SECRET`. Any holder can forge tokens that satisfy every RLS policy. Target: asymmetric keys/JWKS, then rotate, then scope the service role. |
| 4 | **Raw-HTML metadata for non-JS crawlers** | This branch's successor | Canonical, `og:*` and `<title>` are now correct only after hydration. A crawler-facing rewrite in a Pages Function middleware (inject per-URL og/twitter/canonical for known UA strings) closes it. Note the trade-off: Cloudflare caches by URL and ignores `Vary: User-Agent` on cached HTML, so a crawler-triggered render can briefly be served to a browser. |
| 5 | **`<UpdatePrompt />` unmounted + competing service workers** | Next prioritised | Now with a symptom on record: a post-deploy client held a document from the SW cache, requested the previous release's chunk hash, and got the HTML shell back — a white page. Sprint 2.9 makes that failure clean (404) but not absent; the update handshake is what removes it. Currently: The prompt component is rendered nowhere, and the shipped workbox SW calls `skipWaiting()` in `install`, so it never enters the `waiting` state the prompt detects. Separately, `public/sw.js` (the hand-written SW with feed SWR strategies) is never deployed — the plugin overwrites it. One design has to win: pick `injectManifest` with the hand-written worker, or drop it and mount the prompt. |
| 6 | **`script-src 'unsafe-inline'`** | Security review | Retained deliberately in `_headers` with a comment. Removing it requires verifying the Turnstile loader and the Cloudflare Web Analytics beacon against nonces. |
| 7 | **Newsletter funnel** | `axim-passport-api` route | `VITE_CF_FORM_ENDPOINT` and `VITE_TURNSTILE_SITE_KEY` are unset at build time. `subscribeToNewsletter` posts to `/api/v1/subscribe`, which has no Pages Function, so the UI errors honestly. Needs the passport-api form route, then the env var and `https://passport.axim.us.com` in `connect-src`. |
| 8 | **Phantom content** | Editorial decision | `FALLBACK_POSTS` in `api.js` renders three fully-formed dispatches that do not exist in WordPress, and `NewsMedia.jsx` hard-codes four episodes against Unsplash thumbnails and a sample Cloudflare Stream video. Either label them as offline cache or empty them — a journalist clicking one hits a stub. |
| 9 | **No unit-test floor (partly closed)** | This branch's successor | `scripts/smoke-functions.mjs` now covers `/api/config` and the sitemap helpers in CI (22 assertions, no runner needed). Still uncovered: telemetry sink independence, vault row-shape mapping, and the crawl/404 rules — those need component-level tests, i.e. `vitest` as a real dependency. |
| 10 | **Repo hygiene and sourcemaps** | This branch's successor | 2.4 MB of PNG screenshots at the repo root, `test-results/`, `commit_message.txt`, and `build.sourcemap: true` shipping a 2.3 MB map per chunk to the CDN. Also `og:image` points at a 559 kB asset. |
| 11 | **Duplicate Supabase 401 handling** | Reviewed next cycle | `fetchWithRetry` still logs `logApiErrorToTelemetry` for every failure path; confirm the reduced redirect logic does not double-report. |

---

## Accomplishments (Sprint 2.1)
- **Telemetry Batch Writes Verification**: Verified that Cloudflare D1 telemetry batch insertions use a defensive `try/catch` approach, continuing to Analytics Engine writes despite SQL issues.
- **WP Feed Fallback Telemetry**: Verified `wp_feed_fallback_served` telemetry events are automatically dispatched from `src/lib/api.js` on fetch errors/timeouts, and ensured `401` fallbacks do not invalidate Supabase sessions.
- **Automation Calculator Enhancements**: Embedded a direct integration inside `src/components/intel/AutomationCalculator.jsx` to export projections directly into Vault Drafts (`ellars_dispatch_draft` inside `localStorage`), forwarding the user to the publisher toolkit via `useNavigate`.
- **Production SEO Metadata**: Verified production-ready metadata, canonicals, and OG/Twitter headers in `index.html`.

## Roadmap Milestones (Sprint 2.9+)
- Bind `SUPABASE_ANON_KEY` and prove the auth path end to end (PR #218).
- Crawler-facing metadata rewrite (canonical, og/twitter, `lastmod`) inside a Pages Function middleware.
- Resolve the service-worker duplication and mount `<UpdatePrompt />` with a real `waiting` handshake.
- Restore a unit-test floor (`vitest`) for the four silent-failure surfaces.
- Expand D1 querying components on the frontend to visualise site telemetry (now that events actually arrive).
- Optimise caching and payload sizes for Vault and WP API requests.

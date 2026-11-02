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

## Open items (prioritised, with the blocker on each)

| # | Item | Blocker | Notes |
|---|---|---|---|
| 1 | **D1 binding for telemetry** | Cloudflare dashboard | Without it the handler now reports `d1: "unbound"` and `degraded: true` instead of pretending success. Apply `migrations/0001` + `0002` first. |
| 2 | **RLS on `axim_vault` + `ellars-media`** | Database access | Every Vault read/write is raw PostgREST with the anon key. If RLS is not user-scoped, `deleteVaultItem` is a one-line deletion for any anon-key holder. **Verify before any further Vault work.** |
| 3 | **JWT trust root** | Infrastructure | `axim-passport-api` and `axim-seo-worker` both hold `SUPABASE_JWT_SECRET`. Any holder can forge tokens that satisfy every RLS policy. Target: asymmetric keys/JWKS, then rotate, then scope the service role. |
| 4 | **Per-route canonical** | This branch's successor | `index.html` carries one static `<link rel="canonical" href="https://ellars.us.com">`, so every deep link declares itself a duplicate of the homepage and the dispatches are suppressed from indexing. Needs a per-route canonical emitted from the layout. |
| 5 | **`<UpdatePrompt />` unmounted + competing service workers** | This branch's successor | The prompt component is rendered nowhere, and the shipped workbox SW calls `skipWaiting()` in `install`, so it never enters the `waiting` state the prompt detects. Separately, `public/sw.js` (the hand-written SW with feed SWR strategies) is never deployed — the plugin overwrites it. One design has to win: pick `injectManifest` with the hand-written worker, or drop it and mount the prompt. |
| 6 | **`script-src 'unsafe-inline'`** | Security review | Retained deliberately in `_headers` with a comment. Removing it requires verifying the Turnstile loader and the Cloudflare Web Analytics beacon against nonces. |
| 7 | **Newsletter funnel** | `axim-passport-api` route | `VITE_CF_FORM_ENDPOINT` and `VITE_TURNSTILE_SITE_KEY` are unset at build time. `subscribeToNewsletter` posts to `/api/v1/subscribe`, which has no Pages Function, so the UI errors honestly. Needs the passport-api form route, then the env var and `https://passport.axim.us.com` in `connect-src`. |
| 8 | **Phantom content** | Editorial decision | `FALLBACK_POSTS` in `api.js` renders three fully-formed dispatches that do not exist in WordPress, and `NewsMedia.jsx` hard-codes four episodes against Unsplash thumbnails and a sample Cloudflare Stream video. Either label them as offline cache or empty them — a journalist clicking one hits a stub. |
| 9 | **Dead dependencies and bundle** | This branch's successor | `ethers`, `echarts`, `echarts-for-react`, `date-fns`, `playwright` (in production deps), `react-icons`, `@questlabs/react-sdk` have zero imports. `dist/assets/index-*.js` is 599 kB / 171 kB gzip in a single chunk; needs `manualChunks`. |
| 10 | **Repo hygiene** | This branch's successor | 2.4 MB of PNG screenshots at the repo root, `test-results/`, `commit_message.txt`, `package.json` still named `quest-react-starter`, and `build.sourcemap: true` shipping a 2.3 MB map. |
| 11 | **Duplicate Supabase 401 handling** | Reviewed next cycle | `fetchWithRetry` still logs `logApiErrorToTelemetry` for every failure path; confirm the reduced redirect logic does not double-report. |

---

## Accomplishments (Sprint 2.1)
- **Telemetry Batch Writes Verification**: Verified that Cloudflare D1 telemetry batch insertions use a defensive `try/catch` approach, continuing to Analytics Engine writes despite SQL issues.
- **WP Feed Fallback Telemetry**: Verified `wp_feed_fallback_served` telemetry events are automatically dispatched from `src/lib/api.js` on fetch errors/timeouts, and ensured `401` fallbacks do not invalidate Supabase sessions.
- **Automation Calculator Enhancements**: Embedded a direct integration inside `src/components/intel/AutomationCalculator.jsx` to export projections directly into Vault Drafts (`ellars_dispatch_draft` inside `localStorage`), forwarding the user to the publisher toolkit via `useNavigate`.
- **Production SEO Metadata**: Verified production-ready metadata, canonicals, and OG/Twitter headers in `index.html`.

## Roadmap Milestones (Sprint 2.7+)
- Per-route canonical + `robots.txt` + `/sitemap.xml` Pages Function; crawler-only og/twitter rewrite so shared dispatches preview correctly.
- Resolve the service-worker duplication and mount `<UpdatePrompt />` with a real `waiting` handshake.
- Real JSON 404s for unmatched `/api/*` (the `/* /index.html 200` catch-all currently returns the SPA shell with a 200 for unknown API paths).
- `manualChunks` split and removal of the seven unused dependencies.
- Expand D1 querying components on the frontend to visualise site telemetry (now that events actually arrive).
- Optimise caching and payload sizes for Vault and WP API requests.

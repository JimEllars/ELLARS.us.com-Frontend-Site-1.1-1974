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

## Sprint 2.10 — The PWA had no update handshake, so clients stayed on deleted builds

**Branch:** `fix/pwa-update-handshake` · **Base:** `3301f3d`

### Why this cycle

Reproduced live while verifying 2.9. This browser had visited the site earlier; after two further production deploys it was **still running a three-release-old document**, whose entry chunk (`index-X9zi6rQC.js`) no longer existed. The page was blank and the console held a MIME-type error. Root cause chain, all four links real:

1. `registerType: 'autoUpdate'` plus workbox's `NavigationRoute` bound to a **precached `index.html`** means navigation is served from the worker cache, not the network.
2. `src/main.jsx` registered the worker and then never asked it to check for an update again.
3. The `updatefound` handler set `updateAvailable` in the store — and `<UpdatePrompt />` was **mounted nowhere**, so the user was told nothing.
4. `public/sw.js` (a hand-written worker with feed/font strategies) looked editable but was overwritten by the plugin at build time. It never shipped.

### Shipped

**`src/lib/swPolicy.js` (new)** — the decisions, pure and testable: `decideOnControllerChange({ hadController, audioPlaying, alreadyReloaded })` returns `ignore` (first install — nothing stale to replace), `reload` (update, no audio), or `prompt` (audio playing, or this tab already reloaded once — a reload loop is worse than a stale page). `isRegistrationCurrent()` reports whether a registration is already on the current build.

**`src/lib/serviceWorker.js` (new)** — registration with `updateViaCache: 'none'` (the worker script itself was cacheable), an update check on load, on `visibilitychange` and on `online` (throttled to 5 minutes), and the `controllerchange` handshake that acts on the policy. Skipped entirely outside `PROD`, so a dev session never registers a worker.

**`<UpdatePrompt />` is mounted** — it existed, styled, in the brand palette, and unreachable. It now appears when the policy chooses `prompt`, which is the audio-safe path: the station is a flagship surface and a new version can wait for a click.

**`index.html` bootstrap guard** — the last line of defence for a document that is *already* stale: if the entry module fails to load, the inline script (runs before the module) clears the caches, unregisters the workers and reloads **once per session**. Without it the user sits on a blank page forever, because the recovery lives in the bundle that failed to load.

**One worker design wins** — `public/sw.js` deleted. Its intent was not lost: `workbox.runtimeCaching` now carries the intelligence-feed `StaleWhileRevalidate` (`intel-feed`, 40 entries / 24 h) and Google Fonts `CacheFirst` (`google-fonts`, 20 entries / 1 year) routes, verified present in the generated `dist/sw.js`.

### Tests

`scripts/smoke-client.mjs` (new, `npm run test:client`) — 10 assertions over the policy: no reload on first install, reload on update, audio downgrades to prompt, second update prompts instead of looping, current/installing/waiting registration states. `npm test` runs client + functions (45 assertions total) and CI now calls `npm test`.

### Note

The 2.9 asset 404 and this handshake are complementary and both are required: the 404 makes the failure legible, the handshake makes it rare. Neither removes the need for the bootstrap guard, which is the only thing that can rescue a client already stuck.

---

## Sprint 2.11 — Metadata in the bytes that arrive first

**Branch:** `feature/edge-metadata` · **Base:** `1f745a2`

### Why this cycle

Open item 4: canonical, `og:*` and `<title>` were correct only after hydration, so a crawler that does not execute JavaScript saw the site title on every URL and no canonical at all. Sprint 2.7 deliberately chose absent over wrong; this closes the absence.

The recorded hazard was `Vary: User-Agent` — Cloudflare caches HTML by URL, so a crawler-only render can be served to a browser. The answer here is not a UA sniff: **the same document is generated for everyone**, which removes the variance entirely and gives browsers the right title on first paint as a side effect.

### Shipped

**`lib/edge/meta.js` (new)** — the route table and the rewrite, pure and testable.
- Mirrors the router: 4 static routes, 6 directive slugs, `/login` and `/dashboard` (noindex), `/articles/:slug` (own canonical, generic title until WordPress supplies the real one).
- Titles are copied **verbatim from each page's own `<Helmet>`**, so hydration is a no-op rather than a visible flicker. Asserted in CI for all five static routes.
- Canonical normalisation matches the client: trailing slash stripped, query and hash dropped.
- `canonicalOriginFor()` pins production to `https://ellars.us.com` so a `*.pages.dev` deployment never advertises itself as the canonical home of a page; `isPreviewHost()` marks any non-production host `noindex` — preview URLs are public.
- Escaping is applied once, in attribute context; idempotence is asserted (running the rewrite twice produces identical bytes, so an edge cache cannot compound it).

**`functions/_middleware.js` (new)** — only for `GET` requests that asked for a document (`Accept: text/html`) and only for paths the table knows; everything else calls `next()` untouched.
- Fetches the shell through `env.ASSETS` and rewrites the head: title, description, `og:title/description/url`, `twitter:title/description`, `canonical`, `robots`.

### The near-miss worth recording

The first version returned a hand-written header list — `Content-Type`, `Cache-Control`, `nosniff` — and therefore **silently dropped the Content-Security-Policy, HSTS, COOP, frame-options and Permissions-Policy** from every page, because a Functions response does not inherit `public/_headers`. Caught by diffing headers against the static asset before shipping. The handler now passes the shell's headers through wholesale, dropping only `Content-Length`, `Content-Encoding` and `ETag` (the body was rewritten; a stale validator would be a lie). CI asserts the CSP and HSTS survive.

### Tests

`npm run test:functions` → **79 assertions** (12 new): per-route resolution, trailing-slash and query normalisation, noindex on private routes, per-article canonicals, preview-host handling, escaping without double-escaping, idempotence, single canonical/robots/title tags, middleware passthrough for assets and unmapped paths, and the CSP/HSTS/ETag header contract.

### Verified

`wrangler pages dev`, Accept: text/html: every route returns its own title, canonical and robots; `/login` and `/dashboard` are `noindex, nofollow`; `/api/config` and a missing asset are untouched; security headers match the static asset.

### Known limit

`/articles/:slug` gets a per-article canonical but a generic title, because the real one lives in WordPress and a fetch on the navigation path is a latency and availability risk. The client replaces it after hydration, and Google renders. Closing it properly means caching WP titles at the edge — a later increment, not a rewrite here.

---

---

## Sprint 2.12 — The shell answers for files and pages that do not exist

**Branch:** `fix/soft-404s-and-edge-file-misses` · **Base:** `15b354d` (main)

### Why this cycle

A live probe of production for the previous sprints' own guarantees turned up
three defects that share one shape: **the SPA shell is a 200, and Cloudflare will
serve it for anything.** Every one of them is invisible from a browser and loud
to a crawler or a scraper.

| Probe | Was | Now |
|---|---|---|
| `GET /screenshot_home.png` (the `og:image`) | `200 text/html` — the shell | `404 text/plain`, `no-store` |
| `GET /platform/not-a-directive` | `200` shell, `index, follow`, no canonical | `404`, `noindex, follow`, `404 Signal Lost` title, no canonical |
| `GET /assets/<missing>.js` | `404 text/plain` (Sprint 2.9) | unchanged |
| `GET /pwa-192x192.png` | `public, max-age=31536000, must-revalidate, immutable` | one value (see 2.13 for the final TTL) |

### Shipped

**Social previews had no image at all** — `index.html`, `public/og-image.png`, `scripts/generate-og-image.py`
- `og:image` and `twitter:image` both named `https://ellars.us.com/screenshot_home.png`. That file was **never committed** (the only screenshots in the repo are the three loose PNGs at the root, none of them this one), so every share previewed as a bare card, and the request for it was answered by the HTML shell.
- Generated a real 1200×630 card from the palette — void field, electric-yellow constructed mark, deco frame, scanline texture, text-free per the brand rule — 78 kB, well under the scraper limit. Committed with the script that produces it (`python3 scripts/generate-og-image.py`), so the asset is reproducible rather than a binary nobody can regenerate.
- Added `og:image:type/width/height/alt` and `twitter:image:alt`. Excluded it from the service-worker precache: scrapers fetch it, visitors never do.

**A missing file of any extension returned the shell** — `lib/edge/assets.js` (new), `functions/_middleware.js`, `functions/assets/[[path]].js`
- Sprint 2.9 fixed this for `/assets/*` only, because that is where it produced a white page. The rule now lives in `lib/edge/assets.js` and is applied by both the `/assets/*` Function and the root middleware, so `/screenshot_home.png`, `/whatever.webp` and every other binary/media path answer with a real `404 text/plain`, `no-store`, `nosniff`.
- Extension matching is deliberately narrow (binary/media only). `xml`, `json`, `txt` and `html` are excluded because they have handlers of their own — treating `/sitemap.xml` as a file would have 404'd the sitemap, which is exactly what the first version of this change did in `wrangler pages dev`. Caught before it shipped; `/sitemap.xml`, `/200.html` and `/index.html` are now explicitly reserved.
- A dispatch slug containing a dot (`/articles/prices.and.paychecks`) is not a file request: only the listed extensions qualify.

**Unknown routes were indexable soft 404s** — `lib/edge/meta.js`, `functions/_middleware.js`
- `_redirects` can only answer `200`, so a typo'd or removed path got the shell with `index, follow`, the site title and no canonical — the exact profile a crawler keeps.
- `resolveMeta()` still returns `null` for a path it does not know (the decision that made 2.11 testable); the middleware now interprets `null` as *the router does not serve this* and renders the shell with `status: 404`, the NotFound page's own title (`404 Signal Lost | James Ellars`, copied verbatim so hydration is a no-op), `noindex, follow`, `Cache-Control: no-store` and **no canonical** — a self-canonical is how a soft 404 legitimises itself. `applyMeta()` gained the branch that drops the tag instead of writing `href="undefined"`.
- `/articles/:slug` deliberately stays `200`: whether a dispatch exists lives in WordPress, and a fetch on the navigation path is the latency/availability trade-off already recorded in 2.11.

**Contradictory cache headers on every asset** — `public/_headers`
- Pages merges the headers of every matching rule instead of overriding, so `Cache-Control` on `/*` was **concatenated** onto each specific rule. Measured in production: `/sw.js` shipped `public, max-age=0, must-revalidate, no-cache, no-store, must-revalidate`. Contradictory directives in one header are undefined behaviour, and on the service worker — the one file that decides whether a client ever picks up a new build — that is how a stale worker survives a deploy.
- `Cache-Control` is now declared only on specific rules (`/`, `/index.html`, `/200.html`, `/sw.js`, `/manifest.webmanifest`, `/assets/*`, `/*.png|svg|webm|woff2`, `/api/*`), and the wildcard rule carries security headers only. Verified single-valued on every surface in `wrangler pages dev`.

### Tests

`npm run test:functions` → **134 assertions** (was 115). New: file-extension classification (including the slug-with-dots and `/sitemap.xml` exclusions), reserved paths, missing image → 404/`no-store`/not-HTML, real image passthrough with its own content type and `immutable`, unknown route → 404 + noindex + NotFound title + no canonical + `no-store`, dispatch path still 200, `/api/*` untouched, and a **router ↔ edge-table drift guard** that parses `src/App.jsx` and asserts every `<Route path>` resolves in `lib/edge/meta.js`. Plus the social card: declared, absolute, present in `public/`, a real PNG, 1200×630, under 300 kB, `twitter:image` identical to `og:image`; and the `_headers` rules: no `Cache-Control` on `/*`, at most one per rule, `/sw.js` never storable.

CI gains an artifact assertion: `dist/index.html`'s `og:image` must resolve to a file that is actually in `dist/`. A missing social card is now a red build rather than a silent one.

### Verified

`wrangler pages dev` with `Accept: text/html` on every route: `/`, `/platform`, `/about` → 200 with their own titles; `/platform/not-a-directive` → 404 noindex; `/articles/anything` → 200; `/sitemap.xml` → 200 `application/xml`; `/og-image.png` → 200 `image/png` immutable; `/screenshot_home.png` and `/assets/nope.js` → 404 `text/plain`; `/api/config` → JSON 503 locally (no binding, as designed) and `/api/nope` → JSON 404. One `Cache-Control` value on every surface. A real browser load of an unknown path renders the branded 404 and its redirect home.

### Known limits

- `og:image` is one card for the whole site. Per-article cards need the WordPress featured image in a `og:image` rewrite, which belongs with the article-title work already recorded as the 2.11 limit.
- The 404 status is decided by the route table, so a new page must be added to `lib/edge/meta.js` in the same commit as `src/App.jsx`. The drift guard now fails CI if that is forgotten — but it parses App.jsx, so a route created outside `<Route path>` would still slip through.

---

## Sprint 2.13 — An unhashed URL cannot be `immutable`, and the cache had already proved it

**Branch:** `fix/static-asset-cache-poisoning` · **Base:** `78a2148` (main)

### Why this cycle

Found while verifying 2.12 in production, minutes after the merge.

The new social card deployed correctly — `https://ellars.us.com/og-card.png`
answers `200 image/png` — but the URL that was actually advertised,
`/og-image.png`, answered `200 text/html`, `age: 945`, `cf-cache-status: HIT`,
with the **old** merged cache header still attached. The edge had cached the SPA
shell *as if it were an image*, and `_headers` had told it to keep it for a year.
No deploy can fix that: the bytes at that URL are pinned until the entry expires
or someone purges it, and nothing in this project can purge (see below).

The rule that allowed it:

```
/*.png
  Cache-Control: public, max-age=31536000, immutable
```

`immutable` is a promise that the bytes at a URL never change. That is true for
`/assets/*`, where Vite content-hashes every filename — a changed file is a
changed URL. It is false for every root-level file: `og-card.png`,
`pwa-192x192.png`, `favicon.svg` are all names that get reused. Combined with
2.12's defect — every `.png` miss answered by the shell with a 200 — the first
request for a not-yet-deployed image taught every edge colo and every browser to
keep the HTML for a year.

### Shipped

**The card lives at a URL no cache has ever seen** — `public/og-card.png`, `index.html`, `scripts/generate-og-image.py`, `vite.config.js`
- Renamed from `og-image.png`. This is the only fix available without purge credentials, and it is the correct one anyway: a versioned URL is what a long-lived asset should have. Regenerating the card means bumping this name.

**Root-level media is cached for a day, not a year** — `public/_headers`
- `/*.png`, `/*.svg`, `/*.webm`, `/*.woff2` → `public, max-age=86400`. A replaced file propagates within a day; a hashed build asset keeps `immutable` under `/assets/*`, where the name guarantees the promise.
- The reasoning is written into the file next to the rules, with the measured `age: 945` / `HIT` evidence, because the next person to "optimise" this will otherwise put the year back.

### Tests

`npm test` → **136 assertions** (was 134). New: `immutable` is declared on exactly one rule and that rule is `/assets/*`; no rule outside `/assets/*` may carry a `max-age` over a day. Both fail loudly if someone re-adds a year-long root rule.

### Verified

`wrangler pages dev`: `/og-card.png` → `200 image/png`, `public, max-age=86400`; `/og-image.png` → `404 text/plain`, `no-store`; every other surface single-valued.

### The reason this could not simply be purged

`src/lib/api.js` fires `fetch('/api/v1/cache/purge-tag', …)` on publish and
swallows the result. The endpoint **does not exist**: `POST
https://ellars.us.com/api/v1/cache/purge-tag` answers
`{"error":"not_found"}` from the `/api/[[path]]` catch-all. Sprint 2.5 recorded it
as shipped ("returns `501 purge_not_configured` until `CF_ZONE_ID` and
`CF_PURGE_TOKEN` are bound"), and it is not in `functions/` — so there has never
been a purge path, and a poisoned URL had no eviction route other than waiting
out its TTL. Logged as open item 12; the honest options are to build it (and bind
the token) or delete the dead call.

### Known limits

- `/screenshot_home.png` remains cached as HTML for anyone holding an old document
  or a warm colo. Nothing references it now; the card was renamed rather than
  repaired. A purge is the only way to shorten that.
- Root media at one day means an icon change is not instant. That is the intended
  trade: bounded staleness beats an unbounded commitment.

---

## Sprint 2.14 — `robots.txt` was a casualty of the same rule (hotfix)

**Branch:** `fix/static-text-paths` · **Base:** `95811ac`

### Why this cycle

The post-merge regression sweep on `main` — every public surface, with
`Accept: text/html` — found `/robots.txt` answering **`404 text/html`** with the
NotFound title. It had been 200 before 2.12 because the document branch simply
fell through to `_redirects` when it did not recognise a path; 2.12 made "does
not recognise this path" mean "404", and `robots.txt` is not a route.

Crawlers survived it by luck: Googlebot fetches robots.txt with `Accept: */*`,
so `wantsDocument()` was false and the request still reached the asset pipeline.
Every other client — a browser, a monitoring check, a human with curl — got a 404
for the file that defines the whole crawl policy.

### Root cause and fix

`lib/edge/assets.js` classified only binary/media extensions as files. Text files
that are nonetheless files — `robots.txt`, `manifest.webmanifest`, a stray
`.json` — were left to the document branch. There is now an explicit
`DOCUMENT_EXTENSIONS` set and `isStaticFileRequest()`, which is what the
middleware uses: a known extension means "the asset pipeline or a 404", never
"the router".

`/sitemap.xml` stays out of that set on purpose — it is a Pages Function, and is
handled by `isReservedPath`.

### Tests

`npm test` → **144 assertions** (was 136). New: `robots.txt` / `manifest.webmanifest`
/ `sw.js` classify as static file requests; `/platform` and a dispatch slug ending
in dots do not; `robots.txt` answers 200 with `text/plain` even when the request
asks for HTML; a missing `.txt` is a 404 rather than the shell.

### Verified

`wrangler pages dev` with `Accept: text/html` on every surface: `/robots.txt` 200
`text/plain`, `/sitemap.xml` 200 `application/xml`, `/manifest.webmanifest` 200
`application/manifest+json`, `/og-card.png` 200 `image/png`, `/sw.js` 200
`application/javascript`, `/articles/prices.and.paychecks` 200 (slug logic intact),
`/gone.txt` 404 `text/plain`, `/platform/nope` 404 noindex.

### What this says about 2.12's verification

2.12 verified the paths it had reasoned about. It did not enumerate the static
surface, so the one file whose absence is invisible in a browser — and decisive
for crawlers — was the one that broke. The lesson is now encoded rather than
remembered: the smoke suite asserts the classification of every root static file
type, not just the ones a sprint happened to touch.

## Open items (prioritised, with the blocker on each)

| # | Item | Blocker | Notes |
|---|---|---|---|
| 1 | **Supabase env values in the Pages project** | Cloudflare dashboard | The anon key *is* bound (verified: `/api/config` → `configured:true`), but `SUPABASE_URL` **and** `VITE_SUPABASE_URL` are set to `https://<ref>.supabase.co/rest/v1/`. Sprint 2.9 normalises it client- and edge-side; the binding should still be corrected to the bare origin so the guard becomes belt-and-braces. |
| 1b | **D1 binding for telemetry** | Cloudflare dashboard | Without it the handler now reports `d1: "unbound"` and `degraded: true` instead of pretending success. Apply `migrations/0001` + `0002` first. Measured 2026-11-03: `POST /api/telemetry` → `202` with `{"kv":"unbound","d1":"unbound","analytics":"unbound"}`, i.e. **no telemetry is being stored anywhere today**. The 202 is honest, the drop is total. |
| 2 | **RLS on `axim_vault` + `ellars-media`** | Database access | Every Vault read/write is raw PostgREST with the anon key. If RLS is not user-scoped, `deleteVaultItem` is a one-line deletion for any anon-key holder. Measured 2026-11-03 with the live anon key: `ecosystem_vault` and `telemetry_logs` both answer `200` with `[]`. An empty result does **not** prove RLS is off (a table with RLS on and no policy also returns `[]`), and it does not prove it is on — this needs the service role, not a probe. **Verify before any further Vault work.** |
| 2b | **`axim_vault` does not exist in the live project** | Database access | Measured 2026-11-03: `GET /rest/v1/axim_vault` → `PGRST205`. The live project has `ecosystem_vault` (columns `id`, `created_at`, `updated_at`; **no tenant column**) and `telemetry_logs`. So **every Vault call from the dashboard 404s in production** — list, create, update, delete — while the public site looks healthy. The client is not repointed at `ecosystem_vault` on purpose (no tenancy column). `0003_axim_vault.sql` exists only in the workspace handoff (`context/axim-vault-migration.sql`), **not in the repo**, so the schema is unversioned: copy it in, then apply it, then set `app_metadata.app_id` on the operator user. |
| 3 | **JWT trust root** | Infrastructure | `axim-passport-api` and `axim-seo-worker` both hold `SUPABASE_JWT_SECRET`. Any holder can forge tokens that satisfy every RLS policy. Target: asymmetric keys/JWKS, then rotate, then scope the service role. |
| 4 | ~~Raw-HTML metadata for non-JS crawlers~~ | **Closed in 2.11** | `functions/_middleware.js` + `lib/edge/meta.js` rewrite title/description/canonical/og for every HTML navigation, for every user agent. Remaining: article titles still come from WordPress after hydration (see the limit recorded above). |
| 5 | ~~`<UpdatePrompt />` unmounted + competing service workers~~ | **Closed in 2.10** | Prompt mounted, `public/sw.js` deleted, feed/font strategies moved into `workbox.runtimeCaching`, `controllerchange` handshake with an audio-safe prompt. Remaining nicety: a "Reload" affordance in `PrivacyBanner`-style chrome for users who dismiss the toast. |
| 6 | **`script-src 'unsafe-inline'`** | Security review | Retained deliberately in `_headers` with a comment. Removing it requires verifying the Turnstile loader and the Cloudflare Web Analytics beacon against nonces. |
| 7 | **Newsletter funnel** | `axim-passport-api` route | `VITE_CF_FORM_ENDPOINT` and `VITE_TURNSTILE_SITE_KEY` are unset at build time. `subscribeToNewsletter` posts to `/api/v1/subscribe`, which has no Pages Function, so the UI errors honestly. Needs the passport-api form route, then the env var and `https://passport.axim.us.com` in `connect-src`. |
| 8 | **Phantom content** | Editorial decision | `FALLBACK_POSTS` in `api.js` renders three fully-formed dispatches that do not exist in WordPress, and `NewsMedia.jsx` hard-codes four episodes against Unsplash thumbnails and a sample Cloudflare Stream video. Either label them as offline cache or empty them — a journalist clicking one hits a stub. |
| 9 | **No unit-test floor (partly closed)** | This branch's successor | `scripts/smoke-functions.mjs` is now **144 assertions** in CI (config resolution, sitemap entities/zones, asset 404s, middleware metadata/404s, the router drift guard, `_headers` merge rules, the social card). Covered without a runner. Still uncovered: telemetry sink independence, vault row-shape mapping, and anything that needs a DOM — those want `vitest` as a real dependency. |
| 10 | **Repo hygiene and sourcemaps** | Next cycle | 556 kB of loose PNGs at the repo root, `commit_message.txt`, the unreferenced `scripts/copy-spa-fallback.mjs`, and `build.sourcemap: true` shipping ~3.7 MB of maps to the CDN. The `og:image` half of this item is **closed** (2.12/2.13): the card is 79 kB and exists. |
| 11 | **Duplicate Supabase 401 handling** | Reviewed next cycle | `fetchWithRetry` still logs `logApiErrorToTelemetry` for every failure path; confirm the reduced redirect logic does not double-report. |
| 12 | **No cache purge path exists** | `CF_ZONE_ID` + `CF_PURGE_TOKEN` | `POST /api/v1/cache/purge-tag` → `{"error":"not_found"}` from the `/api/[[path]]` catch-all, although Sprint 2.5 records it as shipped and `src/lib/api.js` still calls it fire-and-forget on publish. Until it exists (or the dead call is removed), a bad edge cache entry cannot be evicted. |

---

## Accomplishments (Sprint 2.1)
- **Telemetry Batch Writes Verification**: Verified that Cloudflare D1 telemetry batch insertions use a defensive `try/catch` approach, continuing to Analytics Engine writes despite SQL issues.
- **WP Feed Fallback Telemetry**: Verified `wp_feed_fallback_served` telemetry events are automatically dispatched from `src/lib/api.js` on fetch errors/timeouts, and ensured `401` fallbacks do not invalidate Supabase sessions.
- **Automation Calculator Enhancements**: Embedded a direct integration inside `src/components/intel/AutomationCalculator.jsx` to export projections directly into Vault Drafts (`ellars_dispatch_draft` inside `localStorage`), forwarding the user to the publisher toolkit via `useNavigate`.
- **Production SEO Metadata**: Verified production-ready metadata, canonicals, and OG/Twitter headers in `index.html`.

## Roadmap Milestones (Sprint 2.15+)
- Bind `SUPABASE_ANON_KEY` and prove the auth path end to end (PR #218).
- Crawler-facing metadata rewrite (canonical, og/twitter, `lastmod`) inside a Pages Function middleware.
- Resolve the service-worker duplication and mount `<UpdatePrompt />` with a real `waiting` handshake.
- Restore a unit-test floor (`vitest`) for the four silent-failure surfaces.
- Expand D1 querying components on the frontend to visualise site telemetry (now that events actually arrive).
- Optimise caching and payload sizes for Vault and WP API requests.
- Per-article `og:image` from the WordPress featured image (the 2.12 card is site-wide).
- Repo hygiene: 556 kB of loose screenshots at the root, `commit_message.txt`, the unreferenced `scripts/copy-spa-fallback.mjs`, and `build.sourcemap: true` shipping ~3.7 MB of maps to the CDN (open item 10).

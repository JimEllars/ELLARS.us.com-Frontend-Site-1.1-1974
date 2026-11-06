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

---

## Sprint 2.15 — The dependency queue, and three writers for one `<title>`

**Branches:** `chore/build-toolchain-and-hygiene` (#225), `fix/router-advisory` (#228), `fix/metadata-single-source` · **Base:** `428463d` (main)

### Why this cycle

No new features. Three things were already broken or waiting:

1. Four Dependabot PRs were open — two green, one that had **never run a check at all**, and one red.
2. `npm audit` reported two advisories against code that ships in the bundle.
3. A browser pass over the built site (not curl) showed every page reporting **two different titles**.

### Shipped

**The red Dependabot PR could not have built, for three independent reasons** — `vite.config.js`, `package.json`
- #212 (`vite 5.4.21 → 8.3.5`) failed at `npm ci`: `@vitejs/plugin-react@4.7.0` peers `vite ^4.2 || ^5 || ^6 || ^7`. The peer range, not the code, was the first wall. `@vitejs/plugin-react@5.2.0` is the smallest release that admits `^8` without requiring 6.x's optional `oxc-transform-react` / `@rolldown/plugin-babel` peers.
- With that cleared, Vite 8 (Rolldown) rejected three config shapes that Rollup accepted:
  - `manualChunks` as an **object** → *Invalid type: Expected Function but received Object*, which silently collapses the vendor split. Rewritten as a function over the resolved module id; the four groups survive (`vendor-react` 172 kB, `vendor-motion` 121 kB, `vendor-sanitize` 29 kB, `vendor-data` 21 kB).
  - `closeBundle` copying `dist/index.html` → **ENOENT**, because Rolldown closes before the write lands. `dist/200.html` — the entire Pages SPA fallback — was never produced. Moved to `writeBundle` (verified with an `existsSync` probe that the shell is on disk there). `generateBundle` is not an alternative: Rolldown's bundle object carries only the JS/CSS graph, so there is no HTML asset to clone.
  - `__dirname` → undefined under Vite 8's native config loader; the project root now comes from `import.meta.url`.
- #212 is closed as superseded by #225. Measured after: precache **35 entries / 988 KiB** (was 33 / 1004 KiB), total JS 897 kB (was 910 kB), build time 9.1 s → 1.5 s.

**A shipped high-severity advisory, lost by a stale Dependabot PR** — `package.json`, `package-lock.json`
- `react-router` (high, `6.0.0–7.18.1`: open redirect via backslash in `<Link>`/`useNavigate`, RSC error-handler XSS, SSR-hydration constructor injection, route-matching DoS) and `react-router-dom` (moderate, `6.0.0-alpha.0–7.17.0`).
- The manifest already said `^7.1.0`; the **lockfile** resolved 7.17.0. #171 (`6.30.4 → 7.18.3`) was closed unmerged when 7.x was adopted by hand, which is how the fix evaporated. Floor raised to `^7.18.5`; `npm audit` → **0 vulnerabilities**.

**Every page had two `<title>`s, and the wrong one won** — `src/pages/Home.jsx`, `Platform.jsx`, `NewsMedia.jsx`, `About.jsx`
- Three pages assigned `document.title` in a `useEffect` ("Ellars for Congress | Home"), and two of those plus `About` also rewrote `<meta name="description">` by hand with a `querySelector`.
- Effects run **after** `<Helmet>` commits, so the imperative value won. Measured in `vite preview` before the fix: `/news-media` had the canonical title `News & Media Hub | James Ellars | Official` in the raw shell and in Helmet, while the tab read `Ellars for Congress | News & Media`; `/about` carried two different descriptions in one document. Which tag won depended on effect ordering — the same class of defect 2.7 fixed when the Layout owned the title.
- All four effects deleted. Helmet + `lib/edge/meta.js` are the only writers; `<ScrollToTop />` in `App.jsx` already handles the scroll reset they also duplicated (it runs on every pathname change, so the per-page `window.scrollTo` was redundant too).
- Measured after: `/` → `Home | James Ellars | Official`, `/about` → `About James Ellars | Bridging Main Street`, `/news-media` → `News & Media Hub | James Ellars | Official` — each identical to the edge table and to the page's own Helmet.

**~4.0 MB of source was published alongside a 900 kB bundle** — `vite.config.js`
- `build.sourcemap: true` wrote a `.map` for every chunk and served it from the public origin: the full source of the app, readable by anyone. Nothing consumes them (no error reporter receives an upload, and a browser only fetches a map with devtools open). `hidden` would still write the files; only `false` stops the exposure. `dist/` is now **1.2 MB, zero `.map` files** (was 5.2 MB).
- Open item 10 also covered the dead `scripts/copy-spa-fallback.mjs`; that file does not exist on main and the loose root PNGs remain (editorial decision, unchanged).

**A purge call that never had an endpoint** — `src/lib/api.js`
- `saveVaultDraft()` POSTed `/api/v1/cache/purge-tag` fire-and-forget and swallowed the result. The route has never existed (`functions/` has no such handler; the `/api/[[path]]` catch-all answers `{"error":"not_found"}`), so every publish earned one guaranteed 404 and no invalidation. Removed, with the condition for restoring it written in the comment. Open item 12 stays open: the purge *path* still does not exist, only the lie about it is gone.

**Two Dependabot PRs merged, one recovered from a silent no-run**
- #211 `dompurify 3.4.14 → 3.4.17`, #216 `serialize-javascript 7.0.5 → 7.1.4` — lockfile-only, green, merged.
- #213 `fast-uri 3.1.2 → 3.1.9` had **no `verify` run at all** — not queued, not cancelled, not skipped: the `pull_request` event never produced a workflow run, while Cloudflare Pages and GitGuardian both reported for the same SHA. Closing and reopening the PR re-triggered it; it passed and merged. Worth knowing: a Dependabot PR can look mergeable with the gate simply absent, which is worse than red.

### Tests

`npm test` → **147 assertions** (was 144), all in `scripts/smoke-functions.mjs`:
- no page component assigns `document.title` (parsed across `src/pages/*.jsx`)
- no page rewrites the `description` meta tag with `querySelector`
- the page-file set is non-empty, so the two guards cannot pass vacuously

### Verified

- `eslint --max-warnings=0` clean on every branch; `npm test` 147/147; `npm run build` clean; `dist/index.html`, `200.html` (byte-identical), `sw.js`, `_headers`, `_redirects` all present; no legacy hosts; Supabase chunk present; `og:image` resolves.
- Real-browser pass in `vite preview` (Camoufox, not curl): `/`, `/platform`, `/about`, `/news-media` render their own H1 and title; a client-side `<Link>` click moves to `/about` and updates the title; `/dashboard` redirects an unauthenticated visitor to `/login` and the Auth Gateway title.
- Production sweep of `ellars.us.com` before any change: all **66** sitemap URLs `200 text/html`; `/robots.txt` `200 text/plain`; `/sitemap.xml` `200 application/xml`; `/manifest.webmanifest` `200 application/manifest+json`; `/og-card.png` `200 image/png`; `/assets/nope.js` and `/screenshot_home.png` `404 text/plain`; `/platform/not-a-directive` `404`; `/api/nope` `404 application/json`; one `Cache-Control` value on every surface.

### Known limits

- **`/about`, `/news-media`, `/platform` and every dispatch still carry two `og:title` tags and two `description` tags** after hydration: `index.html` declares them (and the middleware rewrites them per route, so the *first* is always right for a scraper) and Helmet appends a second. First-wins means no crawler is misled, but the document contradicts itself. The clean fix is either a head-dedupe that keeps Helmet's copy on mount, or removing the page-level `og:*` for routes the edge already covers — a deliberate decision for next cycle, not a drive-by edit across six components. Logged as open item 13.
- Rolldown names the Supabase async chunk after the directory it came from (`dist-BS6064DF.js`). Cosmetic; the chunk is present and CI asserts it.
- Vite 8 requires Node `^20.19 || >=22.12`. CI and Cloudflare Pages both build on Node 22; nothing pins it in the repo, so a future image downgrade would break the build rather than the site.

---

## Sprint 2.16 — The update handshake never promoted a worker

**Branch:** `fix/pwa-worker-activation` · **Base:** `1e45284` (main)

### Why this cycle

Found by loading production in a browser at the end of 2.15. A tab that had visited the site in an earlier session was still running a three-deploy-old shell (`/assets/index-C-R-RC9A.js`) while the edge served the new one. 2.10's handshake was supposed to make that rare; it was not making it rare.

### Root cause, in two halves

**The generated worker could never activate itself** — `vite.config.js`
- `vite-plugin-pwa` sets `workbox.skipWaiting` and `workbox.clientsClaim` for `registerType: 'autoUpdate'` **only when `injectRegister` is `'auto'` or unset** (`if ((injectRegister === "auto" || injectRegister == null) && registerType === "autoUpdate")` in `dist/index.js`). This project sets `injectRegister: false` because registration is handled in `src/lib/serviceWorker.js` — so the implication never fired, and the shipped `sw.js` had no install-time `skipWaiting()` and no `clientsClaim()`. The comment in the config asserting "autoUpdate activates a new worker immediately (skipWaiting + clientsClaim)" was describing behaviour the artifact did not have.
- Observed on the deployed worker: `registration.update()` fetched the new script, it installed, and it sat in `waiting` with `active: "activated"` — indefinitely. `controllerchange` therefore never fired, so the `reload` branch of the update policy was unreachable. The **Refresh Now** prompt still worked, because it posts `SKIP_WAITING`; but it only appeared if `updatefound` fired and the user noticed.
- Fixed by declaring `skipWaiting: true` and `clientsClaim: true` explicitly. `dist/sw.js` now begins `self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute(...)`.

**The client forgot it had been claimed** — `src/lib/serviceWorker.js`
- With activation fixed, `hadController` was still captured **once**, at registration. On a first load the page is uncontrolled (`hadController === false`), the first worker then claims it — correct, policy says `ignore`. But every *later* controllerchange was judged against that stale `false`, so every real update was also classified as a first install: the new worker took control, the old document stayed, and nothing reloaded.
- `hadController` is now `let`, and the handler sets it to `true` after the first controllerchange. The pure policy in `swPolicy.js` is unchanged; the bug was in what it was told.

### Tests

- `npm test` unchanged at **147 assertions** — the policy was never wrong, so a policy assertion would have passed while the product was broken. The regression is an artifact invariant instead.
- CI gains **`Assert the service worker promotes and claims`**: red build if `dist/sw.js` lacks `clientsClaim` or an install-time `self.skipWaiting()`.

### Verified (real browser, real worker)

`vite preview` on a fresh origin, then the script changed on disk to simulate a deploy:

1. First load → worker installs, activates, claims; `sessionStorage` reload marker stays `null` (policy: `ignore`) — no unexplained flash.
2. `dist/sw.js` amended → `registration.update()` → new worker installs, **activates immediately**, claims the open tab, `controllerchange` fires, policy returns `reload`, marker is written, the page reloads **once**, and the reloaded document is served by the new worker with an empty `waiting` list and correct titles.

Before the fix the same probe left the new worker `waiting` forever and the marker `null`.

### Known limits

- An update now activates immediately even mid-session, which means the *old* document keeps running against caches it no longer owns until the reload lands. The reload is immediate in the no-audio case; when audio is playing the policy still prompts, and the prompt is now honest — the worker is already active, so clicking reloads onto it. The station is a flagship surface and never gets cut.
- `UpdatePrompt.handleRefresh()` still posts `SKIP_WAITING`, which the generated worker no longer listens for (workbox omits that handler when `skipWaiting` is true). Harmless, but it is dead code of exactly the kind open item 12 was about; left in place for now rather than churned in a hotfix.

---

## Sprint 2.17 — Every hydrated document declared its identity twice

**Branch:** `fix/head-metadata-single-owner` · **Base:** `9bf4da9` (main)

### Why this cycle

Open item 13, the decision 2.15 deliberately deferred: after hydration the document
carried two of each identity tag. Measured in a browser on `/news-media` before the
change — `description` ×2, `og:title` ×2, `og:description` ×2, `og:type` ×2,
`og:url` ×2, `og:image` ×2, 27 `<meta>` nodes where 21 belong. `index.html` declares
the set (and the middleware rewrites it per route), then each page's `<Helmet>`
appends its own copy. Two more findings came out of reading what those copies
actually said:

- **They had already drifted from the edge.** `/news-media` advertised
  `og:title` "News & Media Hub | James Ellars" in the DOM while the `<title>`, the
  edge table and the share card said "…| Official". `Home` said
  "James Ellars | The Blueprint"; `description` on three pages was template
  residue ("Leading American innovation through disruptive systems…") that no
  other surface agreed with.
- **Every page except dispatches pointed `og:image` at `wp.axim.us.com`** — the
  legacy WordPress host, four times, on a site whose first architectural rule is
  that nothing routes to legacy infrastructure. Worse, the shell's
  `og:image:width`/`height`/`type` (which describe `/og-card.png`, 1200×630)
  survived next to the duplicate image, so the document sized an image it no
  longer declared.

### What was built

**One table, one client writer** — `src/lib/headMeta.js`, `src/components/common/RouteMeta.jsx`
- `RouteMeta` emits `title`, `description`, `robots`, `og:type`, `og:title`,
  `og:description`, `og:url`, `twitter:title`, `twitter:description` and the
  canonical, resolved from **the same table the middleware and sitemap already
  share** (`lib/edge/meta.js`). Hydration is now a no-op by construction instead of
  by eight hand-copied string pairs staying in sync.
- It replaces `<CanonicalUrl />` (deleted), a third writer that owned only
  canonical + `og:url`. Normalisation is unchanged: trailing slashes stripped,
  query/hash dropped.
- `/articles/:slug` returns `null` on purpose. A dispatch's title, excerpt and share
  image come from WordPress, so `ArticleDetail.jsx` remains that route's only
  writer — two writers on one route is the defect being removed.

**Ownership hand-off for the shell's copy** — `src/components/common/HeadOwnership.jsx`
- The shell's tags are not React's, so Helmet appends rather than replaces. This
  component waits one frame (react-helmet-async commits inside a
  `requestAnimationFrame` — its `defer: true` default), then removes the shell's
  copy of any key the client has written, and only those. A document that never
  hydrates keeps its metadata; a field the page does not declare is never blanked.
- It also drops the shell's `og:image:*` hints when a client `og:image` names a
  *different* file, which is the dispatch case (featured image, not site card).
- The decision is a pure function (`planHeadDedupe`) asserted in CI; the component
  only applies it. Re-runs on pathname change and is idempotent, so StrictMode's
  double-invoked effects cannot keep eating tags.

**Eight pages stopped writing route metadata** — `Home`, `Platform`, `About`,
`NewsMedia`, `DirectiveDetail`, `Login`, `Dashboard`, `NotFound`
- Removed every `<title>`, `description`, `og:*` and `twitter:*`. Each page keeps
  what is genuinely page-local: its JSON-LD (Home/Platform/About), and
  `DirectiveDetail` keeps its slug list — now guarded against `DIRECTIVE_META`
  drifting from it.
- `Login`/`Dashboard`/`NotFound` no longer render a `<Helmet>` at all; their
  identity comes from `NOINDEX_ROUTES`/`NOT_FOUND_META`, the same objects the edge
  serves. `ArticleDetail` gained `og:type=article`.

### Tests

`npm test` → **222 assertions**, all passing (158 before: 11 client + 147 edge). New ones:

- **Client parity** (`scripts/smoke-client.mjs`, 63 assertions, was 11): for every
  route in the table — `/`, `/platform`, `/about`, `/news-media`, `/login`,
  `/dashboard` and all six directives — the client's title, description, robots and
  canonical must equal `resolveMeta()`'s. Parity is asserted *against the edge
  module*, not against re-typed strings, so a copy edit cannot leave a stale test
  behind. Plus: a dispatch path yields `null`, an unknown path and an unknown
  directive resolve to `NOT_FOUND_META` (no canonical), `og:url` falls back to the
  site root, and nine dedupe-plan cases including idempotence.
- **Source guards** (`scripts/smoke-functions.mjs`): no page component writes
  `<title>`/`og:*`/`description`/`twitter:*`; `headMeta` still imports the edge
  table; `RouteMeta`/`HeadOwnership` are mounted and `CanonicalUrl` is gone;
  `DirectiveDetail`'s slugs match `DIRECTIVE_META`; no `og:*` tag names the legacy
  host; the shell declares each managed key at most once. The guards read code, not
  prose — the first version tripped on a 2.15 comment that quotes the banned
  pattern, and a guard that fails on its own documentation gets deleted rather than
  fixed.

### Verified (real browser, `vite preview`, fresh origin)

- `/news-media` → **0 duplicate keys**, one `<title>`, one canonical, 21 `<meta>`
  nodes (was 27), `og:image` = `https://ellars.us.com/og-card.png`.
- `/` → "Home | James Ellars | Official"; **client-side click to `/about`** →
  "About James Ellars | Bridging Main Street" with canonical and `og:url` both
  `/about`, 0 duplicates (the frame-ordering case, not just first load).
- `/platform` → edge title, `description` from the table, both JSON-LD blocks intact.
- `/platform/political-reform` → "POLITICAL REFORM Policy | James Ellars", which is
  what `DirectiveDetail` used to compose by hand — now from the table.
- `/no-such-page` → "404 Signal Lost | James Ellars", `noindex, follow`, **no**
  canonical, `og:url` = site root: identical to what the middleware serves with the
  404.
- `/dashboard` unauthenticated → redirects to `/login`, settles on "Auth Gateway |
  James Ellars", `noindex, nofollow`, canonical `/login`.
- `/articles/prices-and-paychecks` with WordPress unreachable → "Transmission
  Error | James Ellars", `noindex`, shell card retained **with** its 1200×630 hints
  because no competing image won. 0 duplicates.
- `eslint --max-warnings=0` clean; `npm run build` clean; `200.html` byte-identical
  to `index.html`; 0 `.map` files; precache 35 entries.

### Known limits

- **A dispatch's canonical is still the post URL even in the "Transmission Error"
  state.** The edge cannot know a slug is bad without fetching WordPress, and the
  client error state no longer sets a canonical at all, so the edge's stands. It is
  `noindex`, which is the part that matters for a crawler.
- **Per-article `og:image` is still not visible to scrapers**, and now it is explicit
  rather than accidental: scrapers do not execute JavaScript, so a client-emitted
  featured image never reached them — the roster of dispatch cards they saw was the
  site card all along. `ArticleDetail` keeps emitting it (in-browser share surfaces
  use it) and the shell hints are dropped when it wins. Doing it properly is the
  roadmap item, and it needs the image at the edge, not in an effect.
- **`og:type` is `website` for every non-dispatch route**, including directives.
  Uniform on purpose: the shell declares it, the client now repeats it, and a
  per-route value would be a fifth thing to keep in sync for no crawlable benefit.
- **`index.html`'s static `keywords`/`author` remain shell-only** and are untouched by
  the hand-off. They are the same on every route and nobody else writes them.

---

## Sprint 2.18 — The repo root was a screenshot folder

**Branch:** `chore/repo-hygiene` · **Base:** `2ea099f` (main)

### Why this cycle

Open item 10, the last mechanical debt on the list. `git ls-files` at the root carried
**1.9 MB** of PNGs — `screenshot.png` and `screenshot_home.png` are byte-identical
548 kB copies, plus five more editor dumps — alongside a `commit_message.txt` from a
previous cycle and a tracked playwright `test-results/.last-run.json` whose entire
content is `{"status": "failed"}`. Nothing in the repo references any of them; the real
assets live in `public/`, where the edge's static-file rules apply to them. Every clone,
every CI cache and every `git log` paid for them.

### Shipped

- **Removed** eight root PNGs, `commit_message.txt` and `test-results/.last-run.json`
  (1.9 MB, -10 tracked files).
- **`.gitignore`** now covers `/test-results/`, root-level `*.png|jpg|jpeg|webp` (anchored
  with a leading slash, so `public/*.png` — the PWA icons and the share card — stays
  tracked) and `/commit_message.txt`.
- **Three guards** in `scripts/smoke-functions.mjs`: no binary at the repo root, no
  commit-message draft at the root, and nothing under `dist/` or `test-results/` tracked.
  Verified they fail: dropping a copy of `favicon-32x32.png` at the root turned the suite
  red (`FAIL no binaries at the repo root :: leak.png`), and removing it went green.

### Tests

`npm test` → **225 assertions** (222 before). `eslint --max-warnings=0` clean,
`npm run build` clean, `dist/` unchanged in content.

### Known limits

- The deleted files remain in history. Rewriting it would invalidate every clone and
  every open branch for no runtime benefit, so the 1.9 MB stays reachable by hash but
  is no longer part of a working tree.
- Root-level `*.svg` is still allowed: the PWA mask icon was referenced from the root
  during one cycle and a legitimate one-off diagram is plausible. The guard covers
  binaries, which is what actually accumulated.

---

## Sprint 2.19 — The update handshake works; the measurement was the defect

**Branch:** `fix/pwa-update-measurement` · **Base:** `a7b0caa` (main)

### Why this cycle

Open item 14 recorded a production observation from the end of 2.17: a browser with a
previously registered worker loaded the **pre-deploy** bundle and still served the old
shell on a second navigation, while the origin was already serving the new one. The item
said, in as many words, that this was either the handshake not firing or the check
landing before the single post-`controllerchange` reload — indistinguishable from
outside — and that the worker should not be touched until it was measured. 2.16's fix
had itself been a correction of a plausible-but-wrong explanation.

### What was measured

Two real builds behind `vite preview` on a fresh origin, with a `<meta name="deploy-probe">`
in the shell so the *served document* identifies which build it is:

1. Load `/` → worker installs, activates, claims. Probe `A`, controller present,
   `waiting: false`, marker `null`.
2. Rebuild with the probe flipped to `B` (new `index.html` bytes → new precache revision,
   new `sw.js` bytes) — a faithful deploy, not a script edit.
3. Navigate to `/news-media` as a returning, controlled visitor: the old worker served
   build `A`, the handshake fired, the page **reloaded once** and landed on build `B`.
   After it settled: `probe: "B"`, `navType: "reload"`, marker `"true"`, one precache,
   `waiting: false`, `installing: false`, `active: "activated"`.
4. Repeat with a third build for timing: **3,102 ms** from the old document's
   `timeOrigin` to the reloaded document's `timeOrigin` — detection via `register()`'s
   implicit update check, install, activate, claim, reload.
5. Steady state afterwards: navigating again gave `navType: "navigate"`, probe `C`, no
   second reload. The loop guard holds.

**Conclusion: 2.16 works.** The 2.17 observation was taken at ~0.9 s, before
install/activate could finish, and the following `browser_navigate` cancelled the pending
reload — so it measured the hand-off, not a failure. The stale bundle seen on the *second*
navigation was the browser still using the old worker, which was expected at that point
and is exactly what the automatic reload then replaced.

### What was fixed (the two things measurement exposed)

**`UpdatePrompt.handleRefresh()` was reassuring rather than correct** — `src/components/common/UpdatePrompt.jsx`
- It posted `{ type: 'SKIP_WAITING' }` to `registration.waiting`. The shipped worker is
  built with `skipWaiting: true`, so it never enters the waiting state, and
  `grep -c SKIP_WAITING dist/sw.js` is **0** — there is no message listener at all. The
  message went to nobody.
- It called `window.location.reload(true)`. Browsers have ignored that argument for years
  (already noted in 2.9); it was doing nothing.
- Both removed. A plain reload is the whole action, because by the time the prompt appears
  the new worker is already active and controlling — the prompt exists only for the two
  cases where the reload was deliberately withheld: audio playing, or this tab already
  reloaded once.

### Tests

`npm test` → **231 assertions** (225 before). New source guards, all reading code rather
than prose (`stripComments` is now a module-level helper, because the fix's own comment
quotes `reload(true)`): the reload path writes the loop marker *before* reloading, the
policy is consulted rather than inlined, `hadController` is mutable, and the prompt
neither posts a message nor passes the ignored argument.

### Known limits

- **The first paint after a deploy is still the previous build.** The navigation route is
  cache-first, which is what makes the site work offline; the price is that a returning
  visitor sees the old shell for the ~3 s the handshake needs. The 3.1 s figure is a
  **lower bound**: the simulated deploy changed only the shell, so install re-fetched one
  file. A real deploy changes asset hashes and precaches ~900 kB.
- **The reload is unconditional when nothing is playing.** A visitor reading an article
  loses scroll position when a deploy lands mid-session. Not changed: the alternative is
  leaving them on a shell whose chunks may already be deleted, which is the failure 2.10
  and 2.16 exist to prevent.
- Item 14 stays open only as a pointer to this sprint's evidence, not as a defect.

---

## Sprint 2.20 — Four advisories fixed, and the reason `npm audit` said zero

**Branch:** `chore/dependency-alerts` · **Base:** `4447495` (main)

### Why this cycle

GitHub reported six open Dependabot alerts on `main` (1 high, 3 moderate, 2 low) while
`npm audit` reported **0 vulnerabilities** in the same tree. Those two cannot both be a
statement about the same thing. All six are `development`-scope transitive packages, so
neither number was urgent — but a security signal nobody can reconcile stops being read.

### The discrepancy, measured

`npm audit` was run with `--include=dev` against the same lockfile: **16 vulnerabilities
(2 low, 14 moderate)**. The cause is not a lagging advisory feed — npm's own bulk
endpoint (`registry.npmjs.org/-/npm/v1/security/advisories/bulk`) lists every one of them.
It is `NODE_ENV=production`, which this environment sets, and which makes npm default to
`--omit=dev`: the audit was only ever looking at the **37 runtime dependencies**. Both
numbers are honest, but 2.15 recorded the narrow one ("`npm audit` → 0 vulnerabilities")
as though it covered the tree.

- **Runtime scope: 0 vulnerabilities.** Nothing that ships in the bundle is affected.
- **Full tree: 16**, all in the build/dev chain (eslint's `minimatch`/`glob`/`ejs`/
  `filelist`/`jake`, and `deepmerge` behind `workbox-build`).

### Shipped

**Four of the six alerts closed** — `package.json`, `package-lock.json`
- `browserslist` **4.28.2 → 4.29.5** (GHSA-73wf-gq98-2v4g, high: uncaught crash and
  prototype write via an untrusted `browserslist-stats.json` — the advisory affects
  `<= 4.28.6`). Reached through `@babel/helper-compilation-targets`, so `npm update`
  lifts it inside the existing `^4.24.0` range.
- `baseline-browser-mapping` **2.10.34 → 2.11.35** (GHSA-w5vr-8v7q-w6rv, `process.exit()`
  on invalid input), lifted with `browserslist`.
- `postcss-selector-parser` **6.1.2 → 6.1.5** (GHSA-w9m9-85wc-3x92, low) via `npm update`.
- `postcss-selector-parser` **6.0.10 → 6.1.5** (GHSA-rj75-hqrm-r3gf, moderate: quadratic
  selector parsing) needed an `overrides` entry, because `@tailwindcss/typography` pins
  `6.0.10` **exactly**. Verified safe the only way that counts: `<link>` a rebuild before
  and after and compare bytes — `dist/assets/index-BdVpI0Fz.css`,
  `sha256 6fd3a567…49e36`, **identical**, so the override changes no rendered CSS.

**The two that cannot be fixed without a major** — documented, not silenced
- `minimatch` 3.1.5 / 5.1.9 / 10.2.5 (GHSA-g3hv-75wg-m249, moderate): the first patched
  version is **11.0.1**, and the three copies are required by `eslint` (`^3.1.5`),
  `filelist` (`^5`) and `glob` (`^10`). Forcing 11.x through `overrides` would break
  ESLint's callable-default API. The advisory needs attacker-controlled glob patterns;
  every pattern here comes from our own config.
- `deepmerge` 4.3.1 (GHSA-gcqx-w48m-w2h4, low): **no fixed version exists**. It reaches us
  through `@rollup/plugin-node-resolve` → `workbox-build` → `vite-plugin-pwa`.

**The reconciliation is now mechanical, and token-free** — `.github/workflows/verify.yml`
- **`Assert no high/critical advisory reaches shipped code`** → `npm audit --omit=dev
  --audit-level=high`. `--omit=dev` is stated explicitly because npm silently defaults to
  it whenever `NODE_ENV=production`, which is the whole defect: the scope must be a
  decision in the workflow, not an ambient variable. This is the gate — an advisory in
  shipped code fails the build.
- **`Report the dev-scope advisory backlog`** → `npm audit --include=dev || true`.
  Informational on purpose: the remaining advisories are accepted with reasons, so the
  step must not be red every run, but the backlog belongs in CI logs rather than only on
  the security tab.

The first version of this used the Dependabot alerts API instead. It ran on the PR and
printed `Dependabot alerts unavailable to this token` — `GITHUB_TOKEN` with
`security-events: read` returned 403 for `repos/{owner}/{repo}/dependabot/alerts` in that
context (measured 2026-11-04). It degraded to a warning and passed, which is a green gate
that checks nothing — the same shape as the `npm audit → 0` claim this sprint exists to
correct. Removed rather than documented as working.

### Verified

`npm audit --omit=dev` → **0** (shipped code). `npm audit --include=dev` → 16, none
runtime. `npm ci --include=dev` from a clean cache, `eslint --max-warnings=0` clean,
`npm test` 231 assertions, `npm run build` clean, precache 35 entries, CSS byte-identical
to pre-override.

### Known limits

- **The remaining 14 dev-scope advisories will keep `npm audit --include=dev` red** and are
  accepted: every one is a build-time DoS or prototype issue in tooling that processes our
  own source, and the only offered fixes are major downgrades of `vite-plugin-pwa` or a
  `minimatch` major that ESLint cannot use.
- **The gate is a scope split, not a reachability analysis.** Dependabot reports
  `reachability.verdict: "disabled"` on all six, i.e. it cannot say whether a vulnerable
  path is exercised. "Runtime vs dev" is the coarse proxy, and it is enforced; a real
  reachability answer would need code scanning.
- **The Dependabot backlog is not read by CI.** The alerts API refuses `GITHUB_TOKEN` in
  PR runs (403, measured), so the security tab stays the authoritative view of the six;
  the two `npm audit` steps cover the same ground from the other side, token-free.
- `NODE_ENV=production` is still set in the sandbox, so any future `npm audit` run there
  repeats the same trap unless `--include=dev` is explicit. The CI step no longer depends
  on `npm audit` at all.

---

## Sprint 2.21 — The dispatch feed had never loaded, and `HEAD` was never answered by the edge

**Branch:** `fix/wp-preflight-and-head-parity` · **Base:** `2e9ce9d` (main)

### Why this cycle

A routine sweep of the live site in a real browser — not `curl` — produced two classes of
defect that no page-level check could see, because in both cases the site answered `200`.

### Defect 1: every WordPress request was blocked by its own CORS preflight

`fetchWithRetry` in `src/lib/api.js` attached two provenance headers to **every** request:

```
X-Project-Domain: ellars.us.com
X-Client-Telemetry: AXiM-Frontend-v1
```

Nothing reads either one. Not a Pages Function, not WordPress, not Supabase. They were
decoration — and on `wp.ellars.us.com` they were fatal. WordPress sends a fixed CORS
allow-list:

```
Authorization, X-WP-Nonce, Content-Disposition, Content-MD5, Content-Type, X-Sli-Auth-Token
```

A custom request header turns a simple `GET` into a preflighted one. The preflight is
answered `200` with that list, the browser compares it against what the request carries,
finds `x-client-telemetry` absent, and **refuses to send the request**. Measured in
production on 2026-11-04, in a real Firefox session, on the homepage, `/platform`,
`/platform/:slug` and `/news-media`:

```
Cross-Origin Request Blocked: ... header 'x-client-telemetry' is not allowed according to
header 'Access-Control-Allow-Headers' from CORS preflight. (Reason: CORS request did not
succeed). Status code: (null)
```

Every dispatch fetch failed. `FALLBACK_POSTS` supplied three invented articles in its
place, so the homepage `DISPATCH` card, the archive and the platform page were publishing
fictional dispatches dated Sep 2025 — **the exact phantom content open item 8 describes,
except it was not a quiet fallback, it was the only thing the site has ever shown.**
The site looked healthy throughout, which is why this survived twenty cycles.

### Defect 2: `HEAD` was answered by the SPA rewrite instead of the edge

Only `GET` was handled anywhere on the edge, so `HEAD` fell through `_redirects`
(`/* /index.html 200`) and was answered by the shell. Measured against the live site:

| request | GET | HEAD (before) | HEAD (after) |
|---|---|---|---|
| `/sitemap.xml` | `200 application/xml` | `200 text/html` | `200 application/xml` |
| `/nonexistent` | `404` | `200 text/html` | `404` |
| `/foo.png` (missing) | `404` | `200 text/html` | `404 text/plain` |
| `/api/config` | `200 application/json` | `404` | `200 application/json` |

Every uptime monitor, link checker, sitemap prober and pre-fetch crawler was told the
opposite of what a browser is told. Sprint 2.12 exists to stop soft 404s; it stopped them
for `GET` only.

### Shipped

**A per-target header policy** — `src/lib/requestHeaders.js` (new), `src/lib/api.js`
- `buildRequestHeaders()` is pure (no imports, no `window`) so CI can assert it. The vendor
  headers are attached **only to first-party targets** — `ellars.us.com`,
  `www.ellars.us.com`, localhost, and every relative URL. Third-party targets never receive
  a header that only we understand.
- A bodyless `GET`/`HEAD` no longer declares `Content-Type` to a third party. It has no body
  to describe, and the declaration was the remaining reason a feed read cost an `OPTIONS`
  round trip. The live request now carries exactly one header of our choosing: `Accept`.
- Credentialed headers are untouched: `apikey`, `Authorization`, `Prefer` and `Range` still
  reach Supabase, which reflects whatever its preflight is asked for.
- The four WordPress call sites pass no per-call headers at all; the duplicated
  `Content-Type`/`X-Project-Domain` copied into each one is gone, along with a request
  `Cache-Control: s-maxage=3600` that no origin ever honoured and WordPress would reject.

**`HEAD` parity across the edge** — `functions/_middleware.js`, `functions/sitemap.xml.js`,
`functions/api/config.js`
- The middleware handles `GET` **and** `HEAD`, and drops the body rather than the decision:
  files, unknown routes and real routes all answer with the status their `GET` counterpart
  answers. Any other verb is still passed straight through.
- `/sitemap.xml` exports `onRequestHead`; `/api/config` does too, so the cheapest possible
  health probe no longer reports a configured deployment as `404`.

**The sitemap's edge cache now exists** — `functions/sitemap.xml.js`
- The handler returned `s-maxage=3600` and its comment claimed a crawler sweep cost one
  WordPress round trip. It did not: Cloudflare does not implicitly cache a Pages *Function*
  response, and `cf-cache-status` measured `DYNAMIC` on repeated identical requests. The
  document is now stored in `caches.default`.
- The WordPress fetch had no timeout. It now aborts at 2.5 s (measured origin latency:
  0.7 s; a cold function request was taking 4.0 s).
- A degraded document (origin down) is cached for **60 s**, not an hour — caching a
  WordPress outage for an hour is how dispatches stay missing after the origin recovers.
  `X-Sitemap-Cache` (`hit` / `miss` / `miss-degraded`) and `X-Sitemap-TTL` make that
  visible from one `curl` instead of an inference.

**A phantom endpoint removed** — `src/pages/Platform.jsx`
- An `IntersectionObserver` existed solely to fire `/api/precache?path=<slug>` for each
  directive card that scrolled into view. No such Pages Function has ever been mounted, so
  every visit to `/platform` produced six guaranteed `404`s that the catch-all answered and
  the client swallowed. The observer and the call are gone; the routes are already
  code-split and precached by the service worker.

### Tests

- **`scripts/smoke-client.mjs`: +18 assertions (63 → 81).** The WordPress header set is
  asserted against WordPress's own allow-list literal, not against our constant, so the
  test fails on the drift that caused this. Plus: first-party retention, `www` and preview
  origins, bodyless-`GET` `Content-Type` removal, credentialed-header preservation,
  third-party `POST` bodies.
- **`scripts/smoke-functions.mjs`: +23 assertions (168 → 191).** `HEAD` on a document, an
  unknown route, a missing asset and a passed-through `POST`; `HEAD`/`GET` parity on the
  sitemap; a fake `caches.default` proving a cold response is stored and a warm one is
  served from cache with its stored TTL; the degraded-TTL split.
- Both suites are plain `node`, no runner, and they gate CI.

### Verified

`eslint --max-warnings=0` clean · `npm test` **81 + 191 = 272 assertions, 0 failed** ·
`npm run build` clean, precache 35 entries · `wrangler pages dev dist` parity table above
reproduced locally for all seven paths · a real Firefox run against the local build shows
the feed request carrying `accept: application/json` and nothing else, with **no preflight
and no CORS error** (the local origin is not in WordPress's allow-list, which is expected;
the request itself is now simple enough not to need permission).

### Known limits

- **The fix is verified for the *request*, not yet for the *response*.** WordPress only
  allows `https://ellars.us.com` as an origin, so the restored feed can only be confirmed
  in production, after merge. That verification is the first thing the next cycle does.
- **`FALLBACK_POSTS` is unchanged.** It still fabricates three dispatches whenever the feed
  fails — and prefetching a WordPress origin will sometimes fail. Now that the feed works,
  the fallback is a real fallback again rather than the only path, but it is still
  indistinguishable from real content to a reader. Open item 8 remains an editorial call.
- **The Supabase call sites still set the vendor headers by hand** (`X-AXiM-Tenant`,
  `X-Client-Telemetry` on seven raw `fetch` calls). Supabase reflects them, so they work
  today; they were left alone deliberately to keep this cycle's blast radius on the path
  that was actually broken. They should move onto the same policy when something else
  touches them.
- **`X-AXiM-Tenant` is a client-supplied tenancy header.** Nothing server-side reads it, and
  the guardrail says tenancy comes from `app_metadata.app_id`. If any RLS policy is ever
  written against a request header, this becomes a forgery vector. Recorded, not changed.
- **~~The sitemap's `Cache-Control` is still advisory.~~ Superseded by Sprint 2.22**, which
  measured the consequence: `s-maxage` is not merely advisory on a Pages Function, it is
  ignored, and `max-age` governed the Cache API entry. The response now states one lifetime
  in `max-age` and nothing else.

---

## Sprint 2.22 — The sitemap cache repeated the defect it was written to fix

**Branch:** `fix/sitemap-degraded-cache` · **Base:** `a9d5595` (main)

### Why this cycle

2.21 was verified against production minutes after merge — HEAD parity passed on all five
paths, and the sitemap answered `x-sitemap-cache: hit` in 108 ms. It was also serving a
**1,538-byte sitemap with no dispatches at all**, from cache, with
`X-Sitemap-TTL: 60` … for over ten minutes. `cache-control: public, max-age=600,
s-maxage=60`.

Two mistakes, both mine, both measurable only in production:

1. **`s-maxage` does not set a Cache API lifetime.** `caches.default` read `max-age=600`
   from the same header. The TTL split the function was so proud of — "a degraded document
   is cached for a minute, not an hour" — was decorative: the degraded document was stored
   for ten minutes, and every crawler that arrived in that window was told the site has no
   articles.
2. **A 2.5 s timeout is too tight for a cold worker.** The origin answers in ~0.9 s warm
   and was measured at 4.0 s on the first request after a deploy. The very first request
   through the new code hit that ceiling, produced a degraded document, and the code then
   did the worst possible thing with it: cached it.

The lesson is not "the timeout was wrong". It is that a fallback which **deletes** content
it cannot see is worse than a stale answer, and that a cache lifetime has to be enforced by
the number the cache actually reads.

### Shipped — `functions/sitemap.xml.js`

- **One lifetime, in `max-age`.** `s-maxage` is gone from the response. Measured, not
  assumed: the directive named in the previous cycle's comment was not the one being read.
- **The last good post list is kept separately and survives an outage.**
  `POSTS_CACHE_KEY_PATH` stores the mapped post entries for an hour; when the origin does
  not answer, the sitemap is rebuilt from that list and reported as `miss-stale-posts`
  (cache TTL 300 s) instead of published with the dispatches removed. A WordPress blip no
  longer makes the articles disappear from the sitemap.
- **Versioned, synthetic cache keys** (`/__edge-cache/sitemap-v2`,
  `/__edge-cache/sitemap-posts-v2`). A document written by an older deployment cannot be
  inherited by this one — which is exactly the state the previous cycle left in a colo — and
  a crawler appending `?utm_source=` cannot fan one document out into many entries.
- **Origin timeout raised 2.5 s → 6 s**, above the 4.0 s measured cold-start worst case.
- `X-Sitemap-Cache` now distinguishes `miss` / `hit` / `miss-degraded` /
  `miss-stale-posts`.

### Tests

`scripts/smoke-functions.mjs`: **199 assertions** (was 191). New:
- the stored lifetime is asserted as `public, max-age=60` and the absence of `s-maxage` is
  asserted separately, so the regression cannot be reintroduced by re-adding a hint;
- a cold response is stored under the **versioned synthetic key**, and *not* under the
  incoming URL;
- a query string hits the same single document entry;
- a previously good post list is reused through an outage, reported as `miss-stale-posts`,
  and cached for 300 s.

The fake cache now clones on read the way `caches.default` does — the first version handed
back the same object and failed on the second read, which is a fake that does not behave
like the thing it stands in for.

### Verified

`eslint --max-warnings=0` clean · `npm test` **81 + 199 = 280 assertions, 0 failed** ·
`npm run build` clean · `wrangler pages dev dist`: `/sitemap.xml` → 67 URLs,
`max-age=3600`, **miss 736 ms → hit 9 ms**.

### Known limits

- **The stale-post list is per-colo.** `caches.default` is not a global store, so a colo
  that has never served a good sitemap has nothing to fall back on. The window is one
  request wide per colo, and the cost is a `miss-degraded` document, not a wrong one.
- **A degraded document is still published when there is nothing to fall back to.** That is
  the honest answer — 4 static routes and 6 directives are real URLs — but it is a thinner
  sitemap than a crawler would like, and the only cure is a reachable origin.
- **Production verification is manual.** The failure this cycle fixes was invisible to
  local tests and to CI: both ran the same code that passed. Nothing in the pipeline
  asserts the *deployed* sitemap contains dispatches. A post-deploy probe would have caught
  it in seconds; there is still no post-deploy probe.

---

## Sprint 2.23 — A privacy policy that describes this site, and the form it depended on

**Branch:** `feature/privacy-policy-and-copy-hygiene`

### Why this cycle

The footer's "Privacy Policy" link pointed at `#`, and the banner claimed a "STRICT PRIVACY
PROTOCOL" that no published document backed. Meanwhile the site loads Google Fonts on
every visit — the one third-party request that always happens — and the donation modal
opened `https://example.com/donate` in a new tab when `VITE_DONATION_LINK` was unset and
logged it as a contribution. A policy was written for what the code actually does, and the
three statements the code could not keep were fixed rather than smoothed over in prose.

### Shipped

**`/privacy` exists as a route** — `src/pages/Privacy.jsx` (new), `src/App.jsx`
- Lazy-loaded like every other page. Metadata is **not** declared in the component: it comes
  from `lib/edge/meta.js` via `RouteMeta`, so the 2.17 single-writer rule holds by
  construction.
- `lib/edge/meta.js` gains `/privacy` (indexable, self-canonical); `functions/sitemap.xml.js`
  gains it at `priority 0.3`, `changefreq yearly`. Sitemap is now 68 URLs.
- `Footer.jsx`: the dead `to="#"` Privacy link points at the route. The "System Logistics"
  pseudo-link — another `#` — was removed rather than left as decoration.
- `PrivacyBanner.jsx`: rewrite of the claim to match the policy (first-party telemetry,
  cookie-less analytics, bot protection, Google-served fonts), with the link to the policy,
  suppressed on `/privacy` itself.

**The policy states the font situation instead of omitting it** — `src/pages/Privacy.jsx`
- `src/index.css` imports `fonts.googleapis.com` on every page load, so Google receives a
  request including the caller's IP address before any interaction. That is disclosed in its
  own section, with the fix named (self-host the four families) and the removal condition
  written into the document. Over-disclosure, where the behaviour is real, is the honest
  direction to err in.
- Retention is described as it actually is rather than as a schedule nobody enforces. Same
  reasoning, stated in the text.

**The donation modal no longer routes to a placeholder** — `src/components/common/DonateModal.jsx`
- `|| 'https://example.com/donate'` is gone. With `VITE_DONATION_LINK` unset (the current
  state) the Confirm button is disabled, keyboard activation is refused in the handler, and
  the modal says contributions are not open rather than opening a stranger's page in a new
  tab and emitting `donation_initiated`.

**Inquiry submissions stopped reporting success for data that was thrown away** — `src/pages/About.jsx`
- `submitBookingInquiry` reports failure by **returning** `{ isError: true }`; it does not
  throw. `handleBookingSubmit` ignored the return value, so with `VITE_CF_FORM_ENDPOINT`
  unset — which is the production state — every inquiry showed `// INQUIRY TRANSMITTED`,
  cleared the form, and discarded the message. The handler now checks the result, reports
  `// TRANSMISSION FAILED`, and **keeps what was typed**.
- Found while writing the policy, not before it: `/privacy` sends data-access and deletion
  requests through that form, so a silent success was a data subject request that silently
  vanished. This is the one defect in this cycle that was live in production.
- The inquiry-type select gains a `Privacy request` option. The policy told readers to
  "mark the inquiry type as Privacy" and no such option existed.

**Copy that did not match the platform** — `index.html`, `About.jsx`, `Platform.jsx`, `DirectiveDetail.jsx`
- `All-American Tax Credit` → `The American Tax Credit` everywhere; the site had used both
  names for the same instrument. `0` occurrences of the old name remain in `src/`.
- Homepage `description`/`og:description`/`twitter:description` now state the brand as it is
  (citizen, public advocate, author of the $12,000/yr credit funded by the Automation
  Dividend) instead of four keyword fragments.
- Directive copy de-personalised: "James brings a perspective as a worker first, contrasting
  with oligarchs who were born into money" → an argument about whose income the consensus
  was written by. The second version is defensible and survives quotation out of context.
- "IMPLEMENTATION ROADMAP" (a campaign-shaped promise of pilots and rollouts) → "HOW IT GETS
  ADOPTED", which describes publishing models, statute language and a county-level
  projection, and states plainly that adoption belongs to people who hold office.

### Tests

`npm test`: **288 assertions** (86 client + 202 edge), 0 failed. New:
- `/privacy` joins the client↔edge metadata parity loop in `scripts/smoke-client.mjs`. A
  route added to one table and not the other is a document whose DOM and whose raw bytes
  disagree — the 2.17 defect, one route at a time.
- The bare `STATIC_ROUTES.length === 4` sitemap assertion is replaced by an exact path list.
  A count passes when one route is swapped for another and fails when one is legitimately
  added — exactly backwards.
- Two invariants replace the hand-maintained trust: **every sitemap route has an indexable
  metadata entry with a self-canonical**, and **`/login` and `/dashboard` never appear in the
  sitemap**. The first catches a path advertised and then answered as a 404; the second
  catches a noindex surface telling crawlers it exists.

### Verified

`eslint --max-warnings=0` clean · `npm run build` clean, `dist/200.html` present ·
`wrangler pages dev dist`:
- `GET /privacy` → `200`, `<title>Privacy Policy | James Ellars</title>`, policy description,
  `robots: index, follow`, self-canonical — i.e. the middleware writes it into the raw bytes,
  not only after hydration.
- `GET /sitemap.xml` → **68 URLs**, includes `/privacy`, `max-age=3600`, `X-Sitemap-Cache: miss`;
  `HEAD` matches `GET`.
- `GET /platform/typo` → `404` (the soft-404 guarantee is unaffected by the new route).

### Known limits

- **The privacy request channel has no delivery path in production.** `/privacy` points at
  the About form; that form now fails honestly instead of lying, but it still cannot deliver
  until `VITE_CF_FORM_ENDPOINT` is bound (open item 7). Honest failure is the interim state,
  not the finished one.
- **The font disclosure is a disclosure, not a fix.** Self-hosting the four families removes
  the section and the only always-on third-party request; it is not done here.
- **"Cloudflare Web Analytics" is asserted from configuration, not measured.** The beacon is
  injected by the dashboard, not by this repository; `static.cloudflareinsights.com` is in
  `script-src` and `connect-src`, which is the evidence available from code.

---

## Sprint 2.24 — Nothing checked the deployment, which is where both defects lived

**Branch:** `feature/post-deploy-probe` · **Base:** `9ad0fa5` (main)

### Why this cycle

The cycle opened with the routine production sweep, and the sweep came back clean: five document
routes and six directives all carried their own title and self-canonical, `/platform/typo` and an
unknown path answered `404`, `HEAD` matched `GET` on five paths, `/api/config` reported
`configured:true` with a bare project origin, and the sitemap served **68 URLs / 57 dispatches**
from cache with one `max-age`. There was no live defect to fix, so the cycle went to the roadmap's
own top item — the one 2.21 and 2.22 both wrote down while bleeding:

> Both defects were invisible to CI and to local runs — the pipeline executes the same code that
> passed. A scheduled check against production would have caught both in seconds.

`verify.yml` proves the artifact is correct. Nothing proved the *deployment* was. That is the whole
gap: a build can be byte-perfect and deploy into a state no crawler can use.

One measurement in this cycle's own sweep is worth recording because it nearly became a finding:
`curl` without an `Accept` header returned the site title on every route and a `200` for a missing
path, which reads exactly like a middleware regression. It was not — `wantsDocument()` requires
`text/html`, and `Accept: */*` correctly falls through to the SPA. **A probe that does not declare a
document measures the fallback instead of the site.** That is now asserted, because a monitor built
on the wrong request would page someone about a healthy deployment.

### Shipped

**`lib/edge/documentIdentity.js` (new)** — the reader `applyMeta()` never had
- `readDocumentIdentity(html)` parses a served document into the facts a crawler acts on: `<title>`,
  `description`, `robots`, canonical, `og:title`, `og:url`, `twitter:title` — **plus the count of
  each**. Duplication is a defect in this codebase (Sprints 2.11 and 2.17 were the same bug at two
  layers), and a document with two `og:title` tags has no single identity whichever copy is right.
- Decodes the five entities `escapeAttr()` emits. Without that, the dividend directive — whose title
  contains `&` — would be the one correct page the probe reported as broken.
- `compareDocument()` returns failures as strings with the **measured** value next to the expected
  one. Pure: no fetch, no clock, no DOM, so the detection logic is itself testable.

**`scripts/probe-production.mjs` (new, `npm run probe`)** — 29 checks, 9 groups
- **Identity for every advertised route** (5 static + 6 directives + the two noindex surfaces):
  status, title, description, robots, canonical, `og:url` and no duplicate keys, each compared with
  `resolveMeta()` — the same table the middleware writes from. A copy edit cannot leave a stale probe.
- **The 404 surface:** unknown path and unknown directive → `404` + the NotFound identity + **no**
  canonical; missing `.png` and missing `/assets/*.js` → `404 text/plain no-store`, never the shell.
- `robots.txt` → `200 text/plain` **with** `Accept: text/html` (the regression the file rule had).
- `/api/config` → `configured:true`, a bare `https://<ref>.supabase.co` origin, and no `service_role`
  key (decoded from the JWT claim, not trusted from a field name).
- `/sitemap.xml` → XML, on-origin locs, **at least one `/articles/` URL**, no `&amp;amp;`, an explicit
  `max-age`, **no `s-maxage`**, and an `x-sitemap-cache` state. This is 2.22's exact failure: a
  document with the right status, type and headers that had silently lost every dispatch.
- **Two live dispatches** sampled from that sitemap, asserted to carry their own canonical rather
  than collapsing onto the homepage.
- **HEAD/GET parity** on the 2.21 table — status *and* content type, and HEAD carrying no body.
- **The shell's security headers survived the middleware rewrite** (CSP with no `connect-src 'https:'`,
  `frame-ancestors 'none'`, HSTS, `nosniff`) and **no stale ETag** on a rewritten body.
- **The advertised `og:image` resolves** as a real PNG on the site origin, 1 kB–300 kB.
- `--base=` probes a preview deployment, where it flips to expecting `noindex` canonicals pointing at
  production; `--attempts`/`--timeout` are tunable. Retries cover transport and 5xx **only** — a wrong
  title fails on the first answer, because retrying an assertion hides it.

**`.github/workflows/probe.yml` (new)** — three triggers, three failure modes
- After every successful `verify` on `main` (a deploy is what can break), every six hours (a deploy is
  not the only thing that can: a WordPress outage, an expired cache entry, a dashboard binding), and
  on dispatch. It checks out the **deployed commit**, not whatever `main` has become since, runs with
  no `npm ci` and no secret, and retries the whole suite once after 120 s so a still-publishing Pages
  build is distinguishable from a broken one — with both runs printed.

### Tests

`npm test` → **321 assertions** (235 edge + 86 client; was 202 + 86), 0 failed. New:
- The reader, against `applyMeta`'s own output: title, canonical, robots, `og:url`, one-of-each counts,
  and the ampersand decoding.
- **Non-vacuity, asserted rather than assumed.** Nine cases prove the comparator *fails* on: a wrong
  status, the site title in place of the route title, a duplicated `description`, a missing canonical,
  two `<title>` tags, a null expectation, a soft 404 that self-canonicalises, and a 404 answered as
  `200`. A probe that cannot fail is the green gate that checks nothing, which is the shape 2.20
  deleted from the workflow.
- Source guards: the probe sends `Accept: text/html`, imports its expectations from `lib/edge/meta.js`
  and its route list from `functions/sitemap.xml.js`, re-types no title, and exits non-zero; the
  workflow exists with all three triggers, no `secrets.`, and runs `npm run probe`.

### Verified

`eslint --max-warnings=0` clean · `npm test` 322 assertions · `npm run build` clean, precache 36
entries, all five artifacts present · **`npm run probe` → 29/29 against production** (exit 0) ·
**the same probe against `https://example.com` → 25/29 failed, exit 1**, so the gate is measured
rather than asserted · **against this branch's own Pages preview → 29/29**, with one check reporting
a note instead of a tick: `/api/config` answers `503` there because the anon key is bound for
Production only. That is a real finding about the preview environment (open item 1c) and not a defect
in the deployment, so a preview run reports it as measured state while a production run still fails
on it · the workflow YAML parses with the three triggers and the `if:` guard.

Two things the preview run changed in the code, both worth recording because they were the probe's
own defects rather than the site's:

- **A 503 was being retried as transient and thrown** before any check could read it, so an unbound
  key surfaced as `failed after 3 attempts` — indistinguishable from a flaky origin. The retry layer
  now accepts statuses an endpoint documents as meaningful (`acceptStatuses`), and the check reports
  `answered 503, expected 200 (unbound config)`.
- **Parity forwards the same options as the GET it compares**, so `HEAD /api/config` is still compared
  with `GET /api/config` on a host where both answer `503`.

### Known limits

- **It sees what an anonymous client sees.** Login, the dashboard and the Vault are behind auth: the
  probe can assert that `/login` and `/dashboard` serve the right document, not that a session works.
  That needs a credential in CI, which is open item 2's territory (RLS is still unverified).
- **It reads raw bytes, not the hydrated DOM.** A client-side regression — the 2.17 hand-off, an
  effect that rewrites the title — passes the probe. It is the complement of the browser checks done
  by hand, not a replacement for them.
- **A slow Pages build can still race the post-merge run.** The single 120 s retry covers the ordinary
  case; a genuinely stuck deploy would show as a red probe *and* a stale `cf-ray` in the log. It beats
  the alternative (a probe that waits ten minutes to say nothing). **Measured on 2.25's merge
  (2026-11-05):** the first run started 7 s after the merge, found the two new font URLs `404`, and
  reported `29 passed, 2 failed`; the retry 120 s later found them and reported `31 passed, 0 failed`.
  The deploy lag was ~2 minutes, and both runs are visible in the log — which is the whole point of
  not retrying inside the assertions.
- **GitHub's scheduler is not punctual.** A cron run can start minutes late, and scheduled workflows
  stop after 60 days without repository activity — the post-merge trigger is the one that matters, and
  the schedule is the backstop.
- **It reports, it does not roll back.** Nothing here reverts a bad deploy; it makes the failure
  visible within minutes instead of the next time someone opens the site.
- **A preview deployment is a different environment, and the probe says so.** `--base=<preview>` flips
  the expectations to `noindex` and production canonicals, and tolerates the `503` that `/api/config`
  answers where no anon key is bound (item 1c). It does **not** tolerate that on production — a
  production run fails on an unbound key, which is the defect Sprint 2.8 shipped for weeks.

---

## Sprint 2.25 — Every visit called Google before it rendered a word

**Branch:** `fix/self-hosted-fonts` · **Base:** `e0f193e` (main)

### Why this cycle

Open item 17, and the roadmap's named next hardening item. `src/index.css` began with
`@import url('https://fonts.googleapis.com/css2?...')`, so **every** visit to **every** page
made a request to Google before the first glyph painted — carrying the visitor's IP address,
with no interaction required. It was the only always-on third-party request on the site, and
the reason `/privacy` had a section titled "One thing worth being explicit about: the fonts",
written in 2.23 to disclose a behaviour that should not have existed.

The disclosure was honest and it was also an admission: a privacy notice whose longest
paragraph is about a font request is describing a defect.

### Shipped

**Four families, self-hosted — `public/fonts/`, `src/fonts.css` (new)**
- The CSS was re-derived from the same Google Fonts URL the site imported, WOFF2 user agent,
  keeping only the `/* latin */` blocks (the site is English; a subset nobody reads should not
  be downloaded to prove it). 4 files, **108 kB**.
- **One `@font-face` per family, not per weight.** Google answers `wght@300;400;500;600;800`
  with a *single variable font* and repeats its URL in each rule; downloading per weight
  produced five byte-identical 48 kB Inter files — 351 kB of duplicates for 108 kB of
  typeface. `font-weight: 300 800` (Inter) and `400 900` (Cinzel) download once and render
  every weight. Caught by noticing four files with the same byte count.
- `unicode-range` and `font-display: swap` carried over unchanged, so a page still downloads
  nothing for characters it does not use and text still paints in the fallback face rather
  than staying invisible.
- `public/fonts/README.md` records provenance, versions (Inter v20, Cinzel v26, Marcellus v14,
  VT323 v18), licence (all SIL OFL 1.1) and why `@fontsource` was not used: it would add four
  dependencies to ship 108 kB of bytes that never change, and its versioning is separate from
  the CSS that references them.

**The CSP shrank — `public/_headers`**
- `style-src` loses `fonts.googleapis.com`, `font-src` loses `fonts.gstatic.com`,
  `connect-src` loses both. The policy now allows **no Google host at all**, which is two
  fewer origins a compromise of this site can reach.
- `/fonts/*` gets its own rule: `max-age=86400` (no `immutable` — the filenames are not
  content-hashed) and `Content-Type: font/woff2` **pinned**, because the probe asserts that
  type exactly and a font served as `application/octet-stream` under `nosniff` is the kind of
  thing that renders on one browser and not another.

**The service worker was caching a host that no longer exists — `vite.config.js`**
- The `google-fonts` runtime route (`^https://fonts.(googleapis|gstatic).com`) is deleted.
  Dead config that describes a request nobody makes is how a future reader concludes the
  request still happens.
- `woff2` is removed from `globPatterns` deliberately: precaching four families would put
  108 kB in every install, including the three a given page never renders. Fonts are fetched
  on first use and kept 30 days by the existing `image-font-cache` route. Precache stays at
  36 entries / 998 KiB.

**The policy stopped disclosing what no longer happens — `src/pages/Privacy.jsx`**
- The "explicit about the fonts" section is gone, as its own final paragraph promised it would
  be ("when that is done, this section is deleted"). The Google Fonts bullet is gone from the
  sub-processor list — Google is no longer a processor of anything on this site. Version
  **2**, same date.

### Tests

`npm test` → **352 assertions** (266 edge + 86 client), 0 failed. 30 new, all mechanical:
- **No stylesheet loads a font from Google** (comment-stripped, because the fix's own comment
  quotes the URL — the guard failed on its own documentation first, at 5 `font-display: swap`
  for 4 faces, and was corrected rather than deleted).
- **No active `_headers` line names a font host** (comments stripped: the note explaining the
  removal names the host), and the parsed CSP must read `font-src 'self' data:` with no font
  host in `style-src` or `connect-src`.
- The service worker has no `google-fonts` route and no `woff2` in `globPatterns`.
- `/fonts/*` pins `font/woff2` and caches for a day, not a year.
- **The files are real**: four committed, each with the `wOF2` magic number and over 5 kB;
  every committed file is declared and every declaration resolves; every face uses
  `font-display: swap`; families are declared once each; the two variable families use ranges.
- **The Tailwind tokens and the faces agree** — `font-inter`, `font-editorial`, `font-deco`,
  `font-mono` all resolve to a family that is actually declared, in both directions.
- The policy contains no "Google Fonts" claim and records Version 2.
- The probe gained two checks (below), which is where the 4 assertions that are not source
  guards land.

### Verified

`eslint --max-warnings=0` clean · `npm test` 352 assertions · `npm run build` clean, precache
36 entries, `dist/fonts/` carries the four files, the built CSS references all four by
absolute `/fonts/...` URL, and **no `fonts.googleapis`/`fonts.gstatic` string survives in
`dist/assets`, `dist/index.html` or `dist/sw.js`** (only in the `_headers` comment that
explains their removal) · `vite preview` serves `/fonts/inter-variable.woff2` as 48,256 bytes
with a `wOF2` header.

`npm run probe` gained `/fonts/inter-variable.woff2` and `/fonts/cinzel-variable.woff2`:
status, content type, size and magic number — so the deployment is checked, not just the
build, and the edge's file rule is proven to cover `.woff2` (a font answered by the SPA shell
would be a `text/html` 200). Against production **before** this merge those two checks fail
with `404` — correct, and the cleanest demonstration yet that the probe added in 2.24 detects
an asset that exists in the repo and not in the deployment. They went green on the merge, measured:
`29 passed, 2 failed` at merge+7 s (fonts not yet published), `31 passed, 0 failed` after the probe's
120 s retry — 2.24's deploy-propagation path exercised for real the first time it was needed.

### Known limits

- **Latin only.** A visitor whose page needs Cyrillic or Greek falls back to the system face
  for those characters rather than downloading a subset nobody reads. Adding one means adding
  the subset's blocks to `src/fonts.css` and its `.woff2` here; the README says so.
- **The files are pinned, not versioned by hash.** A future font bump replaces a file at a URL
  clients may have cached for a day. `max-age=86400` (not `immutable`) is the deliberate price
  of keeping the paths readable, and the same rule the site already applies to images.
- **Nothing verifies the rendered glyphs.** The guards prove the files are served and
  declared; they cannot prove the page looks right. That remains a browser check by eye, and
  the four families and their tokens are unchanged from before.
- **`font-display: swap` is inherited, not re-decided.** It is the right choice for a content
  site (no invisible text), and it is the reason a page can flash its fallback face on a cold
  cache. Self-hosting makes that window smaller, not zero.

---

## Sprint 2.26 — The head handed out canonical tags the client never took back

**Branch:** `fix/canonical-ownership` · **Base:** `8aae850` (main)

### Why this cycle

A sweep of client-side behaviour in a real browser — the class of defect `npm run probe`
cannot see, because the probe reads bytes before JavaScript runs. 2.17 introduced one client
writer for route metadata and a reconciliation pass (`HeadOwnership`) that deletes the
shell's copy of any key the client has claimed. `readHeadTags` looked at `<meta>` only.

`<link rel="canonical">` is written twice: by the edge middleware (so a crawler that never
runs JavaScript gets one) and by `<RouteMeta>` after hydration. Nothing removed the first.
Measured against production, 2026-11-05:

| state | canonicals before |
|---|---|
| load `/` | **two identical** (`/` from the edge, `/[rh]` from Helmet) |
| home → `/news-media` | `/` **and** `/news-media` |
| `/news-media` → a dispatch | **`/` and nothing else** |
| direct load of a dispatch | one, but beside **two** `description`, **two** `robots`, **two** `og:image` and the site card's `og:image:width/height` describing a different picture |

Row 3 is the worst of them. Every dispatch reached by clicking — the archive is the normal
way in — advertised **the homepage as its canonical**. That is not a missing signal; it is a
positive instruction to a search engine that the article is a duplicate of `/`.

Row 4 is a second, independent defect: `ArticleDetail` renders `<Helmet>` only after its
WordPress fetch resolves, and `HeadOwnership` reconciled **once**, one frame after the mount.
For a route whose head is written asynchronously, a one-shot snapshot runs before there is
anything to reconcile.

### Shipped

**The canonical is a head key like any other** — `src/lib/headMeta.js`
- `readHeadTags` reads `meta, link[rel="canonical"]`, and a canonical is reported with
  `key: 'canonical'`, `content: href`. The supersede rule ("a client-owned tag removes the
  shell's copy of the same key") then applies with no special case for links.
- `routeCanonicalPath(slug)` builds a dispatch's path from the parameter alone — trailing
  slash, query and hash stripped exactly as `normalizePath` strips them, `null` for an empty
  slug so the caller keeps the edge's answer instead of inventing `/articles`.

**Ownership is continuous, not a snapshot** — `src/components/common/HeadOwnership.jsx`
- A `MutationObserver` on `document.head` reconciles on the next frame after anything is
  added or re-contented, coalesced onto one frame and idempotent, so it settles after one
  pass. This covers the data-driven route and any future component that writes head tags
  after mount.
- The first version of this used **two** `observe()` calls — one for `childList`, one for
  attributes. A second call on the same target *replaces* that target's options rather than
  merging them, so insertions stopped being observed and the article page kept every
  duplicate. Caught in a local browser harness, not by a test; the comment now records why.

**The article route declares its own identity before it loads** — `src/components/intel/ArticleDetail.jsx`
- `<link rel="canonical">` and `og:url` are rendered above the loading and error returns,
  from the slug alone, matching the URL the edge already wrote. Loading, failed and loaded
  all canonicalise to the article's own URL.

**The client now owns the site card too** — `lib/edge/meta.js`, `src/components/common/RouteMeta.jsx`
- Deleting the shell's copy of a key is permanent. After visiting a dispatch and navigating
  to `/about`, the document advertised **no `og:image` at all** — the shell's had been
  removed on the article, and `RouteMeta` never declared one. `SITE_CARD` is now exported
  from the table and declared by the client on every route it owns, so ownership is total and
  `ArticleDetail`'s featured image still supersedes it.

### Tests

- **`scripts/smoke-client.mjs`: +16 assertions (86 → 102).** A fake head answers only the two
  selectors the module actually uses, so it cannot pass by answering a selector the real
  document would answer differently. The three measured states are reconstructed in memory —
  double canonical on `/`, the stale article canonical after navigation, and the direct-load
  article — plus `routeCanonicalPath` normalisation and reconcile idempotence.
- **`scripts/smoke-functions.mjs`: +2 assertions (266 → 268).** `SITE_CARD` must equal the
  card `index.html` declares, and describe it exactly (type, width, height, alt), asserted
  against the shell's bytes rather than against a copy of the constant.

### Verified

`eslint --max-warnings=0` clean · `npm test` **102 + 268 = 370 assertions, 0 failed** ·
`npm run build` clean · `npm run probe` **31/31 against production**.

In a real Firefox session against a local `wrangler pages dev` of the built artifact — with a
local WordPress proxy and a locally patched CSP so the dispatch fetch resolves, which is the
only way this can be exercised outside production:

| state | canonicals | description | robots | og:image | stale size hints |
|---|---|---|---|---|---|
| `/` | 1 | 1 | 1 | card | 4 |
| `/platform`, `/about`, `/news-media`, `/privacy`, `/login` | 1 | 1 | 1 | card | 4 |
| dispatch (direct and via archive) | 1 | 1 | 1 | featured | **0** |
| dispatch → `/about` | 1 | 1 | 1 | card restored | 4 |

Console is clean on every route except the two already-logged production items (the missing
Instagram route and the CSP-blocked placeholder video).

### Known limits

- **This is a client-side invariant and no CI gate sees it.** `npm run probe` fetches bytes
  before JavaScript runs, and `npm test` has no DOM. The 370 assertions cover the planner, not
  the mounted document; the table above was measured by hand. A `vitest` + `jsdom` harness
  (open item 9) or a headless probe step is what closes that gap.
- **`twitter:image` is still the site card on dispatches.** `ArticleDetail` supersedes
  `og:image` but declares no `twitter:image`, so a dispatch shares the card on Twitter/X and
  its featured image everywhere else. Pre-existing, unchanged here, and now the most visible
  remaining asymmetry in the article head.
- **The observer reconciles the whole head on every mutation.** Cheap here (a dozen tags,
  coalesced per frame), but it is a global listener on `document.head`; if a future third-party
  script mutates the head continuously this should move to a targeted list.
- **`/articles/<unknown>` carries a self-canonical with `noindex`.** The article URL exists as
  a route, so the URL is a defensible answer; the `noindex` is what keeps it from being
  indexed. Serving it as a real 404 would need the edge to ask WordPress, which is not on the
  critical path today.

---

## Sprint 2.27 — A DOM test harness, for the invariants that only exist after hydration

**Branch:** `test/dom-head-harness` · **Base:** `a6d7257` (main)

### Why this cycle

Three defects in three cycles lived in the same blind spot. `scripts/smoke-client.mjs`
asserts the head dedupe **plan** and never mounts a component; `npm run probe` fetches the
deployment **before JavaScript runs**. Between them sat everything that happens after
hydration:

- 2.26's canonical tags, written by both the edge and the client and never reconciled;
- 2.26's one-shot reconciliation, which ran before a data-driven `<Helmet>` existed, so a
  dispatch carried two `description`, two `robots` and two `og:image`;
- the two `observe()` calls that replaced each other's options, so `childList` was never
  watched — caught in a local browser harness only because a human looked.

Each was found by driving a browser by hand. That is not a gate, and the plan has said so
for four cycles ("those want `vitest` as a real dependency"). This cycle writes it.

### Shipped

**The runner** — `vitest.config.js`, `package.json`
- `vitest` 5.1 + `jsdom` 31 + `@testing-library/react` 16, dev-scope. Deliberately **not**
  the project's `vite.config.js`: that one loads the PWA plugin, which generates a service
  worker and a precache manifest at build time. A test runner has no business doing either,
  and importing it would make the suite depend on build output. The alias table is one line
  and is duplicated.
- `pretendToBeVisual: true` (jsdom), because react-helmet-async commits inside a
  `requestAnimationFrame` and `<HeadOwnership>` reconciles on the frame after a mutation.
  Without it the suite would assert against a head that had not been written yet and pass
  by timing.
- `test:dom` sets `NODE_ENV=test` itself. An ambient `NODE_ENV=production` — which this
  sandbox sets, the same trap 2.20 documented — resolves React's production build, whose
  `act` is a no-op, and every `render()` throws.
- `npm test` now runs all three suites, so the existing CI step picks it up. The step's
  comment says which suite covers what and why a DOM suite exists at all.

**The tests** — `tests/dom/head-ownership.test.jsx`, 8 cases
- The jsdom document starts as the edge middleware leaves it: shell `<title>`,
  `description`, `robots`, `og:*`, `twitter:*`, the card's size hints, and an unowned
  `<link rel="canonical">`.
- **The real `<RouteMeta>` and `<HeadOwnership>`** are mounted; the real `<ArticleDetail>`
  is mounted with **only its network call mocked** — and that call is a gate the test opens,
  not a timer, because a two-phase assertion (loading state vs loaded state) cannot race a
  sleep on a loaded runner.
- Cases: shell canonical superseded on the entry route; canonical moves on navigation; the
  edge canonical survives when nothing competes (the no-JavaScript fallback); the client
  owns the card on routes it owns; a `<Helmet>` written **after** mount still supersedes the
  shell; the dispatch canonicalises to its own URL **while loading**; the loaded dispatch has
  one of each and its own image with the stale hints gone; navigating away from a dispatch
  restores the card and its four hints.

### The harness is not decorative — proved, one regression at a time

Each fix was reverted alone and the suite re-run:

| reverted | failing tests |
|---|---|
| `readHeadTags` back to `meta` only | 4 |
| `HeadOwnership` back to a one-shot frame | 2 |
| `ArticleDetail` without its own identity | 2 |
| `RouteMeta` without the `SITE_CARD` declaration | 2 |

Two assertions were **strengthened** because the first version passed against broken code:
"the card is present" is satisfied by the shell's copy, so it now asserts the card is
*owned* (`data-rh`), which is what makes a route able to hand it back.

### Verified

`npm test` → **102 + 268 + 8 = 378 assertions, 0 failed** · `eslint --max-warnings=0` clean ·
`npm run build` clean, precache 36 entries · `npm ci --include=dev` from scratch, then the
DOM suite, to prove the lockfile installs the way CI will.

**Incidental, recorded because 2.20 set the number:** the dev-scope advisory backlog fell
from 16 to **6** (2 low, 4 moderate) as a side effect of the install lifting transitive
`minimatch`/`glob`. The runtime gate is unchanged: `npm audit --omit=dev --audit-level=high`
→ 0.

### Known limits

- **Eight cases, one surface.** This covers the head because that is where three defects
  lived; the dashboard, the Vault, the audio player and the modals have no DOM coverage at
  all. The harness is the prerequisite for those, not a substitute for them.
- **`ArticleDetail` is mounted with a mocked `@/lib/api`.** That is deliberate — the unit
  under test is the head lifecycle, not the fetch — but it means the suite would not catch a
  change to `getPostBySlug`'s contract.
- **jsdom is not a browser.** It has no layout, no real `requestAnimationFrame` timing under
  load, and no CSP. The local `wrangler pages dev` + real Firefox harness remains the only
  way to check rendering, and it is manual.
- **No coverage threshold**, deliberately: a number that can be satisfied by asserting
  trivia is worse than no number. Scope is guarded by the table above instead.

---

## Sprint 2.28 — The two protected surfaces, finally under test

**Branch:** `test/dom-auth-surfaces` · **Base:** `b5369a5` (main)

### Why this cycle

The guardrails name four surfaces no change may break: `/login`, `/dashboard`, the live
stream and continuous audio. 2.27 built the harness that can test them and pointed it at the
head. This cycle points it at the two that are reachable — and at the branch that has
already been wrong once.

Sprint 2.6 found that `verifySession()` collapsed a timeout into an authoritative "guest",
so a slow network logged a member out. That logic has been rewritten twice since and has
never had a test. It is six lines of conditionals guarding the only thing that decides
whether someone sees their dashboard.

### Shipped — `tests/dom/protected-route.test.jsx` (7 cases)

- no token → the gateway, no dashboard;
- verified session → the dashboard;
- **hard** guest (the server answered, and the answer was no) → session cleared, back to the
  gateway;
- **transient** guest (the server did not answer) → **the session survives** and the
  dashboard renders. This is the 2.6 regression, pinned;
- offline with a persisted token → dashboard renders, `verifySession` is **never called**,
  and the "Offline Mode" banner explains why;
- nothing decided until storage has been read — the skeleton, asserted *after* the
  validation tick has settled, so the assertion cannot be satisfied by the initial
  `isValidating` flag;
- the five-minute heartbeat re-verifies in the background and clears a session the server
  has since revoked (fake timers, both calls asserted).

### Shipped — `tests/dom/login.test.jsx` (6 cases)

- a rejected credential shows the server's reason, keeps the form, re-enables the button and
  stores nothing;
- the *specific* message for a deployment with no anon key bound, and that it is **not**
  reported as "invalid credentials" — the failure that made an unconfigured deployment look
  like a user's mistake;
- success stores the token and lands on `/dashboard`;
- the credentials reach `loginUser` as typed: the email as the input yields it (the platform
  strips surrounding whitespace from `<input type="email">` — measured, not assumed) and the
  password **verbatim**, spaces intact;
- a thrown transport failure is an error, not a rejection;
- the form is disabled in flight, so a double submit cannot send the password twice.

### The harness is not decorative — proved by mutation

| mutation | failing tests |
|---|---|
| transient failure treated as a logout (the 2.6 defect) | 1 |
| offline short-circuit removed (asks a server it cannot reach) | 1 |
| **both** hydration guards removed | 1 |
| error message not put into state | 2 |
| token not stored on success | 1 |
| form not disabled while in flight | 1 |

One honest negative: the two hydration guards — the effect's early return and the `!isHydrated`
term in the skeleton condition — are **redundant**. The suite fails only when both are
removed. Each alone keeps the skeleton up, which is the behaviour that matters, so the test
asserts the behaviour rather than either mechanism. Recorded rather than dressed up as
coverage of both.

### Verified

`npm test` → **102 + 268 + 21 = 391 assertions, 0 failed**, run three times for flake
(the heartbeat case uses fake timers) · `eslint --max-warnings=0` clean · `npm run build`
clean, precache 36 entries · production probe unaffected (**31/31**).

### Known limits

- **The audio player is not testable because it is not reachable.** `GlobalAudioPlayer` renders
  `<audio>` and reads `audioActiveTrack`, but **nothing in the codebase ever calls
  `setAudioActiveTrack`** — the "station" can never start, so the SW's audio-safe update
  prompt (`swPolicy(… audioPlaying …)`) is unreachable in practice. Continuous playback is a
  guardrail surface with no playback. This is a wiring gap, not a regression, and it needs
  real audio URLs before it can be closed; recorded as open item 19.
- **`loginUser` itself is mocked.** These cases cover the form's states, not the token
  exchange — that needs a live Supabase project, which is item 1c.
- **The dashboard's own states** (Vault list, publisher draft, media uploads) remain
  uncovered. They are the natural next use of the same harness, and they need the row-shape
  contract from item 2b before tests can be written honestly.

---

## Sprint 2.29 — One failed request, one event (it was filing two, or none)

**Branch:** `fix/api-failure-telemetry` · **Base:** `4fd7815` (main)

### Why this cycle

Item 11 has been on the list since 2.15 with the note "confirm the reduced redirect logic does
not double-report". Nobody had done the confirming, so this cycle measured it: stub `fetch`,
call the real functions, read the real queue out of `localStorage`. The result inverted the
assumption behind the item.

| failure | events filed before this cycle |
|---|---|
| transport (fetch threw) | `API_FETCH_ERROR` (**HIGH**) + `wp_feed_fallback_served` (LOW) |
| HTTP 500 | `wp_feed_fallback_served` (LOW) — **no error at all** |
| HTTP 401 on the Vault | **nothing** |
| timeout (our own abort) | `API_FETCH_ERROR` (**HIGH**) + `wp_feed_fallback_served` (LOW) |

`logApiErrorToTelemetry` had exactly one call site: the `catch`. Every non-ok response
returned from the `!ok` branch *above* it, so the entire HTTP failure class — the 500 on the
feed, the 503 on the config endpoint, the 401 that logs a member out — was invisible while the
transport class was billed twice, once by the utility and again by the caller that then served
fallback dispatches. An error dashboard built on this queue would have shown one incident for
every dropped connection and zero for every broken server.

### Shipped — `src/lib/apiFailure.js` (pure, no imports, no globals)

- **`classifyApiFailure()`** — the decision, as a table rather than as branches scattered
  across a retry loop. Severity follows meaning: `http_server`/`timeout`/`network`/`parse` are
  HIGH, `throttled`/`auth_rejected`/`http_client` are MEDIUM, `offline` is **LOW** (a client
  with no connection is an expected condition, not a production incident — it used to be
  HIGH).
- **`buildApiFailurePayload()`** — the envelope `functions/api/telemetry.js` already accepts,
  with `failure_kind`, `http_status`, `attempt`, `network_status` and `request_id` in metadata.
- **`scrubUrl()`** — origin + path, never the query string. Nothing puts a credential in a
  query today; the point is that nothing has to notice on the day something does.
- **`isTelemetryEndpoint()`** — the loop guard, now a decision the caller can be *tested*
  against instead of an `if` inside a logger.

### Changed — `src/lib/api.js`

- `fetchWithRetry` reports from **both** failure paths and from nowhere else, so one request
  produces exactly one error. The 429 retry recursion reports only its final attempt, with the
  attempt number attached (measured: 4 calls to `fetch`, one event).
- The failure object now carries `status` on the HTTP path as well. It was `undefined` there
  while the catch path set it, so a caller could not tell a 404 from a 500 without guessing.
- The degradation event (`wp_feed_fallback_served`) stays — serving cached dispatches is a
  different fact from the request failing — but it now carries `metadata.request_id`, the
  cause's idempotency key, so the pair is **joinable**: one request, one error, one
  consequence. Five copies of the same 20-line envelope literal collapsed into
  `reportFeedFallback()`.
- A `200` whose body is not JSON used to be swallowed by the callers' `catch`. It is now one
  `failure_kind: "parse"` event: the server answered, and the answer was unusable.
- `telemetry_error_flag` is gone. It was written when the telemetry endpoint failed and read
  by nothing in this repository — a broken sink that looked like it had a recovery mechanism.
- The session-clear check parses the hostname (`isSupabaseUrl`) instead of searching the whole
  URL for `.supabase.co`, which also matched `supabase.co.example.net`.

### The suite is not decorative — proved by mutation

`tests/dom/api-failure-telemetry.test.jsx` (15 cases) asserts against the real queue, not a
mock of it. Each behaviour was reverted one at a time:

| mutation | failing cases |
|---|---|
| report from the `catch` only (the pre-2.29 shape) | 7 |
| correlation id dropped from the degradation event | 1 |
| offline reported as HIGH again | 2 |
| the raw URL logged instead of the scrubbed one | 1 |
| the telemetry loop guard removed | 1 |

### Verified

`npm test` → **102 + 268 + 36 = 406 assertions, 0 failed** (36 DOM cases, up from 21) ·
`eslint --max-warnings=0` clean · `npm run build` clean, precache 36 entries, `dist/200.html`
present · production probe unaffected (**31/31**, 2026-11-06).

### Known limits

- **Nothing is watching the queue.** The fix makes the events correct and complete; item 1b
  means every one of them is still dropped at the sink (`kv/d1/analytics: unbound`), so this
  cycle's value is that the *next* binding is trustworthy. A queue with no sink is a diary.
- **The direct `fetch` calls are still unreported.** `publishVaultItem`, `updateVaultItem`,
  `deleteVaultItem`, `uploadMediaAsset`, `fetchUploadedMedia`, `loginUser` and
  `subscribeToNewsletter` bypass `fetchWithRetry` entirely, so their failures file nothing.
  A rejected login should stay quiet; a failed Vault *write* should not. Next cycle's natural
  target.
- **A 429 that recovers is still invisible.** The retry succeeds, nothing is filed, so
  WordPress throttling that we waited out cannot be seen in aggregate.
- **`FALLBACK_POSTS` is still invented content** (item 8). This cycle only made the *fact* that
  it was served reportable; a reader still gets three dispatches that do not exist, and the
  degradation event is now the only thing that says so.

---

## Sprint 2.30 — Seven writes with no timeout, and no way to hear them fail

**Branch:** `fix/supabase-write-policy` · **Base:** `53ea081` (main)

### Why this cycle

2.29 put one failure policy in one place, `fetchWithRetry`, and left a note: the direct
`fetch` calls still file nothing. This cycle followed the note.

Seven functions bypassed it — `publishVaultItem`, `uploadMediaAsset`, `fetchUploadedMedia`,
`deleteUploadedMedia` and the four Vault row-state operations. Reading what that cost, rather
than guessing:

- **No telemetry.** The queue only ever saw `fetchWithRetry`, so a refused publish, a rejected
  upload and a failed delete were reported in the console of whoever had devtools open.
- **No timeout.** `MediaUploads` and `DispatchPublisher` both clear their in-flight state in a
  `finally`. A bare `fetch` to a stalled endpoint is a promise that never settles, so the
  button stayed disabled with no route back except a reload — on the two surfaces a member
  uses to publish.
- **Hand-written headers.** Every one of the seven sent `X-AXiM-Tenant` and
  `X-Client-Telemetry` to `*.supabase.co` by hand. `requestHeaders.js` strips exactly those
  from a third-party target because nothing reads them; seven copies were re-adding them one
  function at a time.

### Shipped — `supabaseWrite()` and `vaultRowWrite()`

One envelope for every Supabase write, built on the 2.29 policy: per-target headers, one event
per failure, `auth_rejected` clears the session. The public contracts are unchanged, because
the components depend on them — `publishVaultItem` still returns a boolean, the row-state
operations still return `{ isError, message }`.

Three decisions worth recording:

- **The timeout is now per-call.** It was hard-coded at 5 s inside `fetchWithRetry`, which is
  right for a JSON read and wrong for the one request whose duration is the member's uplink.
  `supabaseWrite` takes `timeoutMs`; uploads get 120 s, everything else 5 s. Proved both ways
  with fake timers: a read aborts at 5 s, an upload that takes 30 s succeeds.
- **Writes are not retried.** A 429 on a read is free to retry; a POST that may already have
  been applied is the caller's decision to repeat. `client_idempotency_key` makes the repeat
  safe, and that belongs where the key is minted, not in a transport policy. Pinned: a 429 on
  a publish is **one** attempt and one event, where a read gets four.
- **`update` / `archive` / `restore` / `delete` are one function.** Four copies of a request
  that differed by a verb and a body literal is how they drifted — two of them sent
  `X-Client-Telemetry`, two did not, and none of them reported anything.

Deliberately left off the path, with the reason in the code: **`loginUser`** (a wrong password
is the expected outcome of a typo and must never become an incident; the 5xx that reads as
"invalid credentials" is item 20), and **`subscribeToNewsletter`** (its endpoint does not exist
yet, so routing it would file one MEDIUM per subscriber against a 50-record queue with no sink
— item 7 builds the route, and this function joins the policy in that cycle).

### The suite is not decorative — proved by mutation

`tests/dom/api-write-policy.test.jsx` (16 cases). Each behaviour reverted individually:

| mutation | failing cases |
|---|---|
| the write path calls `fetch` directly again (the pre-2.30 shape) | 7 |
| uploads inherit the 5 s read timeout | 1 |
| writes retried like reads | 1 |
| an unreadable 2xx body treated as success | 1 |
| **the hand-written tenant header put back** | **0** |

The last row is an honest negative: `buildRequestHeaders` already strips it for a third-party
target, so re-adding it by hand changes nothing. That is the right outcome — one owner of the
decision instead of seven — and the case is written to assert the outcome, not the mechanism.

### Verified

`npm test` → **102 + 268 + 52 = 422 assertions, 0 failed** (52 DOM cases, up from 36) ·
`eslint --max-warnings=0` clean · `npm run build` clean, precache 36, `dist/200.html` present ·
production probe **31/31** (2026-11-06).

### Known limits

- **Still nothing at the sink.** Item 1b: `kv`/`d1`/`analytics` are all unbound, so every event
  this and the last cycle made honest is dropped on arrival. The queue is now correct; it is
  not yet read.
- **`fetchUploadedMedia` is a read wearing a POST**, and it keeps the read policy (3 retries).
  Its status codes, not its verb, are what distinguish it from a write; recorded because it is
  the one place where "writes are not retried" is not literally true.
- **No write is covered end-to-end.** Every case here stubs `fetch`; there is no live Supabase
  project in CI (item 1c), so the row-shape contract with `axim_vault` is still unverified —
  and the table itself does not exist in the live project (item 2b).
- **The components' own behaviour is untested.** These cases pin the API contract the dashboard
  relies on; they do not mount `MediaUploads` or `DispatchPublisher`, so whether the button
  re-enables is asserted only by reading their `finally` blocks.

---

## Sprint 2.31 — An outage that read as a wrong password

**Branch:** `fix/auth-outage-reporting` · **Base:** `c651df3` (main)

### Why this cycle

Item 20, recorded while wiring 2.30, in one sentence: `loginUser` mapped every non-ok response to
the server's `error_description`. A 500 does not carry one, so **`status 500` surfaced as
"Invalid login credentials"** — the member was told to reset a password that was fine, during an
outage, and the outage was filed nowhere. A 5xx body is also very often an HTML gateway page,
and `response.json()` throwing on it turned a server fault into a parse error attributed to the
person typing.

This is the same shape as the 2.6 defect and the 2.9 one: a single branch collapsing two
different facts — *the credential is wrong* and *the service cannot answer* — into one message,
and picking the one that blames the user.

### Shipped — `loginUser` separates the three states

- **Rejected credential (4xx)** — the server's reason passes through unchanged, and **nothing is
  filed**. A mistyped password is the expected outcome of typing; reporting it would make every
  member's typo an incident, which is how an error dashboard becomes noise. The 2.28 cases that
  pin this message stay green.
- **Unavailable service (5xx / 429)** — one event (HIGH / MEDIUM respectively) with
  `failure_kind: "http_server"` or `"throttled"`, and the member is told *"Sign-in is
  temporarily unavailable…"* instead. The result also carries `unavailable: true`, so a caller
  can distinguish it from a rejection without parsing prose.
- **Transport failure** — one `network` event, and the platform's own wording ("Failed to
  fetch") is replaced with a sentence a person can act on.
- The 4xx body is read defensively. A WAF or CDN in front of the auth endpoint can answer with
  HTML; the cause is unknown at this layer, so the generic rejection sentence is used rather
  than a parser's complaint. Recorded as a known limit rather than dressed up.
- Telemetry for this call never contains the credential: the grant type lives in the query
  string, and `scrubUrl` (2.29) reports origin + path only. Asserted against the serialised
  event, not the code.

### The suite is not decorative — proved by mutation

`tests/dom/api-auth-outage.test.jsx` (11 cases). Reverted one at a time:

| mutation | failing cases |
|---|---|
| every non-ok mapped to the server's reason (the pre-2.31 shape) | 4 |
| a rejected credential reported too | 3 |
| transport failure echoes the platform wording and files nothing | 1 |
| 4xx body parsed without a fallback | 1 |

### Verified

`npm test` → **102 + 268 + 63 = 433 assertions, 0 failed** (63 DOM cases, up from 52) ·
`eslint --max-warnings=0` clean · `npm run build` clean, precache 36 · production probe
**31/31** (2026-11-06).

### Known limits

- **A non-JSON 4xx is indistinguishable from a rejection.** If a proxy refuses with a 403 HTML
  page, the member is told their password is wrong. The honest fix is a header check or a
  `cf-mitigated` test, which needs a real instance of the failure to write a true assertion
  against; recorded, not guessed.
- **Still nothing at the sink** (item 1b). The event exists, is correctly classified, and is
  dropped on arrival.
- **No live auth path is exercised.** `getSupabase` is a stub and there is no Supabase project
  in CI (item 1c), so `setSession` adoption is asserted against a mock, not a session that
  survives a refresh.

---

## Open items (prioritised, with the blocker on each)

| # | Item | Blocker | Notes |
|---|---|---|---|
| 1 | **Supabase env values in the Pages project** | Cloudflare dashboard | The anon key *is* bound (verified: `/api/config` → `configured:true`), but `SUPABASE_URL` **and** `VITE_SUPABASE_URL` are set to `https://<ref>.supabase.co/rest/v1/`. Sprint 2.9 normalises it client- and edge-side; the binding should still be corrected to the bare origin so the guard becomes belt-and-braces. |
| 1c | **`SUPABASE_ANON_KEY` is not bound for Preview** | Cloudflare dashboard | Measured 2026-11-05 against this cycle's own preview deployment: `/api/config` → `503` (`configured:false`), while production answers `200`. The binding is scoped to Production only, so **every preview deployment runs with auth dead** — `/dashboard` cannot be exercised from a PR at all, and `/login` can only show its honest "unavailable" state. Add the anon key to the Preview environment (never `service_role`); `npm run probe -- --base=<preview>` then verifies it, and removes the note that run currently prints. |
| 1b | **D1 binding for telemetry** | Cloudflare dashboard | Without it the handler now reports `d1: "unbound"` and `degraded: true` instead of pretending success. Apply `migrations/0001` + `0002` first. Measured 2026-11-03: `POST /api/telemetry` → `202` with `{"kv":"unbound","d1":"unbound","analytics":"unbound"}`, i.e. **no telemetry is being stored anywhere today**. The 202 is honest, the drop is total. |
| 2 | **RLS on `axim_vault` + `ellars-media`** | Database access | Every Vault read/write is raw PostgREST with the anon key. If RLS is not user-scoped, `deleteVaultItem` is a one-line deletion for any anon-key holder. Measured 2026-11-03 with the live anon key: `ecosystem_vault` and `telemetry_logs` both answer `200` with `[]`. An empty result does **not** prove RLS is off (a table with RLS on and no policy also returns `[]`), and it does not prove it is on — this needs the service role, not a probe. **Verify before any further Vault work.** |
| 2b | **`axim_vault` does not exist in the live project** | Database access | Measured 2026-11-03: `GET /rest/v1/axim_vault` → `PGRST205`. The live project has `ecosystem_vault` (columns `id`, `created_at`, `updated_at`; **no tenant column**) and `telemetry_logs`. So **every Vault call from the dashboard 404s in production** — list, create, update, delete — while the public site looks healthy. The client is not repointed at `ecosystem_vault` on purpose (no tenancy column). `0003_axim_vault.sql` exists only in the workspace handoff (`context/axim-vault-migration.sql`), **not in the repo**, so the schema is unversioned: copy it in, then apply it, then set `app_metadata.app_id` on the operator user. |
| 3 | **JWT trust root** | Infrastructure | `axim-passport-api` and `axim-seo-worker` both hold `SUPABASE_JWT_SECRET`. Any holder can forge tokens that satisfy every RLS policy. Target: asymmetric keys/JWKS, then rotate, then scope the service role. |
| 4 | ~~Raw-HTML metadata for non-JS crawlers~~ | **Closed in 2.11** | `functions/_middleware.js` + `lib/edge/meta.js` rewrite title/description/canonical/og for every HTML navigation, for every user agent. Remaining: article titles still come from WordPress after hydration (see the limit recorded above). |
| 5 | ~~`<UpdatePrompt />` unmounted + competing service workers~~ | **Closed in 2.10** | Prompt mounted, `public/sw.js` deleted, feed/font strategies moved into `workbox.runtimeCaching`, `controllerchange` handshake with an audio-safe prompt. Remaining nicety: a "Reload" affordance in `PrivacyBanner`-style chrome for users who dismiss the toast. |
| 6 | **`script-src 'unsafe-inline'`** | Security review | Retained deliberately in `_headers` with a comment. Removing it requires verifying the Turnstile loader and the Cloudflare Web Analytics beacon against nonces. |
| 7 | **Newsletter funnel** | `axim-passport-api` route | `VITE_CF_FORM_ENDPOINT` and `VITE_TURNSTILE_SITE_KEY` are unset at build time. `subscribeToNewsletter` posts to `/api/v1/subscribe`, which has no Pages Function, so the UI errors honestly. Needs the passport-api form route, then the env var and `https://passport.axim.us.com` in `connect-src`. |
| 8 | **Phantom content** | Editorial decision | `FALLBACK_POSTS` in `api.js` renders three fully-formed dispatches that do not exist in WordPress, and `NewsMedia.jsx` hard-codes four episodes against Unsplash thumbnails and a sample Cloudflare Stream video. Measured 2026-11-04: the WordPress preflight failure (Sprint 2.21) meant this fallback was **the only content the homepage and archive had ever rendered** — the invented dispatches were not a degraded mode, they were the product. The feed is fixed; the content is still invented. Either label it as an offline cache or empty it — a journalist clicking one hits a stub. |
| 9 | ~~No unit-test floor~~ | **Closed in 2.27** | Three suites now gate CI: `smoke-client` (**102**, pure decisions — SW update policy, the head dedupe plan, the request-header policy), `smoke-functions` (**268**, edge handlers — config resolution, sitemap entities/zones/cache, asset 404s, middleware statuses, `_headers` rules, the social card, the probe's own non-vacuity), and `tests/dom/` (**8**, vitest + jsdom, mounting the real `<RouteMeta>`, `<HeadOwnership>` and `<ArticleDetail>`). **378 assertions, no runner dependency beyond the dev deps.** Still uncovered, which is the honest remaining gap: telemetry sink independence, vault row-shape mapping, the dashboard/player/modals in the DOM, and rendering itself — jsdom has no layout, so a real browser check stays manual. |
| 10 | ~~Repo hygiene~~ | **Closed in 2.18** | `build.sourcemap` was turned off in 2.15 (0 `.map` files). The remaining 1.9 MB of root PNGs, `commit_message.txt` and the tracked `test-results/` artifact are gone, with three guards so they cannot come back. |
| 11 | ~~Duplicate Supabase 401 handling~~ | **Closed in 2.29** | Measured rather than reviewed, and the note was half right: one transport failure filed **two** events (the utility's HIGH error plus the caller's LOW degradation), while every HTTP failure filed **none** — the `!ok` branch returned above the only logger call site. `fetchWithRetry` now reports once per request from both paths, severity follows meaning, and the degradation event carries the cause's `request_id`. 15 DOM cases, 5 mutations proved. Remaining: the direct `fetch` calls (Vault writes, media, login, newsletter) still file nothing — see 2.29's limits. |
| 12 | **No cache purge path exists** | `CF_ZONE_ID` + `CF_PURGE_TOKEN` | `POST /api/v1/cache/purge-tag` → `{"error":"not_found"}` from the `/api/[[path]]` catch-all. The dead client call was **removed** in 2.15, so a publish no longer emits a guaranteed 404 — but the capability is still absent: until the Function exists, a bad edge cache entry cannot be evicted. |
| 14 | ~~A returning client may still run the previous deploy's bundle~~ | **Closed in 2.19** | Measured with two real builds: the handshake fires on a returning visit, reloads once and lands on the new build in **3,102 ms**, with no loop on the next navigation. The 2.17 observation was taken at ~0.9 s and cancelled by the next navigation — a measurement artifact, not a defect. The prompt's dead `SKIP_WAITING` post and ignored `reload(true)` argument were removed in the same cycle. See Sprint 2.19. |
| 13 | ~~`og:title` and `description` are declared twice per document~~ | **Closed in 2.17, with a gap closed in 2.26** | Both candidate fixes were taken, in the order that removes the cause rather than the symptom: route metadata now has one client writer fed by the edge's own table (`RouteMeta`), and `HeadOwnership` hands the shell's copy over once. Verified 0 duplicates on seven routes including a client-side navigation; 64 new assertions hold it. **The seven routes did not include a direct load of a dispatch**, whose `<Helmet>` renders only after its WordPress fetch — measured 2026-11-05: two `description`, two `robots`, two `og:image`, and a canonical that third of the site's normal journeys left pointing at the homepage. Sprint 2.26 made the reconciliation continuous and taught it about `<link rel="canonical">`. |
| 15 | **The Instagram feed endpoint does not exist** | Editorial / plugin access | Measured 2026-11-04: `GET /wp-json/spotlight/v1/instagram?feed=390` → `404 {"code":"rest_no_route"}`. The installed plugin's real namespace is **`sl-insta`**, and every route it publishes is admin CRUD behind auth (`/sl-insta/feeds`, `/sl-insta/accounts`, `/sl-insta/connect`) — there is no public read endpoint to point at. So `getSocialFeed()` fails on every `/news-media` view and renders `SOCIAL_FALLBACK`. Needs either a server-side fetch in a Pages Function or a decision to drop the surface. |
| 16 | **A CSP-blocked placeholder video ships** | Editorial (media assets) | `MediaPlaylist.jsx` hard-codes `https://cdn.cloudflare.stream/secure-video-stream.mp4` for two episodes. That host is not Cloudflare Stream (`*.cloudflarestream.com`), it is not in `media-src`, and the browser blocks it: `Content-Security-Policy: ... blocked the loading of a resource (media-src)`. It is the same placeholder family as item 8. Needs real stream IDs; the CSP is correct to refuse this one. |
| 17 | ~~Self-host the four font families~~ | **Closed in 2.25** | Four families, four variable/static WOFF2 files, 108 kB, generated from the same Google CSS the site imported and declared in `src/fonts.css`. The `@import` is gone, the CSP no longer allows any Google host, the service worker's `google-fonts` route is deleted, and the policy section that disclosed the request is deleted as it said it would be. Guards hold all four in place, and the probe now fetches a font from the origin. |
| 18 | ~~No post-deploy probe~~ | **Closed in 2.24** | `verify.yml` proves the artifact; nothing proved the deployment, which is where 2.21 (a feed blocked by its own preflight) and 2.22 (a cached sitemap with no dispatches) both lived while CI was green. `npm run probe` now asks the origin 29 questions about identity, statuses, HEAD parity, headers, config and dispatches, and `probe.yml` runs it after every merge, every six hours, and on demand. 29/29 measured against production; 25/29 failed against a foreign origin, so the gate is not decorative. |
| 20 | ~~A 5xx from the auth endpoint reads as "invalid credentials"~~ | **Closed in 2.31** | The three states are now distinct: a rejected credential passes the server's reason through and files **nothing**, a 5xx/429 files one event and says "temporarily unavailable", and a transport failure is reported once with a sentence instead of "Failed to fetch". Remaining: a **non-JSON 4xx** (a WAF's HTML page) still reads as a bad password, because the cause is genuinely unknown at this layer. |
| 19 | **The global audio player can never start** | Wiring + real audio assets | `GlobalAudioPlayer` reads `audioActiveTrack` and renders a player, but **no code path calls `setAudioActiveTrack`** — measured 2026-11-05 by exhaustive grep across `src/`. Every "play" surface (`MediaPlaylist`, `NewsMedia`) uses local `<video>`/visualiser state instead, so the flagship station is unreachable and the service worker's audio-safe update prompt (`swPolicy(… audioPlaying …)`) can never be exercised in production. Needs: real episode URLs, a `setAudioActiveTrack` call from the relevant surface, and a decision on whether the player replaces or coexists with the in-page players. |

---

## Accomplishments (Sprint 2.1)
- **Telemetry Batch Writes Verification**: Verified that Cloudflare D1 telemetry batch insertions use a defensive `try/catch` approach, continuing to Analytics Engine writes despite SQL issues.
- **WP Feed Fallback Telemetry**: Verified `wp_feed_fallback_served` telemetry events are automatically dispatched from `src/lib/api.js` on fetch errors/timeouts, and ensured `401` fallbacks do not invalidate Supabase sessions.
- **Automation Calculator Enhancements**: Embedded a direct integration inside `src/components/intel/AutomationCalculator.jsx` to export projections directly into Vault Drafts (`ellars_dispatch_draft` inside `localStorage`), forwarding the user to the publisher toolkit via `useNavigate`.
- **Production SEO Metadata**: Verified production-ready metadata, canonicals, and OG/Twitter headers in `index.html`.

## Roadmap Milestones (Sprint 2.29+)
- ~~Restore the WordPress dispatch feed~~ — **closed in 2.21**: the header that broke the
  preflight is gone and the request is simple. First item of 2.22: confirm the restored
  feed **in production**, since WordPress only allows the production origin.
- ~~Add a post-deploy probe~~ — **closed in 2.24**: `npm run probe` (`scripts/probe-production.mjs`)
  plus `.github/workflows/probe.yml` asserts identity, statuses, HEAD parity, headers, config and
  dispatches against the live origin, after every merge and every six hours. Next best use of the
  same mechanism: a probe step that logs in and reads one Vault row, once item 2 has a policy to read.
- ~~Self-host the four font families~~ — **closed in 2.25**: the site now allows no Google host at
  all, and `/privacy` lost the section that disclosed the request instead of having to keep it
  accurate.
- ~~Give the client head invariants a DOM test~~ — **closed in 2.27**: `tests/dom/` mounts the
  real components, and each of the four fixes it covers was reverted one at a time to prove
  the suite fails. Next use of the same harness: the dashboard's Vault states and the audio
  player, which have no coverage at all.
- ~~Extend the DOM suite to the protected surfaces~~ — **closed in 2.28**: `/login` and
  `/dashboard` are covered (13 cases), and 2.6's transient-session defect is now pinned by a
  test that fails if it returns. Next: the dashboard's Vault and publisher states, once item
  2b gives them a row shape to assert against.
- ~~Put the direct `fetch` calls under the same policy~~ — **closed in 2.30** for the Vault
  writes and media; `loginUser` and `subscribeToNewsletter` are excluded on purpose and carry
  the reason in the code. Next: item 20's narrow auth-outage report, and the newsletter once
  item 7 gives it an endpoint.
- **Decide the audio player's fate** (item 19). It is a guardrail surface that cannot start;
  either wire it or remove it, because the SW's audio-safe update path depends on it.
- Bind `SUPABASE_ANON_KEY` and prove the auth path end to end (PR #218).
- ~~Decide the double-metadata question~~ — **closed in 2.17**: one client writer over the edge table, plus a one-time hand-off of the shell's copy.
- Restore a unit-test floor (`vitest`) for the four silent-failure surfaces.
- Expand D1 querying components on the frontend to visualise site telemetry (now that events actually arrive).
- Optimise caching and payload sizes for Vault and WP API requests.
- Per-article `og:image` from the WordPress featured image (the 2.12 card is site-wide).
- ~~Repo hygiene~~ — **closed in 2.18**: 1.9 MB of root PNGs and two stray artifacts removed, root-level binaries and tracked output now guarded.

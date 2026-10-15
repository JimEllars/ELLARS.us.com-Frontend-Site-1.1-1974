# Sprint 1.7 / 2.0 Updates
- Fixed P0 initialization defect in `src/App.jsx` by removing UI-blocking `hasHydrated` check.
- Fixed Zustand store zero-state hydration error by setting `isInitialized`, `isHydrating`, and `_hasHydrated` variables explicitly before hydration, and ensuring default true cases in `src/store/useAppStore.js`.
- Unified Supabase Client Singleton in `src/lib/supabase.js` and removed duplication within `src/lib/api.js`.
- Updated Cloudflare Pages SPA Rewrite Rule and modified build script to generate a fallback `dist/200.html`.
- Implemented robust token validation within `src/components/common/ProtectedRoute.jsx` including non-blocking asynchronous state fallback loops.
- Created edge stream status endpoint at functions/api/v1/stream/status.js
- Updated production metadata tags in index.html for James Ellars official hub
- Replaced "AXiM Systems" with "AXiM Development" in Ventures.jsx.
- Updated "AXiM Systems" to "AXiM Development" in `Ventures.jsx`.
- Replaced the global initialization spinner with seamless public route loading in `App.jsx`.
- Fixed the Zustand store hydration zero-state issue by setting default hydration flags on initialization.
- Consolidated `createClient()` into a single `src/lib/supabase.js` export.
- Configured Cloudflare native SPA fallback (`public/_redirects` & `dist/200.html`).
- Created an edge status function at `functions/api/v1/stream/status.js`.
- Cleaned up production metadata in `index.html`.

## Sprint 2.1: User Acquisition Forms & Modal Hardening
- Strengthened Newsletter Modal validation with turnstile integration and robust token handling.
- Implemented network timeout logic in `subscribeToNewsletter` via `AbortController`.
- Refined form error handling to gracefully display context-specific errors.
- Improved the Donate Modal custom amount input clamping and fixed preset state conflicts.
- Addressed development blockers by returning mock success states when `VITE_CF_FORM_ENDPOINT` is missing.

## Sprint 2.2: Vault Pagination & Rich Media Support
- Added explicit page and perPage tracking variables (20 items per page) for Intel Vault.
- Wired explicit limit parameters onto `fetchSavedVaultItems` within `api.js` for remote API execution.
- Added a "Load More" pagination state bottom-drawer inside the Vault tab component.
- Implemented robust rich media tracking utilizing `DOMPurify` to allow cross-origin `iframe` embed injection for podcast endpoints and safe content rendering (`ArticleDetail.jsx`).
- Hooked the PWA service worker updater logic to trigger a hard window reload (`location.reload(true)`) bypassing local cache on fresh installs.
- Completed accessibility fixes for Navbar by introducing proper focus traps and ARIA attributes for mobile menu elements.

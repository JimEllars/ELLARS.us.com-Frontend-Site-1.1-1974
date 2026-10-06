# Sprint 1.7 / 2.0 Updates
- Fixed P0 initialization defect in `src/App.jsx` by removing UI-blocking `hasHydrated` check.
- Fixed Zustand store zero-state hydration error by setting `isInitialized`, `isHydrating`, and `_hasHydrated` variables explicitly before hydration, and ensuring default true cases in `src/store/useAppStore.js`.
- Unified Supabase Client Singleton in `src/lib/supabase.js` and removed duplication within `src/lib/api.js`.
- Updated Cloudflare Pages SPA Rewrite Rule and modified build script to generate a fallback `dist/200.html`.
- Implemented robust token validation within `src/components/common/ProtectedRoute.jsx` including non-blocking asynchronous state fallback loops.
- Created edge stream status endpoint at functions/api/v1/stream/status.js
- Updated production metadata tags in index.html for James Ellars official hub

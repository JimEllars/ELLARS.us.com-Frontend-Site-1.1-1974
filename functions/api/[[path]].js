/**
 * Cloudflare Pages Function: /api/* (catch-all)
 *
 * public/_redirects is a single line, `/* /index.html 200`, which is correct for
 * the SPA but also means an unknown or misspelled API path returned the HTML
 * shell with a *success* status. Client error handling could never see a 404,
 * and a typo'd endpoint looked like a healthy HTML response.
 *
 * This handler is mounted at /api/[[path]] so it catches every API path that no
 * more specific Function claims. Pages Functions take precedence over
 * `_redirects`, so mounted routes (e.g. /api/telemetry) are unaffected.
 */

const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

export async function onRequest({ request }) {
  const { pathname } = new URL(request.url);

  return json(
    {
      success: false,
      error: "not_found",
      message: `No edge route is mounted at ${pathname}.`,
      path: pathname,
      method: request.method,
    },
    404
  );
}

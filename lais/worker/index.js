// Lais Worker entry (Hono-based. Actual install in M3+ when API routes are needed).
// For M1 scaffold this is a minimal fetch handler so wrangler can parse.

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', version: '0.0.0' }), {
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('Lais Worker — scaffold', { status: 200 });
  },
};

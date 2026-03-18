// CORS middleware for Hono
// Note: Currently CORS is handled via corsResponse() in worker.js
// This file serves as the future migration target when worker.js is fully decomposed

export async function corsMiddleware(c, next) {
  const origin = c.req.header('Origin') || '';
  const allowed = [
    'https://goal-ai-frontend.pages.dev',
    'http://localhost:3000',
    'http://localhost:5173'
  ];

  if (allowed.some(a => origin.startsWith(a)) || origin.endsWith('.pages.dev')) {
    c.header('Access-Control-Allow-Origin', origin);
  }

  c.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Secret, X-Owner-Key');
  c.header('Access-Control-Expose-Headers', 'X-RateLimit-Remaining, X-Model-Used, X-Show-NPS, X-Model-Fallback, X-Reset-Hours');

  await next();
}

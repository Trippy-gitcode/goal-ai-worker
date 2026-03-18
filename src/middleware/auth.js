// Auth middleware for Hono
// Note: Currently auth is handled per-handler via authenticateRequest() in worker.js
// This file serves as the future migration target

export async function authMiddleware(c, next) {
  // Placeholder - auth is currently per-handler
  await next();
}

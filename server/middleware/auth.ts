export default defineEventHandler(async (event) => {
  // `/api/_*` is reserved for framework/module endpoints (e.g. Nuxt Icon).
  if (!event.path.startsWith("/api/") || event.path.startsWith("/api/_")) {
    return;
  }

  event.context.auth = await resolveAuthenticatedUser(event);
  requireAuth(event);
});

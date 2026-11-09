export default defineEventHandler(async (event) => {
  // `/api/_*` routes belong to Nuxt modules (e.g. the `_nuxt_icon` endpoint).
  if (!event.path.startsWith("/api/") || event.path.startsWith("/api/_")) {
    return;
  }

  const user = await resolveAuthenticatedUser(event);

  if (user) {
    event.context.auth = user;
  }

  requireAuth(event);
});

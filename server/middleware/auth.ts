export default defineEventHandler(async (event) => {
  if (!event.path.startsWith("/api/")) {
    return;
  }

  assertSameOriginWrite(event);

  event.context.auth = await resolveAuthenticatedUser(event);
  requireAuth(event);
});

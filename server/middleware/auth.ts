export default defineEventHandler(async (event) => {
  if (!event.path.startsWith("/api/")) {
    return;
  }

  event.context.auth = await resolveAuthenticatedUser(event);
});

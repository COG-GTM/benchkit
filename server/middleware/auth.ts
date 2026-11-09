export default defineEventHandler(async (event) => {
  if (!event.path.startsWith("/api/")) {
    return;
  }

  event.context.user = await resolveRequestUser(event);
});

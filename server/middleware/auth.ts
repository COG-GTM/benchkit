export default defineEventHandler(async (event) => {
  if (!event.path.startsWith("/api/")) {
    return;
  }

  try {
    event.context.user = await resolveRequestUser(event);
  } catch (error) {
    // Only routes that need a caller fail (with 503 via requireUser).
    console.error("Failed to resolve request user:", error);
    event.context.user = null;
    event.context.userLookupFailed = true;
  }
});

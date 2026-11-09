export default defineEventHandler(async (event) => {
  if (!event.path.startsWith("/api/")) {
    return;
  }

  try {
    event.context.user = await resolveRequestUser(event);
  } catch (error) {
    // Fail closed without breaking routes that do not need a caller.
    console.error("Failed to resolve request user:", error);
    event.context.user = null;
  }
});

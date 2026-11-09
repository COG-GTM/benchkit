// Public icon data served by @nuxt/icon (via @nuxt/ui).
const PUBLIC_API_PREFIXES = ["/api/_nuxt_icon/"];

export default defineEventHandler(async (event) => {
  const path = event.path.split("?")[0] || "";
  if (path !== "/api" && !path.startsWith("/api/")) return;
  if (PUBLIC_API_PREFIXES.some((prefix) => path.startsWith(prefix))) return;

  const user = await resolveSessionUser(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required",
    });
  }

  event.context.user = user;
});

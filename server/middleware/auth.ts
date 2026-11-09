const PROTECTED_API_PREFIXES = ["/api/users"];

export default defineEventHandler(async (event) => {
  const path = event.path.split("?")[0] ?? "";

  const isProtected = PROTECTED_API_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  if (isProtected) {
    await requireUser(event);
  }
});

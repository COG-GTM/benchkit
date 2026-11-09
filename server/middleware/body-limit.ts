export default defineEventHandler(async (event) => {
  if (!event.path.startsWith("/api/")) return;

  const limits = getBodyLimits(event);
  const isUpload = event.path.split("?")[0] === "/api/upload";

  await enforceBodyLimit(
    event,
    isUpload ? limits.maxUploadBytes : limits.maxJsonBodyBytes,
  );
});

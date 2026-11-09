import { promises as fs } from "fs";
import path from "path";

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, "name") || "";
  const allowed = getAllowedUpload(name);

  const isKnownName = isStoredUploadName(name) || isLegacyUploadName(name);
  const data =
    allowed && isKnownName
      ? await fs.readFile(path.join(getUploadDir(), name)).catch(() => null)
      : null;
  if (!allowed || !data || !allowed.matches(data)) {
    throw createError({ statusCode: 404, statusMessage: "File not found" });
  }

  setResponseHeaders(event, {
    "Content-Type": allowed.contentType,
    "Content-Length": String(data.length),
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, max-age=0",
    // PDFs and images are previewed inline; text/JSON are only fetched
    "Content-Disposition":
      allowed.type === "pdf" || allowed.type === "img"
        ? "inline"
        : "attachment",
    // Browsers' built-in PDF viewers refuse to run in a sandboxed document
    ...(allowed.type === "pdf"
      ? {}
      : { "Content-Security-Policy": "default-src 'none'; sandbox" }),
  });

  return data;
});

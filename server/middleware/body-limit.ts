import { MAX_REQUEST_BODY_BYTES } from "~~/shared/jsonLimits";

const BODY_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Multipart uploads stream files to disk and are handled by /api/upload.
const EXEMPT_PATHS = ["/api/upload"];

export default defineEventHandler((event) => {
  if (!event.path.startsWith("/api/")) return;
  if (!BODY_METHODS.has(event.method)) return;
  if (EXEMPT_PATHS.some((p) => event.path.split("?")[0] === p)) return;

  // Without a declared length (chunked, or HTTP/2 framing) the size cannot be
  // checked before readBody buffers it, so require one.
  const contentLength = getRequestHeader(event, "content-length");
  if (contentLength === undefined) {
    throw createError({
      statusCode: 411,
      statusMessage: "Content-Length required",
    });
  }

  const length = Number(contentLength);
  if (!Number.isFinite(length) || length < 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid Content-Length",
    });
  }
  if (length > MAX_REQUEST_BODY_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: `Request body exceeds ${MAX_REQUEST_BODY_BYTES / 1024} KB`,
    });
  }
});

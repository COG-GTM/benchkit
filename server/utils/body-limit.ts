import type { IncomingMessage } from "node:http";
import type { H3Event } from "h3";

export const MB = 1024 * 1024;

const BODY_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function getBodyLimits(event?: H3Event) {
  return useRuntimeConfig(event).public.bodyLimits;
}

// Multipart boundaries and part headers sit on top of the file bytes, so the
// raw body may exceed maxUploadBytes by this much per file; the file bytes
// themselves are checked against maxUploadBytes after parsing.
const MULTIPART_OVERHEAD_PER_FILE = 4 * 1024;

export function uploadRequestLimit(limits: ReturnType<typeof getBodyLimits>) {
  return (
    limits.maxUploadBytes + limits.maxUploadFiles * MULTIPART_OVERHEAD_PER_FILE
  );
}

export function payloadTooLarge(limit: number, what = "Request body") {
  return createError({
    statusCode: 413,
    statusMessage: "Payload Too Large",
    message: `${what} exceeds the ${formatBytes(limit)} limit`,
  });
}

export function formatBytes(bytes: number) {
  return bytes >= MB && bytes % MB === 0
    ? `${bytes / MB} MB`
    : `${bytes} bytes`;
}

/**
 * Reads the request body into memory, rejecting with 413 as soon as either
 * the declared Content-Length or the bytes actually received exceed `limit`.
 * The buffer is stored on `req.rawBody`, where h3's readBody /
 * readMultipartFormData pick it up instead of re-reading the stream.
 */
export async function enforceBodyLimit(event: H3Event, limit: number) {
  const req = event.node.req as IncomingMessage & { rawBody?: Buffer };
  if (!BODY_METHODS.has((req.method || "").toUpperCase())) return;
  if (req.rawBody !== undefined) return;

  const declared = Number.parseInt(req.headers["content-length"] || "", 10);
  if (Number.isFinite(declared) && declared > limit) {
    rejectOversized(event);
    throw payloadTooLarge(limit);
  }

  const hasBody =
    declared > 0 ||
    /\bchunked\b/i.test(String(req.headers["transfer-encoding"] ?? ""));
  if (!hasBody) return;

  const body = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let received = 0;

    const cleanup = () => {
      req.off("data", onData);
      req.off("end", onEnd);
      req.off("error", onError);
    };
    const onData = (chunk: Buffer) => {
      received += chunk.length;
      if (received > limit) {
        cleanup();
        chunks.length = 0;
        rejectOversized(event);
        reject(payloadTooLarge(limit));
        return;
      }
      chunks.push(chunk);
    };
    const onEnd = () => {
      cleanup();
      resolve(Buffer.concat(chunks, received));
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    req.on("data", onData).on("end", onEnd).on("error", onError);
  });

  req.rawBody = body;
}

function rejectOversized(event: H3Event) {
  // Stop buffering the rest of the body and drop the connection after the
  // 413 is sent instead of waiting for the client to finish uploading.
  setResponseHeader(event, "Connection", "close");
  event.node.req.pause();
}

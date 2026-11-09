import path from "path";

export type UploadFileType = "pdf" | "img" | "txt" | "json";

interface AllowedUpload {
  type: UploadFileType;
  contentType: string;
  matches: (data: Buffer) => boolean;
}

const startsWith = (data: Buffer, signature: string | number[]) => {
  const bytes =
    typeof signature === "string"
      ? Buffer.from(signature, "latin1")
      : signature;
  return (
    data.length >= bytes.length && bytes.every((byte, i) => data[i] === byte)
  );
};

const isUtf8Text = (data: Buffer) => {
  if (data.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(data);
    return true;
  } catch {
    return false;
  }
};

const isJpeg = (data: Buffer) => startsWith(data, [0xff, 0xd8, 0xff]);

const ALLOWED_UPLOADS: Record<string, AllowedUpload> = {
  ".pdf": {
    type: "pdf",
    contentType: "application/pdf",
    matches: (data) => startsWith(data, "%PDF-"),
  },
  ".png": {
    type: "img",
    contentType: "image/png",
    matches: (data) =>
      startsWith(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  ".jpg": { type: "img", contentType: "image/jpeg", matches: isJpeg },
  ".jpeg": { type: "img", contentType: "image/jpeg", matches: isJpeg },
  ".gif": {
    type: "img",
    contentType: "image/gif",
    matches: (data) => startsWith(data, "GIF87a") || startsWith(data, "GIF89a"),
  },
  ".webp": {
    type: "img",
    contentType: "image/webp",
    matches: (data) =>
      startsWith(data, "RIFF") &&
      data.subarray(8, 12).toString("latin1") === "WEBP",
  },
  ".txt": {
    type: "txt",
    contentType: "text/plain; charset=utf-8",
    matches: isUtf8Text,
  },
  ".json": {
    type: "json",
    contentType: "application/json; charset=utf-8",
    matches: (data) => {
      if (!isUtf8Text(data)) return false;
      try {
        JSON.parse(data.toString("utf-8"));
        return true;
      } catch {
        return false;
      }
    },
  },
};

export const ALLOWED_UPLOAD_EXTENSIONS = Object.keys(ALLOWED_UPLOADS);

// Server-generated names only: <uuid>.<allowed extension>
const STORED_UPLOAD_NAME = /^[0-9a-f-]{36}\.(pdf|png|jpe?g|gif|webp|txt|json)$/;
// Names written by the previous upload handler into public/uploads
const LEGACY_UPLOAD_NAME =
  /^[\w .()-]+_\d{13}\.(pdf|png|jpe?g|gif|webp|txt|json)$/i;

export function getUploadDir() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), ".data/uploads");
}

export function getLegacyUploadDir() {
  return path.join(process.cwd(), "public/uploads");
}

export function getQuarantineDir() {
  return path.join(path.dirname(getUploadDir()), "uploads-quarantine");
}

export function getAllowedUpload(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  const allowed = ALLOWED_UPLOADS[extension];
  return allowed ? { extension, ...allowed } : null;
}

export function validateUpload(filename: string, data: Buffer) {
  const allowed = getAllowedUpload(filename);
  if (!allowed) {
    return {
      ok: false as const,
      reason: `File type not allowed. Allowed types: ${ALLOWED_UPLOAD_EXTENSIONS.join(", ")}`,
    };
  }
  if (!allowed.matches(data)) {
    return {
      ok: false as const,
      reason: `File content does not match its ${allowed.extension} extension`,
    };
  }
  return { ok: true as const, ...allowed };
}

export function isStoredUploadName(name: string) {
  return STORED_UPLOAD_NAME.test(name);
}

export function isLegacyUploadName(name: string) {
  return LEGACY_UPLOAD_NAME.test(name) && path.basename(name) === name;
}

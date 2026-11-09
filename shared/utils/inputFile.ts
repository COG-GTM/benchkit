export type InputFileType = "pdf" | "img" | "txt" | "json";

export const INPUT_FILE_EXTENSIONS: Record<InputFileType, string[]> = {
  pdf: [".pdf"],
  img: [".png", ".jpg", ".jpeg", ".gif", ".webp"],
  txt: [".txt"],
  json: [".json"],
};

const INPUT_FILE_DIRECTORIES = ["/uploads/", "/samples/"];

const FORBIDDEN_FILENAME_CHARS = new Set(["/", "\\", "?", "#", "%", ":"]);

// Single path segment: no separators, query/fragment, percent-encoding,
// scheme delimiter or control characters.
function isSafeFilename(name: string): boolean {
  if (!name || name === "." || name === "..") return false;
  for (const char of name) {
    const code = char.charCodeAt(0);
    if (code < 0x20 || code === 0x7f || FORBIDDEN_FILENAME_CHARS.has(char)) {
      return false;
    }
  }
  return true;
}

export function getInputFileType(filename: string): InputFileType | null {
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot < 0) return null;
  const ext = lower.slice(dot);
  for (const [type, extensions] of Object.entries(INPUT_FILE_EXTENSIONS)) {
    if (extensions.includes(ext)) return type as InputFileType;
  }
  return null;
}

/**
 * True when `file` is a same-origin path produced by the upload endpoint
 * (`/uploads/<name>.<ext>`) or a bundled sample (`/samples/<name>.<ext>`)
 * whose extension matches `type`. Anything else (absolute URLs,
 * protocol-relative URLs, `javascript:`/`data:` URLs, traversal) is rejected.
 */
export function isSafeInputFilePath(file: unknown, type?: unknown): boolean {
  if (typeof file !== "string" || file.length > 512) return false;

  const dir = INPUT_FILE_DIRECTORIES.find((d) => file.startsWith(d));
  if (!dir) return false;

  const name = file.slice(dir.length);
  if (!isSafeFilename(name)) return false;

  const fileType = getInputFileType(name);
  if (!fileType) return false;
  return type === undefined || fileType === type;
}

/**
 * Returns an error message for the first invalid entry in `inputs`, or null
 * when every entry is a valid test case input.
 */
export function validateTestCaseInputs(inputs: unknown): string | null {
  if (inputs === undefined) return null;
  if (!Array.isArray(inputs)) return "inputs must be an array";

  for (const [index, input] of inputs.entries()) {
    if (!input || typeof input !== "object") {
      return `inputs[${index}] must be an object`;
    }
    const { type, file } = input as { type?: unknown; file?: unknown };
    if (
      typeof type !== "string" ||
      !Object.hasOwn(INPUT_FILE_EXTENSIONS, type)
    ) {
      return `inputs[${index}].type must be one of pdf, img, txt, json`;
    }
    if (!isSafeInputFilePath(file, type)) {
      return `inputs[${index}].file must be an uploaded file path under /uploads/ with a ${INPUT_FILE_EXTENSIONS[type as InputFileType].join(", ")} extension`;
    }
  }
  return null;
}

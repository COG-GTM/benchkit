import { promises as fs } from "fs";
import path from "path";
import type { H3Event } from "h3";

export default defineEventHandler(async (event) => {
  try {
    const limits = getBodyLimits(event);
    await enforceBodyLimit(event, limits.maxUploadBytes);

    const files = await readUploadedFiles(event);

    if (files.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "No files provided",
      });
    }

    if (files.length > limits.maxUploadFiles) {
      throw createError({
        statusCode: 413,
        statusMessage: "Payload Too Large",
        message: `At most ${limits.maxUploadFiles} files can be uploaded at once`,
      });
    }

    const oversized = files.find(
      (file) => file.size > limits.maxUploadFileBytes,
    );
    if (oversized) {
      throw payloadTooLarge(
        limits.maxUploadFileBytes,
        `File "${path.basename(oversized.name)}"`,
      );
    }

    const uploadedFiles = [];
    const uploadDir = path.join(process.cwd(), "public/uploads");

    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    for (const file of files) {
      // Generate unique filename
      const timestamp = Date.now();
      const extension = path.extname(file.name);
      const baseName = path.basename(file.name, extension);
      const uniqueFilename = `${baseName}_${timestamp}${extension}`;
      const filePath = path.join(uploadDir, uniqueFilename);

      // Write file to disk
      await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));

      // Return relative path for database storage
      const relativePath = `/uploads/${uniqueFilename}`;

      uploadedFiles.push({
        originalName: file.name,
        filename: uniqueFilename,
        path: relativePath,
        size: file.size,
        type: getFileType(file.name),
      });
    }

    return {
      success: true,
      files: uploadedFiles,
    };
  } catch (error: any) {
    if (isError(error)) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: "File upload failed",
      data: error.message,
    });
  }
});

// Uses the platform FormData parser rather than h3's readMultipartFormData,
// which copies every byte into JS arrays (~30x memory per uploaded byte).
async function readUploadedFiles(event: H3Event): Promise<File[]> {
  const contentType = getRequestHeader(event, "content-type") || "";
  if (!contentType.startsWith("multipart/form-data")) return [];

  let formData: FormData;
  try {
    formData = await readFormData(event);
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Malformed multipart body",
    });
  }

  const files: File[] = [];
  for (const [, value] of formData) {
    if (typeof value !== "string" && value.name) files.push(value);
  }
  return files;
}

function getFileType(filename: string): "pdf" | "img" | "txt" | "json" {
  const ext = path.extname(filename).toLowerCase();

  if (ext === ".pdf") return "pdf";
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) return "img";
  if (ext === ".txt") return "txt";
  if (ext === ".json") return "json";

  return "txt"; // default
}

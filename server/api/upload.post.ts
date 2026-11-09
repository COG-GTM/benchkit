import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export default defineEventHandler(async (event) => {
  try {
    const files = (await readMultipartFormData(event))?.filter(
      (file) => file.filename && file.data,
    );

    if (!files || files.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "No files provided",
      });
    }

    // Validate every file before writing any of them
    const accepted = files.map((file) => {
      const originalName = path.basename(file.filename!);
      const result = validateUpload(originalName, file.data);
      if (!result.ok) {
        throw createError({
          statusCode: 400,
          statusMessage: "Unsupported file",
          message: `${originalName}: ${result.reason}`,
        });
      }
      return { file, originalName, ...result };
    });

    const uploadDir = getUploadDir();
    await fs.mkdir(uploadDir, { recursive: true });

    const uploadedFiles = [];
    for (const { file, originalName, extension, type } of accepted) {
      const uniqueFilename = `${randomUUID()}${extension}`;
      await fs.writeFile(path.join(uploadDir, uniqueFilename), file.data, {
        flag: "wx",
      });

      uploadedFiles.push({
        originalName,
        filename: uniqueFilename,
        path: `/uploads/${uniqueFilename}`,
        size: file.data.length,
        type,
      });
    }

    return {
      success: true,
      files: uploadedFiles,
    };
  } catch (error) {
    if (isError(error)) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: "File upload failed",
    });
  }
});

import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export default defineEventHandler(async (event) => {
  try {
    const files = await readMultipartFormData(event);

    if (!files || files.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "No files provided",
      });
    }

    const uploadedFiles = [];
    const uploadDir = path.join(process.cwd(), "public/uploads");

    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    for (const file of files) {
      if (file.filename && !getInputFileType(path.basename(file.filename))) {
        throw createError({
          statusCode: 400,
          statusMessage: `Unsupported file type: ${path.extname(file.filename) || file.filename}`,
        });
      }
    }

    for (const file of files) {
      if (file.filename && file.data) {
        const type = getInputFileType(path.basename(file.filename))!;

        // Generate unique filename
        const timestamp = Date.now();
        const originalName = path.basename(file.filename);
        const dot = originalName.lastIndexOf(".");
        const extension = originalName.slice(dot).toLowerCase();
        const baseName =
          originalName
            .slice(0, dot)
            .replace(/[^A-Za-z0-9._-]+/g, "_")
            .replace(/^\.+/, "") || "file";
        const suffix = randomBytes(4).toString("hex");
        const uniqueFilename = `${baseName}_${timestamp}_${suffix}${extension}`;
        const filePath = path.join(uploadDir, uniqueFilename);

        // Write file to disk
        await fs.writeFile(filePath, file.data, { flag: "wx" });

        // Return relative path for database storage
        const relativePath = `/uploads/${uniqueFilename}`;

        uploadedFiles.push({
          originalName: file.filename,
          filename: uniqueFilename,
          path: relativePath,
          size: file.data.length,
          type,
        });
      }
    }

    return {
      success: true,
      files: uploadedFiles,
    };
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: "File upload failed",
      data: error.message,
    });
  }
});

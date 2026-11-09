import { promises as fs } from "fs";
import path from "path";

// Uploads used to be written to public/uploads, which the dev server serves
// as-is from the app's origin. Move them out of the web root on startup:
// valid files go to the upload dir (still reachable at /uploads/<name> via
// server/routes/uploads), anything else is quarantined.
export default defineNitroPlugin(async () => {
  const legacyDir = getLegacyUploadDir();
  const entries = await fs.readdir(legacyDir).catch(() => []);
  if (entries.length === 0) return;

  const uploadDir = getUploadDir();
  const quarantineDir = getQuarantineDir();
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.mkdir(quarantineDir, { recursive: true });

  for (const name of entries) {
    const source = path.join(legacyDir, name);
    try {
      const stat = await fs.lstat(source);
      if (!stat.isFile()) continue;

      const data = await fs.readFile(source);
      const allowed = getAllowedUpload(name);
      const valid =
        isLegacyUploadName(name) && !!allowed && allowed.matches(data);

      await moveFile(
        source,
        path.join(valid ? uploadDir : quarantineDir, name),
      );
      if (!valid) {
        console.warn(
          `[uploads] Quarantined unsupported legacy upload: ${name}`,
        );
      }
    } catch (error) {
      console.error(`[uploads] Failed to migrate ${name}:`, error);
    }
  }
});

async function moveFile(source: string, target: string) {
  try {
    await fs.rename(source, target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EXDEV") throw error;
    await fs.copyFile(source, target);
    await fs.unlink(source);
  }
}

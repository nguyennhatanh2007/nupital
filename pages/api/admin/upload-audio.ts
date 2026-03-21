import type { NextApiRequest, NextApiResponse } from "next";
import { promises as fs } from "fs";
import path from "path";
import formidable, { type File as FormidableFile } from "formidable";

import { serverLogger } from "../../../lib/logger-server";

const MAX_AUDIO_UPLOAD_BYTES = 15 * 1024 * 1024;
const FIXED_BACKGROUND_FILE = "background-music.mp3";

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req: NextApiRequest): Promise<{ file: FormidableFile; filename: string }> {
  const form = formidable({
    multiples: false,
    maxFiles: 1,
    maxFileSize: MAX_AUDIO_UPLOAD_BYTES,
    keepExtensions: true,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }

      const incoming = files.file;
      const file = Array.isArray(incoming) ? incoming[0] : incoming;
      if (!file) {
        reject(new Error("Missing uploaded file."));
        return;
      }

      const fieldFilename = fields.filename;
      const fromField = Array.isArray(fieldFilename) ? fieldFilename[0] : fieldFilename;
      const fallbackName = file.originalFilename || "background-music.mp3";

      resolve({ file, filename: fromField || fallbackName });
    });
  });
}

function isAllowedAudio(file: FormidableFile, originalName: string): boolean {
  const mime = (file.mimetype || "").toLowerCase();
  const loweredName = originalName.toLowerCase();
  const hasMp3Extension = loweredName.endsWith(".mp3");
  const allowedMime = mime === "audio/mpeg" || mime === "audio/mp3";

  return hasMp3Extension && (allowedMime || mime === "");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    await serverLogger.warn("API_UPLOAD_AUDIO", "Invalid method", { method: req.method });
    return res.status(405).json({ message: "Method not allowed" });
  }

  const uploadStartTime = performance.now();
  await serverLogger.apiRequest("/api/admin/upload-audio", "POST");

  try {
    const { file, filename } = await parseForm(req);

    await serverLogger.debug("API_UPLOAD_AUDIO", "Audio file parsed", {
      filename,
      mimeType: file.mimetype,
      fileSize: file.size,
    });

    if (!isAllowedAudio(file, filename)) {
      await fs.unlink(file.filepath).catch(() => undefined);
      return res.status(400).json({ message: "Only .mp3 files are supported." });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const destinationPath = path.join(uploadDir, FIXED_BACKGROUND_FILE);
    await fs.copyFile(file.filepath, destinationPath);
    await fs.unlink(file.filepath).catch(() => undefined);

    const uploadDuration = performance.now() - uploadStartTime;
    await serverLogger.apiResponse("/api/admin/upload-audio", 200, Math.round(uploadDuration));
    await serverLogger.info("API_UPLOAD_AUDIO", "Background music uploaded", {
      originalFilename: filename,
      savedPath: "/uploads/background-music.mp3",
      duration: Math.round(uploadDuration),
      fileSize: file.size,
    });

    return res.status(200).json({
      path: "/uploads/background-music.mp3",
      message: "Background music uploaded successfully.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown upload error";
    const maybeCode = (error as { code?: string | number } | undefined)?.code;
    const isTooLarge =
      message.toLowerCase().includes("maxfilesize") ||
      message.toLowerCase().includes("max file size") ||
      maybeCode === 1009;

    const uploadDuration = performance.now() - uploadStartTime;
    await serverLogger.error("API_UPLOAD_AUDIO", "Upload failed", error, {
      duration: Math.round(uploadDuration),
      code: maybeCode,
      message,
    });

    if (isTooLarge) {
      return res.status(413).json({ message: "File too large. Maximum allowed size is 15MB." });
    }

    return res.status(500).json({ message: "Failed to save audio file." });
  }
}
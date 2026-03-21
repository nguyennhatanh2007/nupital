import type { NextApiRequest, NextApiResponse } from "next";
import { promises as fs } from "fs";
import path from "path";
import formidable, { type File as FormidableFile } from "formidable";
import sharp from "sharp";
import jsQR from "jsqr";
import { serverLogger } from "../../../lib/logger-server";

const RESPONSIVE_WIDTHS = [768, 1440, 2200] as const;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_MEGAPIXELS = 20;
const MAX_STORED_EDGE = 2400;
const QR_DETECT_MAX_EDGE = 1600;

export const config = {
  api: {
    bodyParser: false,
  },
};

function toSafeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function parseForm(req: NextApiRequest): Promise<{ file: FormidableFile; filename: string; purpose: string }> {
  const form = formidable({
    multiples: false,
    maxFiles: 1,
    maxFileSize: MAX_UPLOAD_BYTES,
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
      const fallbackName = file.originalFilename || "upload";

      const fieldPurpose = fields.purpose;
      const purpose = Array.isArray(fieldPurpose) ? fieldPurpose[0] || "image" : fieldPurpose || "image";

      resolve({ file, filename: fromField || fallbackName, purpose });
    });
  });
}

async function createVariantSet(inputBuffer: Buffer, outputDir: string, baseName: string) {
  const baseImage = sharp(inputBuffer, { failOn: "none" });
  const metadata = await baseImage.metadata();
  const sourceWidth = metadata.width || 2200;

  const safeWidths = RESPONSIVE_WIDTHS.filter((width, idx, arr) => {
    const candidate = Math.min(width, sourceWidth);
    return arr.indexOf(width) === idx && candidate >= 320;
  }).map((width) => Math.min(width, sourceWidth));

  const uniqueWidths = [...new Set(safeWidths)];

  const tasks = uniqueWidths.flatMap((width) => {
    const resized = sharp(inputBuffer, { failOn: "none" }).resize({
      width,
      fit: "inside",
      withoutEnlargement: true,
    });

    return [
      resized
        .clone()
        .webp({ quality: 82, effort: 5 })
        .toFile(path.join(outputDir, `${baseName}-w${width}.webp`)),
      resized
        .clone()
        .jpeg({ quality: 88, mozjpeg: true })
        .toFile(path.join(outputDir, `${baseName}-w${width}.jpg`)),
    ];
  });

  await Promise.all(tasks);
}

type QrProcessResult = {
  outputBuffer: Buffer;
  qrText: string | null;
  qrCropped: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

async function detectAndSquareCropQr(orientedBuffer: Buffer): Promise<QrProcessResult> {
  const originalMeta = await sharp(orientedBuffer, { failOn: "none" }).metadata();
  const originalWidth = originalMeta.width || 0;
  const originalHeight = originalMeta.height || 0;

  if (!originalWidth || !originalHeight) {
    return { outputBuffer: orientedBuffer, qrText: null, qrCropped: false };
  }

  const downscale =
    Math.max(originalWidth, originalHeight) > QR_DETECT_MAX_EDGE
      ? QR_DETECT_MAX_EDGE / Math.max(originalWidth, originalHeight)
      : 1;

  const detectWidth = Math.max(1, Math.round(originalWidth * downscale));
  const detectHeight = Math.max(1, Math.round(originalHeight * downscale));

  const detectorPipeline = sharp(orientedBuffer, { failOn: "none" })
    .resize({
      width: detectWidth,
      height: detectHeight,
      fit: "fill",
      withoutEnlargement: true,
    })
    .ensureAlpha()
    .raw();

  const detectedFrame = await detectorPipeline.toBuffer({ resolveWithObject: true });
  const qr = jsQR(
    new Uint8ClampedArray(
      detectedFrame.data.buffer,
      detectedFrame.data.byteOffset,
      detectedFrame.data.byteLength
    ),
    detectedFrame.info.width,
    detectedFrame.info.height,
    { inversionAttempts: "attemptBoth" }
  );

  if (!qr) {
    return { outputBuffer: orientedBuffer, qrText: null, qrCropped: false };
  }

  const qrText = qr.data?.trim() || null;
  const location = qr.location;
  if (!location) {
    return { outputBuffer: orientedBuffer, qrText, qrCropped: false };
  }

  const scaleBack = downscale > 0 ? 1 / downscale : 1;
  const points = [
    location.topLeftCorner,
    location.topRightCorner,
    location.bottomLeftCorner,
    location.bottomRightCorner,
  ].map((pt) => ({ x: pt.x * scaleBack, y: pt.y * scaleBack }));

  const xs = points.map((pt) => pt.x);
  const ys = points.map((pt) => pt.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const qrWidth = Math.max(1, maxX - minX);
  const qrHeight = Math.max(1, maxY - minY);
  const qrSide = Math.max(qrWidth, qrHeight);
  const padding = Math.max(12, Math.round(qrSide * 0.22));

  let cropSide = Math.round(qrSide + padding * 2);
  cropSide = clamp(cropSide, 120, Math.min(originalWidth, originalHeight));

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const maxLeft = Math.max(0, originalWidth - cropSide);
  const maxTop = Math.max(0, originalHeight - cropSide);
  const cropLeft = Math.round(clamp(centerX - cropSide / 2, 0, maxLeft));
  const cropTop = Math.round(clamp(centerY - cropSide / 2, 0, maxTop));

  const croppedBuffer = await sharp(orientedBuffer, { failOn: "none" })
    .extract({
      left: cropLeft,
      top: cropTop,
      width: cropSide,
      height: cropSide,
    })
    .toBuffer();

  return {
    outputBuffer: croppedBuffer,
    qrText,
    qrCropped: true,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    await serverLogger.warn("API_UPLOAD", "Invalid method", { method: req.method });
    return res.status(405).json({ message: "Method not allowed" });
  }

  const uploadStartTime = performance.now();
  await serverLogger.apiRequest("/api/admin/upload", "POST");

  try {
    const { file, filename, purpose } = await parseForm(req);
    const shouldProcessQr = purpose === "qr";
    await serverLogger.debug("API_UPLOAD", "File parsed", {
      filename,
      mimeType: file.mimetype,
      fileSize: file.size,
      purpose,
      shouldProcessQr,
    });

    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      await serverLogger.warn("API_UPLOAD", "Invalid file type", { mimeType: file.mimetype, filename });
      return res.status(400).json({ message: "Only image uploads are supported." });
    }

    const buffer = await fs.readFile(file.filepath);
    const orientedBuffer = await sharp(buffer, { failOn: "none" }).rotate().toBuffer();
    const inspectedImage = sharp(orientedBuffer, { failOn: "none" });
    const metadata = await inspectedImage.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    if (!width || !height) {
      await serverLogger.warn("API_UPLOAD", "Invalid image dimensions", { filename, width, height });
      return res.status(400).json({ message: "Invalid image file." });
    }

    const megapixels = (width * height) / 1_000_000;
    if (megapixels > MAX_IMAGE_MEGAPIXELS) {
      await serverLogger.warn("API_UPLOAD", "Image exceeds megapixel limit", {
        filename,
        width,
        height,
        megapixels: Number(megapixels.toFixed(2)),
        maxMegapixels: MAX_IMAGE_MEGAPIXELS,
      });
      return res.status(400).json({
        message: `Image is too large in dimensions (${megapixels.toFixed(1)}MP). Max allowed is ${MAX_IMAGE_MEGAPIXELS}MP.`,
      });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const qrProcessed = shouldProcessQr
      ? await detectAndSquareCropQr(orientedBuffer)
      : { outputBuffer: orientedBuffer, qrText: null, qrCropped: false };
    const workingBuffer = qrProcessed.outputBuffer;

    const safeName = filename ? toSafeName(filename.replace(/\.[^/.]+$/, "")) : "upload";
    const baseName = `${Date.now()}-${safeName}`;

    const originalPath = path.join(uploadDir, `${baseName}-orig.jpg`);
    await sharp(workingBuffer, { failOn: "none" })
      .resize({
        width: MAX_STORED_EDGE,
        height: MAX_STORED_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 92, mozjpeg: true })
      .toFile(originalPath);

    await fs.unlink(file.filepath).catch(() => undefined);

    const uploadedPath = `/uploads/${baseName}-orig.jpg`;
    const uploadDuration = performance.now() - uploadStartTime;

    await serverLogger.apiResponse("/api/admin/upload", 200, Math.round(uploadDuration));
    await serverLogger.info("API_UPLOAD", "Upload successful", {
      originalFilename: filename,
      uploadedPath: uploadedPath,
      fileSize: workingBuffer.length,
      duration: Math.round(uploadDuration),
      variants: "scheduled",
      qrDetected: Boolean(qrProcessed.qrText),
      qrCropped: qrProcessed.qrCropped,
    });

    // Return early so admin upload is fast; responsive variants are generated in the background.
    res.status(200).json({
      path: uploadedPath,
      qrText: qrProcessed.qrText,
      qrCropped: qrProcessed.qrCropped,
    });

    void (async () => {
      const variantStartTime = performance.now();
      try {
        await createVariantSet(workingBuffer, uploadDir, baseName);
        const variantDuration = performance.now() - variantStartTime;
        await serverLogger.info("API_UPLOAD", "Variant generation completed", {
          uploadedPath,
          duration: Math.round(variantDuration),
          widths: RESPONSIVE_WIDTHS,
          formats: ["webp", "jpg"],
        });
      } catch (variantError) {
        const variantDuration = performance.now() - variantStartTime;
        await serverLogger.error("API_UPLOAD", "Variant generation failed", variantError, {
          uploadedPath,
          duration: Math.round(variantDuration),
        });
      }
    })();

    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown upload error";
    const maybeCode = (error as { code?: string | number } | undefined)?.code;
    const isTooLarge =
      message.toLowerCase().includes("maxfilesize") ||
      message.toLowerCase().includes("max file size") ||
      maybeCode === 1009;

    const uploadDuration = performance.now() - uploadStartTime;
    await serverLogger.error("API_UPLOAD", "Upload failed", error, {
      duration: Math.round(uploadDuration),
      code: maybeCode,
      message,
    });

    if (isTooLarge) {
      return res.status(413).json({ message: "File too large. Maximum allowed size is 20MB." });
    }

    return res.status(500).json({ message: "Failed to save image." });
  }
}
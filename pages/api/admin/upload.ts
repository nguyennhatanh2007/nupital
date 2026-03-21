import type { NextApiRequest, NextApiResponse } from "next";
import { promises as fs } from "fs";
import path from "path";
import formidable, { type File as FormidableFile } from "formidable";
import sharp from "sharp";

const RESPONSIVE_WIDTHS = [480, 768, 1080, 1440, 2200] as const;
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

export const config = {
  api: {
    bodyParser: false,
  },
};

function toSafeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function parseForm(req: NextApiRequest): Promise<{ file: FormidableFile; filename: string }> {
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

      resolve({ file, filename: fromField || fallbackName });
    });
  });
}

async function createVariantSet(inputBuffer: Buffer, outputDir: string, baseName: string) {
  const baseImage = sharp(inputBuffer, { failOn: "none" }).rotate();
  const metadata = await baseImage.metadata();
  const sourceWidth = metadata.width || 2200;

  const safeWidths = RESPONSIVE_WIDTHS.filter((width, idx, arr) => {
    const candidate = Math.min(width, sourceWidth);
    return arr.indexOf(width) === idx && candidate >= 320;
  }).map((width) => Math.min(width, sourceWidth));

  const uniqueWidths = [...new Set(safeWidths)];

  const tasks = uniqueWidths.flatMap((width) => {
    const resized = sharp(inputBuffer, { failOn: "none" }).rotate().resize({
      width,
      fit: "inside",
      withoutEnlargement: true,
    });

    return [
      resized
        .clone()
        .avif({ quality: 62, effort: 5 })
        .toFile(path.join(outputDir, `${baseName}-w${width}.avif`)),
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { file, filename } = await parseForm(req);
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return res.status(400).json({ message: "Only image uploads are supported." });
    }

    const buffer = await fs.readFile(file.filepath);
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const safeName = filename ? toSafeName(filename.replace(/\.[^/.]+$/, "")) : "upload";
    const baseName = `${Date.now()}-${safeName}`;

    await createVariantSet(buffer, uploadDir, baseName);

    const originalPath = path.join(uploadDir, `${baseName}-orig.jpg`);
    await sharp(buffer, { failOn: "none" })
      .rotate()
      .jpeg({ quality: 92, mozjpeg: true })
      .toFile(originalPath);

    await fs.unlink(file.filepath).catch(() => undefined);

    return res.status(200).json({ path: `/uploads/${baseName}-orig.jpg` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to save image." });
  }
}
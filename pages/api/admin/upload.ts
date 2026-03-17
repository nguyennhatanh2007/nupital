import type { NextApiRequest, NextApiResponse } from "next";
import { promises as fs } from "fs";
import path from "path";

type UploadBody = {
  filename?: string;
  dataUrl?: string;
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb",
    },
  },
};

function toSafeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const body = req.body as UploadBody;
  if (!body?.dataUrl || typeof body.dataUrl !== "string") {
    return res.status(400).json({ message: "Missing image data." });
  }

  const match = body.dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ message: "Invalid image format." });
  }

  const mimeType = match[1];
  const base64 = match[2];

  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };

  const ext = extensionByType[mimeType];
  if (!ext) {
    return res.status(400).json({ message: "Only jpg, png, webp, gif are supported." });
  }

  try {
    const buffer = Buffer.from(base64, "base64");
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const baseName = body.filename ? toSafeName(body.filename.replace(/\.[^/.]+$/, "")) : "upload";
    const filename = `${Date.now()}-${baseName}.${ext}`;
    const filePath = path.join(uploadDir, filename);

    await fs.writeFile(filePath, buffer);

    return res.status(200).json({ path: `/uploads/${filename}` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to save image." });
  }
}
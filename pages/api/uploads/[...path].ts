import type { NextApiRequest, NextApiResponse } from "next";
import { createReadStream } from "fs";
import { promises as fs } from "fs";
import path from "path";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
};

function toSafeRelativePath(input: string): string | null {
  const normalized = input.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) {
    return null;
  }
  return normalized;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const pathParam = req.query.path;
  const joined = Array.isArray(pathParam) ? pathParam.join("/") : typeof pathParam === "string" ? pathParam : "";
  const safeRelativePath = toSafeRelativePath(joined);

  if (!safeRelativePath) {
    return res.status(400).json({ message: "Invalid upload path" });
  }

  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  const absolutePath = path.join(uploadsRoot, safeRelativePath);

  if (!absolutePath.startsWith(uploadsRoot + path.sep) && absolutePath !== uploadsRoot) {
    return res.status(400).json({ message: "Invalid upload path" });
  }

  try {
    const stat = await fs.stat(absolutePath);
    if (!stat.isFile()) {
      return res.status(404).json({ message: "File not found" });
    }

    const ext = path.extname(absolutePath).toLowerCase();
    const contentType = MIME_BY_EXT[ext] || "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", stat.size.toString());
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    if (req.method === "HEAD") {
      res.status(200).end();
      return;
    }

    const stream = createReadStream(absolutePath);
    stream.on("error", () => {
      if (!res.headersSent) {
        res.status(500).end("Failed to read file");
      } else {
        res.destroy();
      }
    });

    stream.pipe(res);
  } catch {
    return res.status(404).json({ message: "File not found" });
  }
}

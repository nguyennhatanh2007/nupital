import { promises as fs } from "fs";
import path from "path";

import { prisma } from "../lib/prisma";
import { normalizeUploadPath } from "../lib/wedding-data";

function publicPathExists(projectRoot: string, value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = normalizeUploadPath(value);
  if (!normalized.startsWith("/")) return false;
  const fullPath = path.join(projectRoot, "public", normalized.slice(1));
  return require("fs").existsSync(fullPath);
}

async function backupDb(projectRoot: string) {
  const databaseUrl = process.env.DATABASE_URL || "";
  if (!databaseUrl.startsWith("file:")) {
    console.log("[backup] skipped (DATABASE_URL is not SQLite)");
    return;
  }

  const candidates = [
    path.join(projectRoot, "prisma", "dev.db"),
    path.join(projectRoot, "prisma", "prisma", "dev.db"),
  ];

  let dbPath = "";
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      dbPath = candidate;
      break;
    } catch {
      // continue
    }
  }

  if (!dbPath) {
    throw new Error("Cannot find local SQLite database file.");
  }

  const backupDir = path.join(projectRoot, "backups", "repair-missing-images", new Date().toISOString().replace(/[:.]/g, "-"));
  await fs.mkdir(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, "dev.db");
  await fs.copyFile(dbPath, backupPath);
  console.log(`[backup] ${dbPath} -> ${backupPath}`);
}

async function main() {
  const projectRoot = process.cwd();
  await backupDb(projectRoot);

  const uploadDir = path.join(projectRoot, "public", "uploads");
  const uploadFiles = await fs.readdir(uploadDir).catch(() => [] as string[]);
  const availableOriginals = uploadFiles
    .filter((name) => /-orig\.(jpe?g|png|webp|avif)$/i.test(name))
    .map((name) => `/uploads/${name}`);

  const fallbackPool = availableOriginals.length > 0
    ? availableOriginals
    : ["/images/gallery-1.jpg", "/images/gallery-2.jpg", "/images/gallery-3.jpg", "/images/gallery-4.jpg"];

  const wedding = await prisma.wedding.findFirst({
    include: {
      loveStory: { orderBy: { order: "asc" } },
      bankQrInfo: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!wedding) {
    console.log("NO_WEDDING");
    return;
  }

  let poolIndex = 0;
  const nextFromPool = () => {
    const item = fallbackPool[poolIndex % fallbackPool.length];
    poolIndex += 1;
    return item;
  };

  const normalizeOrFallback = (value: string, fallback: string) => {
    const normalized = normalizeUploadPath(value);
    return publicPathExists(projectRoot, normalized) ? normalized : fallback;
  };

  const nextHero = normalizeOrFallback(wedding.heroImage, nextFromPool());
  const nextGroom = normalizeOrFallback(wedding.groomImage, nextFromPool());
  const nextBride = normalizeOrFallback(wedding.brideImage, nextFromPool());

  const currentGallery = Array.isArray(wedding.gallery)
    ? wedding.gallery.filter((item): item is string => typeof item === "string")
    : [];

  const repairedGallery = currentGallery.map((item) => {
    const normalized = normalizeUploadPath(item);
    if (publicPathExists(projectRoot, normalized)) return normalized;
    return nextFromPool();
  });

  while (repairedGallery.length < 6) {
    repairedGallery.push(nextFromPool());
  }

  await prisma.wedding.update({
    where: { id: wedding.id },
    data: {
      heroImage: nextHero,
      groomImage: nextGroom,
      brideImage: nextBride,
      gallery: repairedGallery,
    },
  });

  let timelineUpdates = 0;
  for (const [index, story] of wedding.loveStory.entries()) {
    const normalized = normalizeUploadPath(story.image);
    if (publicPathExists(projectRoot, normalized)) continue;

    const fallback = `/images/gallery-${(index % 4) + 1}.jpg`;
    await prisma.loveStoryEvent.update({
      where: { id: story.id },
      data: { image: fallback },
    });
    timelineUpdates += 1;
  }

  let bankQrUpdated = false;
  if (wedding.bankQrInfo) {
    const qrImage = normalizeUploadPath(wedding.bankQrInfo.qrImage || "");
    const groomQrImage = normalizeUploadPath(wedding.bankQrInfo.groomQrImage || "");
    const brideQrImage = normalizeUploadPath(wedding.bankQrInfo.brideQrImage || "");

    const nextQr = publicPathExists(projectRoot, qrImage) ? qrImage : null;
    const nextGroomQr = publicPathExists(projectRoot, groomQrImage) ? groomQrImage : null;
    const nextBrideQr = publicPathExists(projectRoot, brideQrImage) ? brideQrImage : null;

    if (
      nextQr !== wedding.bankQrInfo.qrImage ||
      nextGroomQr !== wedding.bankQrInfo.groomQrImage ||
      nextBrideQr !== wedding.bankQrInfo.brideQrImage
    ) {
      await prisma.bankQrInfo.update({
        where: { weddingId: wedding.id },
        data: {
          qrImage: nextQr,
          groomQrImage: nextGroomQr,
          brideQrImage: nextBrideQr,
        },
      });
      bankQrUpdated = true;
    }
  }

  console.log(JSON.stringify({
    weddingId: wedding.id,
    heroImage: nextHero,
    groomImage: nextGroom,
    brideImage: nextBride,
    galleryCount: repairedGallery.length,
    timelineUpdates,
    bankQrUpdated,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

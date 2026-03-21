import { promises as fs } from "fs";
import path from "path";

import { prisma } from "../lib/prisma";
import { normalizeUploadPath } from "../lib/wedding-data";

async function resolveSqliteDbPath(projectRoot: string): Promise<string> {
  const candidates = [
    path.join(projectRoot, "prisma", "dev.db"),
    path.join(projectRoot, "prisma", "prisma", "dev.db"),
    path.join(projectRoot, "dev.db"),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // keep searching
    }
  }

  throw new Error(`Unable to locate SQLite database. Checked: ${candidates.join(", ")}`);
}

async function backupSqliteIfNeeded(projectRoot: string) {
  const databaseUrl = process.env.DATABASE_URL || "";
  if (!databaseUrl.startsWith("file:")) {
    console.log("[backup] skipped (DATABASE_URL is not SQLite)");
    return;
  }

  const dbPath = await resolveSqliteDbPath(projectRoot);
  const backupDir = path.join(projectRoot, "backups", "normalize-upload-paths", new Date().toISOString().replace(/[:.]/g, "-"));

  await fs.mkdir(backupDir, { recursive: true });
  await fs.copyFile(dbPath, path.join(backupDir, "dev.db"));
  console.log(`[backup] ${dbPath} -> ${path.join(backupDir, "dev.db")}`);
}

async function main() {
  const projectRoot = process.cwd();
  await backupSqliteIfNeeded(projectRoot);

  const weddings = await prisma.wedding.findMany({
    include: {
      loveStory: true,
      bankQrInfo: true,
      weddingEvents: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  let weddingUpdates = 0;
  let loveStoryUpdates = 0;
  let bankQrUpdates = 0;

  for (const wedding of weddings) {
    const nextHeroImage = normalizeUploadPath(wedding.heroImage);
    const nextGroomImage = normalizeUploadPath(wedding.groomImage);
    const nextBrideImage = normalizeUploadPath(wedding.brideImage);

    const nextGallery = Array.isArray(wedding.gallery)
      ? wedding.gallery.map((item) => normalizeUploadPath(item))
      : wedding.gallery;

    const weddingDataChanged =
      nextHeroImage !== wedding.heroImage ||
      nextGroomImage !== wedding.groomImage ||
      nextBrideImage !== wedding.brideImage ||
      JSON.stringify(nextGallery) !== JSON.stringify(wedding.gallery);

    if (weddingDataChanged) {
      await prisma.wedding.update({
        where: { id: wedding.id },
        data: {
          heroImage: nextHeroImage,
          groomImage: nextGroomImage,
          brideImage: nextBrideImage,
          gallery: nextGallery,
        },
      });
      weddingUpdates += 1;
    }

    for (const milestone of wedding.loveStory) {
      const nextImage = normalizeUploadPath(milestone.image);
      if (nextImage !== milestone.image) {
        await prisma.loveStoryEvent.update({
          where: { id: milestone.id },
          data: { image: nextImage },
        });
        loveStoryUpdates += 1;
      }
    }

    if (wedding.bankQrInfo) {
      const nextQrImage = normalizeUploadPath(wedding.bankQrInfo.qrImage);
      const nextGroomQrImage = normalizeUploadPath(wedding.bankQrInfo.groomQrImage);
      const nextBrideQrImage = normalizeUploadPath(wedding.bankQrInfo.brideQrImage);

      const nextBankQrData = {
        qrImage: nextQrImage || null,
        groomQrImage: nextGroomQrImage || null,
        brideQrImage: nextBrideQrImage || null,
      };

      const bankQrDataChanged =
        nextBankQrData.qrImage !== wedding.bankQrInfo.qrImage ||
        nextBankQrData.groomQrImage !== wedding.bankQrInfo.groomQrImage ||
        nextBankQrData.brideQrImage !== wedding.bankQrInfo.brideQrImage;

      if (bankQrDataChanged) {
        await prisma.bankQrInfo.update({
          where: { weddingId: wedding.id },
          data: nextBankQrData,
        });
        bankQrUpdates += 1;
      }
    }
  }

  console.log(JSON.stringify({
    weddingsProcessed: weddings.length,
    weddingUpdates,
    loveStoryUpdates,
    bankQrUpdates,
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

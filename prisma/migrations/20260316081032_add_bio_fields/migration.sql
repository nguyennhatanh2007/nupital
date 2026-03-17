-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Wedding" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brideName" TEXT NOT NULL,
    "groomName" TEXT NOT NULL,
    "groomBio" TEXT NOT NULL DEFAULT '',
    "brideBio" TEXT NOT NULL DEFAULT '',
    "weddingDate" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "heroImage" TEXT NOT NULL DEFAULT '/images/cover_bg_1.jpg',
    "groomImage" TEXT NOT NULL,
    "brideImage" TEXT NOT NULL,
    "gallery" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Wedding" ("brideImage", "brideName", "createdAt", "gallery", "groomImage", "groomName", "heroImage", "id", "location", "updatedAt", "weddingDate") SELECT "brideImage", "brideName", "createdAt", "gallery", "groomImage", "groomName", "heroImage", "id", "location", "updatedAt", "weddingDate" FROM "Wedding";
DROP TABLE "Wedding";
ALTER TABLE "new_Wedding" RENAME TO "Wedding";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

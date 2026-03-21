-- CreateTable
CREATE TABLE "WeddingEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weddingId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dateTime" DATETIME NOT NULL,
    "lunarDate" TEXT NOT NULL DEFAULT '',
    "locationName" TEXT NOT NULL,
    "locationUrl" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "WeddingEvent_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

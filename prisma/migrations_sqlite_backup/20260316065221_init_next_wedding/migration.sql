-- CreateTable
CREATE TABLE "Wedding" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brideName" TEXT NOT NULL,
    "groomName" TEXT NOT NULL,
    "weddingDate" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "groomImage" TEXT NOT NULL,
    "brideImage" TEXT NOT NULL,
    "gallery" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LoveStoryEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weddingId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "LoveStoryEvent_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BankQrInfo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weddingId" INTEGER NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "qrImage" TEXT,
    CONSTRAINT "BankQrInfo_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LoveStoryEvent_weddingId_order_idx" ON "LoveStoryEvent"("weddingId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "BankQrInfo_weddingId_key" ON "BankQrInfo"("weddingId");

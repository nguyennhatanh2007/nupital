-- CreateTable
CREATE TABLE `Wedding` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `brideName` VARCHAR(191) NOT NULL,
    `groomName` VARCHAR(191) NOT NULL,
    `groomBio` VARCHAR(191) NOT NULL DEFAULT '',
    `brideBio` VARCHAR(191) NOT NULL DEFAULT '',
    `weddingDate` DATETIME(3) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `heroImage` VARCHAR(191) NOT NULL DEFAULT '/images/cover_bg_1.jpg',
    `groomImage` VARCHAR(191) NOT NULL,
    `brideImage` VARCHAR(191) NOT NULL,
    `gallery` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoveStoryEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `weddingId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `eventDate` DATETIME(3) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `image` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    INDEX `LoveStoryEvent_weddingId_order_idx`(`weddingId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WeddingEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `weddingId` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `dateTime` DATETIME(3) NOT NULL,
    `lunarDate` VARCHAR(191) NOT NULL DEFAULT '',
    `locationName` VARCHAR(191) NOT NULL,
    `locationUrl` VARCHAR(191) NOT NULL DEFAULT '',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankQrInfo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `weddingId` INTEGER NOT NULL,
    `bankName` VARCHAR(191) NOT NULL,
    `accountNumber` VARCHAR(191) NOT NULL,
    `ownerName` VARCHAR(191) NOT NULL,
    `qrImage` VARCHAR(191) NULL,
    `groomBankName` VARCHAR(191) NULL,
    `groomAccountNumber` VARCHAR(191) NULL,
    `groomOwnerName` VARCHAR(191) NULL,
    `groomQrImage` VARCHAR(191) NULL,
    `brideBankName` VARCHAR(191) NULL,
    `brideAccountNumber` VARCHAR(191) NULL,
    `brideOwnerName` VARCHAR(191) NULL,
    `brideQrImage` VARCHAR(191) NULL,

    UNIQUE INDEX `BankQrInfo_weddingId_key`(`weddingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FriendMessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `weddingId` INTEGER NULL,
    `name` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FriendMessage_weddingId_createdAt_idx`(`weddingId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LoveStoryEvent` ADD CONSTRAINT `LoveStoryEvent_weddingId_fkey` FOREIGN KEY (`weddingId`) REFERENCES `Wedding`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeddingEvent` ADD CONSTRAINT `WeddingEvent_weddingId_fkey` FOREIGN KEY (`weddingId`) REFERENCES `Wedding`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankQrInfo` ADD CONSTRAINT `BankQrInfo_weddingId_fkey` FOREIGN KEY (`weddingId`) REFERENCES `Wedding`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FriendMessage` ADD CONSTRAINT `FriendMessage_weddingId_fkey` FOREIGN KEY (`weddingId`) REFERENCES `Wedding`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


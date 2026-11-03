-- Add admin-managed founder profiles and blog articles.
-- NOTE: This migration is explicitly unverified until exercised against a genuine configured MySQL service.
CREATE TABLE `TeamMember` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `role` VARCHAR(120) NOT NULL,
    `bio` TEXT NOT NULL,
    `imageId` VARCHAR(36) NULL,
    `linkedin` VARCHAR(500) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `archived` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `TeamMember_published_archived_displayOrder_idx`(`published`, `archived`, `displayOrder`),
    PRIMARY KEY (`id`),
    CONSTRAINT `TeamMember_imageId_fkey` FOREIGN KEY (`imageId`) REFERENCES `UploadedFile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BlogPost` (
    `id` VARCHAR(36) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `title` VARCHAR(180) NOT NULL,
    `excerpt` VARCHAR(500) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `author` VARCHAR(120) NULL,
    `coverImageId` VARCHAR(36) NULL,
    `publishedAt` DATETIME(3) NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `archived` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `BlogPost_slug_key`(`slug`),
    INDEX `BlogPost_published_archived_publishedAt_idx`(`published`, `archived`, `publishedAt`),
    PRIMARY KEY (`id`),
    CONSTRAINT `BlogPost_coverImageId_fkey` FOREIGN KEY (`coverImageId`) REFERENCES `UploadedFile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

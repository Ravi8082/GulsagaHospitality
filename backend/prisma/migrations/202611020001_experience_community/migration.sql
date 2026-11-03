-- CreateTable
CREATE TABLE `CommunityUser` (
    `id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `displayName` VARCHAR(100) NOT NULL,
    `memberVerified` BOOLEAN NOT NULL DEFAULT false,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CommunityUser_email_key`(`email`),
    INDEX `CommunityUser_memberVerified_enabled_idx`(`memberVerified`, `enabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExperienceCategory` (
    `id` VARCHAR(36) NOT NULL,
    `slug` VARCHAR(60) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ExperienceCategory_slug_key`(`slug`),
    UNIQUE INDEX `ExperienceCategory_name_key`(`name`),
    INDEX `ExperienceCategory_enabled_displayOrder_idx`(`enabled`, `displayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MemberExperience` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `categoryId` VARCHAR(36) NOT NULL,
    `destinationId` INTEGER NULL,
    `resortId` INTEGER NULL,
    `title` VARCHAR(180) NOT NULL,
    `shortDescription` VARCHAR(500) NOT NULL,
    `story` LONGTEXT NOT NULL,
    `visitDate` DATE NULL,
    `overallRating` INTEGER NOT NULL,
    `hospitalityRating` INTEGER NOT NULL,
    `cleanlinessRating` INTEGER NOT NULL,
    `locationRating` INTEGER NOT NULL,
    `amenitiesRating` INTEGER NOT NULL,
    `foodRating` INTEGER NOT NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    `moderationReason` VARCHAR(1000) NULL,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `verifiedStay` BOOLEAN NOT NULL DEFAULT false,
    `views` INTEGER NOT NULL DEFAULT 0,
    `publishedAt` DATETIME(3) NULL,
    `moderatedAt` DATETIME(3) NULL,
    `moderatedById` VARCHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MemberExperience_status_publishedAt_idx`(`status`, `publishedAt`),
    INDEX `MemberExperience_categoryId_status_idx`(`categoryId`, `status`),
    INDEX `MemberExperience_destinationId_status_idx`(`destinationId`, `status`),
    INDEX `MemberExperience_resortId_status_idx`(`resortId`, `status`),
    INDEX `MemberExperience_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `MemberExperience_featured_status_publishedAt_idx`(`featured`, `status`, `publishedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExperienceMedia` (
    `id` VARCHAR(36) NOT NULL,
    `experienceId` VARCHAR(36) NOT NULL,
    `uploadedFileId` VARCHAR(36) NOT NULL,
    `kind` VARCHAR(10) NOT NULL,
    `thumbnailStorageKey` VARCHAR(100) NULL,
    `altText` VARCHAR(255) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ExperienceMedia_uploadedFileId_key`(`uploadedFileId`),
    INDEX `ExperienceMedia_experienceId_displayOrder_idx`(`experienceId`, `displayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExperienceRating` (
    `id` VARCHAR(36) NOT NULL,
    `experienceId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `hospitality` INTEGER NOT NULL,
    `cleanliness` INTEGER NOT NULL,
    `location` INTEGER NOT NULL,
    `amenities` INTEGER NOT NULL,
    `food` INTEGER NOT NULL,
    `overall` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ExperienceRating_experienceId_overall_idx`(`experienceId`, `overall`),
    UNIQUE INDEX `ExperienceRating_experienceId_userId_key`(`experienceId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExperienceLike` (
    `id` VARCHAR(36) NOT NULL,
    `experienceId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExperienceLike_userId_createdAt_idx`(`userId`, `createdAt`),
    UNIQUE INDEX `ExperienceLike_experienceId_userId_key`(`experienceId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExperienceComment` (
    `id` VARCHAR(36) NOT NULL,
    `experienceId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `parentId` VARCHAR(36) NULL,
    `body` VARCHAR(2000) NOT NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    `moderatorId` VARCHAR(36) NULL,
    `moderatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ExperienceComment_experienceId_status_createdAt_idx`(`experienceId`, `status`, `createdAt`),
    INDEX `ExperienceComment_parentId_status_idx`(`parentId`, `status`),
    INDEX `ExperienceComment_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExperienceReport` (
    `id` VARCHAR(36) NOT NULL,
    `experienceId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `reason` VARCHAR(60) NOT NULL,
    `details` VARCHAR(1000) NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'OPEN',
    `reviewedById` VARCHAR(36) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExperienceReport_status_createdAt_idx`(`status`, `createdAt`),
    UNIQUE INDEX `ExperienceReport_experienceId_userId_status_key`(`experienceId`, `userId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExperienceModerationHistory` (
    `id` VARCHAR(36) NOT NULL,
    `experienceId` VARCHAR(36) NOT NULL,
    `adminId` VARCHAR(36) NOT NULL,
    `action` VARCHAR(32) NOT NULL,
    `reason` VARCHAR(1000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExperienceModerationHistory_experienceId_createdAt_idx`(`experienceId`, `createdAt`),
    INDEX `ExperienceModerationHistory_adminId_createdAt_idx`(`adminId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExperienceView` (
    `id` VARCHAR(36) NOT NULL,
    `experienceId` VARCHAR(36) NOT NULL,
    `viewerHash` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExperienceView_experienceId_createdAt_idx`(`experienceId`, `createdAt`),
    UNIQUE INDEX `ExperienceView_experienceId_viewerHash_key`(`experienceId`, `viewerHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExperienceNotification` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `experienceId` VARCHAR(36) NULL,
    `kind` VARCHAR(32) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExperienceNotification_userId_readAt_createdAt_idx`(`userId`, `readAt`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MemberExperience` ADD CONSTRAINT `MemberExperience_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `CommunityUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MemberExperience` ADD CONSTRAINT `MemberExperience_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ExperienceCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceMedia` ADD CONSTRAINT `ExperienceMedia_experienceId_fkey` FOREIGN KEY (`experienceId`) REFERENCES `MemberExperience`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceMedia` ADD CONSTRAINT `ExperienceMedia_uploadedFileId_fkey` FOREIGN KEY (`uploadedFileId`) REFERENCES `UploadedFile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceRating` ADD CONSTRAINT `ExperienceRating_experienceId_fkey` FOREIGN KEY (`experienceId`) REFERENCES `MemberExperience`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceRating` ADD CONSTRAINT `ExperienceRating_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `CommunityUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceLike` ADD CONSTRAINT `ExperienceLike_experienceId_fkey` FOREIGN KEY (`experienceId`) REFERENCES `MemberExperience`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceLike` ADD CONSTRAINT `ExperienceLike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `CommunityUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceComment` ADD CONSTRAINT `ExperienceComment_experienceId_fkey` FOREIGN KEY (`experienceId`) REFERENCES `MemberExperience`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceComment` ADD CONSTRAINT `ExperienceComment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `CommunityUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceComment` ADD CONSTRAINT `ExperienceComment_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `ExperienceComment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceComment` ADD CONSTRAINT `ExperienceComment_moderatorId_fkey` FOREIGN KEY (`moderatorId`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceReport` ADD CONSTRAINT `ExperienceReport_experienceId_fkey` FOREIGN KEY (`experienceId`) REFERENCES `MemberExperience`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceReport` ADD CONSTRAINT `ExperienceReport_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `CommunityUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceModerationHistory` ADD CONSTRAINT `ExperienceModerationHistory_experienceId_fkey` FOREIGN KEY (`experienceId`) REFERENCES `MemberExperience`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceModerationHistory` ADD CONSTRAINT `ExperienceModerationHistory_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `AdminUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceView` ADD CONSTRAINT `ExperienceView_experienceId_fkey` FOREIGN KEY (`experienceId`) REFERENCES `MemberExperience`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceNotification` ADD CONSTRAINT `ExperienceNotification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `CommunityUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceNotification` ADD CONSTRAINT `ExperienceNotification_experienceId_fkey` FOREIGN KEY (`experienceId`) REFERENCES `MemberExperience`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `ExperienceCategory` (`id`, `slug`, `name`, `displayOrder`) VALUES
  (UUID(), 'resort-stays', 'Resort Stays', 0),
  (UUID(), 'luxury-holidays', 'Luxury Holidays', 1),
  (UUID(), 'art-residency', 'Art Residency', 2),
  (UUID(), 'destination-weddings', 'Destination Weddings', 3),
  (UUID(), 'adventure-nature', 'Adventure & Nature', 4),
  (UUID(), 'cultural-experiences', 'Cultural Experiences', 5),
  (UUID(), 'family-holidays', 'Family Holidays', 6),
  (UUID(), 'romantic-getaways', 'Romantic Getaways', 7);

-- Initial relational schema for administrator sessions, public content, submissions, media, mail, and audit records.
CREATE TABLE `AdminUser` (
  `id` VARCHAR(36) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'ADMIN',
  `enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `permissions` JSON NOT NULL,
  `sessionVersion` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `AdminUser_email_key` (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Project` (
  `id` VARCHAR(36) NOT NULL,
  `slug` VARCHAR(120) NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `category` VARCHAR(160) NOT NULL,
  `description` TEXT NOT NULL,
  `url` VARCHAR(500) NULL,
  `imageId` VARCHAR(36) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'LIVE',
  `published` BOOLEAN NOT NULL DEFAULT FALSE,
  `displayOrder` INTEGER NOT NULL DEFAULT 0,
  `archived` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Project_slug_key` (`slug`),
  INDEX `Project_published_archived_displayOrder_idx` (`published`, `archived`, `displayOrder`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Service` (
  `id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `description` TEXT NOT NULL,
  `icon` VARCHAR(30) NOT NULL DEFAULT 'code',
  `published` BOOLEAN NOT NULL DEFAULT FALSE,
  `displayOrder` INTEGER NOT NULL DEFAULT 0,
  `archived` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SiteSetting` (
  `key` VARCHAR(100) NOT NULL,
  `value` TEXT NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SocialLink` (
  `id` VARCHAR(36) NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `verified` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ContactSubmission` (
  `id` VARCHAR(36) NOT NULL,
  `reference` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `mobile` VARCHAR(20) NOT NULL,
  `company` VARCHAR(160) NULL,
  `type` VARCHAR(60) NOT NULL,
  `subject` VARCHAR(180) NOT NULL,
  `message` TEXT NOT NULL,
  `consent` BOOLEAN NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'NEW',
  `notes` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ContactSubmission_reference_key` (`reference`),
  INDEX `ContactSubmission_status_createdAt_idx` (`status`, `createdAt`),
  INDEX `ContactSubmission_email_idx` (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OtpVerification` (
  `id` VARCHAR(36) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `purpose` VARCHAR(30) NOT NULL,
  `codeHash` VARCHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `consumed` BOOLEAN NOT NULL DEFAULT FALSE,
  `verified` BOOLEAN NOT NULL DEFAULT FALSE,
  `grantHash` VARCHAR(64) NULL,
  `grantExpiresAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `OtpVerification_email_purpose_createdAt_idx` (`email`, `purpose`, `createdAt`),
  INDEX `OtpVerification_expiresAt_idx` (`expiresAt`),
  INDEX `OtpVerification_grantHash_idx` (`grantHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `JobPosting` (
  `id` VARCHAR(36) NOT NULL,
  `slug` VARCHAR(120) NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `description` TEXT NOT NULL,
  `responsibilities` TEXT NOT NULL,
  `skills` TEXT NOT NULL,
  `qualification` TEXT NOT NULL,
  `experience` VARCHAR(100) NOT NULL,
  `type` VARCHAR(30) NOT NULL,
  `department` VARCHAR(100) NOT NULL,
  `location` VARCHAR(120) NOT NULL,
  `deadline` DATETIME(3) NOT NULL,
  `photoRequired` BOOLEAN NOT NULL DEFAULT FALSE,
  `published` BOOLEAN NOT NULL DEFAULT FALSE,
  `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  `featured` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `JobPosting_slug_key` (`slug`),
  INDEX `JobPosting_published_status_deadline_idx` (`published`, `status`, `deadline`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `JobApplication` (
  `id` VARCHAR(36) NOT NULL,
  `reference` VARCHAR(50) NOT NULL,
  `jobId` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `mobile` VARCHAR(20) NOT NULL,
  `qualification` VARCHAR(160) NOT NULL,
  `skills` TEXT NOT NULL,
  `experience` VARCHAR(100) NOT NULL,
  `city` VARCHAR(120) NOT NULL,
  `introduction` TEXT NOT NULL,
  `linkedin` VARCHAR(500) NULL,
  `github` VARCHAR(500) NULL,
  `portfolio` VARCHAR(500) NULL,
  `coverLetter` TEXT NULL,
  `resumeId` VARCHAR(36) NOT NULL,
  `photoId` VARCHAR(36) NULL,
  `consent` BOOLEAN NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
  `notes` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `JobApplication_reference_key` (`reference`),
  UNIQUE INDEX `JobApplication_resumeId_key` (`resumeId`),
  INDEX `JobApplication_jobId_status_createdAt_idx` (`jobId`, `status`, `createdAt`),
  INDEX `JobApplication_email_idx` (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `UploadedFile` (
  `id` VARCHAR(36) NOT NULL,
  `storageKey` VARCHAR(100) NOT NULL,
  `originalName` VARCHAR(255) NOT NULL,
  `mime` VARCHAR(100) NOT NULL,
  `size` INTEGER NOT NULL,
  `purpose` VARCHAR(30) NOT NULL,
  `published` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `UploadedFile_storageKey_key` (`storageKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EmailNotification` (
  `id` VARCHAR(36) NOT NULL,
  `recipient` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `text` TEXT NOT NULL,
  `html` TEXT NOT NULL,
  `state` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `availableAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastError` VARCHAR(100) NULL,
  `acceptedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `EmailNotification_state_availableAt_idx` (`state`, `availableAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ApplicationStatusHistory` (
  `id` VARCHAR(36) NOT NULL,
  `applicationId` VARCHAR(36) NOT NULL,
  `status` VARCHAR(30) NOT NULL,
  `adminId` VARCHAR(36) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ApplicationStatusHistory_applicationId_createdAt_idx` (`applicationId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AuditLog` (
  `id` VARCHAR(36) NOT NULL,
  `adminId` VARCHAR(36) NOT NULL,
  `action` VARCHAR(80) NOT NULL,
  `resourceId` VARCHAR(100) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `AuditLog_createdAt_idx` (`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PasswordReset` (
  `id` VARCHAR(36) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `tokenHash` VARCHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `used` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `PasswordReset_tokenHash_key` (`tokenHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `sessions` (`sid` VARCHAR(255) NOT NULL, `sess` JSON NOT NULL, `expired` DATETIME NOT NULL, PRIMARY KEY (`sid`), INDEX `sessions_expired_idx` (`expired`)) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Project` ADD CONSTRAINT `Project_imageId_fkey` FOREIGN KEY (`imageId`) REFERENCES `UploadedFile` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `JobApplication` ADD CONSTRAINT `JobApplication_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `JobPosting` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `JobApplication` ADD CONSTRAINT `JobApplication_resumeId_fkey` FOREIGN KEY (`resumeId`) REFERENCES `UploadedFile` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `JobApplication` ADD CONSTRAINT `JobApplication_photoId_fkey` FOREIGN KEY (`photoId`) REFERENCES `UploadedFile` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ApplicationStatusHistory` ADD CONSTRAINT `ApplicationStatusHistory_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `JobApplication` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

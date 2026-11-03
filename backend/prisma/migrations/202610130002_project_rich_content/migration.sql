-- AlterTable: add rich portfolio content fields to Project
-- NOTE: This migration is explicitly unverified until exercised against a genuine configured MySQL service.
ALTER TABLE `Project` ADD COLUMN `longDescription` TEXT NULL;
ALTER TABLE `Project` ADD COLUMN `features` JSON NULL;
ALTER TABLE `Project` ADD COLUMN `techTags` JSON NULL;
ALTER TABLE `Project` ADD COLUMN `role` VARCHAR(200) NULL;
ALTER TABLE `Project` ADD COLUMN `client` VARCHAR(200) NULL;

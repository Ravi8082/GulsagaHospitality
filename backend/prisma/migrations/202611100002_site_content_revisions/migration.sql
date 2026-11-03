-- Page content edited by administrators, with a revision history of every change.
CREATE TABLE IF NOT EXISTS `site_content` (
    `content_key` VARCHAR(60) NOT NULL,
    `data` LONGTEXT NOT NULL,
    `version` INT NOT NULL DEFAULT 1,
    `updated_by` VARCHAR(36) NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`content_key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `content_revisions` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `content_key` VARCHAR(60) NOT NULL,
    `version` INT NOT NULL,
    `action` VARCHAR(20) NOT NULL,
    `data` LONGTEXT NOT NULL,
    `admin_id` VARCHAR(36) NULL,
    `admin_email` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `content_revisions_key_idx`(`content_key`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Row-level change history for the collection tables edited from the admin panel.
CREATE TABLE IF NOT EXISTS `collection_changes` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `collection` VARCHAR(60) NOT NULL,
    `record_id` VARCHAR(40) NOT NULL,
    `action` VARCHAR(10) NOT NULL,
    `before_data` LONGTEXT NULL,
    `after_data` LONGTEXT NULL,
    `admin_id` VARCHAR(36) NULL,
    `admin_email` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `collection_changes_idx`(`collection`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Super Admin managed content: network partners, curated experiences, contact channels, site links.
CREATE TABLE IF NOT EXISTS `network_partners` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(120) NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `category` VARCHAR(80) NOT NULL,
    `city` VARCHAR(120) NULL,
    `country` VARCHAR(120) NULL,
    `property_type` VARCHAR(80) NULL,
    `description` TEXT NULL,
    `logo_url` VARCHAR(600) NULL,
    `image_url` VARCHAR(600) NULL,
    `website` VARCHAR(300) NULL,
    `lat` DECIMAL(9, 6) NULL,
    `lng` DECIMAL(9, 6) NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `network_partners_slug_key`(`slug`),
    INDEX `network_partners_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `experience_catalog` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(120) NOT NULL,
    `title` VARCHAR(180) NOT NULL,
    `category` VARCHAR(80) NULL,
    `summary` VARCHAR(500) NULL,
    `description` TEXT NULL,
    `image_url` VARCHAR(600) NULL,
    `link_url` VARCHAR(600) NULL,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `experience_catalog_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `contact_channels` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `kind` VARCHAR(40) NOT NULL,
    `label` VARCHAR(120) NOT NULL,
    `value` VARCHAR(300) NOT NULL,
    `url` VARCHAR(600) NULL,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `site_links` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `area` VARCHAR(40) NOT NULL,
    `label` VARCHAR(120) NOT NULL,
    `url` VARCHAR(600) NOT NULL,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX `site_links_area_idx`(`area`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `partner_users` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(100) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `session_version` INT NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX `partner_users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `partner_property_access` (
    `partner_user_id` INT NOT NULL,
    `resort_id` INT NOT NULL,
    PRIMARY KEY (`partner_user_id`, `resort_id`),
    INDEX `partner_property_access_resort_idx`(`resort_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `partner_rooms` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `resort_id` INT NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `capacity` INT NOT NULL DEFAULT 2,
    `total_units` INT NOT NULL DEFAULT 1,
    `base_rate` INT NOT NULL DEFAULT 0,
    `amenities` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `partner_rooms_resort_idx`(`resort_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `room_inventory` (
    `room_id` INT NOT NULL,
    `stay_date` DATE NOT NULL,
    `available_units` INT NOT NULL,
    `stop_sell` BOOLEAN NOT NULL DEFAULT false,
    `min_stay` INT NOT NULL DEFAULT 1,
    PRIMARY KEY (`room_id`, `stay_date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `partner_bookings` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `resort_id` INT NOT NULL,
    `room_id` INT NULL,
    `guest_name` VARCHAR(160) NOT NULL,
    `guest_contact` VARCHAR(255) NULL,
    `check_in` DATE NOT NULL,
    `check_out` DATE NOT NULL,
    `guests` INT NOT NULL DEFAULT 1,
    `amount` INT NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `partner_bookings_resort_idx`(`resort_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `partner_enquiries` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `resort_id` INT NOT NULL,
    `kind` VARCHAR(40) NOT NULL DEFAULT 'General',
    `name` VARCHAR(160) NOT NULL,
    `contact` VARCHAR(255) NULL,
    `message` TEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'NEW',
    `follow_up_on` DATE NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `partner_enquiries_resort_idx`(`resort_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Partner proposals stay here until a Gulsaga administrator approves them.
CREATE TABLE IF NOT EXISTS `partner_change_requests` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `resort_id` INT NOT NULL,
    `entity` VARCHAR(20) NOT NULL,
    `entity_id` INT NULL,
    `payload` TEXT NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `submitted_by` INT NOT NULL,
    `reviewed_by` VARCHAR(255) NULL,
    `review_note` VARCHAR(500) NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `reviewed_at` TIMESTAMP NULL,
    INDEX `partner_change_requests_status_idx`(`status`, `resort_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

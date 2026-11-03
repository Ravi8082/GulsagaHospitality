ALTER TABLE `AdminUser` ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `partner_users` ADD COLUMN `must_change_password` BOOLEAN NOT NULL DEFAULT false;

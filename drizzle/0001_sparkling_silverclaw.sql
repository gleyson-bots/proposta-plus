CREATE TABLE `catalog_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdByUserId` int NOT NULL,
	`type` enum('product','service') NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(128),
	`unitPriceCents` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'EUR',
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `catalog_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`contactName` varchar(255) NOT NULL,
	`companyName` varchar(255),
	`taxId` varchar(64),
	`email` varchar(320),
	`phone` varchar(64),
	`jobTitle` varchar(128),
	`addressLine1` varchar(255),
	`addressLine2` varchar(255),
	`postalCode` varchar(32),
	`city` varchar(128),
	`country` varchar(128),
	`notes` text,
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`singletonKey` varchar(32) NOT NULL,
	`legalName` varchar(255) NOT NULL,
	`tradingName` varchar(255),
	`taxId` varchar(64),
	`email` varchar(320),
	`phone` varchar(64),
	`website` varchar(512),
	`addressLine1` varchar(255),
	`addressLine2` varchar(255),
	`postalCode` varchar(32),
	`city` varchar(128),
	`country` varchar(128),
	`logoStorageKey` varchar(512),
	`logoUrl` varchar(768),
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_settings_singletonKey_unique` UNIQUE(`singletonKey`)
);
--> statement-breakpoint
CREATE TABLE `email_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`proposalVersion` int NOT NULL,
	`recipient` varchar(320) NOT NULL,
	`provider` varchar(32) NOT NULL DEFAULT 'resend',
	`providerMessageId` varchar(128),
	`idempotencyKey` varchar(255) NOT NULL,
	`status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`sentAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_deliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_deliveries_proposal_version_unique` UNIQUE(`proposalId`,`proposalVersion`),
	CONSTRAINT `email_deliveries_idempotency_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `proposal_approval_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`position` int NOT NULL,
	`approverUserId` int,
	`commercialRoleLabel` varchar(128),
	`decision` enum('pending','approved','rejected','skipped') NOT NULL DEFAULT 'pending',
	`comment` text,
	`decidedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `proposal_approval_steps_id` PRIMARY KEY(`id`),
	CONSTRAINT `proposal_approval_position_unique` UNIQUE(`proposalId`,`position`)
);
--> statement-breakpoint
CREATE TABLE `proposal_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`uploadedByUserId` int NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(768) NOT NULL,
	`mimeType` varchar(128) NOT NULL,
	`sizeBytes` int NOT NULL,
	`includeInDocument` boolean NOT NULL DEFAULT false,
	`shareWithClient` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `proposal_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `proposal_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`catalogItemId` int,
	`position` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`quantity` decimal(12,3) NOT NULL,
	`unitPriceCents` int NOT NULL,
	`discountBps` int NOT NULL DEFAULT 0,
	`lineSubtotalCents` int NOT NULL,
	`lineDiscountCents` int NOT NULL DEFAULT 0,
	`lineTotalCents` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `proposal_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `proposal_items_position_unique` UNIQUE(`proposalId`,`position`)
);
--> statement-breakpoint
CREATE TABLE `proposal_metadata` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`commercialTerms` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `proposal_metadata_id` PRIMARY KEY(`id`),
	CONSTRAINT `proposal_metadata_proposal_unique` UNIQUE(`proposalId`)
);
--> statement-breakpoint
CREATE TABLE `proposal_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`changedByUserId` int,
	`fromState` enum('draft','sent','accepted','rejected','expired'),
	`toState` enum('draft','sent','accepted','rejected','expired') NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `proposal_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalNumber` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`clientId` int NOT NULL,
	`createdByUserId` int NOT NULL,
	`state` enum('draft','sent','accepted','rejected','expired') NOT NULL DEFAULT 'draft',
	`currency` varchar(3) NOT NULL DEFAULT 'EUR',
	`taxRateBps` int NOT NULL DEFAULT 2300,
	`globalDiscountBps` int NOT NULL DEFAULT 0,
	`subtotalCents` int NOT NULL DEFAULT 0,
	`discountCents` int NOT NULL DEFAULT 0,
	`taxCents` int NOT NULL DEFAULT 0,
	`totalCents` int NOT NULL DEFAULT 0,
	`validUntil` timestamp,
	`publicToken` varchar(128) NOT NULL,
	`publicSharingEnabled` boolean NOT NULL DEFAULT true,
	`clientMessage` text,
	`internalNotes` text,
	`version` int NOT NULL DEFAULT 1,
	`sentAt` timestamp,
	`acceptedAt` timestamp,
	`rejectedAt` timestamp,
	`expiredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `proposals_id` PRIMARY KEY(`id`),
	CONSTRAINT `proposals_number_unique` UNIQUE(`proposalNumber`),
	CONSTRAINT `proposals_public_token_unique` UNIQUE(`publicToken`)
);
--> statement-breakpoint
CREATE TABLE `stored_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proposalId` int NOT NULL,
	`generatedByUserId` int,
	`type` enum('proposal_pdf') NOT NULL DEFAULT 'proposal_pdf',
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(768) NOT NULL,
	`checksum` varchar(128),
	`proposalVersion` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stored_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `catalog_items` ADD CONSTRAINT `catalog_items_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_settings` ADD CONSTRAINT `company_settings_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_deliveries` ADD CONSTRAINT `email_deliveries_proposalId_proposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `proposals`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposal_approval_steps` ADD CONSTRAINT `proposal_approval_steps_proposalId_proposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `proposals`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposal_approval_steps` ADD CONSTRAINT `proposal_approval_steps_approverUserId_users_id_fk` FOREIGN KEY (`approverUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposal_attachments` ADD CONSTRAINT `proposal_attachments_proposalId_proposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `proposals`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposal_attachments` ADD CONSTRAINT `proposal_attachments_uploadedByUserId_users_id_fk` FOREIGN KEY (`uploadedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposal_items` ADD CONSTRAINT `proposal_items_proposalId_proposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `proposals`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposal_items` ADD CONSTRAINT `proposal_items_catalogItemId_catalog_items_id_fk` FOREIGN KEY (`catalogItemId`) REFERENCES `catalog_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposal_metadata` ADD CONSTRAINT `proposal_metadata_proposalId_proposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `proposals`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposal_status_history` ADD CONSTRAINT `proposal_status_history_proposalId_proposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `proposals`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposal_status_history` ADD CONSTRAINT `proposal_status_history_changedByUserId_users_id_fk` FOREIGN KEY (`changedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposals` ADD CONSTRAINT `proposals_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stored_documents` ADD CONSTRAINT `stored_documents_proposalId_proposals_id_fk` FOREIGN KEY (`proposalId`) REFERENCES `proposals`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stored_documents` ADD CONSTRAINT `stored_documents_generatedByUserId_users_id_fk` FOREIGN KEY (`generatedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `catalog_items_archived_idx` ON `catalog_items` (`archivedAt`);--> statement-breakpoint
CREATE INDEX `catalog_items_category_idx` ON `catalog_items` (`category`);--> statement-breakpoint
CREATE INDEX `clients_owner_idx` ON `clients` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `clients_archived_idx` ON `clients` (`archivedAt`);--> statement-breakpoint
CREATE INDEX `clients_company_idx` ON `clients` (`companyName`);--> statement-breakpoint
CREATE INDEX `email_deliveries_status_idx` ON `email_deliveries` (`status`);--> statement-breakpoint
CREATE INDEX `proposal_approval_steps_proposal_idx` ON `proposal_approval_steps` (`proposalId`);--> statement-breakpoint
CREATE INDEX `proposal_attachments_proposal_idx` ON `proposal_attachments` (`proposalId`);--> statement-breakpoint
CREATE INDEX `proposal_items_proposal_idx` ON `proposal_items` (`proposalId`);--> statement-breakpoint
CREATE INDEX `proposal_status_history_proposal_idx` ON `proposal_status_history` (`proposalId`);--> statement-breakpoint
CREATE INDEX `proposals_client_idx` ON `proposals` (`clientId`);--> statement-breakpoint
CREATE INDEX `proposals_creator_idx` ON `proposals` (`createdByUserId`);--> statement-breakpoint
CREATE INDEX `proposals_state_idx` ON `proposals` (`state`);--> statement-breakpoint
CREATE INDEX `stored_documents_proposal_idx` ON `stored_documents` (`proposalId`);
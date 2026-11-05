-- Fresh MySQL 8.4 baseline. Apply only to an EMPTY dedicated database.
-- Do not deploy to PostgreSQL or an existing MySQL database.
-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(320) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'VENDOR_OWNER', 'VENDOR_STAFF') NOT NULL DEFAULT 'VENDOR_STAFF',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isEmailVerified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `EmailVerificationToken` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(320) NOT NULL,
    `otp` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(6) NOT NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `EmailVerificationToken_email_idx`(`email`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `Vendor` (
    `id` VARCHAR(191) NOT NULL,
    `name` TEXT NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `contactPhone` VARCHAR(191) NOT NULL,
    `contactEmail` VARCHAR(320) NOT NULL,
    `address` TEXT NOT NULL,
    `operatingHours` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isApproved` BOOLEAN NOT NULL DEFAULT false,
    `allowCashOnDesk` BOOLEAN NOT NULL DEFAULT true,
    `allowOnlinePayment` BOOLEAN NOT NULL DEFAULT true,
    `requireApproval` BOOLEAN NOT NULL DEFAULT false,
    `retentionDays` INTEGER NOT NULL DEFAULT 30,
    `razorpayKeyId` VARCHAR(191) NULL,
    `razorpayKeySecret` VARCHAR(191) NULL,
    `razorpayWebhookSecret` VARCHAR(191) NULL,
    `upiId` VARCHAR(191) NULL,
    `subscriptionPlan` VARCHAR(191) NOT NULL DEFAULT 'TRIAL',
    `subscriptionExpiresAt` DATETIME(6) NULL,
    `isSubscriptionActive` BOOLEAN NOT NULL DEFAULT true,
    `adminSubNotes` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `Vendor_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `VendorMembership` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'VENDOR_OWNER', 'VENDOR_STAFF') NOT NULL DEFAULT 'VENDOR_STAFF',
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `VendorMembership_userId_vendorId_key`(`userId`, `vendorId`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `VendorQrConfig` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `customColor` VARCHAR(191) NULL DEFAULT '#000000',
    `logoBlobKey` VARCHAR(191) NULL,
    `instructions` VARCHAR(191) NULL,
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `VendorQrConfig_vendorId_key`(`vendorId`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `VendorPaymentAccount` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `partnerApp` VARCHAR(191) NULL DEFAULT 'Print2me',
    `razorpayAccountId` VARCHAR(191) NULL,
    `publicToken` TEXT NULL,
    `accessToken` TEXT NULL,
    `refreshToken` TEXT NULL,
    `tokenExpiresAt` DATETIME(6) NULL,
    `authStatus` VARCHAR(191) NOT NULL DEFAULT 'NOT_CONNECTED',
    `onboardingStatus` VARCHAR(191) NOT NULL DEFAULT 'NOT_STARTED',
    `activationStatus` VARCHAR(191) NOT NULL DEFAULT 'NOT_ACTIVATED',
    `requirements` JSON NULL,
    `lastError` TEXT NULL,
    `lastSyncedAt` DATETIME(6) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `VendorPaymentAccount_vendorId_key`(`vendorId`),
    UNIQUE INDEX `VendorPaymentAccount_razorpayAccountId_key`(`razorpayAccountId`),
    INDEX `VendorPaymentAccount_authStatus_idx`(`authStatus`),
    INDEX `VendorPaymentAccount_activationStatus_idx`(`activationStatus`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `VendorPricing` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `paperSize` ENUM('A4', 'A3', 'LEGAL', 'LETTER') NOT NULL DEFAULT 'A4',
    `colorMode` ENUM('BLACK_AND_WHITE', 'COLOR') NOT NULL DEFAULT 'BLACK_AND_WHITE',
    `isDuplex` BOOLEAN NOT NULL DEFAULT false,
    `pricePerSideMinor` INTEGER NOT NULL,
    `sheetChargeMinor` INTEGER NOT NULL DEFAULT 0,
    `minimumOrderMinor` INTEGER NOT NULL DEFAULT 500,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    INDEX `VendorPricing_vendorId_isActive_idx`(`vendorId`, `isActive`),
    UNIQUE INDEX `VendorPricing_vendorId_paperSize_colorMode_isDuplex_version_key`(`vendorId`, `paperSize`, `colorMode`, `isDuplex`, `version`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `Device` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `deviceName` TEXT NOT NULL,
    `enrollmentCode` VARCHAR(191) NULL,
    `deviceKeyHash` VARCHAR(191) NOT NULL,
    `osVersion` VARCHAR(191) NULL,
    `agentVersion` VARCHAR(191) NULL,
    `lastHeartbeat` DATETIME(6) NULL,
    `isEnrolled` BOOLEAN NOT NULL DEFAULT true,
    `isRevoked` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `Device_enrollmentCode_key`(`enrollmentCode`),
    UNIQUE INDEX `Device_deviceKeyHash_key`(`deviceKeyHash`),
    INDEX `Device_vendorId_isRevoked_idx`(`vendorId`, `isRevoked`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `Printer` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `systemName` VARCHAR(512) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `supportedSizes` JSON NOT NULL,
    `supportsColor` BOOLEAN NOT NULL DEFAULT false,
    `supportsDuplex` BOOLEAN NOT NULL DEFAULT false,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isOnline` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `Printer_deviceId_systemName_key`(`deviceId`, `systemName`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `Document` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `originalName` TEXT NOT NULL,
    `sanitizedName` TEXT NOT NULL,
    `blobKey` VARCHAR(512) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `sizeBytes` BIGINT NOT NULL,
    `pageCount` INTEGER NOT NULL,
    `sha256Hash` VARCHAR(191) NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `isPurged` BOOLEAN NOT NULL DEFAULT false,
    `retentionUntil` DATETIME(6) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `Document_blobKey_key`(`blobKey`),
    INDEX `Document_vendorId_idx`(`vendorId`),
    INDEX `Document_retentionUntil_isPurged_idx`(`retentionUntil`, `isPurged`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `DocumentUploadSession` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `expectedSize` BIGINT NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `blobKey` VARCHAR(512) NOT NULL,
    `expiresAt` DATETIME(6) NOT NULL,
    `isCompleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `DocumentUploadSession_sessionToken_key`(`sessionToken`),
    UNIQUE INDEX `DocumentUploadSession_blobKey_key`(`blobKey`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `trackingToken` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NULL,
    `customerName` TEXT NULL,
    `customerNotes` TEXT NULL,
    `status` ENUM('DRAFT', 'AWAITING_PAYMENT', 'AWAITING_VENDOR_APPROVAL', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `paymentMethod` ENUM('RAZORPAY', 'CASH_ON_COLLECTION') NOT NULL DEFAULT 'RAZORPAY',
    `paymentStatus` ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CASH_PENDING', 'CASH_COLLECTED') NOT NULL DEFAULT 'PENDING',
    `subtotalMinor` INTEGER NOT NULL,
    `taxMinor` INTEGER NOT NULL DEFAULT 0,
    `totalAmountMinor` INTEGER NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `Order_trackingToken_key`(`trackingToken`),
    INDEX `Order_vendorId_status_idx`(`vendorId`, `status`),
    INDEX `Order_vendorId_createdAt_idx`(`vendorId`, `createdAt`),
    INDEX `Order_vendorId_paymentStatus_idx`(`vendorId`, `paymentStatus`),
    UNIQUE INDEX `Order_vendorId_orderNumber_key`(`vendorId`, `orderNumber`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `paperSize` ENUM('A4', 'A3', 'LEGAL', 'LETTER') NOT NULL DEFAULT 'A4',
    `colorMode` ENUM('BLACK_AND_WHITE', 'COLOR') NOT NULL DEFAULT 'BLACK_AND_WHITE',
    `duplexMode` ENUM('SINGLE_SIDED', 'DOUBLE_SIDED_LONG_EDGE', 'DOUBLE_SIDED_SHORT_EDGE') NOT NULL DEFAULT 'SINGLE_SIDED',
    `copies` INTEGER NOT NULL DEFAULT 1,
    `pageRange` VARCHAR(191) NULL,
    `totalSides` INTEGER NOT NULL,
    `totalSheets` INTEGER NOT NULL,
    `unitPriceMinor` INTEGER NOT NULL,
    `itemTotalMinor` INTEGER NOT NULL,

    INDEX `OrderItem_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `razorpayOrderId` VARCHAR(191) NULL,
    `razorpayPaymentId` VARCHAR(191) NULL,
    `razorpaySignature` VARCHAR(191) NULL,
    `amountMinor` INTEGER NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CASH_PENDING', 'CASH_COLLECTED') NOT NULL DEFAULT 'PENDING',
    `failureReason` TEXT NULL,
    `rawPayload` JSON NULL,
    `verifiedAt` DATETIME(6) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `Payment_razorpayOrderId_key`(`razorpayOrderId`),
    UNIQUE INDEX `Payment_razorpayPaymentId_key`(`razorpayPaymentId`),
    INDEX `Payment_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `Refund` (
    `id` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `razorpayRefundId` VARCHAR(191) NULL,
    `amountMinor` INTEGER NOT NULL,
    `reason` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PROCESSED',
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `Refund_razorpayRefundId_key`(`razorpayRefundId`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `PrintJob` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NULL,
    `printerId` VARCHAR(191) NULL,
    `status` ENUM('CREATED', 'QUEUED', 'CLAIMED_BY_DEVICE', 'DOWNLOADING', 'SUBMITTED_TO_SPOOLER', 'COMPLETED', 'FAILED', 'REQUIRES_MANUAL_REVIEW', 'CANCELLED') NOT NULL DEFAULT 'CREATED',
    `claimToken` VARCHAR(191) NULL,
    `claimExpires` DATETIME(6) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 3,
    `lastError` TEXT NULL,
    `spooledAt` DATETIME(6) NULL,
    `completedAt` DATETIME(6) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    INDEX `PrintJob_vendorId_status_idx`(`vendorId`, `status`),
    INDEX `PrintJob_deviceId_status_idx`(`deviceId`, `status`),
    INDEX `PrintJob_claimExpires_idx`(`claimExpires`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `PrintJobEvent` (
    `id` VARCHAR(191) NOT NULL,
    `printJobId` VARCHAR(191) NOT NULL,
    `status` ENUM('CREATED', 'QUEUED', 'CLAIMED_BY_DEVICE', 'DOWNLOADING', 'SUBMITTED_TO_SPOOLER', 'COMPLETED', 'FAILED', 'REQUIRES_MANUAL_REVIEW', 'CANCELLED') NOT NULL,
    `message` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `PrintJobEvent_printJobId_idx`(`printJobId`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `WebhookEvent` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'RAZORPAY',
    `eventType` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `processed` BOOLEAN NOT NULL DEFAULT false,
    `error` VARCHAR(191) NULL,
    `receivedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `WebhookEvent_eventId_key`(`eventId`),
    INDEX `WebhookEvent_processed_idx`(`processed`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `resource` VARCHAR(191) NOT NULL,
    `resourceId` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `details` JSON NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `AuditLog_resource_resourceId_idx`(`resource`, `resourceId`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `RetentionTask` (
    `id` VARCHAR(191) NOT NULL,
    `taskType` VARCHAR(191) NOT NULL DEFAULT 'EXPIRED_BLOB_CLEANUP',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `blobsEvaluated` INTEGER NOT NULL DEFAULT 0,
    `blobsPurged` INTEGER NOT NULL DEFAULT 0,
    `errors` TEXT NULL,
    `startedAt` DATETIME(6) NULL,
    `completedAt` DATETIME(6) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `VendorFcmToken` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(512) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `VendorFcmToken_vendorId_token_key`(`vendorId`, `token`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `SubscriptionPlan` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `priceMonthlyMinor` INTEGER NOT NULL DEFAULT 49900,
    `priceYearlyMinor` INTEGER NOT NULL DEFAULT 499900,
    `maxDevices` INTEGER NOT NULL DEFAULT 1,
    `maxOrdersPerMonth` INTEGER NOT NULL DEFAULT 500,
    `hasAutoPrint` BOOLEAN NOT NULL DEFAULT true,
    `hasColorRouting` BOOLEAN NOT NULL DEFAULT false,
    `hasPrioritySupport` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `SubscriptionPlan_code_key`(`code`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `Coupon` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `discountType` ENUM('PERCENTAGE', 'FLAT_AMOUNT', 'FREE_DAYS') NOT NULL,
    `discountValue` INTEGER NOT NULL DEFAULT 0,
    `freeDays` INTEGER NULL,
    `minOrderMinor` INTEGER NOT NULL DEFAULT 0,
    `maxDiscountMinor` INTEGER NULL,
    `maxUsesTotal` INTEGER NOT NULL DEFAULT 100,
    `currentUsesTotal` INTEGER NOT NULL DEFAULT 0,
    `maxUsesPerVendor` INTEGER NOT NULL DEFAULT 1,
    `validFrom` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `validTill` DATETIME(6) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `applicablePlanCodes` JSON NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `Coupon_code_key`(`code`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `CouponRedemption` (
    `id` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NULL,
    `discountMinor` INTEGER NOT NULL DEFAULT 0,
    `redeemedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `CouponRedemption_vendorId_couponId_idx`(`vendorId`, `couponId`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- CreateTable
CREATE TABLE `VendorSubscriptionInvoice` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NULL,
    `billingCycle` VARCHAR(191) NOT NULL DEFAULT 'MONTHLY',
    `originalPriceMinor` INTEGER NOT NULL DEFAULT 0,
    `discountMinor` INTEGER NOT NULL DEFAULT 0,
    `finalAmountMinor` INTEGER NOT NULL DEFAULT 0,
    `couponCode` VARCHAR(191) NULL,
    `razorpayOrderId` VARCHAR(191) NULL,
    `razorpayPaymentId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SUCCESS',
    `startsAt` DATETIME(6) NOT NULL,
    `expiresAt` DATETIME(6) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `VendorSubscriptionInvoice_vendorId_idx`(`vendorId`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- AddForeignKey
ALTER TABLE `VendorMembership` ADD CONSTRAINT `VendorMembership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendorMembership` ADD CONSTRAINT `VendorMembership_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendorQrConfig` ADD CONSTRAINT `VendorQrConfig_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendorPaymentAccount` ADD CONSTRAINT `VendorPaymentAccount_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendorPricing` ADD CONSTRAINT `VendorPricing_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Device` ADD CONSTRAINT `Device_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Printer` ADD CONSTRAINT `Printer_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Printer` ADD CONSTRAINT `Printer_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Refund` ADD CONSTRAINT `Refund_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrintJob` ADD CONSTRAINT `PrintJob_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrintJob` ADD CONSTRAINT `PrintJob_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrintJob` ADD CONSTRAINT `PrintJob_printerId_fkey` FOREIGN KEY (`printerId`) REFERENCES `Printer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrintJobEvent` ADD CONSTRAINT `PrintJobEvent_printJobId_fkey` FOREIGN KEY (`printJobId`) REFERENCES `PrintJob`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CouponRedemption` ADD CONSTRAINT `CouponRedemption_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CouponRedemption` ADD CONSTRAINT `CouponRedemption_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendorSubscriptionInvoice` ADD CONSTRAINT `VendorSubscriptionInvoice_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendorSubscriptionInvoice` ADD CONSTRAINT `VendorSubscriptionInvoice_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `SubscriptionPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


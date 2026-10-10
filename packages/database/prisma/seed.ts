import { PrismaClient, UserRole, PaperSize, PrintColor } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Password Hashing (cost factor 10)
  const defaultPasswordHash = await bcrypt.hash('Admin@123456', 10);
  const vendorPasswordHash = await bcrypt.hash('Vendor@123456', 10);

  // 2. Super Administrator
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@printflow.io' },
    update: {},
    create: {
      email: 'admin@printflow.io',
      fullName: 'Platform Administrator',
      passwordHash: defaultPasswordHash,
      role: UserRole.SUPER_ADMIN,
      phoneNumber: '+919876543210',
      isActive: true,
    },
  });
  console.log(`✅ Super Admin created: ${superAdmin.email}`);

  // 3. Demo Vendor Owner
  const vendorOwner = await prisma.user.upsert({
    where: { email: 'vendor@speedyprint.com' },
    update: {},
    create: {
      email: 'vendor@speedyprint.com',
      fullName: 'Rajesh Kumar',
      passwordHash: vendorPasswordHash,
      role: UserRole.VENDOR_OWNER,
      phoneNumber: '+919876500001',
      isActive: true,
    },
  });

  // 4. Vendor Business
  const vendor = await prisma.vendor.upsert({
    where: { slug: 'speedy-express' },
    update: {},
    create: {
      name: 'SpeedyPrint Express',
      slug: 'speedy-express',
      contactPhone: '+919876500001',
      contactEmail: 'orders@speedyprint.com',
      address: 'Shop 4, Campus Arcade, Sector 14, Gurugram, Haryana 122001',
      operatingHours: 'Mon-Sat: 09:00 AM - 09:00 PM, Sun: 10:00 AM - 06:00 PM',
      isActive: true,
      isApproved: true,
      allowCashOnDesk: true,
      requireApproval: false,
      retentionDays: 30,
      memberships: {
        create: {
          userId: vendorOwner.id,
          role: UserRole.VENDOR_OWNER,
        },
      },
      qrConfig: {
        create: {
          customColor: '#0f172a',
          instructions: 'Scan to upload and pick up your prints in minutes.',
        },
      },
    },
  });
  console.log(`✅ Vendor created: ${vendor.name} (/v/${vendor.slug})`);

  // 5. Vendor Pricing Matrix (Values in Minor Units: Paise, 1 INR = 100 paise)
  const pricingTiers = [
    // A4 Black & White Single-sided: ₹2.00/side
    { paperSize: PaperSize.A4, colorMode: PrintColor.BLACK_AND_WHITE, isDuplex: false, pricePerSideMinor: 200, sheetChargeMinor: 0, minimumOrderMinor: 500 },
    // A4 Black & White Duplex: ₹1.75/side (₹3.50 per sheet)
    { paperSize: PaperSize.A4, colorMode: PrintColor.BLACK_AND_WHITE, isDuplex: true, pricePerSideMinor: 175, sheetChargeMinor: 0, minimumOrderMinor: 500 },
    // A4 Color Single-sided: ₹10.00/side
    { paperSize: PaperSize.A4, colorMode: PrintColor.COLOR, isDuplex: false, pricePerSideMinor: 1000, sheetChargeMinor: 0, minimumOrderMinor: 500 },
    // A4 Color Duplex: ₹9.00/side (₹18.00 per sheet)
    { paperSize: PaperSize.A4, colorMode: PrintColor.COLOR, isDuplex: true, pricePerSideMinor: 900, sheetChargeMinor: 0, minimumOrderMinor: 500 },
    // A3 Black & White Single-sided: ₹5.00/side
    { paperSize: PaperSize.A3, colorMode: PrintColor.BLACK_AND_WHITE, isDuplex: false, pricePerSideMinor: 500, sheetChargeMinor: 0, minimumOrderMinor: 500 },
    // A3 Color Single-sided: ₹25.00/side
    { paperSize: PaperSize.A3, colorMode: PrintColor.COLOR, isDuplex: false, pricePerSideMinor: 2500, sheetChargeMinor: 0, minimumOrderMinor: 500 },
  ];

  for (const tier of pricingTiers) {
    await prisma.vendorPricing.upsert({
      where: {
        vendorId_paperSize_colorMode_isDuplex_version: {
          vendorId: vendor.id,
          paperSize: tier.paperSize,
          colorMode: tier.colorMode,
          isDuplex: tier.isDuplex,
          version: 1,
        },
      },
      update: {},
      create: {
        vendorId: vendor.id,
        ...tier,
        isActive: true,
        version: 1,
      },
    });
  }
  console.log('✅ Vendor Pricing Matrix seeded.');

  // 6. Registered Windows Print Agent Device & Printer
  const deviceKeyHash = await bcrypt.hash('DEVICE_SECRET_TOKEN_SPEEDY_01', 10);
  const device = await prisma.device.upsert({
    where: { deviceKeyHash },
    update: {},
    create: {
      vendorId: vendor.id,
      deviceName: 'WIN-PRINT-COUNTER-1',
      enrollmentCode: 'ENROLL-SPEEDY-2026',
      deviceKeyHash,
      osVersion: 'Windows 11 Pro 64-bit Build 22631',
      agentVersion: '1.0.0',
      isEnrolled: true,
      lastHeartbeat: new Date(),
    },
  });

  await prisma.printer.upsert({
    where: {
      deviceId_systemName: {
        deviceId: device.id,
        systemName: 'Canon-LBP2900B-Series',
      },
    },
    update: {},
    create: {
      vendorId: vendor.id,
      deviceId: device.id,
      systemName: 'Canon-LBP2900B-Series',
      displayName: 'Canon LBP2900B (High-Speed B&W)',
      supportedSizes: [PaperSize.A4, PaperSize.LETTER],
      supportsColor: false,
      supportsDuplex: false,
      isDefault: true,
      isOnline: true,
    },
  });
  console.log('✅ Demo Device & Printer enrolled and configured.');

  console.log('🎉 Seeding successfully finished!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

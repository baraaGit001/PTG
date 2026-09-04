/* eslint-disable no-console */
import 'reflect-metadata';
import { PrismaClient, type Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, ROLES } from '@ptg/types';
import { SETTING_KEYS } from '@ptg/config';
import { ROOT_LOCATION, computeChildLocation } from '../src/modules/members/path.util.js';

const prisma = new PrismaClient();

/**
 * Development/demo seed data only. Every identity below is obviously fake
 * (ptg-demo.test addresses, PTG-* member IDs) and every balance is created
 * through an explicit ledger entry, never a bare column write - so this
 * script exercises the same invariants the running app enforces.
 */
async function main(): Promise<void> {
  console.log('Seeding permissions, roles and role-permission matrix...');
  await seedRbac();

  console.log('Seeding system settings...');
  await seedSettings();

  console.log('Seeding users, partner network, wallets...');
  const { admin, partners, customers } = await seedUsersAndNetwork();

  console.log('Seeding catalog...');
  const variants = await seedCatalog();

  console.log('Seeding orders...');
  await seedOrders(customers[0].id, variants);

  console.log('Seeding bonus rules & records...');
  await seedBonuses(partners);

  console.log('Seeding community, health, sport, promotions, investment...');
  await seedCommunity(partners);
  await seedHealthArticles();
  await seedSport(partners);
  await seedPromotions();
  await seedInvestment(partners[0].id);

  console.log('Done. Sign in as:');
  console.log('  Admin:   memberId=PTG-ADMIN     password=Passw0rd!Demo');
  console.log(`  Partner: memberId=${partners[0].memberId}  password=Passw0rd!Demo`);
  console.log(`  Customer: memberId=${customers[0].memberId} password=Passw0rd!Demo`);
  void admin;
}

async function seedRbac(): Promise<void> {
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key }, create: { key }, update: {} });
  }
  for (const name of ROLES) {
    const role = await prisma.role.upsert({ where: { name }, create: { name }, update: {} });
    const permissionKeys = DEFAULT_ROLE_PERMISSIONS[name];
    const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        create: { roleId: role.id, permissionId: permission.id },
        update: {},
      });
    }
  }
}

async function seedSettings(): Promise<void> {
  const settings: Array<{ key: string; value: Prisma.InputJsonValue; isPublic: boolean; description: string }> = [
    { key: SETTING_KEYS.brandName, value: 'PTG Business', isPublic: true, description: 'Brand name shown across the app.' },
    { key: SETTING_KEYS.brandLogoUrl, value: '', isPublic: true, description: 'Brand logo asset URL.' },
    { key: SETTING_KEYS.defaultCurrency, value: 'ZAR', isPublic: true, description: 'Default platform currency.' },
    { key: SETTING_KEYS.defaultLocale, value: 'en', isPublic: true, description: 'Default locale for new sessions.' },
    { key: SETTING_KEYS.supportedLocales, value: ['en', 'ar', 'ja', 'zh-CN', 'es'], isPublic: true, description: 'Locales offered in the language selector.' },
    { key: SETTING_KEYS.demoMode, value: false, isPublic: true, description: 'Marks all balances/content as demo data in the UI.' },
    { key: SETTING_KEYS.guestBrowsingEnabled, value: true, isPublic: true, description: 'Allow unauthenticated catalog browsing.' },
    { key: SETTING_KEYS.registrationEnabled, value: false, isPublic: true, description: 'Self-service registration (off - members are admin-provisioned).' },
    { key: SETTING_KEYS.dashboardKpis, value: [], isPublic: false, description: 'Optional override for dashboard KPI cards.' },
    { key: SETTING_KEYS.walletAllowNegative, value: false, isPublic: false, description: 'Whether wallets may go negative.' },
    { key: SETTING_KEYS.walletTransferEnabled, value: false, isPublic: false, description: 'Member-to-member wallet transfers.' },
    { key: SETTING_KEYS.walletAdjustmentApprovalRequired, value: true, isPublic: false, description: 'Require a second admin to approve manual wallet adjustments.' },
    { key: SETTING_KEYS.walletAdjustmentApprovalThresholdMinor, value: 0, isPublic: false, description: 'Adjustments at/above this amount require approval.' },
    { key: SETTING_KEYS.pointsExpiryDays, value: 365, isPublic: false, description: 'Personal points expiry window in days.' },
    { key: SETTING_KEYS.orderNumberPrefix, value: 'PTG', isPublic: false, description: 'Prefix used when generating order numbers.' },
    { key: SETTING_KEYS.lowStockThreshold, value: 5, isPublic: false, description: 'Default low-stock threshold for new variants.' },
    { key: SETTING_KEYS.communityModerationRequired, value: false, isPublic: false, description: 'Require moderator approval before a post is public.' },
    { key: SETTING_KEYS.sportRankingWeights, value: {}, isPublic: false, description: 'Reserved for future ranking-weight overrides.' },
  ];
  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      create: setting,
      update: { value: setting.value, isPublic: setting.isPublic, description: setting.description },
    });
  }
}

async function hashPassword(): Promise<string> {
  return argon2.hash('Passw0rd!Demo', { type: argon2.argon2id });
}

async function seedUsersAndNetwork() {
  const passwordHash = await hashPassword();

  const admin = await prisma.user.upsert({
    where: { memberId: 'PTG-ADMIN' },
    create: {
      memberId: 'PTG-ADMIN',
      email: 'admin@ptg-demo.test',
      fullName: 'Alex Admin',
      displayName: 'Alex',
      passwordHash,
      status: 'ACTIVE',
      roles: { create: [{ role: { connect: { name: 'SUPER_ADMIN' } } }] },
    },
    update: {},
  });

  const staffSeeds: Array<{ memberId: string; name: string; role: (typeof ROLES)[number] }> = [
    { memberId: 'PTG-FINANCE', name: 'Farah Finance', role: 'FINANCE_ADMIN' },
    { memberId: 'PTG-ORDERS', name: 'Omar Orders', role: 'ORDER_ADMIN' },
    { memberId: 'PTG-CONTENT', name: 'Cleo Content', role: 'CONTENT_ADMIN' },
  ];
  for (const staff of staffSeeds) {
    await prisma.user.upsert({
      where: { memberId: staff.memberId },
      create: {
        memberId: staff.memberId,
        email: `${staff.memberId.toLowerCase()}@ptg-demo.test`,
        fullName: staff.name,
        displayName: staff.name.split(' ')[0],
        passwordHash,
        status: 'ACTIVE',
        roles: { create: [{ role: { connect: { name: staff.role } } }] },
      },
      update: {},
    });
  }

  // Partner network: a root partner with two children, each with two of their own.
  const partnerSeeds = [
    { memberId: 'PTG-100001', name: 'Priya Partner', sponsor: null as string | null },
    { memberId: 'PTG-100002', name: 'Ben Builder', sponsor: 'PTG-100001' },
    { memberId: 'PTG-100003', name: 'Chloe Chan', sponsor: 'PTG-100001' },
    { memberId: 'PTG-100004', name: 'Diego Diaz', sponsor: 'PTG-100002' },
    { memberId: 'PTG-100005', name: 'Elena Ema', sponsor: 'PTG-100002' },
    { memberId: 'PTG-100006', name: 'Farid Faye', sponsor: 'PTG-100003' },
  ];

  const partners: Array<{ id: string; memberId: string }> = [];
  const relationshipCache = new Map<string, { path: string; depth: number }>();

  for (const seed of partnerSeeds) {
    const user = await prisma.user.upsert({
      where: { memberId: seed.memberId },
      create: {
        memberId: seed.memberId,
        email: `${seed.memberId.toLowerCase()}@ptg-demo.test`,
        fullName: seed.name,
        displayName: seed.name.split(' ')[0],
        passwordHash,
        status: 'ACTIVE',
        roles: { create: [{ role: { connect: { name: 'PARTNER' } } }] },
        partnerProfile: { create: { membershipStatus: 'ACTIVE', rank: seed.sponsor ? 'Member' : 'Founder', level: seed.sponsor ? 1 : 0, joinedAt: new Date() } },
      },
      update: {},
    });
    partners.push({ id: user.id, memberId: user.memberId });

    const parentLocation = seed.sponsor ? relationshipCache.get(seed.sponsor)! : ROOT_LOCATION;
    const parentId = seed.sponsor ? partners.find((p) => p.memberId === seed.sponsor)!.id : null;
    const location = parentId ? computeChildLocation(parentLocation, parentId) : ROOT_LOCATION;
    relationshipCache.set(seed.memberId, location);

    await prisma.sponsorRelationship.upsert({
      where: { memberId: user.id },
      create: { memberId: user.id, sponsorId: parentId, path: location.path, depth: location.depth },
      update: {},
    });
    // Placement tree mirrors sponsor tree in this seed for simplicity, but is a fully independent table.
    await prisma.placementRelationship.upsert({
      where: { memberId: user.id },
      create: { memberId: user.id, placementParentId: parentId, path: location.path, depth: location.depth },
      update: {},
    });

    await seedWallets(user.id, seed.sponsor ? 42500 : 128000, 8600);
  }

  const customerSeeds = [
    { memberId: 'PTG-C0001', name: 'Casey Customer' },
    { memberId: 'PTG-C0002', name: 'Dana Draper' },
  ];
  const customers: Array<{ id: string; memberId: string }> = [];
  for (const seed of customerSeeds) {
    const user = await prisma.user.upsert({
      where: { memberId: seed.memberId },
      create: {
        memberId: seed.memberId,
        email: `${seed.memberId.toLowerCase()}@ptg-demo.test`,
        fullName: seed.name,
        displayName: seed.name.split(' ')[0],
        passwordHash,
        status: 'ACTIVE',
        roles: { create: [{ role: { connect: { name: 'CUSTOMER' } } }] },
      },
      update: {},
    });
    customers.push({ id: user.id, memberId: user.memberId });
    await seedWallets(user.id, 5000, 0);
    await prisma.address.upsert({
      where: { id: `${user.id}-default-address` },
      create: {
        id: `${user.id}-default-address`,
        userId: user.id,
        recipientName: seed.name,
        phone: '+15550100000',
        country: 'US',
        region: 'CA',
        city: 'San Francisco',
        district: null,
        street: '1 Market Street',
        postalCode: '94105',
        isDefault: true,
      },
      update: {},
    });
  }

  return { admin, partners, customers };
}

async function seedWallets(userId: string, eAccountMinor: number, bonusPoolMinor: number): Promise<void> {
  for (const [type, amount] of [['E_ACCOUNT', eAccountMinor], ['BONUS_POOL', bonusPoolMinor]] as const) {
    const wallet = await prisma.wallet.upsert({
      where: { userId_type: { userId, type } },
      create: { userId, type, currency: 'ZAR', balanceMinor: 0n },
      update: { currency: 'ZAR' },
    });
    if (wallet.balanceMinor === 0n && amount > 0) {
      await prisma.wallet.update({ where: { id: wallet.id }, data: { balanceMinor: BigInt(amount) } });
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          direction: 'IN',
          status: 'POSTED',
          amountMinor: BigInt(amount),
          currency: 'ZAR',
          balanceAfterMinor: BigInt(amount),
          description: 'Opening balance (seed data)',
          descriptionCode: 'SEED_OPENING_BALANCE',
          idempotencyKey: `seed-opening:${wallet.id}`,
          postedAt: new Date(),
        },
      });
    }
  }
  await prisma.pointTransaction.upsert({
    where: { idempotencyKey: `seed-points:${userId}` },
    create: { userId, type: 'EARNED', points: 350, balanceAfter: 350, description: 'Welcome bonus points (seed data)', descriptionCode: 'SEED_WELCOME_POINTS', idempotencyKey: `seed-points:${userId}` },
    update: {},
  });
  await prisma.wallet.upsert({
    where: { userId_type: { userId, type: 'PERSONAL_POINTS' } },
    create: { userId, type: 'PERSONAL_POINTS', currency: 'PTS', balanceMinor: 350n },
    update: { balanceMinor: 350n },
  });
}

/**
 * Catalog mirrors the live PTG Business storefront: prices are ZAR, and every
 * item carries the PV (point value) the mobile app prints under the price.
 * PV runs at roughly price/36 across the real lineup.
 */
const CATEGORY_SEEDS = [
  { slug: 'skincare', name: 'Skincare', position: 1 },
  { slug: 'wellness-essentials', name: 'Wellness Essentials', position: 2 },
  { slug: 'nutrition', name: 'Nutrition', position: 3 },
  { slug: 'personal-care', name: 'Personal Care', position: 4 },
];

interface ProductSeed {
  slug: string;
  name: string;
  sku: string;
  categorySlug: string;
  /** Unit label the app shows under the product name in the cart (Box, Bottle, ...). */
  unit: string;
  priceMinor: number;
  compareAtPriceMinor?: number;
  /** PV awarded per unit. */
  points: number;
  shortDescription: string;
  description: string;
  isFeatured?: boolean;
  attributes?: Array<{ name: string; value: string }>;
  /** Carousel images. */
  gallery?: string[];
  /** Long-form "Product Details" scroll rendered under the buy box. */
  detail?: string[];
}

const OCUZ_DETAIL = Array.from(
  { length: 10 },
  (_, i) => `/products/ocuz-essence/detail-${String(i + 1).padStart(2, '0')}.jpg`,
);

const PRODUCT_SEEDS: ProductSeed[] = [
  {
    slug: 'ocuz-firming-rejuvenating-anti-aging-essence',
    name: 'OCUZ Firming & Rejuvenating Anti-Aging Essence',
    sku: 'PTG-OCUZ-ESS-30',
    categorySlug: 'skincare',
    unit: 'Bottle',
    priceMinor: 75600,
    compareAtPriceMinor: 108000,
    points: 21,
    isFeatured: true,
    shortDescription:
      'Age-defying moments - revitalize young and radiant skin. Firming, wrinkle-reducing and soothing.',
    description: [
      'Double peptides for anti-wrinkle',
      'Contains double peptide anti-aging active ingredients that visibly soften the look of fine lines.',
      '',
      'Firming, elastic and moist',
      'Promotes the production of collagen and elastic fibers so skin regains its plump, youthful bounce.',
      '',
      'Intensive care',
      'Multiple moisturizing factors compounded with precious rare plant extracts - Portulaca Oleracea to alleviate skin inflammation, Houttuynia Cordata to relieve discomfort, and Scutellaria Baicalensis root to strengthen the skin barrier.',
      '',
      'Light and clear texture',
      'Each drop is lightweight - refreshing, easily absorbed, silky and non-greasy.',
      '',
      'Patented technology',
      'Artificial cell membrane material for photo-induced grafting (Patent ZL201310415990.0) and a solid-phase synthesis method for acetyl hexapeptide-8 (Patent ZL 202210025756.6).',
    ].join('\n'),
    attributes: [
      { name: 'Volume', value: '30 ml' },
      { name: 'Brand', value: 'OCUZ - PTG Passion' },
      { name: 'Skin concern', value: 'Fine lines, loss of firmness, dullness' },
      { name: 'Key actives', value: 'Acetyl Hexapeptide-8, artificial cell membrane technology' },
      { name: 'Plant extracts', value: 'Portulaca Oleracea, Houttuynia Cordata, Scutellaria Baicalensis root' },
      { name: 'Texture', value: 'Lightweight, fast-absorbing, non-greasy' },
    ],
    gallery: ['/products/ocuz-essence/main.jpg'],
    detail: OCUZ_DETAIL,
  },
  {
    slug: 'heme-iron-peptide-birds-nest-botanical-drink',
    name: "Heme Iron Peptide & Bird's Nest Peptide Botanical Drink",
    sku: 'PTG-NUT-001',
    categorySlug: 'nutrition',
    unit: 'Box',
    priceMinor: 58500,
    compareAtPriceMinor: 81000,
    points: 16,
    shortDescription: "Heme iron peptide paired with bird's nest peptide in a ready-to-drink botanical formula.",
    description:
      "A ready-to-drink botanical blend combining heme iron peptide with bird's nest peptide, formulated for everyday nutritional support.",
    attributes: [{ name: 'Format', value: 'Liquid sachet' }],
  },
  {
    slug: 'amla-prebiotic-dietary-fiber-detox-drink',
    name: 'Amla Prebiotic High Dietary Fiber Detox Drink',
    sku: 'PTG-NUT-002',
    categorySlug: 'nutrition',
    unit: 'Box',
    priceMinor: 100800,
    points: 30,
    shortDescription: 'Amla-based prebiotic drink with a high dietary fiber content.',
    description: 'A high dietary fiber drink built on amla and prebiotics to support daily digestive comfort.',
  },
  {
    slug: 'double-collagen-cartilage-calcium-tablets',
    name: 'Double Collagen Cartilage Calcium Tablets',
    sku: 'PTG-NUT-003',
    categorySlug: 'nutrition',
    unit: 'Box',
    priceMinor: 37800,
    compareAtPriceMinor: 54000,
    points: 11,
    shortDescription: 'Double collagen and cartilage calcium in a convenient tablet.',
    description: 'Tablets combining double collagen with cartilage calcium for joint and bone support.',
  },
  {
    slug: 'antarctic-krill-oil-softgels',
    name: 'Antarctic Krill Oil Softgels Capsule',
    sku: 'PTG-WEL-001',
    categorySlug: 'wellness-essentials',
    unit: 'Bottle',
    priceMinor: 56700,
    points: 16,
    shortDescription: 'Antarctic krill oil in an easy-to-swallow softgel capsule.',
    description: 'Softgel capsules delivering Antarctic krill oil, a source of omega-3 phospholipids and astaxanthin.',
  },
  {
    slug: 'compound-pro-biotic-solid-beverage',
    name: 'Compound Pro-biotic Solid Beverage',
    sku: 'PTG-WEL-002',
    categorySlug: 'wellness-essentials',
    unit: 'Box',
    priceMinor: 37800,
    compareAtPriceMinor: 54000,
    points: 11,
    shortDescription: 'A compound probiotic solid beverage in single-serve sachets.',
    description: 'Single-serve probiotic sachets that dissolve in water, formulated as a compound solid beverage.',
  },
  {
    slug: 'ptg-protection-anti-cavity-toothpaste',
    name: 'PTG Protection & Anti-Cavity Toothpaste',
    sku: 'PTG-PC-001',
    categorySlug: 'personal-care',
    unit: 'Tube',
    priceMinor: 3528,
    compareAtPriceMinor: 5040,
    points: 1,
    shortDescription: 'Everyday anti-cavity toothpaste from the PTG personal care line.',
    description: 'Daily-use toothpaste formulated for cavity protection and gum care.',
  },
  {
    slug: 'ptg-green-tea-polyphenol-sanitary-napkin',
    name: 'PTG Green Tea Polyphenol Sanitary Napkin',
    sku: 'PTG-PC-002',
    categorySlug: 'personal-care',
    unit: 'Pack',
    priceMinor: 3528,
    compareAtPriceMinor: 5040,
    points: 1,
    shortDescription: 'Sanitary napkins with a green tea polyphenol layer.',
    description: 'Sanitary napkins carrying a green tea polyphenol layer for freshness and comfort.',
  },
];

async function seedCatalog() {
  const categoryIds = new Map<string, string>();
  for (const seed of CATEGORY_SEEDS) {
    const category = await prisma.category.upsert({
      where: { slug: seed.slug },
      create: seed,
      update: { name: seed.name, position: seed.position },
    });
    categoryIds.set(seed.slug, category.id);
  }

  const variantIds: string[] = [];
  for (const seed of PRODUCT_SEEDS) {
    const gallery = seed.gallery?.length
      ? seed.gallery
      : [`https://placehold.co/800x800/f4f5f7/1f2937?text=${encodeURIComponent(seed.name)}`];

    const images = [
      ...gallery.map((url, index) => ({
        url,
        alt: seed.name,
        position: index,
        isPrimary: index === 0,
        role: 'GALLERY' as const,
      })),
      ...(seed.detail ?? []).map((url, index) => ({
        url,
        alt: `${seed.name} - detail ${index + 1}`,
        position: gallery.length + index,
        isPrimary: false,
        role: 'DETAIL' as const,
      })),
    ];

    const data = {
      name: seed.name,
      sku: seed.sku,
      shortDescription: seed.shortDescription,
      description: seed.description,
      categoryId: categoryIds.get(seed.categorySlug)!,
      currency: 'ZAR',
      basePriceMinor: BigInt(seed.priceMinor),
      compareAtPriceMinor: seed.compareAtPriceMinor != null ? BigInt(seed.compareAtPriceMinor) : null,
      pointsAwarded: seed.points,
      status: 'PUBLISHED' as const,
      isFeatured: seed.isFeatured ?? false,
      publishedAt: new Date(),
    };

    // Images and attributes are rewritten on every run so re-seeding picks up
    // artwork and copy changes instead of silently keeping the first version.
    const product = await prisma.product.upsert({
      where: { slug: seed.slug },
      create: { slug: seed.slug, ...data },
      update: data,
    });
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.createMany({ data: images.map((img) => ({ ...img, productId: product.id })) });
    await prisma.productAttribute.deleteMany({ where: { productId: product.id } });
    if (seed.attributes?.length) {
      await prisma.productAttribute.createMany({
        data: seed.attributes.map((attr) => ({ ...attr, productId: product.id, isVariantAxis: false })),
      });
    }

    const variant = await prisma.productVariant.upsert({
      where: { sku: seed.sku },
      create: {
        productId: product.id,
        sku: seed.sku,
        name: seed.unit,
        priceMinor: BigInt(seed.priceMinor),
        pointsAwarded: seed.points,
        options: {},
        isDefault: true,
      },
      update: { name: seed.unit, priceMinor: BigInt(seed.priceMinor), pointsAwarded: seed.points },
    });
    await prisma.inventory.upsert({
      where: { variantId: variant.id },
      create: { variantId: variant.id, onHand: 200, reserved: 0, lowStockThreshold: 20 },
      update: {},
    });
    variantIds.push(variant.id);
  }

  // Retire anything left over from an earlier seed. Archiving rather than
  // deleting keeps historical order lines - which reference the variants -
  // intact while removing the products from the storefront.
  await prisma.product.updateMany({
    where: { slug: { notIn: PRODUCT_SEEDS.map((seed) => seed.slug) } },
    data: { status: 'ARCHIVED', isFeatured: false },
  });

  return variantIds;
}

async function seedOrders(customerId: string, variantIds: string[]): Promise<void> {
  const variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantIds[0] }, include: { product: true } });
  const existing = await prisma.order.findFirst({ where: { userId: customerId } });
  if (existing) return;

  const order = await prisma.order.create({
    data: {
      orderNumber: 'PTG-SEED-0001',
      userId: customerId,
      status: 'DELIVERED',
      paymentStatus: 'PAID',
      currency: 'ZAR',
      subtotalMinor: variant.priceMinor * 2n,
      shippingMinor: 0n,
      taxMinor: 0n,
      totalMinor: variant.priceMinor * 2n,
      deliveryMethod: 'STANDARD',
      shippingAddress: { recipientName: 'Casey Customer', phone: '+15550100000', country: 'US', region: 'CA', city: 'San Francisco', district: null, street: '1 Market Street', postalCode: '94105' },
      pointsAwarded: variant.pointsAwarded * 2,
      idempotencyKey: 'seed-order-0001',
      items: {
        create: [{ productId: variant.productId, productName: variant.product.name, variantId: variant.id, variantName: variant.name, sku: variant.sku, quantity: 2, unitPriceMinor: variant.priceMinor, lineTotalMinor: variant.priceMinor * 2n, pointsAwarded: variant.pointsAwarded * 2 }],
      },
      payments: { create: { method: 'E_ACCOUNT', status: 'PAID', amountMinor: variant.priceMinor * 2n, currency: 'ZAR', paidAt: new Date() } },
      shipments: { create: { status: 'DELIVERED', courier: 'Demo Courier', trackingNumber: 'DEMO123456', shippedAt: new Date(), deliveredAt: new Date() } },
      timeline: {
        create: [
          { code: 'ORDER_PLACED', status: 'PENDING_PAYMENT' },
          { code: 'ORDER_PAID', status: 'PAID' },
          { code: 'ORDER_SHIPPED', status: 'SHIPPED' },
          { code: 'ORDER_DELIVERED', status: 'DELIVERED' },
        ],
      },
    },
  });
  void order;
}

async function seedBonuses(partners: Array<{ id: string; memberId: string }>): Promise<void> {
  const rule = await prisma.bonusRule.upsert({
    where: { code: 'DIRECT_REFERRAL_WELCOME' },
    create: {
      name: 'Direct Referral Welcome Bonus',
      code: 'DIRECT_REFERRAL_WELCOME',
      type: 'DIRECT_REFERRAL',
      description: 'Configurable welcome bonus paid when a new direct member joins. Amount is set per grant, not computed by a hard-coded formula.',
      active: true,
      configuration: { note: 'Illustrative rule; payout amounts are entered by an admin per grant.' },
      effectiveFrom: new Date('2024-01-01'),
    },
    update: {},
  });

  const existing = await prisma.bonusRecord.findFirst({ where: { ruleId: rule.id } });
  if (existing) return;

  await prisma.bonusRecord.create({
    data: { memberId: partners[0].id, ruleId: rule.id, amountMinor: 5000n, currency: 'ZAR', status: 'PAID', sourceType: 'MANUAL', sourceLabel: 'Seed data', walletTransactionId: null, paidAt: new Date() },
  });
  await prisma.bonusRecord.create({
    data: { memberId: partners[1].id, ruleId: rule.id, amountMinor: 3000n, currency: 'ZAR', status: 'PENDING', sourceType: 'MANUAL', sourceLabel: 'Seed data' },
  });
}

async function seedCommunity(partners: Array<{ id: string; memberId: string }>): Promise<void> {
  const existing = await prisma.communityPost.findFirst();
  if (existing) return;
  const post = await prisma.communityPost.create({
    data: { authorId: partners[0].id, title: 'Welcome to the community!', body: 'Share your wellness wins here. (Seed data)', tags: ['welcome'], moderationStatus: 'PUBLISHED' },
  });
  await prisma.communityComment.create({ data: { postId: post.id, authorId: partners[1].id, body: 'Excited to be here!' } });
  await prisma.communityReaction.create({ data: { postId: post.id, userId: partners[2].id, type: 'LIKE' } });
}

async function seedHealthArticles(): Promise<void> {
  const category = await prisma.healthArticleCategory.upsert({ where: { slug: 'nutrition-basics' }, create: { slug: 'nutrition-basics', name: 'Nutrition Basics' }, update: {} });
  await prisma.healthArticle.upsert({
    where: { slug: 'staying-hydrated' },
    create: {
      slug: 'staying-hydrated',
      title: 'Staying Hydrated Through the Day',
      excerpt: 'Simple habits for consistent hydration. (Seed content)',
      bodyHtml: '<p>Simple habits for consistent hydration. This is placeholder demo content.</p>',
      categoryId: category.id,
      authorName: 'PTG Editorial',
      tags: ['hydration', 'habits'],
      isFeatured: true,
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
    update: {},
  });
}

async function seedSport(partners: Array<{ id: string; memberId: string }>): Promise<void> {
  const metric = await prisma.sportMetric.upsert({
    where: { code: 'DAILY_STEPS' },
    create: { code: 'DAILY_STEPS', name: 'Daily Steps', unit: 'STEPS', scoreWeightMilli: 1, active: true },
    update: {},
  });
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (const [index, partner] of partners.entries()) {
    const value = 6000 + index * 800;
    await prisma.sportScore.upsert({
      where: { userId_metricId_recordedFor: { userId: partner.id, metricId: metric.id, recordedFor: today } },
      create: { userId: partner.id, metricId: metric.id, value, score: Math.round(value * (metric.scoreWeightMilli / 1000)), recordedFor: today },
      update: {},
    });
  }
}

async function seedPromotions(): Promise<void> {
  const existing = await prisma.promotion.findFirst();
  if (existing) return;
  await prisma.promotion.create({
    data: {
      title: 'Member Appreciation Week',
      description: 'A demo promotional banner. (Seed content)',
      status: 'ACTIVE',
      startAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      regions: [],
      rules: {},
      position: 1,
    },
  });
}

async function seedInvestment(partnerId: string): Promise<void> {
  const plan = await prisma.investmentPlan.upsert({
    where: { slug: 'starter-growth-plan' },
    create: {
      name: 'Starter Growth Plan',
      slug: 'starter-growth-plan',
      description: 'An admin-configured incentive scheme. No return or yield is guaranteed or computed by this platform.',
      minimumAmountMinor: 100000n,
      maximumAmountMinor: 50000000n,
      currency: 'ZAR',
      termDays: 90,
      riskLabel: 'Conservative',
      status: 'OPEN',
      configuration: {},
    },
    update: {
      description: 'An admin-configured incentive scheme. No return or yield is guaranteed or computed by this platform.',
      minimumAmountMinor: 100000n,
      maximumAmountMinor: 50000000n,
      currency: 'ZAR',
    },
  });
  void partnerId;
  void plan;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

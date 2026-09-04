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
    { key: SETTING_KEYS.defaultCurrency, value: 'USD', isPublic: true, description: 'Default platform currency.' },
    { key: SETTING_KEYS.defaultLocale, value: 'en', isPublic: true, description: 'Default locale for new sessions.' },
    { key: SETTING_KEYS.supportedLocales, value: ['en', 'ar', 'ja', 'zh-CN', 'es'], isPublic: true, description: 'Locales offered in the language selector.' },
    { key: SETTING_KEYS.demoMode, value: true, isPublic: true, description: 'Marks all balances/content as demo data in the UI.' },
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
      create: { userId, type, currency: 'USD', balanceMinor: 0n },
      update: {},
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
          currency: 'USD',
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

async function seedCatalog() {
  const category = await prisma.category.upsert({
    where: { slug: 'wellness-essentials' },
    create: { slug: 'wellness-essentials', name: 'Wellness Essentials', position: 1 },
    update: {},
  });
  const category2 = await prisma.category.upsert({
    where: { slug: 'nutrition' },
    create: { slug: 'nutrition', name: 'Nutrition', position: 2 },
    update: {},
  });

  const productSeeds = [
    { slug: 'daily-multivitamin', name: 'Daily Multivitamin', sku: 'PTG-SKU-001', priceMinor: 2499, categoryId: category.id, points: 25 },
    { slug: 'omega-3-fish-oil', name: 'Omega-3 Fish Oil', sku: 'PTG-SKU-002', priceMinor: 1899, categoryId: category.id, points: 19 },
    { slug: 'plant-protein-powder', name: 'Plant Protein Powder', sku: 'PTG-SKU-003', priceMinor: 3999, categoryId: category2.id, points: 40 },
    { slug: 'electrolyte-hydration-mix', name: 'Electrolyte Hydration Mix', sku: 'PTG-SKU-004', priceMinor: 1499, categoryId: category2.id, points: 15 },
  ];

  const variantIds: string[] = [];
  for (const seed of productSeeds) {
    const product = await prisma.product.upsert({
      where: { slug: seed.slug },
      create: {
        slug: seed.slug,
        name: seed.name,
        sku: seed.sku,
        shortDescription: `${seed.name} - developer/demo product data.`,
        description: `${seed.name} is a demo product used to exercise the marketplace flows. Not a real item for sale.`,
        categoryId: seed.categoryId,
        currency: 'USD',
        basePriceMinor: BigInt(seed.priceMinor),
        pointsAwarded: seed.points,
        status: 'PUBLISHED',
        isFeatured: seed.slug === 'daily-multivitamin',
        publishedAt: new Date(),
        images: { create: [{ url: `https://placehold.co/600x600?text=${encodeURIComponent(seed.name)}`, isPrimary: true, position: 0 }] },
      },
      update: {},
    });

    const variant = await prisma.productVariant.upsert({
      where: { sku: seed.sku },
      create: { productId: product.id, sku: seed.sku, name: 'Standard', priceMinor: BigInt(seed.priceMinor), pointsAwarded: seed.points, options: {}, isDefault: true },
      update: {},
    });
    await prisma.inventory.upsert({
      where: { variantId: variant.id },
      create: { variantId: variant.id, onHand: 200, reserved: 0, lowStockThreshold: 20 },
      update: {},
    });
    variantIds.push(variant.id);
  }
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
      currency: 'USD',
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
      payments: { create: { method: 'E_ACCOUNT', status: 'PAID', amountMinor: variant.priceMinor * 2n, currency: 'USD', paidAt: new Date() } },
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
    data: { memberId: partners[0].id, ruleId: rule.id, amountMinor: 5000n, currency: 'USD', status: 'PAID', sourceType: 'MANUAL', sourceLabel: 'Seed data', walletTransactionId: null, paidAt: new Date() },
  });
  await prisma.bonusRecord.create({
    data: { memberId: partners[1].id, ruleId: rule.id, amountMinor: 3000n, currency: 'USD', status: 'PENDING', sourceType: 'MANUAL', sourceLabel: 'Seed data' },
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
      description: 'A demo, admin-configured plan. No return or yield is guaranteed or computed by this platform.',
      minimumAmountMinor: 10000n,
      maximumAmountMinor: 500000n,
      currency: 'USD',
      termDays: 90,
      riskLabel: 'Conservative',
      status: 'OPEN',
      configuration: {},
    },
    update: {},
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

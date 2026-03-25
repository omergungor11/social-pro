/**
 * Social Pro — Prisma Seed File
 *
 * Seeds realistic demo data for the Social Pro application.
 * IDEMPOTENT: Uses delete-before-create pattern scoped to the existing agency.
 * Does NOT recreate the admin user or agency — looks them up first.
 *
 * Run: npx tsx prisma/seed.ts
 *      npx prisma db seed
 */

import {
  PrismaClient,
  SocialPlatform,
  PostStatus,
  PostTargetStatus,
  MetricType,
  NotificationType,
  AiModel,
  AiGenerationStatus,
  ReportType,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function hoursFromNow(n: number): Date {
  const d = new Date();
  d.setHours(d.getHours() + n);
  return d;
}

const PLACEHOLDER_TOKEN = "encrypted_placeholder_token_aes256gcm";

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("Starting seed...\n");

  // -------------------------------------------------------------------------
  // 1. Resolve existing admin user and agency
  // -------------------------------------------------------------------------
  console.log("Looking up or creating admin user and agency...");

  let adminUser = await prisma.user.findUnique({
    where: { email: "admin@socialpro.dev" },
  });

  if (!adminUser) {
    console.log("  Admin user not found — creating...");
    const bcrypt = await import("bcrypt");
    const passwordHash = await bcrypt.hash("159753*a", 12);

    adminUser = await prisma.user.create({
      data: {
        email: "admin@socialpro.dev",
        name: "Admin",
        passwordHash,
      },
    });
    console.log(`  Created admin user: ${adminUser.id}`);
  }

  let adminMembership = await prisma.agencyMember.findFirst({
    where: { userId: adminUser.id },
    include: { agency: true },
  });

  if (!adminMembership) {
    console.log("  Agency not found — creating...");
    const agency = await prisma.agency.create({
      data: { name: "Social Pro Agency", slug: "social-pro-agency" },
    });

    adminMembership = await prisma.agencyMember.create({
      data: {
        userId: adminUser.id,
        agencyId: agency.id,
        role: "OWNER",
        acceptedAt: new Date(),
      },
      include: { agency: true },
    });
    console.log(`  Created agency: ${agency.name} (${agency.id})`);
  }

  const agency = adminMembership.agency;
  const agencyId = agency.id;
  const userId = adminUser.id;

  console.log(`  Admin user: ${adminUser.email} (id: ${adminUser.id})`);
  console.log(`  Agency: ${agency.name} (id: ${agencyId})\n`);

  // -------------------------------------------------------------------------
  // 2. Clean existing seed data (idempotency)
  //    Order matters — children before parents.
  // -------------------------------------------------------------------------
  console.log("Cleaning existing seed data for agency...");

  await prisma.analyticsSnapshot.deleteMany({
    where: { socialAccount: { agencyId } },
  });
  await prisma.postApproval.deleteMany({
    where: { post: { agencyId } },
  });
  await prisma.postTarget.deleteMany({
    where: { post: { agencyId } },
  });
  await prisma.postMedia.deleteMany({
    where: { post: { agencyId } },
  });
  await prisma.post.deleteMany({ where: { agencyId } });
  await prisma.socialAccount.deleteMany({ where: { agencyId } });
  await prisma.clientGroupMembership.deleteMany({
    where: { group: { agencyId } },
  });
  await prisma.clientGroup.deleteMany({ where: { agencyId } });
  await prisma.client.deleteMany({ where: { agencyId } });
  await prisma.notification.deleteMany({ where: { agencyId } });
  await prisma.aiGeneration.deleteMany({ where: { agencyId } });
  await prisma.analyticsReport.deleteMany({ where: { agencyId } });
  await prisma.auditLog.deleteMany({ where: { agencyId } });
  await prisma.usageRecord.deleteMany({ where: { agencyId } });

  console.log("  Existing seed data cleaned.\n");

  // -------------------------------------------------------------------------
  // 3. Clients (7 clients)
  // -------------------------------------------------------------------------
  console.log("Seeding clients...");

  const clientsData = [
    {
      name: "Nora Kaya",
      email: "nora.kaya@brightleaf.co",
      phone: "+90 532 100 2201",
      company: "Brightleaf E-Commerce",
      notes:
        "Premium e-commerce brand. Prefers Instagram and TikTok campaigns. Monthly retainer.",
      tags: ["e-commerce", "enterprise"],
    },
    {
      name: "Berk Arslan",
      email: "b.arslan@axiomcloud.io",
      phone: "+90 533 200 4402",
      company: "Axiom Cloud SaaS",
      notes:
        "B2B SaaS client. Focus on LinkedIn thought leadership and Twitter engagement.",
      tags: ["saas", "startup"],
    },
    {
      name: "Elif Demir",
      email: "elif@nova-studio.com",
      phone: "+90 541 300 6603",
      company: "Nova Creative Studio",
      notes: null,
      tags: ["agency"],
    },
    {
      name: "Can Yilmaz",
      email: "can.yilmaz@urbanbrew.com.tr",
      phone: "+90 552 400 8804",
      company: "Urban Brew Coffee",
      notes:
        "Local chain going national. Strong Facebook and Instagram presence. High engagement audience.",
      tags: ["e-commerce", "startup"],
    },
    {
      name: "Selin Ozturk",
      email: "selin@finexo.io",
      phone: "+90 555 500 1105",
      company: "Finexo Fintech",
      notes:
        "Fintech startup — compliance-sensitive content. All posts require approval before publish.",
      tags: ["startup", "enterprise"],
    },
    {
      name: "Mehmet Celik",
      email: "mcelik@celikgroup.com.tr",
      phone: "+90 544 600 3306",
      company: "Celik Group Holding",
      notes: null,
      tags: ["enterprise"],
    },
    {
      name: "Ayse Turk",
      email: "ayse@shopturk.co",
      phone: "+90 535 700 5507",
      company: "ShopTurk Marketplace",
      notes: "New client — onboarding in progress. Evaluate platforms first.",
      tags: ["e-commerce", "startup"],
    },
  ];

  const clients = await Promise.all(
    clientsData.map((data) =>
      prisma.client.create({
        data: {
          agencyId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          company: data.company,
          notes: data.notes,
          tags: data.tags,
          metadata: {},
        },
      })
    )
  );

  console.log(`  Created ${clients.length} clients.`);

  const [
    clientBrightleaf,
    clientAxiom,
    clientNova,
    clientUrbanBrew,
    clientFinexo,
    clientCelik,
    clientShopTurk,
  ] = clients;

  // -------------------------------------------------------------------------
  // 4. Client Groups
  // -------------------------------------------------------------------------
  console.log("Seeding client groups...");

  const groupVIP = await prisma.clientGroup.create({
    data: {
      agencyId,
      name: "VIP Clients",
      color: "#f59e0b",
      description: "High-value accounts with enterprise retainers",
    },
  });

  const groupActive = await prisma.clientGroup.create({
    data: {
      agencyId,
      name: "Active Campaigns",
      color: "#10b981",
      description: "Clients with campaigns running this month",
    },
  });

  const groupNew = await prisma.clientGroup.create({
    data: {
      agencyId,
      name: "New Clients",
      color: "#6366f1",
      description: "Recently onboarded — under 90 days",
    },
  });

  // Assign clients to groups
  const groupMemberships = [
    { clientId: clientBrightleaf!.id, groupId: groupVIP.id },
    { clientId: clientCelik!.id, groupId: groupVIP.id },
    { clientId: clientAxiom!.id, groupId: groupVIP.id },
    { clientId: clientBrightleaf!.id, groupId: groupActive.id },
    { clientId: clientUrbanBrew!.id, groupId: groupActive.id },
    { clientId: clientFinexo!.id, groupId: groupActive.id },
    { clientId: clientNova!.id, groupId: groupActive.id },
    { clientId: clientShopTurk!.id, groupId: groupNew.id },
    { clientId: clientFinexo!.id, groupId: groupNew.id },
  ];

  await prisma.clientGroupMembership.createMany({ data: groupMemberships });

  console.log(
    `  Created 3 groups (VIP, Active Campaigns, New Clients) with ${groupMemberships.length} memberships.`
  );

  // -------------------------------------------------------------------------
  // 5. Social Accounts (9 accounts)
  // -------------------------------------------------------------------------
  console.log("Seeding social accounts...");

  const socialAccountsData = [
    // Brightleaf — Instagram + TikTok
    {
      clientId: clientBrightleaf!.id,
      platform: SocialPlatform.INSTAGRAM,
      platformUserId: "17841412345678901",
      platformUsername: "brightleaf_official",
      displayName: "Brightleaf",
      scopes: ["instagram_basic", "instagram_content_publish"],
      isActive: true,
      tokenExpiresAt: daysFromNow(45),
      lastSyncedAt: daysAgo(1),
    },
    {
      clientId: clientBrightleaf!.id,
      platform: SocialPlatform.TIKTOK,
      platformUserId: "6987654321098765432",
      platformUsername: "brightleaf.store",
      displayName: "Brightleaf Store",
      scopes: ["user.info.basic", "video.upload"],
      isActive: true,
      tokenExpiresAt: daysFromNow(30),
      lastSyncedAt: daysAgo(2),
    },
    // Axiom Cloud — LinkedIn + Twitter
    {
      clientId: clientAxiom!.id,
      platform: SocialPlatform.LINKEDIN,
      platformUserId: "urn:li:organization:87654321",
      platformUsername: "axiom-cloud",
      displayName: "Axiom Cloud",
      scopes: ["r_organization_social", "w_organization_social"],
      isActive: true,
      tokenExpiresAt: daysFromNow(60),
      lastSyncedAt: daysAgo(1),
    },
    {
      clientId: clientAxiom!.id,
      platform: SocialPlatform.TWITTER,
      platformUserId: "1234567890123456789",
      platformUsername: "AxiomCloud",
      displayName: "Axiom Cloud",
      scopes: ["tweet.read", "tweet.write", "users.read"],
      isActive: true,
      tokenExpiresAt: daysFromNow(90),
      lastSyncedAt: daysAgo(1),
    },
    // Urban Brew — Facebook + Instagram
    {
      clientId: clientUrbanBrew!.id,
      platform: SocialPlatform.FACEBOOK,
      platformUserId: "108765432109876",
      platformUsername: "urbanbrew.coffee",
      displayName: "Urban Brew Coffee",
      scopes: ["pages_manage_posts", "pages_read_engagement"],
      isActive: true,
      tokenExpiresAt: daysFromNow(15),
      lastSyncedAt: daysAgo(3),
    },
    {
      clientId: clientUrbanBrew!.id,
      platform: SocialPlatform.INSTAGRAM,
      platformUserId: "17841498765432109",
      platformUsername: "urbanbrewcoffee",
      displayName: "Urban Brew Coffee",
      scopes: ["instagram_basic", "instagram_content_publish"],
      isActive: true,
      tokenExpiresAt: daysFromNow(15),
      lastSyncedAt: daysAgo(3),
    },
    // Finexo — LinkedIn
    {
      clientId: clientFinexo!.id,
      platform: SocialPlatform.LINKEDIN,
      platformUserId: "urn:li:organization:11223344",
      platformUsername: "finexo-fintech",
      displayName: "Finexo",
      scopes: ["r_organization_social", "w_organization_social"],
      isActive: true,
      tokenExpiresAt: daysFromNow(5),
      lastSyncedAt: daysAgo(4),
    },
    // Nova Creative — YouTube (disconnected)
    {
      clientId: clientNova!.id,
      platform: SocialPlatform.YOUTUBE,
      platformUserId: "UCaBcDeFgHiJkLmNoPqRsTuV",
      platformUsername: "novacreativestudio",
      displayName: "Nova Creative Studio",
      scopes: ["https://www.googleapis.com/auth/youtube.upload"],
      isActive: false,
      tokenExpiresAt: daysAgo(10),
      lastSyncedAt: daysAgo(12),
    },
    // Celik Group — Facebook
    {
      clientId: clientCelik!.id,
      platform: SocialPlatform.FACEBOOK,
      platformUserId: "209876543210987",
      platformUsername: "celikgroup",
      displayName: "Celik Group",
      scopes: ["pages_manage_posts", "pages_read_engagement"],
      isActive: true,
      tokenExpiresAt: daysFromNow(55),
      lastSyncedAt: daysAgo(2),
    },
  ];

  const socialAccounts = await Promise.all(
    socialAccountsData.map((data) =>
      prisma.socialAccount.create({
        data: {
          agencyId,
          clientId: data.clientId,
          platform: data.platform,
          platformUserId: data.platformUserId,
          platformUsername: data.platformUsername,
          displayName: data.displayName,
          accessToken: PLACEHOLDER_TOKEN,
          refreshToken: PLACEHOLDER_TOKEN,
          tokenExpiresAt: data.tokenExpiresAt,
          scopes: data.scopes,
          isActive: data.isActive,
          lastSyncedAt: data.lastSyncedAt,
          metadata: {},
        },
      })
    )
  );

  console.log(`  Created ${socialAccounts.length} social accounts.`);

  const [
    accBrightleafIG,
    accBrightleafTT,
    accAxiomLI,
    accAxiomTW,
    accUrbanBrewFB,
    accUrbanBrewIG,
    accFinexoLI,
    _accNovaYT,
    accCelikFB,
  ] = socialAccounts;

  // -------------------------------------------------------------------------
  // 6. Posts (18 posts)
  // -------------------------------------------------------------------------
  console.log("Seeding posts...");

  // Helper: create post with targets atomically
  type PostTargetInput = {
    socialAccountId: string;
    status: PostTargetStatus;
    platformPostId?: string;
    platformUrl?: string;
    publishedAt?: Date;
  };

  async function createPost(opts: {
    clientId: string | null;
    title: string;
    contentText: string;
    status: PostStatus;
    scheduledAt?: Date;
    publishedAt?: Date;
    aiGenerated?: boolean;
    aiPrompt?: string;
    targets?: PostTargetInput[];
  }): Promise<{ id: string }> {
    const post = await prisma.post.create({
      data: {
        agencyId,
        createdByUserId: userId,
        clientId: opts.clientId,
        title: opts.title,
        content: { text: opts.contentText },
        status: opts.status,
        scheduledAt: opts.scheduledAt,
        publishedAt: opts.publishedAt,
        aiGenerated: opts.aiGenerated ?? false,
        aiPrompt: opts.aiPrompt,
      },
    });

    if (opts.targets && opts.targets.length > 0) {
      await prisma.postTarget.createMany({
        data: opts.targets.map((t) => ({
          postId: post.id,
          socialAccountId: t.socialAccountId,
          status: t.status,
          platformPostId: t.platformPostId,
          platformUrl: t.platformUrl,
          publishedAt: t.publishedAt,
        })),
      });
    }

    return post;
  }

  // --- PUBLISHED posts (past) ---
  const post1 = await createPost({
    clientId: clientBrightleaf!.id,
    title: "Summer Collection Launch",
    contentText:
      "Summer is here and so is our new collection! Explore handpicked styles that bring warmth and color to every day. Shop now — link in bio. #brightleaf #summer2026 #fashion",
    status: PostStatus.PUBLISHED,
    publishedAt: daysAgo(14),
    targets: [
      {
        socialAccountId: accBrightleafIG!.id,
        status: PostTargetStatus.PUBLISHED,
        platformPostId: "17920432591234567",
        platformUrl: "https://www.instagram.com/p/AbCdEfGhIjK/",
        publishedAt: daysAgo(14),
      },
    ],
  });

  const post2 = await createPost({
    clientId: clientBrightleaf!.id,
    title: "Weekend Flash Sale",
    contentText:
      "Flash sale this weekend only! Up to 40% off sitewide. Don't miss out — use code WEEKEND40 at checkout. Valid Sat-Sun only. #sale #brightleaf",
    status: PostStatus.PUBLISHED,
    publishedAt: daysAgo(7),
    targets: [
      {
        socialAccountId: accBrightleafIG!.id,
        status: PostTargetStatus.PUBLISHED,
        platformPostId: "17920432591234568",
        platformUrl: "https://www.instagram.com/p/BcDeFgHiJkL/",
        publishedAt: daysAgo(7),
      },
      {
        socialAccountId: accBrightleafTT!.id,
        status: PostTargetStatus.PUBLISHED,
        platformPostId: "7123456789012345678",
        platformUrl:
          "https://www.tiktok.com/@brightleaf.store/video/7123456789012345678",
        publishedAt: daysAgo(7),
      },
    ],
  });

  const post3 = await createPost({
    clientId: clientAxiom!.id,
    title: "Q1 Product Update",
    contentText:
      "Excited to share our Q1 2026 product update! We shipped 14 new features, improved API latency by 38%, and hit 99.97% uptime. Read the full changelog on our blog. #b2bsaas #productupdate #axiomcloud",
    status: PostStatus.PUBLISHED,
    publishedAt: daysAgo(10),
    aiGenerated: true,
    aiPrompt:
      "Write a professional LinkedIn post announcing Q1 product milestones for a cloud SaaS company",
    targets: [
      {
        socialAccountId: accAxiomLI!.id,
        status: PostTargetStatus.PUBLISHED,
        platformPostId: "urn:li:share:7098765432101234567",
        platformUrl:
          "https://www.linkedin.com/feed/update/urn:li:share:7098765432101234567",
        publishedAt: daysAgo(10),
      },
    ],
  });

  const post4 = await createPost({
    clientId: clientAxiom!.id,
    title: "Hiring — Senior Backend Engineer",
    contentText:
      "We are hiring! Join the Axiom Cloud engineering team as a Senior Backend Engineer. Remote-first, competitive package, meaningful work. Apply here: axiomcloud.io/careers #hiring #remotework #backend",
    status: PostStatus.PUBLISHED,
    publishedAt: daysAgo(5),
    targets: [
      {
        socialAccountId: accAxiomLI!.id,
        status: PostTargetStatus.PUBLISHED,
        platformPostId: "urn:li:share:7098765432109876543",
        platformUrl:
          "https://www.linkedin.com/feed/update/urn:li:share:7098765432109876543",
        publishedAt: daysAgo(5),
      },
      {
        socialAccountId: accAxiomTW!.id,
        status: PostTargetStatus.PUBLISHED,
        platformPostId: "1876543210987654321",
        platformUrl: "https://twitter.com/AxiomCloud/status/1876543210987654321",
        publishedAt: daysAgo(5),
      },
    ],
  });

  const post5 = await createPost({
    clientId: clientUrbanBrew!.id,
    title: "Good Morning Campaign",
    contentText:
      "Start your morning right with our freshly brewed single-origin pour-over. Every cup tells a story. Find your nearest Urban Brew location at urbanbrew.com.tr. #coffee #morningvibes #istanbul",
    status: PostStatus.PUBLISHED,
    publishedAt: daysAgo(3),
    targets: [
      {
        socialAccountId: accUrbanBrewFB!.id,
        status: PostTargetStatus.PUBLISHED,
        platformPostId: "108765432109876_987654321098765",
        platformUrl:
          "https://www.facebook.com/urbanbrew.coffee/posts/987654321098765",
        publishedAt: daysAgo(3),
      },
      {
        socialAccountId: accUrbanBrewIG!.id,
        status: PostTargetStatus.PUBLISHED,
        platformPostId: "17920432599876543",
        platformUrl: "https://www.instagram.com/p/CdEfGhIjKlM/",
        publishedAt: daysAgo(3),
      },
    ],
  });

  const post6 = await createPost({
    clientId: clientCelik!.id,
    title: "20th Anniversary Announcement",
    contentText:
      "Celebrating 20 years of excellence. Celik Group has grown from a regional trading company to a diversified holding with operations in 8 countries. Thank you to every partner and employee who made this journey possible. #celikgroup #anniversary #milestone",
    status: PostStatus.PUBLISHED,
    publishedAt: daysAgo(6),
    targets: [
      {
        socialAccountId: accCelikFB!.id,
        status: PostTargetStatus.PUBLISHED,
        platformPostId: "209876543210987_112233445566778",
        platformUrl:
          "https://www.facebook.com/celikgroup/posts/112233445566778",
        publishedAt: daysAgo(6),
      },
    ],
  });

  // --- SCHEDULED posts (future) ---
  const post7 = await createPost({
    clientId: clientBrightleaf!.id,
    title: "New Arrivals — July Drop",
    contentText:
      "Something new is dropping this July. Stay tuned — you don't want to miss it. Set your reminders. #brightleaf #comingsoon #july2026",
    status: PostStatus.SCHEDULED,
    scheduledAt: daysFromNow(3),
    targets: [
      {
        socialAccountId: accBrightleafIG!.id,
        status: PostTargetStatus.PENDING,
      },
      {
        socialAccountId: accBrightleafTT!.id,
        status: PostTargetStatus.PENDING,
      },
    ],
  });

  const post8 = await createPost({
    clientId: clientAxiom!.id,
    title: "Webinar: Scaling to 1M API Requests",
    contentText:
      "Join us next Tuesday for a live webinar: \"Scaling to 1M API requests/day without losing sleep.\" Our CTO walks through real architecture decisions. Free to attend — register at axiomcloud.io/webinar. #webinar #saas #engineering",
    status: PostStatus.SCHEDULED,
    scheduledAt: hoursFromNow(36),
    aiGenerated: true,
    aiPrompt:
      "Write a Twitter thread teaser for a technical webinar about API scalability",
    targets: [
      {
        socialAccountId: accAxiomTW!.id,
        status: PostTargetStatus.PENDING,
      },
      {
        socialAccountId: accAxiomLI!.id,
        status: PostTargetStatus.PENDING,
      },
    ],
  });

  const post9 = await createPost({
    clientId: clientUrbanBrew!.id,
    title: "New Location Opening — Kadikoy",
    contentText:
      "Big news! Our 12th location opens in Kadikoy next week. First 50 customers get a free cold brew on us. See you there! #urbanbrew #kadikoy #istanbul #coffee",
    status: PostStatus.SCHEDULED,
    scheduledAt: daysFromNow(6),
    targets: [
      {
        socialAccountId: accUrbanBrewFB!.id,
        status: PostTargetStatus.PENDING,
      },
      {
        socialAccountId: accUrbanBrewIG!.id,
        status: PostTargetStatus.PENDING,
      },
    ],
  });

  const post10 = await createPost({
    clientId: clientFinexo!.id,
    title: "Money Transfer Fee Update",
    contentText:
      "Starting July 1st, domestic transfers under 10,000 TL are completely free on Finexo. No hidden fees, no surprises. Download the app to learn more. #fintech #finexo #moneytransfer",
    status: PostStatus.SCHEDULED,
    scheduledAt: daysFromNow(9),
    targets: [
      {
        socialAccountId: accFinexoLI!.id,
        status: PostTargetStatus.PENDING,
      },
    ],
  });

  const post11 = await createPost({
    clientId: clientCelik!.id,
    title: "CSR — Tree Planting Initiative",
    contentText:
      "As part of our sustainability commitment, Celik Group planted 5,000 saplings across three regions this spring. Small steps, big impact. #sustainability #csr #celikgroup",
    status: PostStatus.SCHEDULED,
    scheduledAt: daysFromNow(2),
    targets: [
      {
        socialAccountId: accCelikFB!.id,
        status: PostTargetStatus.PENDING,
      },
    ],
  });

  // --- FAILED posts ---
  const post12 = await createPost({
    clientId: clientBrightleaf!.id,
    title: "Influencer Collab Announcement",
    contentText:
      "We are thrilled to announce our first influencer collaboration! Full reveal this Friday. #brightleaf #collab #influencer",
    status: PostStatus.FAILED,
    scheduledAt: daysAgo(2),
    targets: [
      {
        socialAccountId: accBrightleafTT!.id,
        status: PostTargetStatus.FAILED,
      },
    ],
  });

  const post13 = await createPost({
    clientId: clientUrbanBrew!.id,
    title: "Valentine's Day Special",
    contentText:
      "Love is in the air — and so is the smell of fresh coffee. Share a cup with someone special this Valentine's Day. #valentines #urbanbrew #coffee",
    status: PostStatus.FAILED,
    scheduledAt: daysAgo(45),
    targets: [
      {
        socialAccountId: accUrbanBrewFB!.id,
        status: PostTargetStatus.FAILED,
      },
    ],
  });

  // --- DRAFT posts ---
  const post14 = await createPost({
    clientId: clientFinexo!.id,
    title: "Savings Account Launch",
    contentText:
      "Coming soon: Finexo Savings — earn up to 4.5% annual yield with daily compounding. Zero lock-in period. More details soon.",
    status: PostStatus.DRAFT,
  });

  const post15 = await createPost({
    clientId: clientNova!.id,
    title: "Behind the Scenes — Brand Shoot",
    contentText:
      "A peek behind the lens. Our team spent 3 days shooting the new brand campaign for a major client. Raw creativity, hard work, amazing results. #behindthescenes #branding #creative",
    status: PostStatus.DRAFT,
    aiGenerated: true,
    aiPrompt:
      "Write an engaging Instagram caption for a behind-the-scenes brand photoshoot post",
  });

  const post16 = await createPost({
    clientId: clientAxiom!.id,
    title: "Customer Success Story — Series B Startup",
    contentText:
      "How a Series B startup cut their infrastructure costs by 60% using Axiom Cloud's autoscaling. Full case study on our blog. #casestudy #saas #cloudcomputing",
    status: PostStatus.DRAFT,
    aiGenerated: true,
    aiPrompt:
      "Write a LinkedIn post highlighting a SaaS customer success story focused on cost savings",
  });

  const post17 = await createPost({
    clientId: clientShopTurk!.id,
    title: "Platform Introduction",
    contentText:
      "ShopTurk — Turkey's fastest growing marketplace. Over 2 million products, same-day delivery in 15 cities. Shop smart, shop local. #shopturk #ecommerce #marketplace",
    status: PostStatus.DRAFT,
  });

  const post18 = await createPost({
    clientId: clientCelik!.id,
    title: "Q2 Financial Highlights",
    contentText:
      "Celik Group Q2 2026 highlights: Revenue up 22% YoY, expanded to two new markets, and our logistics division secured a landmark 5-year contract. Full report on our investor portal. #celikgroup #investor #quarterly",
    status: PostStatus.DRAFT,
  });

  console.log(
    `  Created 18 posts (6 published, 5 scheduled, 2 failed, 5 drafts).`
  );

  // Collect post references for use below (suppress unused variable warning)
  void post1;
  void post7;
  void post8;
  void post9;
  void post10;
  void post11;
  void post12;
  void post13;
  void post14;
  void post15;
  void post16;
  void post17;
  void post18;

  // -------------------------------------------------------------------------
  // 7. Analytics Snapshots (for published posts via their targets)
  // -------------------------------------------------------------------------
  console.log("Seeding analytics snapshots...");

  // Fetch the post targets that were created as PUBLISHED
  const publishedTargets = await prisma.postTarget.findMany({
    where: {
      post: { agencyId },
      status: PostTargetStatus.PUBLISHED,
    },
    include: { socialAccount: true },
  });

  const snapshotData: Array<{
    socialAccountId: string;
    postTargetId: string;
    metricType: MetricType;
    value: bigint;
    periodStart: Date;
    periodEnd: Date;
  }> = [];

  const metricsPerTarget: Array<{
    metricType: MetricType;
    valueFn: () => bigint;
  }> = [
    {
      metricType: MetricType.IMPRESSIONS,
      valueFn: () =>
        BigInt(Math.floor(Math.random() * 12000) + 1500),
    },
    {
      metricType: MetricType.LIKES,
      valueFn: () =>
        BigInt(Math.floor(Math.random() * 600) + 40),
    },
    {
      metricType: MetricType.COMMENTS,
      valueFn: () =>
        BigInt(Math.floor(Math.random() * 80) + 5),
    },
    {
      metricType: MetricType.SHARES,
      valueFn: () =>
        BigInt(Math.floor(Math.random() * 120) + 3),
    },
    {
      metricType: MetricType.REACH,
      valueFn: () =>
        BigInt(Math.floor(Math.random() * 8000) + 800),
    },
    {
      metricType: MetricType.ENGAGEMENT,
      valueFn: () =>
        BigInt(Math.floor(Math.random() * 400) + 20),
    },
  ];

  for (const target of publishedTargets) {
    const periodStart = target.publishedAt ?? daysAgo(7);
    const periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const metric of metricsPerTarget) {
      snapshotData.push({
        socialAccountId: target.socialAccountId,
        postTargetId: target.id,
        metricType: metric.metricType,
        value: metric.valueFn(),
        periodStart,
        periodEnd,
      });
    }
  }

  // Also add follower snapshots per active social account (account-level, not post-level)
  const followerCounts: Record<string, number> = {
    [accBrightleafIG!.id]: 42800,
    [accBrightleafTT!.id]: 18300,
    [accAxiomLI!.id]: 12600,
    [accAxiomTW!.id]: 7400,
    [accUrbanBrewFB!.id]: 31200,
    [accUrbanBrewIG!.id]: 24500,
    [accFinexoLI!.id]: 5800,
    [accCelikFB!.id]: 15900,
  };

  for (const [socialAccountId, followers] of Object.entries(followerCounts)) {
    snapshotData.push({
      socialAccountId,
      postTargetId: "",
      metricType: MetricType.FOLLOWERS,
      value: BigInt(followers),
      periodStart: daysAgo(7),
      periodEnd: new Date(),
    });
  }

  // createMany does not support empty postTargetId; use null for account-level
  for (const snap of snapshotData) {
    await prisma.analyticsSnapshot.create({
      data: {
        socialAccountId: snap.socialAccountId,
        postTargetId: snap.postTargetId || null,
        metricType: snap.metricType,
        value: snap.value,
        periodStart: snap.periodStart,
        periodEnd: snap.periodEnd,
        rawData: {},
      },
    });
  }

  console.log(`  Created ${snapshotData.length} analytics snapshots.`);

  // -------------------------------------------------------------------------
  // 8. Analytics Reports
  // -------------------------------------------------------------------------
  console.log("Seeding analytics reports...");

  await prisma.analyticsReport.createMany({
    data: [
      {
        agencyId,
        clientId: clientBrightleaf!.id,
        title: "Brightleaf — May 2026 Monthly Report",
        dateRangeStart: new Date("2026-05-01"),
        dateRangeEnd: new Date("2026-05-31"),
        reportType: ReportType.MONTHLY,
        generatedData: {
          totalImpressions: 87400,
          totalEngagement: 6230,
          engagementRate: 7.13,
          topPost: "Summer Collection Launch",
          followersGrowth: 1240,
        },
      },
      {
        agencyId,
        clientId: clientAxiom!.id,
        title: "Axiom Cloud — Weekly Report W24",
        dateRangeStart: daysAgo(14),
        dateRangeEnd: daysAgo(7),
        reportType: ReportType.WEEKLY,
        generatedData: {
          totalImpressions: 22100,
          totalEngagement: 1890,
          engagementRate: 8.55,
          linkedinReach: 14300,
          twitterImpressions: 7800,
        },
      },
      {
        agencyId,
        clientId: clientUrbanBrew!.id,
        title: "Urban Brew — Q1 2026 Custom Report",
        dateRangeStart: new Date("2026-01-01"),
        dateRangeEnd: new Date("2026-03-31"),
        reportType: ReportType.CUSTOM,
        generatedData: {
          totalImpressions: 341000,
          totalEngagement: 28900,
          engagementRate: 8.48,
          newFollowers: 4700,
          topPlatform: "INSTAGRAM",
        },
      },
    ],
  });

  console.log("  Created 3 analytics reports.");

  // -------------------------------------------------------------------------
  // 9. Notifications (8 notifications)
  // -------------------------------------------------------------------------
  console.log("Seeding notifications...");

  await prisma.notification.createMany({
    data: [
      {
        agencyId,
        userId,
        type: NotificationType.POST_PUBLISHED,
        title: "Post published successfully",
        body: "\"Summer Collection Launch\" was published to Instagram.",
        data: { postId: post2.id, platform: "INSTAGRAM" },
        readAt: daysAgo(6),
        createdAt: daysAgo(7),
      },
      {
        agencyId,
        userId,
        type: NotificationType.POST_PUBLISHED,
        title: "Post published successfully",
        body: "\"Good Morning Campaign\" was published to Facebook and Instagram.",
        data: { postId: post5.id },
        readAt: daysAgo(2),
        createdAt: daysAgo(3),
      },
      {
        agencyId,
        userId,
        type: NotificationType.POST_FAILED,
        title: "Post failed to publish",
        body: "\"Influencer Collab Announcement\" failed on TikTok — token expired.",
        data: {
          postId: post12.id,
          platform: "TIKTOK",
          error: "access_token_expired",
        },
        readAt: null,
        createdAt: daysAgo(2),
      },
      {
        agencyId,
        userId,
        type: NotificationType.ACCOUNT_DISCONNECT,
        title: "Social account disconnected",
        body: "Nova Creative Studio's YouTube account has been disconnected — token invalid.",
        data: { platform: "YOUTUBE", clientName: "Nova Creative Studio" },
        readAt: daysAgo(11),
        createdAt: daysAgo(12),
      },
      {
        agencyId,
        userId,
        type: NotificationType.LIMIT_WARNING,
        title: "Plan limit warning",
        body: "You have used 80% of your monthly scheduled post quota. Consider upgrading.",
        data: { metric: "POSTS_PUBLISHED", used: 24, limit: 30 },
        readAt: null,
        createdAt: daysAgo(1),
      },
      {
        agencyId,
        userId,
        type: NotificationType.LIMIT_WARNING,
        title: "Token expiring soon",
        body: "Finexo's LinkedIn access token expires in 5 days. Reconnect to avoid disruption.",
        data: { platform: "LINKEDIN", clientName: "Finexo Fintech", daysLeft: 5 },
        readAt: null,
        createdAt: hoursFromNow(-8),
      },
      {
        agencyId,
        userId,
        type: NotificationType.REPORT_READY,
        title: "Report ready",
        body: "Axiom Cloud Weekly Report W24 has been generated and is ready to download.",
        data: { reportTitle: "Axiom Cloud — Weekly Report W24" },
        readAt: daysAgo(6),
        createdAt: daysAgo(7),
      },
      {
        agencyId,
        userId,
        type: NotificationType.PAYMENT_SUCCESS,
        title: "Payment successful",
        body: "Your Pro Plan monthly subscription was renewed successfully. Next billing: April 22, 2026.",
        data: { amountCents: 9900, currency: "usd", plan: "pro" },
        readAt: daysAgo(20),
        createdAt: daysAgo(22),
      },
    ],
  });

  console.log("  Created 8 notifications (3 unread).");

  // -------------------------------------------------------------------------
  // 10. AI Generations (5 records)
  // -------------------------------------------------------------------------
  console.log("Seeding AI generation records...");

  await prisma.aiGeneration.createMany({
    data: [
      {
        agencyId,
        userId,
        prompt:
          "Write a professional LinkedIn post announcing Q1 product milestones for a cloud SaaS company",
        result: {
          content:
            "Excited to share our Q1 2026 product update! We shipped 14 new features, improved API latency by 38%, and hit 99.97% uptime. Read the full changelog on our blog. #b2bsaas #productupdate #axiomcloud",
          platform: "LINKEDIN",
          characterCount: 218,
        },
        model: AiModel.CLAUDE,
        tokensUsed: 340,
        costCents: 1,
        status: AiGenerationStatus.COMPLETED,
        createdAt: daysAgo(11),
      },
      {
        agencyId,
        userId,
        prompt:
          "Write a Twitter thread teaser for a technical webinar about API scalability",
        result: {
          content:
            "Join us next Tuesday for a live webinar: \"Scaling to 1M API requests/day without losing sleep.\" Our CTO walks through real architecture decisions. Free to attend — register at axiomcloud.io/webinar. #webinar #saas #engineering",
          platform: "TWITTER",
          characterCount: 236,
        },
        model: AiModel.CLAUDE,
        tokensUsed: 420,
        costCents: 1,
        status: AiGenerationStatus.COMPLETED,
        createdAt: daysAgo(4),
      },
      {
        agencyId,
        userId,
        prompt:
          "Write an engaging Instagram caption for a behind-the-scenes brand photoshoot post",
        result: {
          content:
            "A peek behind the lens. Our team spent 3 days shooting the new brand campaign for a major client. Raw creativity, hard work, amazing results. #behindthescenes #branding #creative",
          platform: "INSTAGRAM",
          characterCount: 182,
        },
        model: AiModel.CLAUDE,
        tokensUsed: 290,
        costCents: 1,
        status: AiGenerationStatus.COMPLETED,
        createdAt: daysAgo(8),
      },
      {
        agencyId,
        userId,
        prompt:
          "Write a LinkedIn post highlighting a SaaS customer success story focused on cost savings",
        result: {
          content:
            "How a Series B startup cut their infrastructure costs by 60% using Axiom Cloud's autoscaling. Full case study on our blog. #casestudy #saas #cloudcomputing",
          platform: "LINKEDIN",
          characterCount: 162,
        },
        model: AiModel.OPENAI,
        tokensUsed: 380,
        costCents: 2,
        status: AiGenerationStatus.COMPLETED,
        createdAt: daysAgo(3),
      },
      {
        agencyId,
        userId,
        prompt:
          "Generate 5 content ideas for an e-commerce fashion brand targeting 18-35 year olds on TikTok",
        result: null,
        model: AiModel.CLAUDE,
        tokensUsed: 0,
        costCents: 0,
        status: AiGenerationStatus.FAILED,
        createdAt: daysAgo(1),
      },
    ],
  });

  console.log("  Created 5 AI generation records.");

  // -------------------------------------------------------------------------
  // 11. Usage Records
  // -------------------------------------------------------------------------
  console.log("Seeding usage records...");

  const periodStart = new Date("2026-03-01");
  const periodEnd = new Date("2026-03-31");

  await prisma.usageRecord.createMany({
    data: [
      {
        agencyId,
        metric: "POSTS_PUBLISHED",
        value: BigInt(24),
        periodStart,
        periodEnd,
      },
      {
        agencyId,
        metric: "AI_GENERATIONS",
        value: BigInt(47),
        periodStart,
        periodEnd,
      },
      {
        agencyId,
        metric: "STORAGE_BYTES",
        value: BigInt(682 * 1024 * 1024), // 682 MB
        periodStart,
        periodEnd,
      },
      {
        agencyId,
        metric: "SOCIAL_ACCOUNTS",
        value: BigInt(socialAccounts.filter((a) => a.isActive).length),
        periodStart,
        periodEnd,
      },
      {
        agencyId,
        metric: "CLIENTS",
        value: BigInt(clients.length),
        periodStart,
        periodEnd,
      },
      {
        agencyId,
        metric: "TEAM_MEMBERS",
        value: BigInt(1),
        periodStart,
        periodEnd,
      },
    ],
  });

  console.log("  Created 6 usage records for March 2026.");

  // -------------------------------------------------------------------------
  // 12. Audit Logs (sample activity trail)
  // -------------------------------------------------------------------------
  console.log("Seeding audit logs...");

  await prisma.auditLog.createMany({
    data: [
      {
        agencyId,
        userId,
        action: "client.created",
        entityType: "Client",
        entityId: clientBrightleaf!.id,
        changes: { name: "Nora Kaya", company: "Brightleaf E-Commerce" },
        ipAddress: "192.168.1.10",
        createdAt: daysAgo(30),
      },
      {
        agencyId,
        userId,
        action: "social_account.connected",
        entityType: "SocialAccount",
        entityId: accBrightleafIG!.id,
        changes: { platform: "INSTAGRAM", username: "brightleaf_official" },
        ipAddress: "192.168.1.10",
        createdAt: daysAgo(28),
      },
      {
        agencyId,
        userId,
        action: "post.published",
        entityType: "Post",
        entityId: post3.id,
        changes: { status: { from: "SCHEDULED", to: "PUBLISHED" } },
        ipAddress: null,
        createdAt: daysAgo(10),
      },
      {
        agencyId,
        userId,
        action: "social_account.disconnected",
        entityType: "SocialAccount",
        entityId: _accNovaYT.id,
        changes: { reason: "token_invalid", platform: "YOUTUBE" },
        ipAddress: null,
        createdAt: daysAgo(12),
      },
      {
        agencyId,
        userId,
        action: "client.updated",
        entityType: "Client",
        entityId: clientShopTurk!.id,
        changes: {
          notes: {
            from: null,
            to: "New client — onboarding in progress. Evaluate platforms first.",
          },
        },
        ipAddress: "192.168.1.42",
        createdAt: daysAgo(2),
      },
    ],
  });

  console.log("  Created 5 audit log entries.");

  // -------------------------------------------------------------------------
  // Done
  // -------------------------------------------------------------------------
  console.log("\nSeed complete.");
  console.log(`  Agency   : ${agency.name} (${agencyId})`);
  console.log(`  Clients  : ${clients.length}`);
  console.log(`  Groups   : 3`);
  console.log(`  Accounts : ${socialAccounts.length}`);
  console.log(`  Posts    : 18`);
  console.log(`  Snapshots: ${snapshotData.length}`);
  console.log(`  Notifs   : 8`);
  console.log(`  AI gens  : 5`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

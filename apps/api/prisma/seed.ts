import { PrismaClient, PlanType, SubscriptionStatus, CampaignStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding database...");

    // Create admin user
    const passwordHash = await bcrypt.hash("Admin123!", 10);

    const adminUser = await prisma.user.upsert({
        where: { email: "admin@marketor.dev" },
        update: {},
        create: {
            email: "admin@marketor.dev",
            name: "Admin User",
            passwordHash,
            authProvider: "local",
        },
    });

    console.log(`✅ Created admin user: ${adminUser.email}`);

    // Create default tenant
    const tenant = await prisma.tenant.upsert({
        where: { slug: "marketor-demo" },
        update: {},
        create: {
            name: "Marketor Demo",
            slug: "marketor-demo",
        },
    });

    console.log(`✅ Created tenant: ${tenant.name}`);

    // Assign admin role to user
    await prisma.userTenantRole.upsert({
        where: {
            userId_tenantId: {
                userId: adminUser.id,
                tenantId: tenant.id,
            },
        },
        update: { role: "ADMIN" },
        create: {
            userId: adminUser.id,
            tenantId: tenant.id,
            role: "ADMIN",
        },
    });

    console.log(`✅ Assigned ADMIN role to ${adminUser.email} in ${tenant.name}`);

    // Create subscription for tenant (FREE plan)
    await prisma.subscription.upsert({
        where: { tenantId: tenant.id },
        update: {},
        create: {
            tenantId: tenant.id,
            stripeCustomerId: `cus_demo_${tenant.id.slice(0, 8)}`,
            plan: PlanType.FREE,
            status: SubscriptionStatus.ACTIVE,
            maxUsers: 2,
            maxPosts: 30,
            maxStorage: 500,
            maxPlatforms: 3,
        },
    });

    console.log(`✅ Created FREE subscription for ${tenant.name}`);

    // Create plan definitions (prices in cents)
    const plans = [
        {
            plan: PlanType.FREE,
            name: "Free",
            description: "Get started with basic features",
            priceMonthly: 0,
            priceYearly: 0,
            maxUsers: 2,
            maxPosts: 30,
            maxStorage: 500,
            maxPlatforms: 3,
            features: ["3 social platforms", "30 posts/month", "Basic analytics", "2 team members"],
        },
        {
            plan: PlanType.STARTER,
            name: "Starter",
            description: "For growing creators",
            priceMonthly: 2900, // $29
            priceYearly: 29000, // $290
            maxUsers: 5,
            maxPosts: 100,
            maxStorage: 2000,
            maxPlatforms: 5,
            features: ["5 social platforms", "100 posts/month", "Advanced analytics", "5 team members", "AI content suggestions"],
        },
        {
            plan: PlanType.PROFESSIONAL,
            name: "Professional",
            description: "For serious marketers",
            priceMonthly: 7900, // $79
            priceYearly: 79000, // $790
            maxUsers: 15,
            maxPosts: 500,
            maxStorage: 10000,
            maxPlatforms: 10,
            features: ["10 social platforms", "500 posts/month", "Custom analytics", "15 team members", "AI content generation", "Priority support"],
        },
        {
            plan: PlanType.AGENCY,
            name: "Agency",
            description: "For agencies and teams",
            priceMonthly: 19900, // $199
            priceYearly: 199000, // $1990
            maxUsers: 50,
            maxPosts: 2000,
            maxStorage: 50000,
            maxPlatforms: 25,
            features: ["25 social platforms", "2000 posts/month", "White-label reports", "50 team members", "Unlimited AI", "Dedicated support"],
        },
    ];

    for (const planData of plans) {
        await prisma.planDefinition.upsert({
            where: { plan: planData.plan },
            update: planData,
            create: planData,
        });
    }

    console.log(`✅ Created ${plans.length} plan definitions`);

    // Create a sample brand profile
    const existingBrand = await prisma.brandProfile.findFirst({
        where: { tenantId: tenant.id, name: "Marketor Brand" },
    });

    if (!existingBrand) {
        await prisma.brandProfile.create({
            data: {
                tenantId: tenant.id,
                name: "Marketor Brand",
                voice: {
                    tone: "professional yet approachable",
                    style: "informative and engaging",
                    keywords: ["growth", "marketing", "social media", "content"],
                },
                audiences: [
                    { name: "Small Business Owners", demographics: "25-55, entrepreneurs" },
                    { name: "Marketing Managers", demographics: "28-45, B2B focus" },
                ],
                valueProps: [
                    "AI-powered content creation",
                    "Multi-platform scheduling",
                    "Team collaboration",
                ],
                visualStyle: {
                    primaryColor: "#6366f1",
                    secondaryColor: "#8b5cf6",
                    fontFamily: "Inter",
                },
            },
        });
        console.log(`✅ Created brand profile for ${tenant.name}`);
    } else {
        console.log(`✅ Brand profile already exists for ${tenant.name}`);
    }

    // Create a sample campaign
    const existingCampaign = await prisma.campaign.findFirst({
        where: { tenantId: tenant.id, name: "Q1 Product Launch" },
    });

    if (!existingCampaign) {
        await prisma.campaign.create({
            data: {
                tenantId: tenant.id,
                name: "Q1 Product Launch",
                status: CampaignStatus.ACTIVE,
            },
        });
        console.log(`✅ Created sample campaign: Q1 Product Launch`);
    } else {
        console.log(`✅ Campaign already exists: Q1 Product Launch`);
    }

    console.log("\n🎉 Seeding complete!");
    console.log("\n📧 Login credentials:");
    console.log("   Email: admin@marketor.dev");
    console.log("   Password: Admin123!");
}

main()
    .catch((e) => {
        console.error("❌ Seeding failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

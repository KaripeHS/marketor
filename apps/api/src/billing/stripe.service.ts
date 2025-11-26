import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PlanType, SubscriptionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import Stripe from "stripe";

export interface CreateCustomerParams {
    tenantId: string;
    email: string;
    name: string;
    metadata?: Record<string, string>;
}

export interface CreateSubscriptionParams {
    tenantId: string;
    priceId: string;
    trialDays?: number;
}

export interface CheckoutSessionParams {
    tenantId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    trialDays?: number;
}

export interface PortalSessionParams {
    tenantId: string;
    returnUrl: string;
}

@Injectable()
export class StripeService {
    private readonly logger = new Logger(StripeService.name);
    private readonly stripe: Stripe | null;
    private readonly enabled: boolean;
    private readonly webhookSecret: string | undefined;

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService
    ) {
        const apiKey = this.config.get<string>("STRIPE_SECRET_KEY");
        this.webhookSecret = this.config.get<string>("STRIPE_WEBHOOK_SECRET");
        this.enabled = !!apiKey;

        if (this.enabled) {
            this.stripe = new Stripe(apiKey!);
            this.logger.log("Stripe service initialized");
        } else {
            this.stripe = null;
            this.logger.warn("Stripe service disabled: STRIPE_SECRET_KEY not configured");
        }
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    async createCustomer(params: CreateCustomerParams): Promise<string> {
        if (!this.stripe) {
            // Mock mode - generate fake customer ID
            const customerId = `cus_mock_${Date.now()}`;
            await this.prisma.subscription.create({
                data: {
                    tenantId: params.tenantId,
                    stripeCustomerId: customerId,
                    plan: PlanType.FREE,
                    status: SubscriptionStatus.ACTIVE,
                },
            });
            return customerId;
        }

        const customer = await this.stripe.customers.create({
            email: params.email,
            name: params.name,
            metadata: {
                tenantId: params.tenantId,
                ...params.metadata,
            },
        });

        // Create subscription record with FREE plan
        await this.prisma.subscription.create({
            data: {
                tenantId: params.tenantId,
                stripeCustomerId: customer.id,
                plan: PlanType.FREE,
                status: SubscriptionStatus.ACTIVE,
            },
        });

        this.logger.debug(`Created Stripe customer ${customer.id} for tenant ${params.tenantId}`);
        return customer.id;
    }

    async createCheckoutSession(params: CheckoutSessionParams): Promise<{ url: string; sessionId: string }> {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId: params.tenantId },
        });

        if (!subscription) {
            throw new BadRequestException("No subscription found for tenant");
        }

        if (!this.stripe) {
            // Mock mode
            return {
                url: `${params.successUrl}?session_id=mock_session_${Date.now()}`,
                sessionId: `mock_session_${Date.now()}`,
            };
        }

        const session = await this.stripe.checkout.sessions.create({
            customer: subscription.stripeCustomerId,
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [
                {
                    price: params.priceId,
                    quantity: 1,
                },
            ],
            success_url: params.successUrl,
            cancel_url: params.cancelUrl,
            subscription_data: params.trialDays
                ? { trial_period_days: params.trialDays }
                : undefined,
            metadata: {
                tenantId: params.tenantId,
            },
        });

        this.logger.debug(`Created checkout session ${session.id} for tenant ${params.tenantId}`);
        return { url: session.url!, sessionId: session.id };
    }

    async createPortalSession(params: PortalSessionParams): Promise<{ url: string }> {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId: params.tenantId },
        });

        if (!subscription) {
            throw new BadRequestException("No subscription found for tenant");
        }

        if (!this.stripe) {
            // Mock mode
            return { url: params.returnUrl };
        }

        const session = await this.stripe.billingPortal.sessions.create({
            customer: subscription.stripeCustomerId,
            return_url: params.returnUrl,
        });

        return { url: session.url };
    }

    async cancelSubscription(tenantId: string, cancelAtPeriodEnd: boolean = true): Promise<void> {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
        });

        if (!subscription || !subscription.stripeSubscriptionId) {
            throw new BadRequestException("No active subscription found");
        }

        if (this.stripe) {
            if (cancelAtPeriodEnd) {
                await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
                    cancel_at_period_end: true,
                });
            } else {
                await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
            }
        }

        await this.prisma.subscription.update({
            where: { tenantId },
            data: {
                cancelAtPeriodEnd,
                canceledAt: cancelAtPeriodEnd ? null : new Date(),
                status: cancelAtPeriodEnd ? subscription.status : SubscriptionStatus.CANCELED,
            },
        });

        this.logger.debug(`Canceled subscription for tenant ${tenantId}`);
    }

    async resumeSubscription(tenantId: string): Promise<void> {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
        });

        if (!subscription || !subscription.stripeSubscriptionId) {
            throw new BadRequestException("No subscription found");
        }

        if (!subscription.cancelAtPeriodEnd) {
            throw new BadRequestException("Subscription is not scheduled for cancellation");
        }

        if (this.stripe) {
            await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
                cancel_at_period_end: false,
            });
        }

        await this.prisma.subscription.update({
            where: { tenantId },
            data: {
                cancelAtPeriodEnd: false,
                canceledAt: null,
            },
        });

        this.logger.debug(`Resumed subscription for tenant ${tenantId}`);
    }

    async getSubscription(tenantId: string) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
            include: {
                usageRecords: {
                    where: {
                        periodEnd: { gte: new Date() },
                    },
                    orderBy: { periodStart: "desc" },
                },
            },
        });

        if (!subscription) {
            return null;
        }

        // Get plan definition
        const planDef = await this.prisma.planDefinition.findUnique({
            where: { plan: subscription.plan },
        });

        return {
            ...subscription,
            planDefinition: planDef,
            limits: {
                maxUsers: subscription.maxUsers ?? planDef?.maxUsers ?? 1,
                maxPosts: subscription.maxPosts ?? planDef?.maxPosts ?? 10,
                maxStorage: subscription.maxStorage ?? planDef?.maxStorage ?? 100,
                maxPlatforms: subscription.maxPlatforms ?? planDef?.maxPlatforms ?? 1,
            },
        };
    }

    async getInvoices(tenantId: string, limit: number = 10) {
        return this.prisma.invoice.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
    }

    // Webhook handling
    constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event | null {
        if (!this.stripe || !this.webhookSecret) {
            this.logger.warn("Cannot verify webhook: Stripe not configured");
            return null;
        }

        try {
            return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
        } catch (err) {
            this.logger.error("Webhook signature verification failed:", err);
            return null;
        }
    }

    async handleWebhookEvent(event: Stripe.Event): Promise<void> {
        this.logger.debug(`Processing webhook event: ${event.type}`);

        switch (event.type) {
            case "checkout.session.completed":
                await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
                break;

            case "customer.subscription.created":
            case "customer.subscription.updated":
                await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
                break;

            case "customer.subscription.deleted":
                await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                break;

            case "invoice.paid":
                await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
                break;

            case "invoice.payment_failed":
                await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
                break;

            default:
                this.logger.debug(`Unhandled webhook event type: ${event.type}`);
        }
    }

    private async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
        const tenantId = session.metadata?.tenantId;
        if (!tenantId) {
            this.logger.warn("Checkout session missing tenantId metadata");
            return;
        }

        this.logger.debug(`Checkout complete for tenant ${tenantId}`);
        // Subscription will be updated via subscription.updated webhook
    }

    private async handleSubscriptionUpdate(stripeSubscription: Stripe.Subscription): Promise<void> {
        const subscription = await this.prisma.subscription.findUnique({
            where: { stripeCustomerId: stripeSubscription.customer as string },
        });

        if (!subscription) {
            this.logger.warn(`No subscription found for customer ${stripeSubscription.customer}`);
            return;
        }

        // Map Stripe status to our status
        const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
            trialing: SubscriptionStatus.TRIALING,
            active: SubscriptionStatus.ACTIVE,
            past_due: SubscriptionStatus.PAST_DUE,
            canceled: SubscriptionStatus.CANCELED,
            unpaid: SubscriptionStatus.UNPAID,
            incomplete: SubscriptionStatus.INCOMPLETE,
            incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
            paused: SubscriptionStatus.PAUSED,
        };

        // Determine plan from price
        const priceId = stripeSubscription.items.data[0]?.price.id;
        let plan = subscription.plan;

        if (priceId) {
            const planDef = await this.prisma.planDefinition.findUnique({
                where: { stripePriceId: priceId },
            });
            if (planDef) {
                plan = planDef.plan;
            }
        }

        // Access period timestamps - handle both old and new API shapes
        const periodStart = (stripeSubscription as unknown as Record<string, number>).current_period_start;
        const periodEnd = (stripeSubscription as unknown as Record<string, number>).current_period_end;
        const trialStartTs = (stripeSubscription as unknown as Record<string, number | null>).trial_start;
        const trialEndTs = (stripeSubscription as unknown as Record<string, number | null>).trial_end;

        await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                stripeSubscriptionId: stripeSubscription.id,
                stripePriceId: priceId,
                plan,
                status: statusMap[stripeSubscription.status],
                currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
                currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
                cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
                trialStart: trialStartTs ? new Date(trialStartTs * 1000) : null,
                trialEnd: trialEndTs ? new Date(trialEndTs * 1000) : null,
            },
        });

        this.logger.debug(`Updated subscription for tenant ${subscription.tenantId}: ${plan} (${stripeSubscription.status})`);
    }

    private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
        const subscription = await this.prisma.subscription.findUnique({
            where: { stripeSubscriptionId: stripeSubscription.id },
        });

        if (!subscription) {
            this.logger.warn(`No subscription found for Stripe subscription ${stripeSubscription.id}`);
            return;
        }

        await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                status: SubscriptionStatus.CANCELED,
                canceledAt: new Date(),
                plan: PlanType.FREE, // Downgrade to free
            },
        });

        this.logger.debug(`Subscription deleted for tenant ${subscription.tenantId}`);
    }

    private async handleInvoicePaid(stripeInvoice: Stripe.Invoice): Promise<void> {
        const subscription = await this.prisma.subscription.findUnique({
            where: { stripeCustomerId: stripeInvoice.customer as string },
        });

        if (!subscription) return;

        // Extract payment_intent safely
        const paymentIntent = (stripeInvoice as unknown as Record<string, unknown>).payment_intent as string | null;

        await this.prisma.invoice.upsert({
            where: { stripeInvoiceId: stripeInvoice.id },
            create: {
                subscriptionId: subscription.id,
                tenantId: subscription.tenantId,
                stripeInvoiceId: stripeInvoice.id,
                stripePaymentIntentId: paymentIntent,
                amountDue: stripeInvoice.amount_due,
                amountPaid: stripeInvoice.amount_paid,
                currency: stripeInvoice.currency,
                status: "PAID",
                paidAt: new Date(),
                invoicePdf: stripeInvoice.invoice_pdf || undefined,
                hostedInvoiceUrl: stripeInvoice.hosted_invoice_url || undefined,
            },
            update: {
                amountPaid: stripeInvoice.amount_paid,
                status: "PAID",
                paidAt: new Date(),
                invoicePdf: stripeInvoice.invoice_pdf || undefined,
                hostedInvoiceUrl: stripeInvoice.hosted_invoice_url || undefined,
            },
        });

        this.logger.debug(`Invoice paid for tenant ${subscription.tenantId}: ${stripeInvoice.id}`);
    }

    private async handleInvoicePaymentFailed(stripeInvoice: Stripe.Invoice): Promise<void> {
        const subscription = await this.prisma.subscription.findUnique({
            where: { stripeCustomerId: stripeInvoice.customer as string },
        });

        if (!subscription) return;

        // Extract payment_intent safely
        const paymentIntentFailed = (stripeInvoice as unknown as Record<string, unknown>).payment_intent as string | null;

        await this.prisma.invoice.upsert({
            where: { stripeInvoiceId: stripeInvoice.id },
            create: {
                subscriptionId: subscription.id,
                tenantId: subscription.tenantId,
                stripeInvoiceId: stripeInvoice.id,
                stripePaymentIntentId: paymentIntentFailed,
                amountDue: stripeInvoice.amount_due,
                currency: stripeInvoice.currency,
                status: "OPEN",
                dueDate: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000) : null,
            },
            update: {
                status: "OPEN",
            },
        });

        // Update subscription status
        await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: SubscriptionStatus.PAST_DUE },
        });

        this.logger.debug(`Invoice payment failed for tenant ${subscription.tenantId}: ${stripeInvoice.id}`);
    }

    // Plan management
    async getPlans() {
        return this.prisma.planDefinition.findMany({
            where: { isActive: true, isPublic: true },
            orderBy: { priceMonthly: "asc" },
        });
    }

    async seedPlans(): Promise<void> {
        const plans = [
            {
                plan: PlanType.FREE,
                name: "Free",
                description: "Get started with basic features",
                priceMonthly: 0,
                priceYearly: 0,
                maxUsers: 1,
                maxPosts: 10,
                maxStorage: 100,
                maxPlatforms: 1,
                features: ["1 social account", "10 posts/month", "Basic analytics"],
            },
            {
                plan: PlanType.STARTER,
                name: "Starter",
                description: "Perfect for individual creators",
                priceMonthly: 1900, // $19
                priceYearly: 19000, // $190 (save 2 months)
                maxUsers: 2,
                maxPosts: 50,
                maxStorage: 500,
                maxPlatforms: 3,
                features: ["3 social accounts", "50 posts/month", "Advanced analytics", "AI content suggestions", "Email support"],
            },
            {
                plan: PlanType.PROFESSIONAL,
                name: "Professional",
                description: "For growing businesses",
                priceMonthly: 4900, // $49
                priceYearly: 49000, // $490
                maxUsers: 5,
                maxPosts: 200,
                maxStorage: 2000,
                maxPlatforms: 5,
                features: ["5 social accounts", "200 posts/month", "Full analytics", "AI content generation", "Priority support", "Team collaboration"],
            },
            {
                plan: PlanType.AGENCY,
                name: "Agency",
                description: "For agencies and teams",
                priceMonthly: 9900, // $99
                priceYearly: 99000, // $990
                maxUsers: 20,
                maxPosts: 1000,
                maxStorage: 10000,
                maxPlatforms: 10,
                features: ["Unlimited social accounts", "1000 posts/month", "White-label reports", "Client management", "API access", "Dedicated support"],
            },
            {
                plan: PlanType.ENTERPRISE,
                name: "Enterprise",
                description: "Custom solutions for large organizations",
                priceMonthly: 0, // Custom pricing
                priceYearly: 0,
                maxUsers: 100,
                maxPosts: 10000,
                maxStorage: 100000,
                maxPlatforms: 50,
                features: ["Unlimited everything", "Custom integrations", "SLA guarantee", "Dedicated account manager", "Custom training", "On-premise option"],
                isPublic: false,
            },
        ];

        for (const plan of plans) {
            await this.prisma.planDefinition.upsert({
                where: { plan: plan.plan },
                create: plan,
                update: {
                    name: plan.name,
                    description: plan.description,
                    priceMonthly: plan.priceMonthly,
                    priceYearly: plan.priceYearly,
                    maxUsers: plan.maxUsers,
                    maxPosts: plan.maxPosts,
                    maxStorage: plan.maxStorage,
                    maxPlatforms: plan.maxPlatforms,
                    features: plan.features,
                },
            });
        }

        this.logger.log("Seeded plan definitions");
    }
}

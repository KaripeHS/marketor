import { Body, Controller, Get, Post, Query, RawBodyRequest, Req, Res } from "@nestjs/common";
import { IsOptional, IsString, IsNumber, Min } from "class-validator";
import { Request, Response } from "express";
import { Auth } from "../auth/auth.decorator";
import { AuthContext } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { StripeService } from "./stripe.service";
import { UsageService } from "./usage.service";

class CreateCheckoutDto {
    @IsString()
    priceId!: string;

    @IsString()
    successUrl!: string;

    @IsString()
    cancelUrl!: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    trialDays?: number;
}

class CreatePortalDto {
    @IsString()
    returnUrl!: string;
}

@Controller("billing")
export class BillingController {
    constructor(
        private readonly stripe: StripeService,
        private readonly usage: UsageService
    ) {}

    // Get current subscription
    @Get("subscription")
    async getSubscription(@Auth() auth: AuthContext) {
        return this.stripe.getSubscription(auth.tenantId);
    }

    // Get available plans
    @Get("plans")
    async getPlans() {
        return this.stripe.getPlans();
    }

    // Create checkout session
    @Post("checkout")
    @Roles("ADMIN")
    async createCheckout(
        @Body() dto: CreateCheckoutDto,
        @Auth() auth: AuthContext
    ) {
        return this.stripe.createCheckoutSession({
            tenantId: auth.tenantId,
            priceId: dto.priceId,
            successUrl: dto.successUrl,
            cancelUrl: dto.cancelUrl,
            trialDays: dto.trialDays,
        });
    }

    // Create billing portal session
    @Post("portal")
    @Roles("ADMIN")
    async createPortal(
        @Body() dto: CreatePortalDto,
        @Auth() auth: AuthContext
    ) {
        return this.stripe.createPortalSession({
            tenantId: auth.tenantId,
            returnUrl: dto.returnUrl,
        });
    }

    // Cancel subscription
    @Post("cancel")
    @Roles("ADMIN")
    async cancelSubscription(
        @Query("immediate") immediate: string,
        @Auth() auth: AuthContext
    ) {
        await this.stripe.cancelSubscription(auth.tenantId, immediate !== "true");
        return { success: true };
    }

    // Resume subscription
    @Post("resume")
    @Roles("ADMIN")
    async resumeSubscription(@Auth() auth: AuthContext) {
        await this.stripe.resumeSubscription(auth.tenantId);
        return { success: true };
    }

    // Get invoices
    @Get("invoices")
    async getInvoices(
        @Query("limit") limit: string,
        @Auth() auth: AuthContext
    ) {
        return this.stripe.getInvoices(auth.tenantId, parseInt(limit) || 10);
    }

    // Get usage
    @Get("usage")
    async getUsage(@Auth() auth: AuthContext) {
        return this.usage.getCurrentUsage(auth.tenantId);
    }

    // Get usage history
    @Get("usage/history")
    async getUsageHistory(
        @Query("months") months: string,
        @Auth() auth: AuthContext
    ) {
        return this.usage.getUsageHistory(auth.tenantId, parseInt(months) || 6);
    }

    // Check entitlements
    @Get("entitlements")
    async getEntitlements(@Auth() auth: AuthContext) {
        return this.usage.getEntitlements(auth.tenantId);
    }

    // Stripe webhook (public, no auth)
    @Post("webhook")
    async handleWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Res() res: Response
    ) {
        const signature = req.headers["stripe-signature"] as string;

        if (!signature) {
            return res.status(400).json({ error: "Missing signature" });
        }

        const rawBody = req.rawBody;
        if (!rawBody) {
            return res.status(400).json({ error: "Missing body" });
        }

        const event = this.stripe.constructWebhookEvent(rawBody, signature);
        if (!event) {
            return res.status(400).json({ error: "Invalid webhook" });
        }

        try {
            await this.stripe.handleWebhookEvent(event);
            return res.json({ received: true });
        } catch (error) {
            console.error("Webhook error:", error);
            return res.status(500).json({ error: "Webhook handler failed" });
        }
    }

    // Admin: Seed default plans
    @Post("admin/seed-plans")
    @Roles("ADMIN")
    async seedPlans() {
        await this.stripe.seedPlans();
        return { success: true };
    }
}

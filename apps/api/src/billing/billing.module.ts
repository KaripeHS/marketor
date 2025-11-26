import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BillingController } from "./billing.controller";
import { StripeService } from "./stripe.service";
import { UsageService } from "./usage.service";
import { EntitlementsGuard } from "./entitlements.guard";

@Module({
    imports: [ConfigModule],
    controllers: [BillingController],
    providers: [
        StripeService,
        UsageService,
        EntitlementsGuard,
    ],
    exports: [
        StripeService,
        UsageService,
        EntitlementsGuard,
    ],
})
export class BillingModule {}

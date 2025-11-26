import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UsageType } from "@prisma/client";
import { UsageService } from "./usage.service";

export const ENTITLEMENT_KEY = "entitlement";
export const RequireEntitlement = (type: UsageType) => SetMetadata(ENTITLEMENT_KEY, type);

@Injectable()
export class EntitlementsGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly usage: UsageService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredEntitlement = this.reflector.getAllAndOverride<UsageType>(
            ENTITLEMENT_KEY,
            [context.getHandler(), context.getClass()]
        );

        if (!requiredEntitlement) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const tenantId = request.auth?.tenantId;

        if (!tenantId) {
            throw new ForbiddenException("Tenant context required");
        }

        const check = await this.usage.checkLimit(tenantId, requiredEntitlement);

        if (!check.allowed) {
            const limitName = this.getLimitName(requiredEntitlement);
            throw new ForbiddenException(
                `You have reached your ${limitName} limit (${check.current}/${check.limit}). ` +
                "Please upgrade your plan to continue."
            );
        }

        return true;
    }

    private getLimitName(type: UsageType): string {
        switch (type) {
            case UsageType.POSTS_PUBLISHED:
                return "monthly posts";
            case UsageType.TEAM_MEMBERS:
                return "team members";
            case UsageType.PLATFORMS_CONNECTED:
                return "connected platforms";
            case UsageType.STORAGE_MB:
                return "storage";
            case UsageType.AI_GENERATIONS:
                return "AI generations";
            default:
                return "usage";
        }
    }
}

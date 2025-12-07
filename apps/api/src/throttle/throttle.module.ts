import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";

@Module({
    imports: [
        ThrottlerModule.forRoot([
            {
                // Default rate limit: 100 requests per minute
                name: "short",
                ttl: 60000, // 1 minute
                limit: 100,
            },
            {
                // Long-term rate limit: 1000 requests per hour
                name: "long",
                ttl: 3600000, // 1 hour
                limit: 1000,
            },
        ]),
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
    exports: [ThrottlerModule],
})
export class ThrottleModule {}

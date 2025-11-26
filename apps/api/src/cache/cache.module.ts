import { Module, Global } from "@nestjs/common";
import { CacheModule as NestCacheModule } from "@nestjs/cache-manager";
import { redisStore } from "cache-manager-ioredis-yet";
import { CacheService } from "./cache.service";

@Global()
@Module({
    imports: [
        NestCacheModule.registerAsync({
            useFactory: async () => {
                const redisUrl = process.env.REDIS_URL;

                if (redisUrl) {
                    return {
                        store: await redisStore({
                            url: redisUrl,
                            ttl: 60 * 1000, // Default 60 seconds
                        }),
                    };
                }

                // Fallback to in-memory cache if Redis is not configured
                return {
                    ttl: 60 * 1000,
                    max: 1000, // Maximum number of items in cache
                };
            },
        }),
    ],
    providers: [CacheService],
    exports: [NestCacheModule, CacheService],
})
export class CacheModule {}

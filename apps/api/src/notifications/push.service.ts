import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

export interface PushNotificationOptions {
    to: string | string[]; // Expo push token(s)
    title: string;
    body: string;
    data?: Record<string, unknown>;
    badge?: number;
    sound?: "default" | null;
    categoryId?: string;
    priority?: "default" | "normal" | "high";
}

export interface PushResult {
    success: boolean;
    ticketId?: string;
    error?: string;
}

interface ExpoPushTicket {
    id?: string;
    status: "ok" | "error";
    message?: string;
    details?: {
        error?: string;
    };
}

interface ExpoPushResponse {
    data: ExpoPushTicket[];
}

export interface PushTokenRecord {
    id: string;
    userId: string;
    token: string;
    deviceType: string;
    deviceName: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

@Injectable()
export class PushService {
    private readonly logger = new Logger(PushService.name);
    private readonly expoPushUrl = "https://exp.host/--/api/v2/push/send";
    private readonly enabled: boolean;

    constructor(
        private readonly config: ConfigService,
        private readonly prisma: PrismaService
    ) {
        // Push is enabled by default (no API key needed for Expo)
        this.enabled = this.config.get<string>("PUSH_ENABLED") !== "false";

        if (!this.enabled) {
            this.logger.warn("Push notification service disabled via PUSH_ENABLED=false");
        }
    }

    async send(options: PushNotificationOptions): Promise<PushResult[]> {
        if (!this.enabled) {
            this.logger.debug(`Push not sent (disabled): ${options.title}`);
            return [{ success: true, ticketId: "mock-disabled" }];
        }

        const tokens = Array.isArray(options.to) ? options.to : [options.to];

        // Filter valid Expo push tokens
        const validTokens = tokens.filter((token) => this.isValidExpoPushToken(token));

        if (validTokens.length === 0) {
            this.logger.debug("No valid Expo push tokens to send to");
            return [{ success: false, error: "No valid push tokens" }];
        }

        const messages = validTokens.map((token) => ({
            to: token,
            title: options.title,
            body: options.body,
            data: options.data,
            badge: options.badge,
            sound: options.sound || "default",
            categoryId: options.categoryId,
            priority: options.priority || "high",
        }));

        try {
            const response = await fetch(this.expoPushUrl, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(messages),
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Expo Push API error: ${response.status} - ${errorText}`);
                return messages.map(() => ({ success: false, error: `API error: ${response.status}` }));
            }

            const data = await response.json() as ExpoPushResponse;
            const results: PushResult[] = [];

            for (let i = 0; i < data.data.length; i++) {
                const ticket = data.data[i];
                if (ticket.status === "ok" && ticket.id) {
                    results.push({ success: true, ticketId: ticket.id });
                    this.logger.debug(`Push sent: ${ticket.id}`);
                } else {
                    const error = ticket.details?.error || ticket.message || "Unknown error";
                    results.push({ success: false, error });
                    this.logger.error(`Push failed for token ${validTokens[i]}: ${error}`);

                    // If token is invalid, mark it as inactive
                    if (ticket.details?.error === "DeviceNotRegistered") {
                        await this.deactivateToken(validTokens[i]);
                    }
                }
            }

            return results;
        } catch (error) {
            this.logger.error("Failed to send push notification:", error);
            return messages.map(() => ({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            }));
        }
    }

    async sendToUser(
        userId: string,
        options: Omit<PushNotificationOptions, "to">
    ): Promise<PushResult[]> {
        const tokens = await this.getUserTokens(userId);

        if (tokens.length === 0) {
            this.logger.debug(`No push tokens found for user ${userId}`);
            return [{ success: false, error: "No push tokens registered" }];
        }

        return this.send({
            ...options,
            to: tokens.map((t) => t.token),
        });
    }

    async registerToken(
        userId: string,
        token: string,
        deviceType: string,
        deviceName?: string
    ): Promise<PushTokenRecord> {
        if (!this.isValidExpoPushToken(token)) {
            throw new Error("Invalid Expo push token format");
        }

        // Upsert the token (user might reinstall app with same token)
        const pushToken = await this.prisma.pushToken.upsert({
            where: {
                token,
            },
            create: {
                userId,
                token,
                deviceType,
                deviceName,
                isActive: true,
            },
            update: {
                userId, // Token might have been transferred to new user
                deviceType,
                deviceName,
                isActive: true,
                updatedAt: new Date(),
            },
        });

        this.logger.log(`Push token registered for user ${userId}: ${deviceType}`);
        return pushToken;
    }

    async unregisterToken(token: string): Promise<void> {
        await this.prisma.pushToken.updateMany({
            where: { token },
            data: { isActive: false },
        });
        this.logger.debug(`Push token unregistered: ${token.substring(0, 20)}...`);
    }

    async getUserTokens(userId: string): Promise<PushTokenRecord[]> {
        return this.prisma.pushToken.findMany({
            where: {
                userId,
                isActive: true,
            },
        });
    }

    async deactivateToken(token: string): Promise<void> {
        await this.prisma.pushToken.updateMany({
            where: { token },
            data: { isActive: false },
        });
        this.logger.warn(`Push token deactivated (device not registered): ${token.substring(0, 20)}...`);
    }

    async cleanupInactiveTokens(olderThanDays: number = 90): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const result = await this.prisma.pushToken.deleteMany({
            where: {
                isActive: false,
                updatedAt: { lt: cutoffDate },
            },
        });

        this.logger.log(`Cleaned up ${result.count} inactive push tokens`);
        return result.count;
    }

    private isValidExpoPushToken(token: string): boolean {
        // Expo push tokens start with ExponentPushToken[ or ExpoPushToken[
        return /^Expo(nent)?PushToken\[.+\]$/.test(token);
    }

    isEnabled(): boolean {
        return this.enabled;
    }
}

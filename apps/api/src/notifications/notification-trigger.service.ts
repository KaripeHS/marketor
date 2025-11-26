import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotificationChannel, NotificationType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "./email.service";
import { NotificationTemplatesService } from "./templates.service";

export interface NotificationRecipient {
    userId: string;
    email?: string;
    name?: string;
}

export interface TriggerNotificationOptions {
    type: NotificationType;
    recipients: NotificationRecipient[];
    tenantId?: string;
    variables: Record<string, unknown>;
    channels?: NotificationChannel[];
}

interface NotificationPrefs {
    emailEnabled: boolean;
    pushEnabled: boolean;
    inAppEnabled: boolean;
    [key: string]: boolean | number | string | null;
}

type TypePreferenceKey =
    | "approvalRequests"
    | "approvalDecisions"
    | "revisionRequests"
    | "comments"
    | "mentions"
    | "scheduleReminders"
    | "publishSuccess"
    | "publishFailure"
    | "tokenExpiry"
    | "weeklyDigest"
    | "analyticsAlerts";

@Injectable()
export class NotificationTriggerService {
    private readonly logger = new Logger(NotificationTriggerService.name);
    private readonly appUrl: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly email: EmailService,
        private readonly templates: NotificationTemplatesService,
        private readonly config: ConfigService
    ) {
        this.appUrl = this.config.get<string>("APP_URL") || "http://localhost:3000";
    }

    async trigger(options: TriggerNotificationOptions): Promise<void> {
        const { type, recipients, tenantId, variables } = options;
        const channels = options.channels || [NotificationChannel.IN_APP, NotificationChannel.EMAIL];

        // Add appUrl to variables
        const enrichedVariables = { ...variables, appUrl: this.appUrl };

        for (const recipient of recipients) {
            const prefs = await this.getPreferences(recipient.userId, tenantId);

            // Check if this notification type is enabled for the user
            if (!this.isTypeEnabled(type, prefs)) {
                this.logger.debug(`Notification ${type} disabled for user ${recipient.userId}`);
                continue;
            }

            // Check quiet hours
            if (this.isInQuietHours(prefs)) {
                this.logger.debug(`User ${recipient.userId} is in quiet hours, skipping push/email`);
                // Still send in-app, skip push/email
                if (channels.includes(NotificationChannel.IN_APP) && prefs.inAppEnabled) {
                    await this.sendInApp(type, recipient, tenantId, enrichedVariables);
                }
                continue;
            }

            // Send to each enabled channel
            for (const channel of channels) {
                if (!this.isChannelEnabled(channel, prefs)) continue;

                try {
                    switch (channel) {
                        case NotificationChannel.IN_APP:
                            await this.sendInApp(type, recipient, tenantId, enrichedVariables);
                            break;
                        case NotificationChannel.EMAIL:
                            if (recipient.email) {
                                await this.sendEmail(type, recipient, tenantId, enrichedVariables);
                            }
                            break;
                        case NotificationChannel.PUSH:
                            // Push notifications not implemented yet
                            this.logger.debug("Push notifications not yet implemented");
                            break;
                    }
                } catch (error) {
                    this.logger.error(`Failed to send ${channel} notification to ${recipient.userId}:`, error);
                }
            }
        }
    }

    private async sendInApp(
        type: NotificationType,
        recipient: NotificationRecipient,
        tenantId: string | undefined,
        variables: Record<string, unknown>
    ): Promise<void> {
        const rendered = await this.templates.renderTemplate(type, NotificationChannel.IN_APP, {
            ...variables,
            recipientName: recipient.name || "there",
        });

        if (!rendered) {
            this.logger.warn(`No IN_APP template for ${type}`);
            return;
        }

        await this.prisma.notification.create({
            data: {
                userId: recipient.userId,
                tenantId,
                type,
                channel: NotificationChannel.IN_APP,
                title: this.getTitleFromType(type),
                body: rendered.body,
                payload: variables as Prisma.InputJsonValue,
                sentAt: new Date(),
                deliveredAt: new Date(),
            },
        });

        this.logger.debug(`In-app notification sent to ${recipient.userId}: ${type}`);
    }

    private async sendEmail(
        type: NotificationType,
        recipient: NotificationRecipient,
        tenantId: string | undefined,
        variables: Record<string, unknown>
    ): Promise<void> {
        if (!recipient.email) return;

        const rendered = await this.templates.renderTemplate(type, NotificationChannel.EMAIL, {
            ...variables,
            recipientName: recipient.name || "there",
        });

        if (!rendered || !rendered.subject) {
            this.logger.warn(`No EMAIL template for ${type}`);
            return;
        }

        // Create notification record
        const notification = await this.prisma.notification.create({
            data: {
                userId: recipient.userId,
                tenantId,
                type,
                channel: NotificationChannel.EMAIL,
                title: rendered.subject,
                body: rendered.body,
                payload: variables as Prisma.InputJsonValue,
            },
        });

        // Send email
        const result = await this.email.send({
            to: recipient.email,
            subject: rendered.subject,
            html: this.wrapEmailHtml(rendered.body),
        });

        // Update notification status
        if (result.success) {
            await this.prisma.notification.update({
                where: { id: notification.id },
                data: { sentAt: new Date(), deliveredAt: new Date() },
            });
            this.logger.debug(`Email sent to ${recipient.email}: ${type}`);
        } else {
            await this.prisma.notification.update({
                where: { id: notification.id },
                data: { failedAt: new Date(), error: result.error },
            });
            this.logger.error(`Email failed for ${recipient.email}: ${result.error}`);
        }
    }

    private async getPreferences(userId: string, tenantId?: string): Promise<NotificationPrefs> {
        const prefs = await this.prisma.notificationPreference.findFirst({
            where: {
                userId,
                OR: [{ tenantId }, { tenantId: null }],
            },
            orderBy: { tenantId: "desc" }, // Prefer tenant-specific prefs
        });

        if (prefs) {
            return prefs as unknown as NotificationPrefs;
        }

        // Default preferences
        return {
            emailEnabled: true,
            pushEnabled: true,
            inAppEnabled: true,
            approvalRequests: true,
            approvalDecisions: true,
            revisionRequests: true,
            comments: true,
            mentions: true,
            scheduleReminders: true,
            publishSuccess: true,
            publishFailure: true,
            tokenExpiry: true,
            weeklyDigest: true,
            analyticsAlerts: true,
            quietHoursStart: null,
            quietHoursEnd: null,
            timezone: "UTC",
        };
    }

    private isChannelEnabled(channel: NotificationChannel, prefs: NotificationPrefs): boolean {
        switch (channel) {
            case NotificationChannel.IN_APP:
                return prefs.inAppEnabled;
            case NotificationChannel.EMAIL:
                return prefs.emailEnabled;
            case NotificationChannel.PUSH:
                return prefs.pushEnabled;
            default:
                return true;
        }
    }

    private isTypeEnabled(type: NotificationType, prefs: NotificationPrefs): boolean {
        const typePreferenceMap: Record<NotificationType, TypePreferenceKey | null> = {
            APPROVAL_REQUESTED: "approvalRequests",
            APPROVAL_APPROVED: "approvalDecisions",
            APPROVAL_REJECTED: "approvalDecisions",
            APPROVAL_CHANGES_REQUESTED: "approvalDecisions",
            REVISION_REQUESTED: "revisionRequests",
            REVISION_RESOLVED: "revisionRequests",
            COMMENT_ADDED: "comments",
            MENTION: "mentions",
            SCHEDULE_REMINDER: "scheduleReminders",
            PUBLISH_SUCCESS: "publishSuccess",
            PUBLISH_FAILURE: "publishFailure",
            TOKEN_EXPIRY_WARNING: "tokenExpiry",
            TOKEN_EXPIRED: "tokenExpiry",
            WEEKLY_DIGEST: "weeklyDigest",
            ANALYTICS_ALERT: "analyticsAlerts",
            INVITATION_RECEIVED: null, // Always enabled
            MEMBER_JOINED: null, // Always enabled
            SYSTEM_ANNOUNCEMENT: null, // Always enabled
        };

        const prefKey = typePreferenceMap[type];
        if (prefKey === null) return true; // Always enabled types
        return prefs[prefKey] !== false;
    }

    private isInQuietHours(prefs: NotificationPrefs): boolean {
        const start = prefs.quietHoursStart;
        const end = prefs.quietHoursEnd;

        if (start === null || end === null) return false;

        const now = new Date();
        // TODO: Convert to user's timezone
        const hour = now.getUTCHours();

        if (typeof start === "number" && typeof end === "number") {
            if (start <= end) {
                return hour >= start && hour < end;
            } else {
                // Quiet hours span midnight
                return hour >= start || hour < end;
            }
        }

        return false;
    }

    private getTitleFromType(type: NotificationType): string {
        const titles: Record<NotificationType, string> = {
            APPROVAL_REQUESTED: "Approval Requested",
            APPROVAL_APPROVED: "Content Approved",
            APPROVAL_REJECTED: "Content Rejected",
            APPROVAL_CHANGES_REQUESTED: "Changes Requested",
            REVISION_REQUESTED: "Revision Requested",
            REVISION_RESOLVED: "Revision Resolved",
            COMMENT_ADDED: "New Comment",
            MENTION: "You were mentioned",
            SCHEDULE_REMINDER: "Upcoming Schedule",
            PUBLISH_SUCCESS: "Published Successfully",
            PUBLISH_FAILURE: "Publishing Failed",
            TOKEN_EXPIRY_WARNING: "Token Expiring Soon",
            TOKEN_EXPIRED: "Token Expired",
            WEEKLY_DIGEST: "Weekly Digest",
            ANALYTICS_ALERT: "Analytics Alert",
            INVITATION_RECEIVED: "You're Invited",
            MEMBER_JOINED: "New Team Member",
            SYSTEM_ANNOUNCEMENT: "Announcement",
        };
        return titles[type] || type;
    }

    private wrapEmailHtml(body: string): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        a { color: #4F46E5; }
        h2 { color: #1f2937; margin-top: 0; }
        h3 { color: #374151; }
    </style>
</head>
<body>
    ${body}
    <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;">
    <p style="color: #9ca3af; font-size: 12px;">
        This email was sent by GrowthPilot.
        <a href="${this.appUrl}/settings/notifications">Manage notification preferences</a>
    </p>
</body>
</html>
`;
    }

    // Convenience methods for common notification types
    async notifyApprovalRequested(
        contentId: string,
        contentTitle: string,
        platform: string,
        requesterName: string,
        reviewerIds: string[],
        tenantId: string
    ): Promise<void> {
        const recipients = await this.getRecipientDetails(reviewerIds);
        await this.trigger({
            type: NotificationType.APPROVAL_REQUESTED,
            recipients,
            tenantId,
            variables: { contentId, contentTitle, platform, requesterName },
        });
    }

    async notifyApprovalDecision(
        contentId: string,
        contentTitle: string,
        reviewerName: string,
        decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED",
        notes: string | null,
        authorId: string,
        tenantId: string
    ): Promise<void> {
        const recipients = await this.getRecipientDetails([authorId]);
        const typeMap = {
            APPROVED: NotificationType.APPROVAL_APPROVED,
            REJECTED: NotificationType.APPROVAL_REJECTED,
            CHANGES_REQUESTED: NotificationType.APPROVAL_CHANGES_REQUESTED,
        };
        await this.trigger({
            type: typeMap[decision],
            recipients,
            tenantId,
            variables: { contentId, contentTitle, reviewerName, notes },
        });
    }

    async notifyPublishResult(
        contentId: string,
        contentTitle: string,
        platform: string,
        success: boolean,
        platformUrl: string | null,
        error: string | null,
        authorId: string,
        tenantId: string
    ): Promise<void> {
        const recipients = await this.getRecipientDetails([authorId]);
        await this.trigger({
            type: success ? NotificationType.PUBLISH_SUCCESS : NotificationType.PUBLISH_FAILURE,
            recipients,
            tenantId,
            variables: { contentId, contentTitle, platform, platformUrl, error },
        });
    }

    async notifyComment(
        contentId: string,
        contentTitle: string,
        authorName: string,
        commentPreview: string,
        recipientIds: string[],
        tenantId: string
    ): Promise<void> {
        const recipients = await this.getRecipientDetails(recipientIds);
        await this.trigger({
            type: NotificationType.COMMENT_ADDED,
            recipients,
            tenantId,
            variables: { contentId, contentTitle, authorName, commentPreview },
        });
    }

    async notifyTokenExpiry(
        platform: string,
        daysUntilExpiry: number,
        userId: string,
        tenantId: string
    ): Promise<void> {
        const recipients = await this.getRecipientDetails([userId]);
        const type = daysUntilExpiry <= 0
            ? NotificationType.TOKEN_EXPIRED
            : NotificationType.TOKEN_EXPIRY_WARNING;
        await this.trigger({
            type,
            recipients,
            tenantId,
            variables: { platform, daysUntilExpiry },
        });
    }

    private async getRecipientDetails(userIds: string[]): Promise<NotificationRecipient[]> {
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, name: true },
        });
        return users.map((u) => ({
            userId: u.id,
            email: u.email,
            name: u.name || undefined,
        }));
    }
}

import { Injectable, Logger } from "@nestjs/common";
import { NotificationType } from "@prisma/client";
import { WebsocketGateway, RealtimeNotification } from "./websocket.gateway";

export interface NotificationPayload {
    type: NotificationType;
    title: string;
    body: string;
    payload?: Record<string, unknown>;
}

@Injectable()
export class WebsocketService {
    private readonly logger = new Logger(WebsocketService.name);

    constructor(private readonly gateway: WebsocketGateway) {}

    /**
     * Send a real-time notification to a specific user
     */
    notifyUser(userId: string, notification: NotificationPayload) {
        const data: RealtimeNotification = {
            id: `notification_${Date.now()}`,
            ...notification,
            timestamp: new Date(),
        };

        this.gateway.sendToUser(userId, "notification", data);
        this.logger.log(`Notified user ${userId}: ${notification.type}`);
    }

    /**
     * Send a real-time notification to all users in a tenant
     */
    notifyTenant(tenantId: string, notification: NotificationPayload) {
        const data: RealtimeNotification = {
            id: `notification_${Date.now()}`,
            ...notification,
            timestamp: new Date(),
        };

        this.gateway.sendToTenant(tenantId, "notification", data);
        this.logger.log(`Notified tenant ${tenantId}: ${notification.type}`);
    }

    /**
     * Notify about content state changes
     */
    notifyContentUpdate(
        tenantId: string,
        contentId: string,
        state: string,
        title?: string
    ) {
        this.notifyTenant(tenantId, {
            type: "SYSTEM_ANNOUNCEMENT" as NotificationType,
            title: "Content Updated",
            body: `Content "${title || contentId}" is now ${state}`,
            payload: { contentId, state },
        });
    }

    /**
     * Notify about approval requests
     */
    notifyApprovalRequest(
        reviewerId: string,
        contentId: string,
        contentTitle?: string
    ) {
        this.notifyUser(reviewerId, {
            type: "APPROVAL_REQUESTED" as NotificationType,
            title: "New Approval Request",
            body: `Content "${contentTitle || contentId}" requires your approval`,
            payload: { contentId },
        });
    }

    /**
     * Notify about approval decisions
     */
    notifyApprovalDecision(
        userId: string,
        contentId: string,
        decision: "APPROVED" | "REJECTED",
        contentTitle?: string
    ) {
        this.notifyUser(userId, {
            type: decision === "APPROVED" ? "APPROVAL_APPROVED" : "APPROVAL_REJECTED",
            title: `Content ${decision === "APPROVED" ? "Approved" : "Rejected"}`,
            body: `Your content "${contentTitle || contentId}" has been ${decision.toLowerCase()}`,
            payload: { contentId, decision },
        });
    }

    /**
     * Notify about comments
     */
    notifyComment(
        userId: string,
        contentId: string,
        commentAuthor: string,
        commentBody: string
    ) {
        this.notifyUser(userId, {
            type: "COMMENT_ADDED" as NotificationType,
            title: "New Comment",
            body: `${commentAuthor}: ${commentBody.substring(0, 100)}${commentBody.length > 100 ? "..." : ""}`,
            payload: { contentId, commentAuthor },
        });
    }

    /**
     * Notify about publishing results
     */
    notifyPublishResult(
        userId: string,
        contentId: string,
        platform: string,
        success: boolean,
        error?: string
    ) {
        this.notifyUser(userId, {
            type: success ? "PUBLISH_SUCCESS" : "PUBLISH_FAILURE",
            title: success ? "Published Successfully" : "Publishing Failed",
            body: success
                ? `Content published to ${platform}`
                : `Failed to publish to ${platform}: ${error}`,
            payload: { contentId, platform, success },
        });
    }

    /**
     * Check if a user is currently online
     */
    isUserOnline(userId: string): boolean {
        return this.gateway.isUserOnline(userId);
    }

    /**
     * Get count of online users in tenant
     */
    getOnlineUsersCount(tenantId: string): number {
        return this.gateway.getOnlineUsersInTenant(tenantId);
    }
}

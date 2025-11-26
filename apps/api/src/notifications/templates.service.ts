import { Injectable, Logger } from "@nestjs/common";
import { NotificationChannel, NotificationType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface RenderedTemplate {
    subject?: string;
    body: string;
}

interface TemplateDefinition {
    name: string;
    subject?: string;
    body: string;
    variables: string[];
}

type TemplateRegistry = {
    [K in NotificationType]?: {
        [C in NotificationChannel]?: TemplateDefinition;
    };
};

@Injectable()
export class NotificationTemplatesService {
    private readonly logger = new Logger(NotificationTemplatesService.name);

    private readonly defaultTemplates: TemplateRegistry = {
        APPROVAL_REQUESTED: {
            IN_APP: {
                name: "Approval Requested",
                body: "{{requesterName}} requested approval for \"{{contentTitle}}\"",
                variables: ["requesterName", "contentTitle", "contentId"],
            },
            EMAIL: {
                name: "Approval Requested",
                subject: "Approval needed: {{contentTitle}}",
                body: `
<h2>Approval Request</h2>
<p>Hi {{recipientName}},</p>
<p><strong>{{requesterName}}</strong> has requested your approval for the following content:</p>
<div style="padding: 16px; background: #f5f5f5; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0;"><strong>{{contentTitle}}</strong></p>
    <p style="margin: 8px 0 0 0; color: #666;">Platform: {{platform}}</p>
</div>
<p><a href="{{appUrl}}/content/{{contentId}}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Review Content</a></p>
<p style="color: #666; font-size: 14px;">If the button doesn't work, copy this link: {{appUrl}}/content/{{contentId}}</p>
`,
                variables: ["recipientName", "requesterName", "contentTitle", "contentId", "platform", "appUrl"],
            },
        },
        APPROVAL_APPROVED: {
            IN_APP: {
                name: "Content Approved",
                body: "\"{{contentTitle}}\" has been approved by {{reviewerName}}",
                variables: ["contentTitle", "reviewerName", "contentId"],
            },
            EMAIL: {
                name: "Content Approved",
                subject: "✅ Approved: {{contentTitle}}",
                body: `
<h2>Content Approved</h2>
<p>Hi {{recipientName}},</p>
<p>Great news! Your content has been approved.</p>
<div style="padding: 16px; background: #ecfdf5; border-left: 4px solid #10b981; margin: 16px 0;">
    <p style="margin: 0;"><strong>{{contentTitle}}</strong></p>
    <p style="margin: 8px 0 0 0; color: #666;">Approved by: {{reviewerName}}</p>
</div>
{{#if notes}}<p><strong>Notes:</strong> {{notes}}</p>{{/if}}
<p><a href="{{appUrl}}/content/{{contentId}}" style="display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px;">View Content</a></p>
`,
                variables: ["recipientName", "contentTitle", "reviewerName", "contentId", "notes", "appUrl"],
            },
        },
        APPROVAL_REJECTED: {
            IN_APP: {
                name: "Content Rejected",
                body: "\"{{contentTitle}}\" was rejected by {{reviewerName}}",
                variables: ["contentTitle", "reviewerName", "contentId"],
            },
            EMAIL: {
                name: "Content Rejected",
                subject: "❌ Rejected: {{contentTitle}}",
                body: `
<h2>Content Rejected</h2>
<p>Hi {{recipientName}},</p>
<p>Unfortunately, your content has been rejected and requires revision.</p>
<div style="padding: 16px; background: #fef2f2; border-left: 4px solid #ef4444; margin: 16px 0;">
    <p style="margin: 0;"><strong>{{contentTitle}}</strong></p>
    <p style="margin: 8px 0 0 0; color: #666;">Rejected by: {{reviewerName}}</p>
</div>
{{#if notes}}<p><strong>Reason:</strong> {{notes}}</p>{{/if}}
<p><a href="{{appUrl}}/content/{{contentId}}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">View &amp; Edit</a></p>
`,
                variables: ["recipientName", "contentTitle", "reviewerName", "contentId", "notes", "appUrl"],
            },
        },
        APPROVAL_CHANGES_REQUESTED: {
            IN_APP: {
                name: "Changes Requested",
                body: "{{reviewerName}} requested changes on \"{{contentTitle}}\"",
                variables: ["contentTitle", "reviewerName", "contentId"],
            },
            EMAIL: {
                name: "Changes Requested",
                subject: "⚠️ Changes requested: {{contentTitle}}",
                body: `
<h2>Changes Requested</h2>
<p>Hi {{recipientName}},</p>
<p>{{reviewerName}} has reviewed your content and requested some changes.</p>
<div style="padding: 16px; background: #fffbeb; border-left: 4px solid #f59e0b; margin: 16px 0;">
    <p style="margin: 0;"><strong>{{contentTitle}}</strong></p>
</div>
{{#if notes}}<p><strong>Requested changes:</strong> {{notes}}</p>{{/if}}
<p><a href="{{appUrl}}/content/{{contentId}}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">View &amp; Update</a></p>
`,
                variables: ["recipientName", "contentTitle", "reviewerName", "contentId", "notes", "appUrl"],
            },
        },
        COMMENT_ADDED: {
            IN_APP: {
                name: "New Comment",
                body: "{{authorName}} commented on \"{{contentTitle}}\"",
                variables: ["authorName", "contentTitle", "contentId", "commentPreview"],
            },
            EMAIL: {
                name: "New Comment",
                subject: "💬 New comment on {{contentTitle}}",
                body: `
<h2>New Comment</h2>
<p>Hi {{recipientName}},</p>
<p><strong>{{authorName}}</strong> left a comment on your content:</p>
<div style="padding: 16px; background: #f5f5f5; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0; font-style: italic;">"{{commentPreview}}"</p>
</div>
<p><a href="{{appUrl}}/content/{{contentId}}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">View &amp; Reply</a></p>
`,
                variables: ["recipientName", "authorName", "contentTitle", "contentId", "commentPreview", "appUrl"],
            },
        },
        MENTION: {
            IN_APP: {
                name: "You were mentioned",
                body: "{{authorName}} mentioned you in \"{{contentTitle}}\"",
                variables: ["authorName", "contentTitle", "contentId"],
            },
            EMAIL: {
                name: "You were mentioned",
                subject: "@{{recipientName}} - You were mentioned",
                body: `
<h2>You were mentioned</h2>
<p>Hi {{recipientName}},</p>
<p><strong>{{authorName}}</strong> mentioned you in a comment:</p>
<div style="padding: 16px; background: #f5f5f5; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0 0 8px 0;"><strong>{{contentTitle}}</strong></p>
    <p style="margin: 0; font-style: italic;">"{{commentPreview}}"</p>
</div>
<p><a href="{{appUrl}}/content/{{contentId}}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">View Content</a></p>
`,
                variables: ["recipientName", "authorName", "contentTitle", "contentId", "commentPreview", "appUrl"],
            },
        },
        PUBLISH_SUCCESS: {
            IN_APP: {
                name: "Published Successfully",
                body: "\"{{contentTitle}}\" was published to {{platform}}",
                variables: ["contentTitle", "platform", "contentId"],
            },
            EMAIL: {
                name: "Published Successfully",
                subject: "🎉 Published: {{contentTitle}}",
                body: `
<h2>Content Published!</h2>
<p>Hi {{recipientName}},</p>
<p>Your content has been successfully published to {{platform}}.</p>
<div style="padding: 16px; background: #ecfdf5; border-left: 4px solid #10b981; margin: 16px 0;">
    <p style="margin: 0;"><strong>{{contentTitle}}</strong></p>
    <p style="margin: 8px 0 0 0; color: #666;">Platform: {{platform}}</p>
</div>
{{#if platformUrl}}<p><a href="{{platformUrl}}" style="color: #4F46E5;">View on {{platform}}</a></p>{{/if}}
<p><a href="{{appUrl}}/content/{{contentId}}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">View Analytics</a></p>
`,
                variables: ["recipientName", "contentTitle", "platform", "contentId", "platformUrl", "appUrl"],
            },
        },
        PUBLISH_FAILURE: {
            IN_APP: {
                name: "Publishing Failed",
                body: "Failed to publish \"{{contentTitle}}\" to {{platform}}",
                variables: ["contentTitle", "platform", "contentId", "error"],
            },
            EMAIL: {
                name: "Publishing Failed",
                subject: "⚠️ Failed to publish: {{contentTitle}}",
                body: `
<h2>Publishing Failed</h2>
<p>Hi {{recipientName}},</p>
<p>We couldn't publish your content to {{platform}}.</p>
<div style="padding: 16px; background: #fef2f2; border-left: 4px solid #ef4444; margin: 16px 0;">
    <p style="margin: 0;"><strong>{{contentTitle}}</strong></p>
    <p style="margin: 8px 0 0 0; color: #666;">Platform: {{platform}}</p>
    {{#if error}}<p style="margin: 8px 0 0 0; color: #ef4444;">Error: {{error}}</p>{{/if}}
</div>
<p>Don't worry - you can retry publishing from your dashboard.</p>
<p><a href="{{appUrl}}/content/{{contentId}}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Retry Publishing</a></p>
`,
                variables: ["recipientName", "contentTitle", "platform", "contentId", "error", "appUrl"],
            },
        },
        TOKEN_EXPIRY_WARNING: {
            IN_APP: {
                name: "Token Expiring Soon",
                body: "Your {{platform}} connection expires in {{daysUntilExpiry}} days",
                variables: ["platform", "daysUntilExpiry"],
            },
            EMAIL: {
                name: "Token Expiring Soon",
                subject: "⏰ Your {{platform}} connection is expiring soon",
                body: `
<h2>Connection Expiring Soon</h2>
<p>Hi {{recipientName}},</p>
<p>Your {{platform}} connection will expire in <strong>{{daysUntilExpiry}} days</strong>.</p>
<p>To continue posting to {{platform}}, please reconnect your account.</p>
<p><a href="{{appUrl}}/settings/connections" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Reconnect {{platform}}</a></p>
`,
                variables: ["recipientName", "platform", "daysUntilExpiry", "appUrl"],
            },
        },
        TOKEN_EXPIRED: {
            IN_APP: {
                name: "Token Expired",
                body: "Your {{platform}} connection has expired. Please reconnect.",
                variables: ["platform"],
            },
            EMAIL: {
                name: "Token Expired",
                subject: "🔴 Your {{platform}} connection has expired",
                body: `
<h2>Connection Expired</h2>
<p>Hi {{recipientName}},</p>
<p>Your {{platform}} connection has expired. Scheduled posts to {{platform}} will fail until you reconnect.</p>
<p><a href="{{appUrl}}/settings/connections" style="display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px;">Reconnect Now</a></p>
`,
                variables: ["recipientName", "platform", "appUrl"],
            },
        },
        WEEKLY_DIGEST: {
            EMAIL: {
                name: "Weekly Digest",
                subject: "📊 Your weekly content performance",
                body: `
<h2>Weekly Performance Digest</h2>
<p>Hi {{recipientName}},</p>
<p>Here's how your content performed this week:</p>

<div style="padding: 16px; background: #f5f5f5; border-radius: 8px; margin: 16px 0;">
    <table style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 8px 0;"><strong>Total Views</strong></td>
            <td style="padding: 8px 0; text-align: right;">{{totalViews}}</td>
        </tr>
        <tr>
            <td style="padding: 8px 0;"><strong>Total Engagement</strong></td>
            <td style="padding: 8px 0; text-align: right;">{{totalEngagement}}</td>
        </tr>
        <tr>
            <td style="padding: 8px 0;"><strong>Posts Published</strong></td>
            <td style="padding: 8px 0; text-align: right;">{{postsPublished}}</td>
        </tr>
        <tr>
            <td style="padding: 8px 0;"><strong>Engagement Rate</strong></td>
            <td style="padding: 8px 0; text-align: right;">{{engagementRate}}%</td>
        </tr>
    </table>
</div>

{{#if topPost}}
<h3>Top Performing Content</h3>
<div style="padding: 16px; background: #ecfdf5; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0;"><strong>{{topPost.title}}</strong></p>
    <p style="margin: 8px 0 0 0; color: #666;">{{topPost.views}} views • {{topPost.engagement}} engagement</p>
</div>
{{/if}}

<p><a href="{{appUrl}}/analytics" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">View Full Report</a></p>
`,
                variables: ["recipientName", "totalViews", "totalEngagement", "postsPublished", "engagementRate", "topPost", "appUrl"],
            },
        },
        INVITATION_RECEIVED: {
            EMAIL: {
                name: "Invitation Received",
                subject: "You've been invited to join {{tenantName}} on GrowthPilot",
                body: `
<h2>You're Invited!</h2>
<p>Hi there,</p>
<p><strong>{{inviterName}}</strong> has invited you to join <strong>{{tenantName}}</strong> on GrowthPilot as a {{role}}.</p>
<p><a href="{{inviteUrl}}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Accept Invitation</a></p>
<p style="color: #666; font-size: 14px;">This invitation expires on {{expiresAt}}.</p>
`,
                variables: ["inviterName", "tenantName", "role", "inviteUrl", "expiresAt"],
            },
        },
        MEMBER_JOINED: {
            IN_APP: {
                name: "New Team Member",
                body: "{{memberName}} joined your team as {{role}}",
                variables: ["memberName", "role"],
            },
        },
        SCHEDULE_REMINDER: {
            IN_APP: {
                name: "Upcoming Schedule",
                body: "\"{{contentTitle}}\" is scheduled to publish in {{timeUntil}}",
                variables: ["contentTitle", "timeUntil", "contentId"],
            },
            EMAIL: {
                name: "Upcoming Schedule",
                subject: "⏰ Content publishing soon: {{contentTitle}}",
                body: `
<h2>Upcoming Publication</h2>
<p>Hi {{recipientName}},</p>
<p>Your content is scheduled to publish in <strong>{{timeUntil}}</strong>.</p>
<div style="padding: 16px; background: #f5f5f5; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0;"><strong>{{contentTitle}}</strong></p>
    <p style="margin: 8px 0 0 0; color: #666;">Platform: {{platform}}</p>
    <p style="margin: 8px 0 0 0; color: #666;">Scheduled for: {{scheduledTime}}</p>
</div>
<p><a href="{{appUrl}}/content/{{contentId}}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">View Content</a></p>
`,
                variables: ["recipientName", "contentTitle", "platform", "scheduledTime", "timeUntil", "contentId", "appUrl"],
            },
        },
        REVISION_REQUESTED: {
            IN_APP: {
                name: "Revision Requested",
                body: "{{requesterName}} requested revisions on \"{{contentTitle}}\"",
                variables: ["requesterName", "contentTitle", "contentId"],
            },
            EMAIL: {
                name: "Revision Requested",
                subject: "📝 Revision requested: {{contentTitle}}",
                body: `
<h2>Revision Requested</h2>
<p>Hi {{recipientName}},</p>
<p><strong>{{requesterName}}</strong> has requested revisions on your content:</p>
<div style="padding: 16px; background: #fffbeb; border-left: 4px solid #f59e0b; margin: 16px 0;">
    <p style="margin: 0;"><strong>{{contentTitle}}</strong></p>
</div>
{{#if notes}}<p><strong>Notes:</strong> {{notes}}</p>{{/if}}
<p><a href="{{appUrl}}/content/{{contentId}}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">View &amp; Edit</a></p>
`,
                variables: ["recipientName", "requesterName", "contentTitle", "contentId", "notes", "appUrl"],
            },
        },
        REVISION_RESOLVED: {
            IN_APP: {
                name: "Revision Resolved",
                body: "Revision on \"{{contentTitle}}\" has been resolved",
                variables: ["contentTitle", "contentId"],
            },
        },
        ANALYTICS_ALERT: {
            IN_APP: {
                name: "Analytics Alert",
                body: "{{alertMessage}}",
                variables: ["alertMessage", "contentId"],
            },
            EMAIL: {
                name: "Analytics Alert",
                subject: "📈 {{alertTitle}}",
                body: `
<h2>Analytics Alert</h2>
<p>Hi {{recipientName}},</p>
<p>{{alertMessage}}</p>
{{#if contentTitle}}
<div style="padding: 16px; background: #f5f5f5; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 0;"><strong>{{contentTitle}}</strong></p>
</div>
{{/if}}
<p><a href="{{appUrl}}/analytics" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">View Analytics</a></p>
`,
                variables: ["recipientName", "alertTitle", "alertMessage", "contentTitle", "contentId", "appUrl"],
            },
        },
        SYSTEM_ANNOUNCEMENT: {
            IN_APP: {
                name: "System Announcement",
                body: "{{message}}",
                variables: ["message"],
            },
            EMAIL: {
                name: "System Announcement",
                subject: "📢 {{title}}",
                body: `
<h2>{{title}}</h2>
<p>Hi {{recipientName}},</p>
<div style="padding: 16px; background: #f5f5f5; border-radius: 8px; margin: 16px 0;">
    {{message}}
</div>
{{#if actionUrl}}<p><a href="{{actionUrl}}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">{{actionLabel}}</a></p>{{/if}}
`,
                variables: ["recipientName", "title", "message", "actionUrl", "actionLabel"],
            },
        },
    };

    constructor(private readonly prisma: PrismaService) {}

    async getTemplate(
        type: NotificationType,
        channel: NotificationChannel
    ): Promise<TemplateDefinition | null> {
        // Try database first
        const dbTemplate = await this.prisma.notificationTemplate.findFirst({
            where: { type, channel, isActive: true },
        });

        if (dbTemplate) {
            return {
                name: dbTemplate.name,
                subject: dbTemplate.subject || undefined,
                body: dbTemplate.body,
                variables: dbTemplate.variables,
            };
        }

        // Fall back to default templates
        return this.defaultTemplates[type]?.[channel] || null;
    }

    render(template: TemplateDefinition, variables: Record<string, unknown>): RenderedTemplate {
        const render = (text: string): string => {
            let result = text;

            // Handle conditionals {{#if var}}...{{/if}}
            result = result.replace(
                /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
                (_, varName, content) => {
                    const value = variables[varName];
                    return value ? content : "";
                }
            );

            // Replace variables {{var}}
            result = result.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
                const parts = path.split(".");
                let value: unknown = variables;
                for (const part of parts) {
                    if (value && typeof value === "object") {
                        value = (value as Record<string, unknown>)[part];
                    } else {
                        return "";
                    }
                }
                return value !== undefined && value !== null ? String(value) : "";
            });

            return result;
        };

        return {
            subject: template.subject ? render(template.subject) : undefined,
            body: render(template.body),
        };
    }

    async renderTemplate(
        type: NotificationType,
        channel: NotificationChannel,
        variables: Record<string, unknown>
    ): Promise<RenderedTemplate | null> {
        const template = await this.getTemplate(type, channel);
        if (!template) {
            this.logger.warn(`No template found for ${type}/${channel}`);
            return null;
        }
        return this.render(template, variables);
    }

    async seedDefaultTemplates(): Promise<void> {
        for (const [type, channels] of Object.entries(this.defaultTemplates)) {
            for (const [channel, template] of Object.entries(channels)) {
                await this.prisma.notificationTemplate.upsert({
                    where: {
                        type_channel: {
                            type: type as NotificationType,
                            channel: channel as NotificationChannel,
                        },
                    },
                    create: {
                        type: type as NotificationType,
                        channel: channel as NotificationChannel,
                        name: template.name,
                        subject: template.subject,
                        body: template.body,
                        variables: template.variables,
                    },
                    update: {},
                });
            }
        }
        this.logger.log("Seeded default notification templates");
    }
}

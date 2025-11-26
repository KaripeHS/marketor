import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface EmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
    replyTo?: string;
    tags?: { name: string; value: string }[];
}

export interface EmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

interface ResendResponse {
    id: string;
}

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private readonly apiKey: string | undefined;
    private readonly defaultFrom: string;
    private readonly enabled: boolean;

    constructor(private readonly config: ConfigService) {
        this.apiKey = this.config.get<string>("RESEND_API_KEY");
        this.defaultFrom = this.config.get<string>("EMAIL_FROM") || "GrowthPilot <noreply@growthpilot.io>";
        this.enabled = !!this.apiKey;

        if (!this.enabled) {
            this.logger.warn("Email service disabled: RESEND_API_KEY not configured");
        }
    }

    async send(options: EmailOptions): Promise<EmailResult> {
        if (!this.enabled) {
            this.logger.debug(`Email not sent (disabled): ${options.subject} to ${options.to}`);
            return { success: true, messageId: "mock-disabled" };
        }

        try {
            const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from: options.from || this.defaultFrom,
                    to: Array.isArray(options.to) ? options.to : [options.to],
                    subject: options.subject,
                    html: options.html,
                    text: options.text,
                    reply_to: options.replyTo,
                    tags: options.tags,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Resend API error: ${response.status} - ${errorText}`);
                return { success: false, error: `API error: ${response.status}` };
            }

            const data = await response.json() as ResendResponse;
            this.logger.debug(`Email sent: ${data.id} - ${options.subject}`);
            return { success: true, messageId: data.id };
        } catch (error) {
            this.logger.error("Failed to send email:", error);
            return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
        }
    }

    async sendBatch(emails: EmailOptions[]): Promise<EmailResult[]> {
        return Promise.all(emails.map((email) => this.send(email)));
    }

    isEnabled(): boolean {
        return this.enabled;
    }
}

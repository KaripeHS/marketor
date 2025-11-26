import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { EmailService } from "./email.service";
import { PushService } from "./push.service";
import { DigestService } from "./digest.service";
import { NotificationTemplatesService } from "./templates.service";
import { NotificationTriggerService } from "./notification-trigger.service";

@Module({
    imports: [ConfigModule],
    providers: [
        NotificationsService,
        EmailService,
        PushService,
        DigestService,
        NotificationTemplatesService,
        NotificationTriggerService,
    ],
    controllers: [NotificationsController],
    exports: [
        NotificationsService,
        EmailService,
        PushService,
        DigestService,
        NotificationTriggerService,
    ],
})
export class NotificationsModule {}

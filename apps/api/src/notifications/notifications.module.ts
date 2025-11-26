import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { EmailService } from "./email.service";
import { NotificationTemplatesService } from "./templates.service";
import { NotificationTriggerService } from "./notification-trigger.service";

@Module({
    imports: [ConfigModule],
    providers: [
        NotificationsService,
        EmailService,
        NotificationTemplatesService,
        NotificationTriggerService,
    ],
    controllers: [NotificationsController],
    exports: [
        NotificationsService,
        EmailService,
        NotificationTriggerService,
    ],
})
export class NotificationsModule {}

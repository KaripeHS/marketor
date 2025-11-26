import { Global, Module } from "@nestjs/common";
import { QueueService } from "./queue.service";
import { PostJobProcessor } from "./post-job.processor";
import { SchedulerService } from "./scheduler.service";
import { PrismaModule } from "../prisma/prisma.module";
import { SocialModule } from "../social/social.module";

@Global()
@Module({
    imports: [PrismaModule, SocialModule],
    providers: [QueueService, PostJobProcessor, SchedulerService],
    exports: [QueueService, SchedulerService],
})
export class QueueModule {}

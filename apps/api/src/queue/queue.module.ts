import { Global, Module } from "@nestjs/common";
import { QueueService } from "./queue.service";
import { PostJobProcessor } from "./post-job.processor";
import { SchedulerService } from "./scheduler.service";
import { PrismaModule } from "../prisma/prisma.module";

@Global()
@Module({
    imports: [PrismaModule],
    providers: [QueueService, PostJobProcessor, SchedulerService],
    exports: [QueueService, SchedulerService],
})
export class QueueModule {}

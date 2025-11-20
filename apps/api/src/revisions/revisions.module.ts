import { Module } from "@nestjs/common";
import { RevisionsService } from "./revisions.service";
import { RevisionsController } from "./revisions.controller";

@Module({
  providers: [RevisionsService],
  controllers: [RevisionsController]
})
export class RevisionsModule {}

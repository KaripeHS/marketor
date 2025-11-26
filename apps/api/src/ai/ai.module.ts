import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { PromptsModule } from "./prompts";
import { AgentOrchestratorService } from "./orchestrator";

@Module({
    imports: [PromptsModule],
    controllers: [AiController],
    providers: [AiService, AgentOrchestratorService],
    exports: [AiService, AgentOrchestratorService],
})
export class AiModule { }

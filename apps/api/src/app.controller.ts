import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { Public } from "./auth/public.decorator";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("/health")
  @Public()
  health() {
    return { status: "ok", service: "growthpilot-api", time: new Date().toISOString() };
  }

  @Get("/")
  @Public()
  root() {
    return this.appService.getHello();
  }
}

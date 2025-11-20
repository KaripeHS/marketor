import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidUnknownValues: false,
      transform: true
    })
  );

  const port = process.env.API_PORT || 4000;
  await app.listen(port);
  Logger.log(`GrowthPilot API running on http://localhost:${port}`);
}

bootstrap();

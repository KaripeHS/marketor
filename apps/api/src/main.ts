// Initialize Sentry first, before any other imports
import { initSentry, Sentry } from "./instrument";
initSentry();

import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { PrismaService } from "./prisma/prisma.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true, // Required for Stripe webhooks
  });

  // Security headers
  const isProd = process.env.NODE_ENV === "production";
  app.use(
    helmet({
      contentSecurityPolicy: isProd ? undefined : false, // Disable CSP in dev
      crossOriginEmbedderPolicy: false, // Allow embedding for OAuth flows
      hsts: isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
    })
  );

  // CORS configuration
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : ["http://localhost:3000"];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-user-id", "x-tenant-id"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidUnknownValues: false,
      transform: true,
    })
  );

  // Set up Sentry error handler
  Sentry.setupExpressErrorHandler(app.getHttpAdapter().getInstance());

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  const port = process.env.API_PORT || 4000;
  await app.listen(port);
  Logger.log(`GrowthPilot API running on http://localhost:${port}`);
}

bootstrap();

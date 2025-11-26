import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { MetricsService } from "./metrics.service";

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
    constructor(private readonly metricsService: MetricsService) {}

    use(req: Request, res: Response, next: NextFunction) {
        const start = Date.now();
        const method = req.method;
        const path = req.originalUrl || req.url;

        // Skip metrics endpoint itself
        if (path === "/metrics" || path.startsWith("/metrics")) {
            return next();
        }

        // Track in-flight requests
        this.metricsService.httpRequestsInFlight.labels(method).inc();

        // Capture response
        res.on("finish", () => {
            const duration = Date.now() - start;
            const status = res.statusCode;

            this.metricsService.httpRequestsInFlight.labels(method).dec();
            this.metricsService.recordHttpRequest(method, path, status, duration);
        });

        next();
    }
}

import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import * as Sentry from "@sentry/node";

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest();

        // Determine HTTP status
        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        // Only report 5xx errors to Sentry (server errors)
        if (status >= 500) {
            Sentry.withScope((scope) => {
                scope.setTag("type", "server_error");
                scope.setExtra("url", request.url);
                scope.setExtra("method", request.method);
                scope.setExtra("status", status);

                if (request.user?.id) {
                    scope.setUser({ id: request.user.id });
                }

                if (request.headers["x-tenant-id"]) {
                    scope.setTag("tenant_id", request.headers["x-tenant-id"]);
                }

                Sentry.captureException(exception);
            });
        }

        // Get error message
        const message =
            exception instanceof HttpException
                ? exception.getResponse()
                : { message: "Internal server error" };

        response.status(status).json(
            typeof message === "string"
                ? { statusCode: status, message }
                : { statusCode: status, ...message }
        );
    }
}

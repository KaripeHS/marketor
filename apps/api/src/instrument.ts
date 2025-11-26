import * as Sentry from "@sentry/node";

// Initialize Sentry before any other imports
export function initSentry() {
    const dsn = process.env.SENTRY_DSN;

    if (!dsn) {
        console.log("Sentry DSN not configured, error tracking disabled");
        return;
    }

    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || "development",
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
        profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
        integrations: [
            Sentry.httpIntegration(),
            Sentry.expressIntegration(),
        ],
        beforeSend(event) {
            // Scrub sensitive data before sending
            if (event.request?.headers) {
                delete event.request.headers["authorization"];
                delete event.request.headers["x-api-key"];
            }
            return event;
        },
    });

    console.log("Sentry initialized for error tracking");
}

export { Sentry };

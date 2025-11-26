import * as Sentry from "@sentry/react";

let isInitialized = false;

export function initSentry() {
    if (isInitialized) return;

    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

    if (!dsn) {
        console.log("Sentry DSN not configured, error tracking disabled");
        return;
    }

    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || "development",
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration(),
        ],
        beforeSend(event) {
            // Don't send events in development unless DSN is configured
            if (process.env.NODE_ENV === "development" && !dsn) {
                return null;
            }
            return event;
        },
    });

    isInitialized = true;
    console.log("Sentry initialized for error tracking");
}

export function captureError(error: Error, context?: Record<string, unknown>) {
    Sentry.withScope((scope) => {
        if (context) {
            scope.setExtras(context);
        }
        Sentry.captureException(error);
    });
}

export function setUser(user: { id: string; email?: string }) {
    Sentry.setUser(user);
}

export function clearUser() {
    Sentry.setUser(null);
}

export { Sentry };

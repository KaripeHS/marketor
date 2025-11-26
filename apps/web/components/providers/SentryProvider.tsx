"use client";

import { useEffect } from "react";
import { initSentry, setUser, clearUser } from "@/lib/sentry";
import { useAuth } from "@/contexts/AuthContext";

export function SentryProvider({ children }: { children: React.ReactNode }) {
    const { currentUser, isAuthenticated } = useAuth();

    useEffect(() => {
        initSentry();
    }, []);

    useEffect(() => {
        if (isAuthenticated && currentUser) {
            setUser({ id: currentUser.id, email: currentUser.email });
        } else {
            clearUser();
        }
    }, [isAuthenticated, currentUser]);

    return <>{children}</>;
}

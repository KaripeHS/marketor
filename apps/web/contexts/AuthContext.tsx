"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authService, LoginResponse, TenantMembership } from "@/services/api";

interface User {
    id: string;
    email: string;
    name: string | null;
}

interface Tenant {
    id: string;
    name: string;
    slug: string;
}

interface AuthContextType {
    userId: string | null;
    tenantId: string | null;
    currentUser: User | null;
    currentTenant: Tenant | null;
    memberships: TenantMembership[];
    token: string | null;
    login: (email: string, password: string, redirectTo?: string) => Promise<void>;
    register: (email: string, password: string, name?: string, redirectTo?: string) => Promise<void>;
    loginWithToken: (response: LoginResponse) => void;
    logout: () => void;
    switchTenant: (tenantId: string) => void;
    isAuthenticated: boolean;
    isLoading: boolean;
    refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [userId, setUserId] = useState<string | null>(null);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
    const [memberships, setMemberships] = useState<TenantMembership[]>([]);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const setAuthState = useCallback((response: LoginResponse, selectedTenantId?: string) => {
        const tid = selectedTenantId || response.memberships[0]?.tenantId;
        const membership = response.memberships.find(m => m.tenantId === tid);

        // Store in state
        setToken(response.accessToken);
        setUserId(response.user.id);
        setTenantId(tid || null);
        setCurrentUser(response.user);
        setMemberships(response.memberships);

        if (membership) {
            setCurrentTenant({
                id: membership.tenantId,
                name: membership.tenantName,
                slug: membership.tenantSlug,
            });
        }

        // Store in localStorage
        localStorage.setItem("marketor_token", response.accessToken);
        localStorage.setItem("marketor_user_id", response.user.id);
        if (tid) {
            localStorage.setItem("marketor_tenant_id", tid);
        }
    }, []);

    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem("marketor_token");
            const storedTenantId = localStorage.getItem("marketor_tenant_id");

            if (storedToken) {
                setToken(storedToken);
                try {
                    // Refresh user data from server
                    const response = await authService.refresh();
                    setAuthState(response, storedTenantId || undefined);
                } catch (error) {
                    console.error("Failed to refresh auth", error);
                    // Clear invalid token
                    localStorage.removeItem("marketor_token");
                    localStorage.removeItem("marketor_user_id");
                    localStorage.removeItem("marketor_tenant_id");
                }
            } else {
                // Legacy header-based auth fallback
                const storedUserId = localStorage.getItem("marketor_user_id");
                if (storedUserId && storedTenantId) {
                    setUserId(storedUserId);
                    setTenantId(storedTenantId);
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, [setAuthState]);

    const login = async (email: string, password: string, redirectTo?: string) => {
        const response = await authService.login(email, password);
        setAuthState(response);
        router.push(redirectTo || "/dashboard");
    };

    const register = async (email: string, password: string, name?: string, redirectTo?: string) => {
        const response = await authService.register(email, password, name);
        setAuthState(response);
        router.push(redirectTo || "/dashboard");
    };

    const loginWithToken = (response: LoginResponse) => {
        setAuthState(response);
        router.push("/dashboard");
    };

    const logout = () => {
        localStorage.removeItem("marketor_token");
        localStorage.removeItem("marketor_user_id");
        localStorage.removeItem("marketor_tenant_id");
        setToken(null);
        setUserId(null);
        setTenantId(null);
        setCurrentUser(null);
        setCurrentTenant(null);
        setMemberships([]);
        router.push("/login");
    };

    const switchTenant = (newTenantId: string) => {
        const membership = memberships.find(m => m.tenantId === newTenantId);
        if (membership) {
            setTenantId(newTenantId);
            setCurrentTenant({
                id: membership.tenantId,
                name: membership.tenantName,
                slug: membership.tenantSlug,
            });
            localStorage.setItem("marketor_tenant_id", newTenantId);
        }
    };

    const refreshAuth = async () => {
        if (token) {
            try {
                const response = await authService.refresh();
                setAuthState(response, tenantId || undefined);
            } catch (error) {
                console.error("Failed to refresh auth", error);
            }
        }
    };

    return (
        <AuthContext.Provider
            value={{
                userId,
                tenantId,
                currentUser,
                currentTenant,
                memberships,
                token,
                login,
                register,
                loginWithToken,
                logout,
                switchTenant,
                isAuthenticated: !!(token || (userId && tenantId)),
                isLoading,
                refreshAuth,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

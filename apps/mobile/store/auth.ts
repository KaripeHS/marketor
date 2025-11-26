import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { authApi, LoginResponse } from "@/services/api";

interface User {
    id: string;
    email: string;
    name: string | null;
}

interface Membership {
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    role: string;
}

interface AuthState {
    user: User | null;
    memberships: Membership[];
    currentTenantId: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name?: string) => Promise<void>;
    logout: () => Promise<void>;
    setTenant: (tenantId: string) => Promise<void>;
    loadAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    memberships: [],
    currentTenantId: null,
    isAuthenticated: false,
    isLoading: true,

    login: async (email: string, password: string) => {
        const response = await authApi.login(email, password);
        await handleAuthSuccess(response, set);
    },

    register: async (email: string, password: string, name?: string) => {
        const response = await authApi.register(email, password, name);
        await handleAuthSuccess(response, set);
    },

    logout: async () => {
        await SecureStore.deleteItemAsync("auth_token");
        await SecureStore.deleteItemAsync("tenant_id");
        set({
            user: null,
            memberships: [],
            currentTenantId: null,
            isAuthenticated: false,
        });
    },

    setTenant: async (tenantId: string) => {
        await SecureStore.setItemAsync("tenant_id", tenantId);
        set({ currentTenantId: tenantId });
    },

    loadAuth: async () => {
        try {
            const token = await SecureStore.getItemAsync("auth_token");
            if (!token) {
                set({ isLoading: false, isAuthenticated: false });
                return;
            }

            const data = await authApi.whoami();
            const tenantId = await SecureStore.getItemAsync("tenant_id");

            set({
                user: data.user,
                memberships: data.memberships,
                currentTenantId: tenantId || data.memberships[0]?.tenantId || null,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error) {
            await SecureStore.deleteItemAsync("auth_token");
            await SecureStore.deleteItemAsync("tenant_id");
            set({ isLoading: false, isAuthenticated: false });
        }
    },
}));

async function handleAuthSuccess(
    response: LoginResponse,
    set: (state: Partial<AuthState>) => void
) {
    await SecureStore.setItemAsync("auth_token", response.accessToken);

    const defaultTenantId = response.memberships[0]?.tenantId;
    if (defaultTenantId) {
        await SecureStore.setItemAsync("tenant_id", defaultTenantId);
    }

    set({
        user: response.user,
        memberships: response.memberships,
        currentTenantId: defaultTenantId || null,
        isAuthenticated: true,
        isLoading: false,
    });
}

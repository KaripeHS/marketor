import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "@/constants/config";

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync("auth_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    const tenantId = await SecureStore.getItemAsync("tenant_id");
    if (tenantId) {
        config.headers["x-tenant-id"] = tenantId;
    }

    return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            await SecureStore.deleteItemAsync("auth_token");
            await SecureStore.deleteItemAsync("tenant_id");
        }
        return Promise.reject(error);
    }
);

export interface LoginResponse {
    accessToken: string;
    user: {
        id: string;
        email: string;
        name: string | null;
    };
    memberships: {
        tenantId: string;
        tenantName: string;
        tenantSlug: string;
        role: string;
    }[];
}

export const authApi = {
    login: async (email: string, password: string): Promise<LoginResponse> => {
        const response = await api.post<LoginResponse>("/auth/login", { email, password });
        return response.data;
    },

    register: async (email: string, password: string, name?: string): Promise<LoginResponse> => {
        const response = await api.post<LoginResponse>("/auth/register", { email, password, name });
        return response.data;
    },

    whoami: async () => {
        const response = await api.get("/auth/whoami");
        return response.data;
    },
};

export interface ContentItem {
    id: string;
    campaignId: string;
    platform: string;
    format: string;
    state: string;
    title: string | null;
    script: string | null;
    caption: string | null;
    hashtags: string[];
    mediaUrl: string | null;
    scheduledAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export const contentApi = {
    list: async (params?: { state?: string; platform?: string }) => {
        const response = await api.get<ContentItem[]>("/content", { params });
        return response.data;
    },

    get: async (id: string) => {
        const response = await api.get<ContentItem>(`/content/${id}`);
        return response.data;
    },

    create: async (data: Partial<ContentItem>) => {
        const response = await api.post<ContentItem>("/content", data);
        return response.data;
    },

    updateState: async (id: string, state: string) => {
        const response = await api.patch<ContentItem>(`/content/${id}/state`, { state });
        return response.data;
    },
};

export interface Approval {
    id: string;
    contentId: string;
    reviewerId: string;
    status: string;
    comment: string | null;
    createdAt: string;
    content?: ContentItem;
}

export const approvalsApi = {
    list: async () => {
        const response = await api.get<Approval[]>("/approvals");
        return response.data;
    },

    approve: async (contentId: string, comment?: string) => {
        const response = await api.post(`/approvals/${contentId}`, {
            status: "APPROVED",
            comment
        });
        return response.data;
    },

    reject: async (contentId: string, comment: string) => {
        const response = await api.post(`/approvals/${contentId}`, {
            status: "REJECTED",
            comment
        });
        return response.data;
    },
};

export interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    readAt: string | null;
    createdAt: string;
}

export const notificationsApi = {
    list: async () => {
        const response = await api.get<Notification[]>("/notifications");
        return response.data;
    },

    unreadCount: async () => {
        const response = await api.get<{ count: number }>("/notifications/unread-count");
        return response.data.count;
    },

    markRead: async (id: string) => {
        await api.patch(`/notifications/${id}/read`);
    },

    markAllRead: async () => {
        await api.post("/notifications/read-all");
    },
};

export interface Campaign {
    id: string;
    name: string;
    status: string;
    createdAt: string;
}

export const campaignsApi = {
    list: async () => {
        const response = await api.get<Campaign[]>("/campaigns");
        return response.data;
    },

    get: async (id: string) => {
        const response = await api.get<Campaign>(`/campaigns/${id}`);
        return response.data;
    },
};

export default api;

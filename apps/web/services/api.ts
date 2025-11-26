import { api } from "@/lib/api";
import {
    Campaign,
    ContentItem,
    CreateCampaignDto,
    CreateContentDto,
    UpdateContentStateDto,
    Approval,
    UpdateApprovalDto,
    Comment,
    CreateCommentDto,
    BrandProfile,
    UpsertBrandDto,
    Strategy,
    CreateStrategyDto,
    UpdateCampaignDto,
    UpdateContentDto,
    UpdateStrategyDto,
    Notification as AppNotification,
    AnalyticsData,
    SocialConnection,
    CreateConnectionDto,
    PostJob,
    CreatePostJobDto,
    PostJobStatus,
    JobStats,
    Invitation,
    CreateInvitationDto,
    MediaAsset,
    MediaType,
} from "@/types";

export const campaignsService = {
    list: async (tenantId?: string) => {
        const params = tenantId ? { tenantId } : {};
        const response = await api.get<Campaign[]>("/campaigns", { params });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get<Campaign & { content: ContentItem[] }>(`/campaigns/${id}`);
        return response.data;
    },

    create: async (data: CreateCampaignDto) => {
        const response = await api.post<Campaign>("/campaigns", data);
        return response.data;
    },

    update: async (id: string, data: UpdateCampaignDto) => {
        const response = await api.patch<Campaign>(`/campaigns/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete<void>(`/campaigns/${id}`);
        return response.data;
    }
};

export const contentService = {
    list: async (filters: { tenantId?: string; campaignId?: string } = {}) => {
        const response = await api.get<ContentItem[]>("/content", { params: filters });
        return response.data;
    },

    create: async (data: CreateContentDto) => {
        const response = await api.post<ContentItem>("/content", data);
        return response.data;
    },

    updateState: async (id: string, data: UpdateContentStateDto) => {
        const response = await api.patch<ContentItem>(`/content/${id}/state`, data);
        return response.data;
    },

    update: async (id: string, data: UpdateContentDto) => {
        const response = await api.patch<ContentItem>(`/content/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete<void>(`/content/${id}`);
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get<ContentItem>(`/content/${id}`);
        return response.data;
    }
};

export const approvalsService = {
    get: async (contentId: string) => {
        const response = await api.get<Approval[]>("/approvals");
        return response.data.find(a => a.contentId === contentId);
    },

    update: async (contentId: string, data: UpdateApprovalDto) => {
        const response = await api.post<Approval>(`/approvals/${contentId}`, data);
        return response.data;
    }
};

export const commentsService = {
    list: async (contentId: string) => {
        const response = await api.get<Comment[]>("/comments", { params: { contentId } });
        return response.data;
    },

    create: async (data: CreateCommentDto) => {
        const response = await api.post<Comment>("/comments", data);
        return response.data;
    }
};

export const brandService = {
    list: async () => {
        const response = await api.get<BrandProfile[]>("/brand");
        return response.data;
    },

    upsert: async (data: UpsertBrandDto) => {
        const response = await api.post<BrandProfile>("/brand", data);
        return response.data;
    }
};

export const strategyService = {
    list: async () => {
        const response = await api.get<Strategy[]>("/strategy");
        return response.data;
    },

    create: async (data: CreateStrategyDto) => {
        const response = await api.post<Strategy>("/strategy", data);
        return response.data;
    },

    update: async (id: string, data: UpdateStrategyDto) => {
        const response = await api.patch<Strategy>(`/strategy/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete<void>(`/strategy/${id}`);
        return response.data;
    }
};

export const plansService = {
    list: async () => {
        const response = await api.get<any[]>("/plans");
        return response.data;
    },

    create: async (data: { strategyId?: string; timeWindow: Record<string, any>; items: any[] }) => {
        const response = await api.post<any>("/plans", data);
        return response.data;
    }
};

export const notificationsService = {
    list: async () => {
        const response = await api.get<AppNotification[]>("/notifications");
        return response.data;
    },

    markRead: async (id: string) => {
        const response = await api.patch<AppNotification>(`/notifications/${id}/read`);
        return response.data;
    }
};

export const revisionsService = {
    list: async () => {
        const response = await api.get<any[]>("/revisions");
        return response.data;
    },

    create: async (data: { contentId: string; notes?: string }) => {
        const response = await api.post<any>("/revisions", data);
        return response.data;
    },

    updateStatus: async (id: string, status: "OPEN" | "RESOLVED" | "REJECTED") => {
        const response = await api.patch<any>(`/revisions/${id}/status`, { status });
        return response.data;
    }
};

export const aiService = {
    generate: async (type: "STRATEGY" | "CONTENT", context: Record<string, any>, prompt?: string) => {
        const response = await api.post<any>("/ai/generate", { type, context, prompt });
        return response.data;
    }
};

export const analyticsService = {
    getOverview: async (period: string = "30d") => {
        const response = await api.get<AnalyticsData>("/analytics/overview", { params: { period } });
        return response.data;
    }
};

export const tenantsService = {
    list: async () => {
        const response = await api.get<any[]>("/tenants");
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get<any>(`/tenants/${id}`);
        return response.data;
    },

    update: async (id: string, data: { name: string }) => {
        const response = await api.patch<any>(`/tenants/${id}`, data);
        return response.data;
    }
};

export const usersService = {
    list: async () => {
        const response = await api.get<any[]>("/users");
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get<any>(`/users/${id}`);
        return response.data;
    },

    create: async (data: { email: string; name?: string }) => {
        const response = await api.post<any>("/users", data);
        return response.data;
    }
};

export const auditService = {
    list: async (limit: number = 100) => {
        const response = await api.get<any[]>("/audit", { params: { limit } });
        return response.data;
    }
};

export interface AuthUser {
    id: string;
    email: string;
    name: string | null;
}

export interface TenantMembership {
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    role: string;
}

export interface LoginResponse {
    accessToken: string;
    user: AuthUser;
    memberships: TenantMembership[];
}

export const authService = {
    register: async (email: string, password: string, name?: string): Promise<LoginResponse> => {
        const response = await api.post<LoginResponse>("/auth/register", { email, password, name });
        return response.data;
    },

    login: async (email: string, password: string): Promise<LoginResponse> => {
        const response = await api.post<LoginResponse>("/auth/login", { email, password });
        return response.data;
    },

    whoami: async () => {
        const response = await api.get<{ user: any; tenant: any }>("/auth/whoami");
        return response.data;
    },

    refresh: async (): Promise<LoginResponse> => {
        const response = await api.get<LoginResponse>("/auth/refresh");
        return response.data;
    }
};

// Social Integration Services

export const socialConnectionsService = {
    list: async () => {
        const response = await api.get<SocialConnection[]>("/social/connections");
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get<SocialConnection>(`/social/connections/${id}`);
        return response.data;
    },

    create: async (data: CreateConnectionDto) => {
        const response = await api.post<SocialConnection>("/social/connections", data);
        return response.data;
    },

    disconnect: async (id: string) => {
        const response = await api.patch<SocialConnection>(`/social/connections/${id}/disconnect`);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete<void>(`/social/connections/${id}`);
        return response.data;
    },

    refresh: async (id: string) => {
        const response = await api.post<SocialConnection>(`/social/connections/${id}/refresh`);
        return response.data;
    }
};

export const postJobsService = {
    list: async (status?: PostJobStatus) => {
        const params = status ? { status } : {};
        const response = await api.get<PostJob[]>("/social/jobs", { params });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get<PostJob>(`/social/jobs/${id}`);
        return response.data;
    },

    getStats: async () => {
        const response = await api.get<JobStats>("/social/jobs/stats");
        return response.data;
    },

    create: async (data: CreatePostJobDto) => {
        const response = await api.post<PostJob>("/social/jobs", data);
        return response.data;
    },

    cancel: async (id: string) => {
        const response = await api.patch<PostJob>(`/social/jobs/${id}/cancel`);
        return response.data;
    },

    retry: async (id: string) => {
        const response = await api.patch<PostJob>(`/social/jobs/${id}/retry`);
        return response.data;
    },

    processJobs: async () => {
        const response = await api.post<{ processed: number; results: any[] }>("/social/jobs/process");
        return response.data;
    }
};

// Invitations Service

export const invitationsService = {
    list: async () => {
        const response = await api.get<Invitation[]>("/invitations");
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get<Invitation>(`/invitations/${id}`);
        return response.data;
    },

    getPending: async () => {
        const response = await api.get<Invitation[]>("/invitations/pending");
        return response.data;
    },

    verify: async (token: string) => {
        const response = await api.get<Invitation>(`/invitations/verify/${token}`);
        return response.data;
    },

    create: async (data: CreateInvitationDto) => {
        const response = await api.post<Invitation>("/invitations", data);
        return response.data;
    },

    accept: async (token: string) => {
        const response = await api.post<any>(`/invitations/${token}/accept`);
        return response.data;
    },

    cancel: async (id: string) => {
        const response = await api.patch<Invitation>(`/invitations/${id}/cancel`);
        return response.data;
    },

    resend: async (id: string) => {
        const response = await api.patch<Invitation>(`/invitations/${id}/resend`);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete<void>(`/invitations/${id}`);
        return response.data;
    }
};

// Media Service

export const mediaService = {
    upload: async (file: File, tenantId: string, type: MediaType = "image", contentId?: string): Promise<MediaAsset> => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("tenantId", tenantId);
        formData.append("type", type);
        if (contentId) {
            formData.append("contentId", contentId);
        }

        const response = await api.post<MediaAsset>("/media/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    list: async (tenantId: string): Promise<MediaAsset[]> => {
        const response = await api.get<MediaAsset[]>("/media", { params: { tenantId } });
        return response.data;
    },

    listByContent: async (contentId: string, tenantId: string): Promise<MediaAsset[]> => {
        const response = await api.get<MediaAsset[]>(`/media/content/${contentId}`, { params: { tenantId } });
        return response.data;
    },

    attachToContent: async (assetId: string, contentId: string, tenantId: string): Promise<MediaAsset> => {
        const response = await api.post<MediaAsset>(`/media/${assetId}/attach`, { contentId, tenantId });
        return response.data;
    },

    delete: async (id: string, tenantId: string): Promise<void> => {
        await api.delete(`/media/${id}`, { params: { tenantId } });
    }
};

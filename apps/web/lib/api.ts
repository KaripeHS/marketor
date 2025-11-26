import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Interceptor to inject auth headers
api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        // Try JWT token first
        const token = localStorage.getItem("marketor_token");
        if (token) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }

        // Always include tenant ID if available (needed for multi-tenant context)
        const tenantId = localStorage.getItem("marketor_tenant_id");
        if (tenantId) {
            config.headers["x-tenant-id"] = tenantId;
        }

        // Legacy header auth fallback (for development/testing without JWT)
        if (!token) {
            const userId = localStorage.getItem("marketor_user_id");
            if (userId) {
                config.headers["x-user-id"] = userId;
            }
        }
    }
    return config;
});

// Response interceptor for handling auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear auth state on unauthorized
            if (typeof window !== "undefined") {
                localStorage.removeItem("marketor_token");
                localStorage.removeItem("marketor_user_id");
                localStorage.removeItem("marketor_tenant_id");
                // Redirect to login if not already there
                if (!window.location.pathname.includes("/login")) {
                    window.location.href = "/login";
                }
            }
        }
        return Promise.reject(error);
    }
);

export interface ApiError {
    message: string;
    statusCode: number;
}

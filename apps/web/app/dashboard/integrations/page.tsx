"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { socialConnectionsService, postJobsService, oauthService, OAuthPlatformInfo } from "@/services/api";
import { SocialConnection, PostJob, Platform, PostJobStatus, JobStats } from "@/types";
import {
    Loader2,
    Plus,
    Unlink,
    RefreshCw,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    ExternalLink,
    Shield,
    X,
} from "lucide-react";
import { toast } from "sonner";

const platformIcons: Record<string, string> = {
    TIKTOK: "🎵",
    INSTAGRAM: "📸",
    YOUTUBE: "📺",
    YOUTUBE_SHORT: "📱",
    FACEBOOK: "👤",
    TWITTER: "𝕏",
    LINKEDIN: "💼",
    PINTEREST: "📌",
};

const platformColors: Record<string, string> = {
    TIKTOK: "bg-black text-white",
    INSTAGRAM: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
    YOUTUBE: "bg-red-600 text-white",
    YOUTUBE_SHORT: "bg-red-500 text-white",
    FACEBOOK: "bg-blue-600 text-white",
    TWITTER: "bg-black text-white",
    LINKEDIN: "bg-blue-700 text-white",
    PINTEREST: "bg-red-700 text-white",
};

const statusColors: Record<PostJobStatus, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    CANCELLED: "bg-gray-100 text-gray-800",
};

function IntegrationsContent() {
    const searchParams = useSearchParams();
    const [connections, setConnections] = useState<SocialConnection[]>([]);
    const [jobs, setJobs] = useState<PostJob[]>([]);
    const [stats, setStats] = useState<JobStats | null>(null);
    const [platforms, setPlatforms] = useState<OAuthPlatformInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [connectingPlatform, setConnectingPlatform] = useState<Platform | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [connectionsData, jobsData, statsData, platformsData] = await Promise.all([
                socialConnectionsService.list(),
                postJobsService.list(),
                postJobsService.getStats(),
                oauthService.getPlatforms().catch(() => [] as OAuthPlatformInfo[]),
            ]);
            setConnections(connectionsData);
            setJobs(jobsData);
            setStats(statsData);
            setPlatforms(platformsData);
        } catch (error) {
            console.error("Failed to fetch integrations data", error);
            toast.error("Failed to load integrations");
        } finally {
            setLoading(false);
        }
    }, []);

    // Handle OAuth callback parameters
    useEffect(() => {
        const success = searchParams.get("success");
        const error = searchParams.get("error");
        const platform = searchParams.get("platform");

        if (success) {
            toast.success(decodeURIComponent(success));
            // Clean up URL
            window.history.replaceState({}, "", "/dashboard/integrations");
        } else if (error) {
            toast.error(`${platform ? platform + ": " : ""}${decodeURIComponent(error)}`);
            window.history.replaceState({}, "", "/dashboard/integrations");
        }
    }, [searchParams]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleConnect = (platform: Platform) => {
        setConnectingPlatform(platform);
        // Redirect to OAuth authorization endpoint
        const authUrl = oauthService.getAuthorizationUrl(platform);
        window.location.href = authUrl;
    };

    const handleDisconnect = async (id: string) => {
        if (!confirm("Are you sure you want to disconnect this account? This will cancel any pending posts.")) return;
        try {
            await socialConnectionsService.disconnect(id);
            toast.success("Account disconnected");
            fetchData();
        } catch (error) {
            toast.error("Failed to disconnect account");
        }
    };

    const handleRefreshToken = async (id: string) => {
        try {
            await oauthService.refreshToken(id);
            toast.success("Token refreshed successfully");
            fetchData();
        } catch (error: any) {
            const message = error.response?.data?.message || "Failed to refresh token";
            if (message.includes("reconnect")) {
                toast.error("Token expired. Please reconnect your account.");
            } else {
                toast.error(message);
            }
        }
    };

    const handleCancelJob = async (id: string) => {
        try {
            await postJobsService.cancel(id);
            toast.success("Job cancelled");
            fetchData();
        } catch (error) {
            toast.error("Failed to cancel job");
        }
    };

    const handleRetryJob = async (id: string) => {
        try {
            await postJobsService.retry(id);
            toast.success("Job queued for retry");
            fetchData();
        } catch (error) {
            toast.error("Failed to retry job");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    // Get connected platform IDs
    const connectedPlatforms = new Set(
        connections.filter((c) => c.isActive).map((c) => c.platform)
    );

    // Platforms available for connection
    const availablePlatforms = platforms.filter(
        (p) => p.configured && !connectedPlatforms.has(p.platform)
    );

    // Platforms that are not configured (need API keys)
    const unconfiguredPlatforms = platforms.filter((p) => !p.configured);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Social Integrations</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Connect your social accounts to publish content directly
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowConnectModal(true)}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Connect Account
                </button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center">
                            <Clock className="w-5 h-5 text-yellow-500 mr-2" />
                            <span className="text-sm text-gray-600">Pending</span>
                        </div>
                        <p className="text-2xl font-bold mt-2">{stats.pending}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center">
                            <Loader2 className="w-5 h-5 text-blue-500 mr-2" />
                            <span className="text-sm text-gray-600">Processing</span>
                        </div>
                        <p className="text-2xl font-bold mt-2">{stats.processing}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center">
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                            <span className="text-sm text-gray-600">Completed</span>
                        </div>
                        <p className="text-2xl font-bold mt-2">{stats.completed}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center">
                            <XCircle className="w-5 h-5 text-red-500 mr-2" />
                            <span className="text-sm text-gray-600">Failed</span>
                        </div>
                        <p className="text-2xl font-bold mt-2">{stats.failed}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center">
                            <AlertCircle className="w-5 h-5 text-gray-500 mr-2" />
                            <span className="text-sm text-gray-600">Total Jobs</span>
                        </div>
                        <p className="text-2xl font-bold mt-2">{stats.total}</p>
                    </div>
                </div>
            )}

            {/* Connected Accounts */}
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Connected Accounts</h3>
                </div>
                <div className="p-4">
                    {connections.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Shield className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts connected</h3>
                            <p className="text-gray-500 mb-4">
                                Connect your social media accounts to start publishing content.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowConnectModal(true)}
                                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Connect Your First Account
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {connections.map((connection) => {
                                const isExpiringSoon = connection.tokenExpiry &&
                                    new Date(connection.tokenExpiry) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

                                return (
                                    <div
                                        key={connection.id}
                                        className={`flex items-center justify-between p-4 rounded-lg border ${
                                            connection.isActive
                                                ? isExpiringSoon
                                                    ? "border-yellow-300 bg-yellow-50"
                                                    : "border-gray-200"
                                                : "border-gray-100 bg-gray-50 opacity-60"
                                        }`}
                                    >
                                        <div className="flex items-center">
                                            <span className={`px-3 py-2 rounded-lg text-lg ${platformColors[connection.platform] || "bg-gray-500 text-white"}`}>
                                                {platformIcons[connection.platform] || "📱"}
                                            </span>
                                            <div className="ml-4">
                                                <p className="font-medium text-gray-900">
                                                    {connection.accountName || connection.platform}
                                                </p>
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    {connection.isActive ? (
                                                        <span className="flex items-center text-green-600">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Connected
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center text-gray-500">
                                                            <XCircle className="w-3 h-3 mr-1" />
                                                            Disconnected
                                                        </span>
                                                    )}
                                                    {connection.tokenExpiry && (
                                                        <span className={isExpiringSoon ? "text-yellow-600" : ""}>
                                                            · Expires {new Date(connection.tokenExpiry).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {isExpiringSoon && connection.isActive && (
                                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                                    Expires soon
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleRefreshToken(connection.id)}
                                                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                                title="Refresh token"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDisconnect(connection.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                                title="Disconnect"
                                            >
                                                <Unlink className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Post Jobs Queue */}
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Publishing Queue</h3>
                    <button
                        type="button"
                        onClick={fetchData}
                        className="text-sm text-purple-600 hover:text-purple-800 flex items-center"
                    >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Refresh
                    </button>
                </div>
                <div className="p-4">
                    {jobs.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                            No publishing jobs in queue. Schedule content to see them here.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {jobs.map((job) => (
                                        <tr key={job.id}>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-sm ${platformColors[job.platform] || "bg-gray-500 text-white"}`}>
                                                    {platformIcons[job.platform] || "📱"} {job.platform}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {new Date(job.scheduledFor).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[job.status]}`}>
                                                    {job.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {job.attempts}/{job.maxAttempts}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center space-x-2">
                                                    {job.status === PostJobStatus.PENDING && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCancelJob(job.id)}
                                                            className="text-red-600 hover:text-red-800 text-sm"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                    {job.status === PostJobStatus.FAILED && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRetryJob(job.id)}
                                                            className="text-blue-600 hover:text-blue-800 text-sm"
                                                        >
                                                            Retry
                                                        </button>
                                                    )}
                                                    {job.publishResult?.platformUrl && (
                                                        <a
                                                            href={job.publishResult.platformUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-gray-500 hover:text-gray-700"
                                                            title="View on platform"
                                                            aria-label="View post on platform"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Connect Modal */}
            {showConnectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">Connect Social Account</h3>
                            <button
                                type="button"
                                onClick={() => setShowConnectModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                                aria-label="Close modal"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {availablePlatforms.length === 0 && unconfiguredPlatforms.length === 0 && connectedPlatforms.size === 0 ? (
                                <p className="text-gray-500 text-center py-4">
                                    No platforms available. Please contact support.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {/* Available Platforms */}
                                    {availablePlatforms.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 mb-3">Available Platforms</h4>
                                            <div className="space-y-2">
                                                {availablePlatforms.map((platform) => (
                                                    <button
                                                        key={platform.platform}
                                                        type="button"
                                                        onClick={() => handleConnect(platform.platform)}
                                                        disabled={connectingPlatform === platform.platform}
                                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-opacity hover:opacity-90 ${platformColors[platform.platform] || "bg-gray-600 text-white"} disabled:opacity-50`}
                                                    >
                                                        <div className="flex items-center">
                                                            <span className="text-2xl mr-3">{platformIcons[platform.platform] || "📱"}</span>
                                                            <span className="font-medium">{platform.displayName}</span>
                                                        </div>
                                                        {connectingPlatform === platform.platform ? (
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                        ) : (
                                                            <ExternalLink className="w-4 h-4 opacity-60" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Unconfigured Platforms */}
                                    {unconfiguredPlatforms.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 mb-3">Coming Soon</h4>
                                            <div className="space-y-2">
                                                {unconfiguredPlatforms.map((platform) => (
                                                    <div
                                                        key={platform.platform}
                                                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gray-100 text-gray-500"
                                                    >
                                                        <div className="flex items-center">
                                                            <span className="text-2xl mr-3 grayscale">{platformIcons[platform.platform] || "📱"}</span>
                                                            <span className="font-medium">{platform.displayName}</span>
                                                        </div>
                                                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">Not Configured</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Already Connected */}
                                    {connectedPlatforms.size > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 mb-3">Already Connected</h4>
                                            <div className="space-y-2">
                                                {Array.from(connectedPlatforms).map((platform) => {
                                                    const info = platforms.find((p) => p.platform === platform);
                                                    return (
                                                        <div
                                                            key={platform}
                                                            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-green-50 border border-green-200"
                                                        >
                                                            <div className="flex items-center">
                                                                <span className="text-2xl mr-3">{platformIcons[platform] || "📱"}</span>
                                                                <span className="font-medium text-green-800">{info?.displayName || platform}</span>
                                                            </div>
                                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-gray-50 rounded-b-lg border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                                Connecting will redirect you to the platform for authorization. Your data is encrypted and secure.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function IntegrationsPage() {
    return (
        <DashboardLayout>
            <Suspense fallback={
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            }>
                <IntegrationsContent />
            </Suspense>
        </DashboardLayout>
    );
}

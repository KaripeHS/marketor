"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { socialConnectionsService, postJobsService } from "@/services/api";
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
    ExternalLink
} from "lucide-react";
import { toast } from "sonner";

const platformIcons: Record<Platform, string> = {
    TIKTOK: "🎵",
    INSTAGRAM: "📸",
    YOUTUBE: "📺",
    YOUTUBE_SHORT: "📱",
    FACEBOOK: "👤",
};

const platformColors: Record<Platform, string> = {
    TIKTOK: "bg-black text-white",
    INSTAGRAM: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
    YOUTUBE: "bg-red-600 text-white",
    YOUTUBE_SHORT: "bg-red-500 text-white",
    FACEBOOK: "bg-blue-600 text-white",
};

const statusColors: Record<PostJobStatus, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    CANCELLED: "bg-gray-100 text-gray-800",
};

export default function IntegrationsPage() {
    const [connections, setConnections] = useState<SocialConnection[]>([]);
    const [jobs, setJobs] = useState<PostJob[]>([]);
    const [stats, setStats] = useState<JobStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [showConnectModal, setShowConnectModal] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [connectionsData, jobsData, statsData] = await Promise.all([
                socialConnectionsService.list(),
                postJobsService.list(),
                postJobsService.getStats(),
            ]);
            setConnections(connectionsData);
            setJobs(jobsData);
            setStats(statsData);
        } catch (error) {
            console.error("Failed to fetch integrations data", error);
            toast.error("Failed to load integrations");
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (platform: Platform) => {
        // In a real implementation, this would initiate OAuth flow
        // For now, we'll create a mock connection
        try {
            await socialConnectionsService.create({
                platform,
                accountId: `mock_${platform.toLowerCase()}_${Date.now()}`,
                accountName: `${platform} Account`,
                accessToken: `mock_token_${Date.now()}`,
                scopes: ["read", "write", "publish"],
            });
            toast.success(`Connected to ${platform}`);
            setShowConnectModal(false);
            fetchData();
        } catch (error) {
            toast.error(`Failed to connect to ${platform}`);
        }
    };

    const handleDisconnect = async (id: string) => {
        if (!confirm("Are you sure you want to disconnect this account?")) return;
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
            await socialConnectionsService.refresh(id);
            toast.success("Token refreshed");
            fetchData();
        } catch (error) {
            toast.error("Failed to refresh token");
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
            <DashboardLayout>
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            </DashboardLayout>
        );
    }

    const availablePlatforms = Object.values(Platform).filter(
        (p) => !connections.some((c) => c.platform === p && c.isActive)
    );

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Social Integrations</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Connect your social accounts and manage publishing
                        </p>
                    </div>
                    <button
                        onClick={() => setShowConnectModal(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                            <p className="text-gray-500 text-center py-8">
                                No accounts connected. Click &quot;Connect Account&quot; to get started.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {connections.map((connection) => (
                                    <div
                                        key={connection.id}
                                        className={`flex items-center justify-between p-4 rounded-lg border ${
                                            connection.isActive ? "border-gray-200" : "border-gray-100 bg-gray-50 opacity-60"
                                        }`}
                                    >
                                        <div className="flex items-center">
                                            <span className={`px-3 py-2 rounded-lg text-lg ${platformColors[connection.platform]}`}>
                                                {platformIcons[connection.platform]}
                                            </span>
                                            <div className="ml-4">
                                                <p className="font-medium text-gray-900">
                                                    {connection.accountName || connection.platform}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {connection.isActive ? "Connected" : "Disconnected"}
                                                    {connection.tokenExpiry && (
                                                        <> · Expires {new Date(connection.tokenExpiry).toLocaleDateString()}</>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => handleRefreshToken(connection.id)}
                                                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                                title="Refresh token"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDisconnect(connection.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                                title="Disconnect"
                                            >
                                                <Unlink className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Post Jobs Queue */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">Publishing Queue</h3>
                        <button
                            onClick={fetchData}
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                        >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Refresh
                        </button>
                    </div>
                    <div className="p-4">
                        {jobs.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">
                                No publishing jobs in queue.
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
                                                    <span className={`px-2 py-1 rounded text-sm ${platformColors[job.platform]}`}>
                                                        {platformIcons[job.platform]} {job.platform}
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
                                                                onClick={() => handleCancelJob(job.id)}
                                                                className="text-red-600 hover:text-red-800 text-sm"
                                                            >
                                                                Cancel
                                                            </button>
                                                        )}
                                                        {job.status === PostJobStatus.FAILED && (
                                                            <button
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
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="text-lg font-medium text-gray-900">Connect Account</h3>
                                <button
                                    onClick={() => setShowConnectModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="p-6 space-y-3">
                                {availablePlatforms.length === 0 ? (
                                    <p className="text-gray-500 text-center">
                                        All platforms are already connected.
                                    </p>
                                ) : (
                                    availablePlatforms.map((platform) => (
                                        <button
                                            key={platform}
                                            onClick={() => handleConnect(platform)}
                                            className={`w-full flex items-center px-4 py-3 rounded-lg transition-opacity hover:opacity-80 ${platformColors[platform]}`}
                                        >
                                            <span className="text-2xl mr-3">{platformIcons[platform]}</span>
                                            <span className="font-medium">Connect {platform}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                            <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
                                <p className="text-xs text-gray-500">
                                    Note: This is a demo. In production, connecting would initiate an OAuth flow.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

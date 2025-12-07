"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { adminService } from "@/services/api";
import {
    Activity,
    Users,
    Building2,
    FileText,
    Server,
    Database,
    HardDrive,
    Loader2,
    AlertTriangle,
    CheckCircle,
    XCircle,
    TrendingUp,
    ArrowRight,
} from "lucide-react";

interface SystemHealth {
    status: "healthy" | "degraded" | "unhealthy";
    uptime: number;
    timestamp: string;
    services: {
        database: { status: string; latency?: number };
        cache: { status: string };
        queue: { status: string };
    };
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
}

interface SystemStats {
    tenants: { total: number; active: number; newThisMonth: number };
    users: { total: number; active: number; newThisMonth: number };
    content: { total: number; published: number; scheduled: number; draft: number };
    campaigns: { total: number; active: number };
    social: { connections: number; postsPublished: number; failedPosts: number };
}

export default function AdminDashboardPage() {
    const { currentMembership, isLoading: authLoading } = useAuth();
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [healthData, statsData] = await Promise.all([
                    adminService.getHealth(),
                    adminService.getStats(),
                ]);
                setHealth(healthData);
                setStats(statsData);
            } catch (err) {
                setError("Failed to load admin data. You may not have admin access.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading && currentMembership?.role === "ADMIN") {
            fetchData();
        } else if (!authLoading) {
            setError("Admin access required");
            setLoading(false);
        }
    }, [authLoading, currentMembership]);

    const formatUptime = (ms: number) => {
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        return `${days}d ${hours}h ${minutes}m`;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "up":
            case "healthy":
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case "degraded":
                return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            default:
                return <XCircle className="w-5 h-5 text-red-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "up":
            case "healthy":
                return "bg-green-100 text-green-800";
            case "degraded":
                return "bg-yellow-100 text-yellow-800";
            default:
                return "bg-red-100 text-red-800";
        }
    };

    if (loading || authLoading) {
        return (
            <DashboardLayout>
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-red-800">{error}</h2>
                    <p className="text-sm text-red-600 mt-2">
                        Contact your administrator if you believe this is an error.
                    </p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                        <p className="text-sm text-gray-500 mt-1">System monitoring and management</p>
                    </div>
                    {health && (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(health.status)}`}>
                            {getStatusIcon(health.status)}
                            <span className="ml-2 capitalize">{health.status}</span>
                        </span>
                    )}
                </div>

                {/* System Health */}
                {health && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Activity className="w-5 h-5 mr-2 text-blue-500" />
                            System Health
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-500">Database</span>
                                    {getStatusIcon(health.services.database.status)}
                                </div>
                                <div className="flex items-center">
                                    <Database className="w-4 h-4 text-gray-400 mr-2" />
                                    {health.services.database.latency && (
                                        <span className="text-sm font-medium">{health.services.database.latency}ms</span>
                                    )}
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-500">Cache</span>
                                    {getStatusIcon(health.services.cache.status)}
                                </div>
                                <div className="flex items-center">
                                    <Server className="w-4 h-4 text-gray-400 mr-2" />
                                    <span className="text-sm font-medium capitalize">{health.services.cache.status}</span>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-500">Queue</span>
                                    {getStatusIcon(health.services.queue.status)}
                                </div>
                                <div className="flex items-center">
                                    <Activity className="w-4 h-4 text-gray-400 mr-2" />
                                    <span className="text-sm font-medium capitalize">{health.services.queue.status}</span>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-500">Memory</span>
                                    <span className="text-sm font-medium">{health.memory.percentage}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${health.memory.percentage > 80 ? "bg-red-500" : health.memory.percentage > 60 ? "bg-yellow-500" : "bg-green-500"}`}
                                        style={{ width: `${health.memory.percentage}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {health.memory.used}MB / {health.memory.total}MB
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-500">
                                <HardDrive className="w-4 h-4 inline mr-1" />
                                Uptime: <span className="font-medium">{formatUptime(health.uptime)}</span>
                            </p>
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Link href="/admin/tenants" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Total Tenants</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.tenants.total}</p>
                                    <p className="text-xs text-green-600 mt-1">
                                        +{stats.tenants.newThisMonth} this month
                                    </p>
                                </div>
                                <Building2 className="w-10 h-10 text-blue-500" />
                            </div>
                        </Link>

                        <Link href="/admin/users" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Total Users</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.users.total}</p>
                                    <p className="text-xs text-green-600 mt-1">
                                        +{stats.users.newThisMonth} this month
                                    </p>
                                </div>
                                <Users className="w-10 h-10 text-purple-500" />
                            </div>
                        </Link>

                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Content Items</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.content.total}</p>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-xs text-green-600">{stats.content.published} published</span>
                                        <span className="text-xs text-blue-600">{stats.content.scheduled} scheduled</span>
                                    </div>
                                </div>
                                <FileText className="w-10 h-10 text-green-500" />
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Social Posts</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.social.postsPublished}</p>
                                    {stats.social.failedPosts > 0 && (
                                        <p className="text-xs text-red-600 mt-1">
                                            {stats.social.failedPosts} failed
                                        </p>
                                    )}
                                </div>
                                <TrendingUp className="w-10 h-10 text-orange-500" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link
                        href="/admin/tenants"
                        className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow flex items-center justify-between"
                    >
                        <div className="flex items-center">
                            <Building2 className="w-6 h-6 text-blue-500 mr-3" />
                            <span className="font-medium">Manage Tenants</span>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                    </Link>

                    <Link
                        href="/admin/users"
                        className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow flex items-center justify-between"
                    >
                        <div className="flex items-center">
                            <Users className="w-6 h-6 text-purple-500 mr-3" />
                            <span className="font-medium">Manage Users</span>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                    </Link>

                    <Link
                        href="/admin/audit"
                        className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow flex items-center justify-between"
                    >
                        <div className="flex items-center">
                            <Activity className="w-6 h-6 text-green-500 mr-3" />
                            <span className="font-medium">View Audit Logs</span>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                    </Link>
                </div>
            </div>
        </DashboardLayout>
    );
}

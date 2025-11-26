"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { auditService } from "@/services/api";
import { Loader2, RefreshCw, History, User, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditLogEntry {
    id: string;
    actorId?: string;
    tenantId?: string;
    action: string;
    targetType?: string;
    targetId?: string;
    meta?: Record<string, any>;
    createdAt: string;
}

export default function AuditLogPage() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [limit, setLimit] = useState(100);

    useEffect(() => {
        fetchLogs();
    }, [limit]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await auditService.list(limit);
            setLogs(data);
        } catch (error) {
            console.error("Failed to fetch audit logs", error);
        } finally {
            setLoading(false);
        }
    };

    const getActionBadgeColor = (action: string) => {
        if (action.includes("POST")) return "bg-green-100 text-green-800";
        if (action.includes("PATCH")) return "bg-yellow-100 text-yellow-800";
        if (action.includes("DELETE")) return "bg-red-100 text-red-800";
        return "bg-blue-100 text-blue-800";
    };

    const formatAction = (action: string) => {
        const parts = action.split(" ");
        if (parts.length >= 2) {
            const method = parts[0];
            const path = parts.slice(1).join(" ");
            return { method, path };
        }
        return { method: "GET", path: action };
    };

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto">
                <div className="md:flex md:items-center md:justify-between mb-8">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                            Audit Log
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Track all activities and changes in your organization.
                        </p>
                    </div>
                    <div className="mt-4 flex items-center space-x-4 md:ml-4 md:mt-0">
                        <select
                            aria-label="Select number of entries"
                            value={limit}
                            onChange={(e) => setLimit(parseInt(e.target.value, 10))}
                            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                        >
                            <option value={50}>Last 50 entries</option>
                            <option value={100}>Last 100 entries</option>
                            <option value={250}>Last 250 entries</option>
                            <option value={500}>Last 500 entries</option>
                        </select>
                        <button
                            onClick={fetchLogs}
                            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        >
                            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                            Refresh
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                        <History className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Activities will appear here as they occur.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200">
                            {logs.map((log) => {
                                const { method, path } = formatAction(log.action);
                                return (
                                    <li key={log.id}>
                                        <div className="px-4 py-4 sm:px-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <span
                                                        className={cn(
                                                            "inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium",
                                                            getActionBadgeColor(method)
                                                        )}
                                                    >
                                                        {method}
                                                    </span>
                                                    <span className="text-sm font-mono text-gray-700">
                                                        {path}
                                                    </span>
                                                </div>
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <Clock className="h-4 w-4 mr-1" />
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                                                {log.actorId && (
                                                    <div className="flex items-center">
                                                        <User className="h-4 w-4 mr-1" />
                                                        <span className="font-mono text-xs">{log.actorId}</span>
                                                    </div>
                                                )}
                                                {log.targetType && (
                                                    <div className="flex items-center">
                                                        <FileText className="h-4 w-4 mr-1" />
                                                        <span>{log.targetType}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {log.meta && Object.keys(log.meta).length > 0 && (
                                                <div className="mt-2">
                                                    <details className="text-xs text-gray-500">
                                                        <summary className="cursor-pointer hover:text-gray-700">
                                                            View metadata
                                                        </summary>
                                                        <pre className="mt-1 p-2 bg-gray-50 rounded overflow-x-auto">
                                                            {JSON.stringify(log.meta, null, 2)}
                                                        </pre>
                                                    </details>
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                {logs.length > 0 && (
                    <div className="mt-4 text-sm text-gray-500 text-center">
                        Showing {logs.length} entries
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { analyticsService } from "@/services/api";
import { AnalyticsData } from "@/types";
import AnalyticsChart from "@/components/analytics/AnalyticsChart";
import { ArrowUp, ArrowDown, Eye, Users, FileText, Activity, Loader2 } from "lucide-react";

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("30d");

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const result = await analyticsService.getOverview(period);
                setData(result);
            } catch (error) {
                console.error("Failed to fetch analytics", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [period]);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            </DashboardLayout>
        );
    }

    if (!data) {
        return (
            <DashboardLayout>
                <div className="p-8 text-center text-red-500">Failed to load analytics data</div>
            </DashboardLayout>
        );
    }

    const metrics = [
        {
            name: "Total Views",
            value: data.metrics.totalViews.toLocaleString(),
            change: "+12%",
            changeType: "positive",
            icon: Eye,
            color: "text-blue-600",
            bg: "bg-blue-100"
        },
        {
            name: "Engagement Rate",
            value: `${data.metrics.engagementRate}%`,
            change: "+2.1%",
            changeType: "positive",
            icon: Activity,
            color: "text-green-600",
            bg: "bg-green-100"
        },
        {
            name: "Followers Gained",
            value: data.metrics.followersGained.toLocaleString(),
            change: "+5.4%",
            changeType: "positive",
            icon: Users,
            color: "text-purple-600",
            bg: "bg-purple-100"
        },
        {
            name: "Posts Published",
            value: data.metrics.postsPublished,
            change: "-2",
            changeType: "negative",
            icon: FileText,
            color: "text-orange-600",
            bg: "bg-orange-100"
        }
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
                    <select
                        aria-label="Select time period"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    >
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                    </select>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {metrics.map((item) => (
                    <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className={`flex-shrink-0 rounded-md p-3 ${item.bg}`}>
                                    <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                                        <dd className="flex items-baseline">
                                            <div className="text-2xl font-semibold text-gray-900">{item.value}</div>
                                            <div
                                                className={`ml-2 flex items-baseline text-sm font-semibold ${item.changeType === "positive" ? "text-green-600" : "text-red-600"
                                                    }`}
                                            >
                                                {item.changeType === "positive" ? (
                                                    <ArrowUp className="self-center flex-shrink-0 h-4 w-4 text-green-500" />
                                                ) : (
                                                    <ArrowDown className="self-center flex-shrink-0 h-4 w-4 text-red-500" />
                                                )}
                                                <span className="sr-only">
                                                    {item.changeType === "positive" ? "Increased" : "Decreased"} by
                                                </span>
                                                {item.change}
                                            </div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Views Over Time */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Views Over Time</h3>
                    <AnalyticsChart type="line" data={data.viewsOverTime} dataKey="value" color="#3b82f6" />
                </div>

                {/* Engagement by Platform */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Engagement by Platform</h3>
                    <AnalyticsChart
                        type="bar"
                        data={data.engagementByPlatform}
                        dataKey="value"
                        xAxisKey="platform"
                        color="#8b5cf6"
                    />
                </div>
            </div>
            </div>
        </DashboardLayout>
    );
}

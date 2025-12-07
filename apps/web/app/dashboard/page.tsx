"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import GettingStartedWizard from "@/components/dashboard/GettingStartedWizard";
import { useAuth } from "@/contexts/AuthContext";
import { campaignsService, contentService, analyticsService } from "@/services/api";
import { Campaign, ContentItem, AnalyticsData, ContentState } from "@/types";
import { Megaphone, FileText, Eye, Users, ArrowRight, Loader2, Calendar, Target } from "lucide-react";

export default function DashboardPage() {
    const { currentTenant, currentUser, isLoading: authLoading } = useAuth();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [content, setContent] = useState<ContentItem[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [campaignsData, contentData, analyticsData] = await Promise.all([
                    campaignsService.list(),
                    contentService.list(),
                    analyticsService.getOverview("30d"),
                ]);
                setCampaigns(campaignsData);
                setContent(contentData);
                setAnalytics(analyticsData);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            fetchData();
        }
    }, [authLoading]);

    const scheduledContent = content.filter(c => c.state === ContentState.SCHEDULED);
    const draftContent = content.filter(c => c.state === ContentState.DRAFT);
    const publishedContent = content.filter(c => c.state === ContentState.PUBLISHED);
    const activeCampaigns = campaigns.filter(c => c.status === "ACTIVE");

    const stats = [
        {
            name: "Active Campaigns",
            value: activeCampaigns.length,
            icon: Megaphone,
            color: "text-blue-600",
            bg: "bg-blue-100",
            href: "/dashboard/campaigns"
        },
        {
            name: "Content Items",
            value: content.length,
            icon: FileText,
            color: "text-purple-600",
            bg: "bg-purple-100",
            href: "/dashboard/content"
        },
        {
            name: "Total Views",
            value: analytics?.metrics.totalViews.toLocaleString() || "0",
            icon: Eye,
            color: "text-green-600",
            bg: "bg-green-100",
            href: "/dashboard/analytics"
        },
        {
            name: "Followers Gained",
            value: analytics?.metrics.followersGained.toLocaleString() || "0",
            icon: Users,
            color: "text-orange-600",
            bg: "bg-orange-100",
            href: "/dashboard/analytics"
        },
    ];

    if (loading || authLoading) {
        return (
            <DashboardLayout>
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Getting Started Wizard */}
                <GettingStartedWizard />

                {/* Header */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        Welcome back{currentUser?.name ? `, ${currentUser.name}` : ""}!
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        {currentTenant?.name || "Your Organization"} Dashboard
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat) => (
                        <Link
                            key={stat.name}
                            href={stat.href}
                            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
                        >
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className={`flex-shrink-0 rounded-md p-3 ${stat.bg}`}>
                                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">
                                                {stat.name}
                                            </dt>
                                            <dd className="text-2xl font-semibold text-gray-900">
                                                {stat.value}
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Quick Actions & Recent Activity */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Quick Actions */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                Quick Actions
                            </h3>
                        </div>
                        <div className="p-4 space-y-3">
                            <Link
                                href="/dashboard/content"
                                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <div className="flex items-center">
                                    <FileText className="h-5 w-5 text-blue-600 mr-3" />
                                    <span className="text-sm font-medium text-blue-900">Create New Content</span>
                                </div>
                                <ArrowRight className="h-4 w-4 text-blue-600" />
                            </Link>
                            <Link
                                href="/dashboard/campaigns"
                                className="flex items-center justify-between p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                            >
                                <div className="flex items-center">
                                    <Megaphone className="h-5 w-5 text-purple-600 mr-3" />
                                    <span className="text-sm font-medium text-purple-900">New Campaign</span>
                                </div>
                                <ArrowRight className="h-4 w-4 text-purple-600" />
                            </Link>
                            <Link
                                href="/dashboard/strategy"
                                className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                            >
                                <div className="flex items-center">
                                    <Target className="h-5 w-5 text-green-600 mr-3" />
                                    <span className="text-sm font-medium text-green-900">Create Strategy</span>
                                </div>
                                <ArrowRight className="h-4 w-4 text-green-600" />
                            </Link>
                            <Link
                                href="/dashboard/calendar"
                                className="flex items-center justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                            >
                                <div className="flex items-center">
                                    <Calendar className="h-5 w-5 text-orange-600 mr-3" />
                                    <span className="text-sm font-medium text-orange-900">View Calendar</span>
                                </div>
                                <ArrowRight className="h-4 w-4 text-orange-600" />
                            </Link>
                        </div>
                    </div>

                    {/* Content Overview */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                Content Overview
                            </h3>
                        </div>
                        <div className="p-4">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 bg-yellow-400 rounded-full mr-3"></div>
                                        <span className="text-sm font-medium text-gray-700">Drafts</span>
                                    </div>
                                    <span className="text-lg font-semibold text-gray-900">{draftContent.length}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 bg-blue-400 rounded-full mr-3"></div>
                                        <span className="text-sm font-medium text-gray-700">Scheduled</span>
                                    </div>
                                    <span className="text-lg font-semibold text-gray-900">{scheduledContent.length}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                                        <span className="text-sm font-medium text-gray-700">Published</span>
                                    </div>
                                    <span className="text-lg font-semibold text-gray-900">{publishedContent.length}</span>
                                </div>
                            </div>
                            <div className="mt-4">
                                <Link
                                    href="/dashboard/content"
                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                                >
                                    View all content
                                    <ArrowRight className="h-4 w-4 ml-1" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Campaigns */}
                {campaigns.length > 0 && (
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                Recent Campaigns
                            </h3>
                            <Link
                                href="/dashboard/campaigns"
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                View all
                            </Link>
                        </div>
                        <ul className="divide-y divide-gray-200">
                            {campaigns.slice(0, 5).map((campaign) => (
                                <li key={campaign.id} className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{campaign.name}</p>
                                            <p className="text-sm text-gray-500">
                                                Created {new Date(campaign.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                campaign.status === "ACTIVE"
                                                    ? "bg-green-100 text-green-800"
                                                    : campaign.status === "PAUSED"
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : "bg-gray-100 text-gray-800"
                                            }`}
                                        >
                                            {campaign.status}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

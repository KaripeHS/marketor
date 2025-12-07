"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { contentService, campaignsService, aiService } from "@/services/api";
import { ContentItem, ContentFormat, Platform, ContentState, Campaign, UpdateContentDto } from "@/types";
import { Plus, Loader2, Filter, Edit2, Sparkles, X, Trash2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ContentPage() {
    const [contentItems, setContentItems] = useState<ContentItem[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Filter State
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");

    // Form State
    const [formData, setFormData] = useState({
        platform: Platform.TIKTOK,
        format: ContentFormat.SHORT_VIDEO,
        campaignId: "",
        scheduledFor: "",
        state: ContentState.DRAFT,
    });

    // AI State
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiIdeas, setAiIdeas] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [contentData, campaignsData] = await Promise.all([
                contentService.list(selectedCampaignId ? { campaignId: selectedCampaignId } : {}),
                campaignsService.list(),
            ]);
            setContentItems(contentData);
            setCampaigns(campaignsData);
        } catch (error) {
            console.error("Failed to fetch data", error);
            toast.error("Failed to fetch content");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedCampaignId]);

    const openCreateModal = () => {
        setEditingItem(null);
        setFormData({
            platform: Platform.TIKTOK,
            format: ContentFormat.SHORT_VIDEO,
            campaignId: "",
            scheduledFor: "",
            state: ContentState.DRAFT,
        });
        setIsModalOpen(true);
    };

    const openEditModal = (item: ContentItem) => {
        setEditingItem(item);
        setFormData({
            platform: item.platform,
            format: item.format,
            campaignId: item.campaignId || "",
            scheduledFor: item.scheduledFor ? new Date(item.scheduledFor).toISOString().slice(0, 16) : "",
            state: item.state,
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this content?")) return;
        try {
            await contentService.delete(id);
            toast.success("Content deleted successfully");
            fetchData();
        } catch (error) {
            console.error("Failed to delete content", error);
            toast.error("Failed to delete content");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingItem) {
                const dto: UpdateContentDto = {
                    platform: formData.platform,
                    format: formData.format,
                    campaignId: formData.campaignId || undefined,
                    scheduledFor: formData.scheduledFor ? new Date(formData.scheduledFor).toISOString() : undefined,
                    state: formData.state,
                };
                await contentService.update(editingItem.id, dto);
                toast.success("Content updated successfully");
            } else {
                await contentService.create({
                    platform: formData.platform,
                    format: formData.format,
                    campaignId: formData.campaignId || undefined,
                    scheduledFor: formData.scheduledFor ? new Date(formData.scheduledFor).toISOString() : undefined,
                    state: formData.state,
                });
                toast.success("Content created successfully");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Failed to save content", error);
            toast.error("Failed to save content");
        } finally {
            setSubmitting(false);
        }
    };

    const handleGenerateIdeas = async () => {
        setAiGenerating(true);
        setIsAiModalOpen(true);
        try {
            const context = {
                campaigns: campaigns.map(c => c.name),
                recentContent: contentItems.slice(0, 5).map(c => ({ platform: c.platform, format: c.format }))
            };
            const result = await aiService.generate("CONTENT", context);
            if (result && result.data?.ideas) {
                setAiIdeas(result.data.ideas);
                toast.success("Ideas generated!");
            }
        } catch (error) {
            console.error("Failed to generate ideas", error);
            toast.error("Failed to generate ideas");
        } finally {
            setAiGenerating(false);
        }
    };

    const useIdea = (idea: any) => {
        setEditingItem(null);
        setFormData({
            platform: idea.platform || Platform.TIKTOK,
            format: idea.format || ContentFormat.SHORT_VIDEO,
            campaignId: "",
            scheduledFor: "",
            state: ContentState.DRAFT,
        });
        setIsAiModalOpen(false);
        setIsModalOpen(true);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Content</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Manage your content queue and schedule.
                        </p>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={handleGenerateIdeas}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        >
                            <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                            Generate Ideas
                        </button>
                        <button
                            onClick={openCreateModal}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Content
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center space-x-4">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <select
                        value={selectedCampaignId}
                        onChange={(e) => setSelectedCampaignId(e.target.value)}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                        <option value="">All Campaigns</option>
                        {campaigns.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : contentItems.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200 border-dashed">
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No content found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Try adjusting filters or create new content.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200">
                            {contentItems.map((item) => (
                                <li key={item.id}>
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <p className="text-sm font-medium text-blue-600 truncate">
                                                    {item.platform} - {item.format}
                                                </p>
                                                {item.campaign && (
                                                    <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                        {item.campaign.name}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <p
                                                    className={cn(
                                                        "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                                                        item.state === ContentState.PUBLISHED
                                                            ? "bg-green-100 text-green-800"
                                                            : item.state === ContentState.SCHEDULED
                                                                ? "bg-yellow-100 text-yellow-800"
                                                                : "bg-gray-100 text-gray-800"
                                                    )}
                                                >
                                                    {item.state}
                                                </p>
                                                <Link
                                                    href={`/dashboard/content/${item.id}`}
                                                    className="text-blue-400 hover:text-blue-500"
                                                    title="View details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => openEditModal(item)}
                                                    className="text-gray-400 hover:text-gray-500"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="text-red-400 hover:text-red-500"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-2 sm:flex sm:justify-between">
                                            <div className="sm:flex">
                                                <p className="flex items-center text-sm text-gray-500">
                                                    {item.scheduledFor
                                                        ? `Scheduled for ${new Date(item.scheduledFor).toLocaleString()}`
                                                        : "Unscheduled"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Create/Edit Modal */}
                {isModalOpen && (
                    <div className="fixed z-10 inset-0 overflow-y-auto">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                            </div>

                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                                &#8203;
                            </span>

                            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                                <form onSubmit={handleSubmit}>
                                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                        <div className="sm:flex sm:items-start">
                                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                                    {editingItem ? "Edit Content" : "Create New Content"}
                                                </h3>
                                                <div className="mt-4 space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Platform</label>
                                                        <select
                                                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                                                            value={formData.platform}
                                                            onChange={(e) => setFormData({ ...formData, platform: e.target.value as Platform })}
                                                        >
                                                            {Object.values(Platform).map((p) => (
                                                                <option key={p} value={p}>{p}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Format</label>
                                                        <select
                                                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                                                            value={formData.format}
                                                            onChange={(e) => setFormData({ ...formData, format: e.target.value as ContentFormat })}
                                                        >
                                                            {Object.values(ContentFormat).map((f) => (
                                                                <option key={f} value={f}>{f}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Campaign (Optional)</label>
                                                        <select
                                                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                                                            value={formData.campaignId}
                                                            onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
                                                        >
                                                            <option value="">None</option>
                                                            {campaigns.map((c) => (
                                                                <option key={c.id} value={c.id}>{c.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Schedule (Optional)</label>
                                                        <input
                                                            type="datetime-local"
                                                            className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                                                            value={formData.scheduledFor}
                                                            onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                                                        />
                                                    </div>
                                                    {editingItem && (
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">State</label>
                                                            <select
                                                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                                                                value={formData.state}
                                                                onChange={(e) => setFormData({ ...formData, state: e.target.value as ContentState })}
                                                            >
                                                                {Object.values(ContentState).map((s) => (
                                                                    <option key={s} value={s}>{s}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                        >
                                            {submitting ? "Saving..." : "Save"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Ideas Modal */}
                {isAiModalOpen && (
                    <div className="fixed z-20 inset-0 overflow-y-auto">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                            </div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                                            <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                                            AI Content Ideas
                                        </h3>
                                        <button onClick={() => setIsAiModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                                            <X className="w-6 h-6" />
                                        </button>
                                    </div>

                                    {aiGenerating ? (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
                                            <p className="text-sm text-gray-500">Generating ideas...</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                                            {aiIdeas.length === 0 ? (
                                                <p className="text-center text-gray-500 py-8">No ideas generated yet.</p>
                                            ) : (
                                                aiIdeas.map((idea, index) => (
                                                    <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="font-medium text-gray-900">{idea.topic}</h4>
                                                                <p className="text-sm text-gray-500 mt-1">{idea.description}</p>
                                                                <div className="mt-2 flex items-center space-x-2">
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                                        {idea.platform}
                                                                    </span>
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                                        {idea.format}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => useIdea(idea)}
                                                                className="ml-4 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-purple-600 hover:bg-purple-700"
                                                            >
                                                                Use This
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

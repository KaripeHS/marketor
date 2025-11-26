"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { campaignsService, contentService, aiService, brandService } from "@/services/api";
import { Campaign, ContentItem, ContentState, Platform, ContentFormat, BrandProfile } from "@/types";
import { Loader2, ArrowLeft, Plus, Eye, Trash2, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AiContentIdea {
    platform: string;
    format: string;
    topic: string;
    description: string;
}

export default function CampaignDetailPage() {
    const params = useParams();
    const campaignId = params.id as string;

    const [campaign, setCampaign] = useState<(Campaign & { content: ContentItem[] }) | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);

    // Create content form state
    const [newPlatform, setNewPlatform] = useState<Platform>(Platform.TIKTOK);
    const [newFormat, setNewFormat] = useState<ContentFormat>(ContentFormat.SHORT_VIDEO);

    // AI suggestions state
    const [aiIdeas, setAiIdeas] = useState<AiContentIdea[]>([]);
    const [loadingAiIdeas, setLoadingAiIdeas] = useState(false);
    const [selectedIdea, setSelectedIdea] = useState<AiContentIdea | null>(null);
    const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);

    useEffect(() => {
        fetchCampaign();
        fetchBrandProfile();
    }, [campaignId]);

    const fetchBrandProfile = async () => {
        try {
            const profiles = await brandService.list();
            if (profiles.length > 0) {
                setBrandProfile(profiles[0]);
            }
        } catch (error) {
            console.error("Failed to fetch brand profile", error);
        }
    };

    const fetchCampaign = async () => {
        try {
            const data = await campaignsService.getById(campaignId);
            setCampaign(data);
        } catch (error) {
            console.error("Failed to fetch campaign", error);
            toast.error("Failed to load campaign");
        } finally {
            setLoading(false);
        }
    };

    const generateAiIdeas = async () => {
        setLoadingAiIdeas(true);
        try {
            const context: Record<string, any> = {
                campaignName: campaign?.name,
                existingContent: campaign?.content?.map(c => ({ platform: c.platform, format: c.format })) || [],
            };
            if (brandProfile) {
                context.brandName = brandProfile.name;
                context.brandVoice = brandProfile.voice;
                context.audiences = brandProfile.audiences;
            }
            const result = await aiService.generate("CONTENT", context, "Generate 3-4 fresh content ideas for this campaign");
            if (result.ideas && Array.isArray(result.ideas)) {
                setAiIdeas(result.ideas);
            }
        } catch (error) {
            console.error("Failed to generate AI ideas", error);
            toast.error("Failed to generate content ideas");
        } finally {
            setLoadingAiIdeas(false);
        }
    };

    const selectAiIdea = (idea: AiContentIdea) => {
        setSelectedIdea(idea);
        // Map the AI suggestion to our enum values
        const platformMap: Record<string, Platform> = {
            TIKTOK: Platform.TIKTOK,
            INSTAGRAM: Platform.INSTAGRAM,
            YOUTUBE: Platform.YOUTUBE,
            YOUTUBE_SHORT: Platform.YOUTUBE_SHORT,
            FACEBOOK: Platform.FACEBOOK,
        };
        const formatMap: Record<string, ContentFormat> = {
            SHORT_VIDEO: ContentFormat.SHORT_VIDEO,
            LONG_VIDEO: ContentFormat.LONG_VIDEO,
            IMAGE: ContentFormat.IMAGE,
            CAROUSEL: ContentFormat.CAROUSEL,
            TEXT: ContentFormat.TEXT,
        };
        if (platformMap[idea.platform]) {
            setNewPlatform(platformMap[idea.platform]);
        }
        if (formatMap[idea.format]) {
            setNewFormat(formatMap[idea.format]);
        }
    };

    const handleCreateContent = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            await contentService.create({
                campaignId,
                platform: newPlatform,
                format: newFormat,
            });
            toast.success("Content item created");
            setIsCreateModalOpen(false);
            fetchCampaign();
        } catch (error) {
            console.error("Failed to create content", error);
            toast.error("Failed to create content");
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteContent = async (contentId: string) => {
        if (!confirm("Are you sure you want to delete this content?")) return;
        try {
            await contentService.delete(contentId);
            toast.success("Content deleted");
            fetchCampaign();
        } catch (error) {
            console.error("Failed to delete content", error);
            toast.error("Failed to delete content");
        }
    };

    const getStateColor = (state: ContentState) => {
        switch (state) {
            case ContentState.PUBLISHED:
                return "bg-green-100 text-green-800";
            case ContentState.SCHEDULED:
                return "bg-blue-100 text-blue-800";
            case ContentState.READY_TO_SCHEDULE:
                return "bg-purple-100 text-purple-800";
            case ContentState.COMPLIANCE_REVIEW:
                return "bg-yellow-100 text-yellow-800";
            case ContentState.REJECTED:
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
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

    if (!campaign) {
        return (
            <DashboardLayout>
                <div className="text-center py-12">
                    <p className="text-gray-500">Campaign not found</p>
                    <Link href="/dashboard/campaigns" className="mt-4 text-blue-600 hover:underline">
                        Back to campaigns
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/dashboard/campaigns"
                        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to campaigns
                    </Link>

                    <div className="md:flex md:items-center md:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Created {new Date(campaign.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="mt-4 flex items-center space-x-3 md:mt-0">
                            <span
                                className={cn(
                                    "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
                                    campaign.status === "ACTIVE"
                                        ? "bg-green-100 text-green-800"
                                        : campaign.status === "PAUSED"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-gray-100 text-gray-800"
                                )}
                            >
                                {campaign.status}
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(true)}
                                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Content
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Items */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">
                            Content Items ({campaign.content?.length || 0})
                        </h2>
                    </div>

                    {!campaign.content || campaign.content.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No content items yet</p>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(true)}
                                className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Create your first content
                            </button>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {campaign.content.map((item) => (
                                <li key={item.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {item.platform} - {item.format}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {item.scheduledFor
                                                        ? `Scheduled: ${new Date(item.scheduledFor).toLocaleString()}`
                                                        : "Not scheduled"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <span
                                                className={cn(
                                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                                    getStateColor(item.state)
                                                )}
                                            >
                                                {item.state}
                                            </span>
                                            <Link
                                                href={`/dashboard/content/${item.id}`}
                                                className="text-blue-400 hover:text-blue-600"
                                                title="View details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteContent(item.id)}
                                                className="text-red-400 hover:text-red-600"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Create Content Modal */}
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
                                <h3 className="text-lg font-medium">Add Content to Campaign</h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreateModalOpen(false);
                                        setAiIdeas([]);
                                        setSelectedIdea(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-500"
                                    aria-label="Close"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* AI Suggestions Section */}
                                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center">
                                            <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
                                            <h4 className="font-medium text-gray-900">AI Content Ideas</h4>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={generateAiIdeas}
                                            disabled={loadingAiIdeas}
                                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-purple-700 bg-white border border-purple-200 rounded-md hover:bg-purple-50 disabled:opacity-50"
                                        >
                                            {loadingAiIdeas ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-4 h-4 mr-1.5" />
                                                    Generate Ideas
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {aiIdeas.length > 0 ? (
                                        <div className="space-y-2">
                                            {aiIdeas.map((idea, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => selectAiIdea(idea)}
                                                    className={cn(
                                                        "w-full text-left p-3 rounded-md border transition-colors",
                                                        selectedIdea === idea
                                                            ? "border-purple-500 bg-purple-50"
                                                            : "border-gray-200 bg-white hover:border-purple-300"
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                                                    {idea.platform}
                                                                </span>
                                                                <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                                                    {idea.format}
                                                                </span>
                                                            </div>
                                                            <p className="mt-1 text-sm font-medium text-gray-900">{idea.topic}</p>
                                                            <p className="mt-0.5 text-xs text-gray-500">{idea.description}</p>
                                                        </div>
                                                        {selectedIdea === idea && (
                                                            <Check className="w-5 h-5 text-purple-600 flex-shrink-0" />
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">
                                            Click &quot;Generate Ideas&quot; to get AI-powered content suggestions based on your campaign and brand.
                                        </p>
                                    )}
                                </div>

                                {/* Manual Selection Form */}
                                <form onSubmit={handleCreateContent} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Platform
                                            </label>
                                            <select
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                                value={newPlatform}
                                                onChange={(e) => {
                                                    setNewPlatform(e.target.value as Platform);
                                                    setSelectedIdea(null);
                                                }}
                                            >
                                                {Object.values(Platform).map((p) => (
                                                    <option key={p} value={p}>
                                                        {p}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Format
                                            </label>
                                            <select
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                                value={newFormat}
                                                onChange={(e) => {
                                                    setNewFormat(e.target.value as ContentFormat);
                                                    setSelectedIdea(null);
                                                }}
                                            >
                                                {Object.values(ContentFormat).map((f) => (
                                                    <option key={f} value={f}>
                                                        {f}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {selectedIdea && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                            <p className="text-sm text-blue-800">
                                                <span className="font-medium">Selected idea:</span> {selectedIdea.topic}
                                            </p>
                                            <p className="text-xs text-blue-600 mt-1">{selectedIdea.description}</p>
                                        </div>
                                    )}

                                    <div className="flex justify-end space-x-3 pt-4 border-t">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCreateModalOpen(false);
                                                setAiIdeas([]);
                                                setSelectedIdea(null);
                                            }}
                                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={creating}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                            Create Content
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

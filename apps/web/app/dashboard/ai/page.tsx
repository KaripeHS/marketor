"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { aiService, AgentType, AIGenerationResult, brandService } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import {
    Sparkles,
    Loader2,
    Copy,
    Check,
    RefreshCw,
    Hash,
    Video,
    Image,
    TrendingUp,
    Calendar,
    Shield,
    BarChart3,
    Brain,
    Wand2,
    ChevronDown,
} from "lucide-react";

interface AgentCard {
    type: AgentType;
    name: string;
    description: string;
    icon: React.ElementType;
    color: string;
    category: "content" | "strategy" | "analysis";
}

const AGENT_CARDS: AgentCard[] = [
    {
        type: "SCRIPT_WRITER",
        name: "Script Writer",
        description: "Generate video scripts for TikTok, Reels, and YouTube Shorts",
        icon: Video,
        color: "bg-purple-500",
        category: "content",
    },
    {
        type: "CAPTION_WRITER",
        name: "Caption Writer",
        description: "Create engaging captions and hashtags for any platform",
        icon: Hash,
        color: "bg-pink-500",
        category: "content",
    },
    {
        type: "IMAGE_GENERATOR",
        name: "Image Ideas",
        description: "Get creative image concepts and visual descriptions",
        icon: Image,
        color: "bg-blue-500",
        category: "content",
    },
    {
        type: "TREND_RESEARCH",
        name: "Trend Research",
        description: "Discover trending topics and viral content ideas",
        icon: TrendingUp,
        color: "bg-green-500",
        category: "strategy",
    },
    {
        type: "STRATEGY",
        name: "Strategy Builder",
        description: "Create comprehensive content strategies",
        icon: Brain,
        color: "bg-indigo-500",
        category: "strategy",
    },
    {
        type: "PLANNER",
        name: "Content Planner",
        description: "Plan your content calendar and posting schedule",
        icon: Calendar,
        color: "bg-orange-500",
        category: "strategy",
    },
    {
        type: "COMPLIANCE",
        name: "Compliance Check",
        description: "Review content for regulatory compliance",
        icon: Shield,
        color: "bg-red-500",
        category: "analysis",
    },
    {
        type: "ANALYTICS",
        name: "Performance Insights",
        description: "Analyze content performance and get recommendations",
        icon: BarChart3,
        color: "bg-cyan-500",
        category: "analysis",
    },
];

export default function AIAssistantPage() {
    const { tenantId } = useAuth();
    const [selectedAgent, setSelectedAgent] = useState<AgentCard | null>(null);
    const [input, setInput] = useState("");
    const [platform, setPlatform] = useState("tiktok");
    const [tone, setTone] = useState("professional");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AIGenerationResult | null>(null);
    const [copied, setCopied] = useState(false);
    const [brandProfiles, setBrandProfiles] = useState<any[]>([]);
    const [selectedBrand, setSelectedBrand] = useState<string>("");
    const [activeCategory, setActiveCategory] = useState<"all" | "content" | "strategy" | "analysis">("all");

    useEffect(() => {
        loadBrandProfiles();
    }, [tenantId]);

    const loadBrandProfiles = async () => {
        try {
            const profiles = await brandService.list();
            setBrandProfiles(profiles);
            if (profiles.length > 0) {
                setSelectedBrand(profiles[0].id);
            }
        } catch (error) {
            console.error("Failed to load brand profiles:", error);
        }
    };

    const handleGenerate = async () => {
        if (!selectedAgent || !input.trim()) return;

        setLoading(true);
        setResult(null);

        try {
            const variables: Record<string, unknown> = {
                topic: input,
                platform,
                tone,
                brandProfileId: selectedBrand || undefined,
            };

            // Add agent-specific variables
            if (selectedAgent.type === "SCRIPT_WRITER") {
                variables.duration = "60"; // seconds
                variables.style = "hook-story-cta";
            } else if (selectedAgent.type === "CAPTION_WRITER") {
                variables.maxLength = 2200;
                variables.includeHashtags = true;
                variables.hashtagCount = 10;
            } else if (selectedAgent.type === "COMPLIANCE") {
                variables.industry = "healthcare"; // Could be dynamic
                variables.content = input;
            }

            const response = await aiService.executeAgent(selectedAgent.type, variables);
            setResult(response);
        } catch (error) {
            console.error("Generation failed:", error);
            setResult({
                success: false,
                error: "Failed to generate content. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!result?.content) return;
        await navigator.clipboard.writeText(result.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const filteredAgents = activeCategory === "all"
        ? AGENT_CARDS
        : AGENT_CARDS.filter(a => a.category === activeCategory);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Sparkles className="w-7 h-7 text-purple-500" />
                        AI Assistant
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Generate content, research trends, and get AI-powered insights
                    </p>
                </div>

                {/* Category Filter */}
                <div className="flex gap-2">
                    {[
                        { id: "all", label: "All" },
                        { id: "content", label: "Content Creation" },
                        { id: "strategy", label: "Strategy" },
                        { id: "analysis", label: "Analysis" },
                    ].map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => setActiveCategory(id as typeof activeCategory)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeCategory === id
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Agent Selection Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {filteredAgents.map((agent) => {
                        const Icon = agent.icon;
                        const isSelected = selectedAgent?.type === agent.type;
                        return (
                            <button
                                key={agent.type}
                                onClick={() => {
                                    setSelectedAgent(agent);
                                    setResult(null);
                                }}
                                className={`p-4 rounded-lg border-2 text-left transition-all ${
                                    isSelected
                                        ? "border-purple-500 bg-purple-50"
                                        : "border-gray-200 bg-white hover:border-gray-300"
                                }`}
                            >
                                <div className={`w-10 h-10 rounded-lg ${agent.color} flex items-center justify-center mb-3`}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">{agent.description}</p>
                            </button>
                        );
                    })}
                </div>

                {/* Generation Panel */}
                {selectedAgent && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Wand2 className="w-5 h-5 text-purple-500" />
                            {selectedAgent.name}
                        </h2>

                        <div className="space-y-4">
                            {/* Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {selectedAgent.type === "COMPLIANCE" ? "Content to Review" : "Topic or Idea"}
                                </label>
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={
                                        selectedAgent.type === "COMPLIANCE"
                                            ? "Paste the content you want to check for compliance..."
                                            : "Describe your topic, product, or idea..."
                                    }
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                />
                            </div>

                            {/* Options Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Platform */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Platform
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={platform}
                                            onChange={(e) => setPlatform(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        >
                                            <option value="tiktok">TikTok</option>
                                            <option value="instagram">Instagram</option>
                                            <option value="youtube">YouTube</option>
                                            <option value="linkedin">LinkedIn</option>
                                            <option value="twitter">Twitter/X</option>
                                            <option value="facebook">Facebook</option>
                                        </select>
                                        <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Tone */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tone
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={tone}
                                            onChange={(e) => setTone(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        >
                                            <option value="professional">Professional</option>
                                            <option value="casual">Casual & Friendly</option>
                                            <option value="humorous">Humorous</option>
                                            <option value="educational">Educational</option>
                                            <option value="inspirational">Inspirational</option>
                                            <option value="urgent">Urgent/FOMO</option>
                                        </select>
                                        <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Brand Profile */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Brand Voice
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={selectedBrand}
                                            onChange={(e) => setSelectedBrand(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        >
                                            <option value="">Default</option>
                                            {brandProfiles.map((brand) => (
                                                <option key={brand.id} value={brand.id}>
                                                    {brand.name}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Generate Button */}
                            <button
                                onClick={handleGenerate}
                                disabled={loading || !input.trim()}
                                className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        Generate
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Result */}
                        {result && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                {result.success ? (
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-medium text-gray-900">Generated Content</h3>
                                            <div className="flex items-center gap-2">
                                                {result.tokensUsed && (
                                                    <span className="text-xs text-gray-500">
                                                        {result.tokensUsed} tokens
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleGenerate()}
                                                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                                                    title="Regenerate"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={handleCopy}
                                                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                                                    title="Copy to clipboard"
                                                >
                                                    {copied ? (
                                                        <Check className="w-4 h-4 text-green-500" />
                                                    ) : (
                                                        <Copy className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                                                {result.content}
                                            </pre>
                                        </div>
                                        {result.data && (
                                            <div className="mt-4">
                                                <details className="text-sm">
                                                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                                                        View additional data
                                                    </summary>
                                                    <pre className="mt-2 bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                                                        {JSON.stringify(result.data, null, 2)}
                                                    </pre>
                                                </details>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-red-50 text-red-700 p-4 rounded-lg">
                                        <p className="font-medium">Generation Failed</p>
                                        <p className="text-sm mt-1">{result.error}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Quick Tips */}
                {!selectedAgent && (
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
                        <h3 className="font-semibold text-gray-900 mb-3">
                            Tips for Better Results
                        </h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                Be specific about your target audience and goals
                            </li>
                            <li className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                Set up a brand profile for consistent voice across all content
                            </li>
                            <li className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                Use Trend Research before creating content to find viral topics
                            </li>
                            <li className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                Always run Compliance Check for regulated industries
                            </li>
                        </ul>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

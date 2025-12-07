"use client";

import React, { useState, useEffect } from "react";
import { socialConnectionsService, postJobsService } from "@/services/api";
import { SocialConnection, ContentItem } from "@/types";
import {
    Loader2,
    X,
    Send,
    Clock,
    CheckCircle,
    AlertTriangle,
    Calendar,
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

interface PublishModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: ContentItem;
    onPublished?: () => void;
}

export default function PublishModal({ isOpen, onClose, content, onPublished }: PublishModalProps) {
    const [connections, setConnections] = useState<SocialConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
    const [scheduleMode, setScheduleMode] = useState<"now" | "scheduled">("now");
    const [scheduledTime, setScheduledTime] = useState("");
    const [publishing, setPublishing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchConnections();
            // Set default scheduled time to content's scheduled time or 1 hour from now
            if (content.scheduledFor) {
                const date = new Date(content.scheduledFor);
                setScheduledTime(date.toISOString().slice(0, 16));
                setScheduleMode("scheduled");
            } else {
                const oneHourLater = new Date(Date.now() + 60 * 60 * 1000);
                setScheduledTime(oneHourLater.toISOString().slice(0, 16));
            }
        }
    }, [isOpen, content]);

    const fetchConnections = async () => {
        setLoading(true);
        try {
            const data = await socialConnectionsService.list();
            // Filter to only active connections
            const active = data.filter((c) => c.isActive);
            setConnections(active);

            // Auto-select connection matching content platform
            const matching = active.find((c) => c.platform === content.platform);
            if (matching) {
                setSelectedConnections([matching.id]);
            }
        } catch (error) {
            console.error("Failed to fetch connections", error);
            toast.error("Failed to load connected accounts");
        } finally {
            setLoading(false);
        }
    };

    const toggleConnection = (connectionId: string) => {
        setSelectedConnections((prev) =>
            prev.includes(connectionId)
                ? prev.filter((id) => id !== connectionId)
                : [...prev, connectionId]
        );
    };

    const handlePublish = async () => {
        if (selectedConnections.length === 0) {
            toast.error("Please select at least one account to publish to");
            return;
        }

        setPublishing(true);
        try {
            const scheduledFor = scheduleMode === "scheduled"
                ? new Date(scheduledTime).toISOString()
                : new Date().toISOString();

            // Create post jobs for each selected connection
            const promises = selectedConnections.map((connectionId) => {
                const connection = connections.find((c) => c.id === connectionId);
                if (!connection) return Promise.resolve();

                return postJobsService.create({
                    contentId: content.id,
                    platform: connection.platform,
                    scheduledFor,
                });
            });

            await Promise.all(promises);

            const message = scheduleMode === "scheduled"
                ? `Content scheduled for ${new Date(scheduledTime).toLocaleString()}`
                : "Content queued for publishing";

            toast.success(message);
            onPublished?.();
            onClose();
        } catch (error: any) {
            console.error("Failed to publish", error);
            toast.error(error.response?.data?.message || "Failed to publish content");
        } finally {
            setPublishing(false);
        }
    };

    if (!isOpen) return null;

    const compatibleConnections = connections.filter(
        (c) => c.platform === content.platform
    );
    const otherConnections = connections.filter(
        (c) => c.platform !== content.platform
    );

    const isContentReady = content.caption || content.script || content.mediaUrl;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">Publish Content</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {content.platform} • {content.format}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {/* Warning if content not ready */}
                    {!isContentReady && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-yellow-800">Content may not be ready</p>
                                <p className="text-xs text-yellow-700 mt-1">
                                    No caption, script, or media found. Add content before publishing.
                                </p>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : connections.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500 mb-4">No connected accounts found.</p>
                            <a
                                href="/dashboard/integrations"
                                className="text-purple-600 hover:text-purple-800 font-medium"
                            >
                                Connect your social accounts →
                            </a>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Schedule Options */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    When to publish
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setScheduleMode("now")}
                                        className={`p-3 rounded-lg border-2 text-left transition-colors ${
                                            scheduleMode === "now"
                                                ? "border-purple-500 bg-purple-50"
                                                : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    >
                                        <Send className={`w-5 h-5 mb-1 ${
                                            scheduleMode === "now" ? "text-purple-600" : "text-gray-400"
                                        }`} />
                                        <p className="font-medium text-sm">Publish Now</p>
                                        <p className="text-xs text-gray-500">Send immediately</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setScheduleMode("scheduled")}
                                        className={`p-3 rounded-lg border-2 text-left transition-colors ${
                                            scheduleMode === "scheduled"
                                                ? "border-purple-500 bg-purple-50"
                                                : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    >
                                        <Clock className={`w-5 h-5 mb-1 ${
                                            scheduleMode === "scheduled" ? "text-purple-600" : "text-gray-400"
                                        }`} />
                                        <p className="font-medium text-sm">Schedule</p>
                                        <p className="text-xs text-gray-500">Pick a time</p>
                                    </button>
                                </div>

                                {scheduleMode === "scheduled" && (
                                    <div className="mt-3">
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="datetime-local"
                                                value={scheduledTime}
                                                onChange={(e) => setScheduledTime(e.target.value)}
                                                min={new Date().toISOString().slice(0, 16)}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Account Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Select accounts to publish to
                                </label>

                                {/* Compatible accounts (same platform) */}
                                {compatibleConnections.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3 text-green-500" />
                                            Best match for {content.platform}
                                        </p>
                                        <div className="space-y-2">
                                            {compatibleConnections.map((connection) => (
                                                <button
                                                    key={connection.id}
                                                    type="button"
                                                    onClick={() => toggleConnection(connection.id)}
                                                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                                                        selectedConnections.includes(connection.id)
                                                            ? "border-purple-500 bg-purple-50"
                                                            : "border-gray-200 hover:border-gray-300"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-2 py-1 rounded text-sm ${platformColors[connection.platform] || "bg-gray-500 text-white"}`}>
                                                            {platformIcons[connection.platform] || "📱"}
                                                        </span>
                                                        <div className="text-left">
                                                            <p className="font-medium text-sm text-gray-900">
                                                                {connection.accountName || connection.platform}
                                                            </p>
                                                            <p className="text-xs text-gray-500">{connection.platform}</p>
                                                        </div>
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                        selectedConnections.includes(connection.id)
                                                            ? "border-purple-500 bg-purple-500"
                                                            : "border-gray-300"
                                                    }`}>
                                                        {selectedConnections.includes(connection.id) && (
                                                            <CheckCircle className="w-3 h-3 text-white" />
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Other accounts */}
                                {otherConnections.length > 0 && (
                                    <div>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Other connected accounts
                                        </p>
                                        <div className="space-y-2">
                                            {otherConnections.map((connection) => (
                                                <button
                                                    key={connection.id}
                                                    type="button"
                                                    onClick={() => toggleConnection(connection.id)}
                                                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                                                        selectedConnections.includes(connection.id)
                                                            ? "border-purple-500 bg-purple-50"
                                                            : "border-gray-200 hover:border-gray-300"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-2 py-1 rounded text-sm ${platformColors[connection.platform] || "bg-gray-500 text-white"}`}>
                                                            {platformIcons[connection.platform] || "📱"}
                                                        </span>
                                                        <div className="text-left">
                                                            <p className="font-medium text-sm text-gray-900">
                                                                {connection.accountName || connection.platform}
                                                            </p>
                                                            <p className="text-xs text-gray-500">{connection.platform}</p>
                                                        </div>
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                        selectedConnections.includes(connection.id)
                                                            ? "border-purple-500 bg-purple-500"
                                                            : "border-gray-300"
                                                    }`}>
                                                        {selectedConnections.includes(connection.id) && (
                                                            <CheckCircle className="w-3 h-3 text-white" />
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {compatibleConnections.length === 0 && (
                                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-sm text-yellow-800">
                                            No {content.platform} accounts connected.{" "}
                                            <a href="/dashboard/integrations" className="underline">
                                                Connect one
                                            </a>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handlePublish}
                        disabled={publishing || selectedConnections.length === 0 || loading}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {publishing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Publishing...
                            </>
                        ) : scheduleMode === "scheduled" ? (
                            <>
                                <Clock className="w-4 h-4" />
                                Schedule
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Publish Now
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

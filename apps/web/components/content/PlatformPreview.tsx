"use client";

import React, { useState } from "react";
import { Platform, ContentFormat } from "@/types";

// Re-export for convenience
export { Platform, ContentFormat };
import { cn } from "@/lib/utils";
import {
    Smartphone,
    Heart,
    MessageCircle,
    Share2,
    Bookmark,
    MoreHorizontal,
    Play,
    Music2,
    ThumbsUp,
} from "lucide-react";

interface PlatformPreviewProps {
    platform: Platform;
    format: ContentFormat;
    mediaUrl?: string;
    caption?: string;
    hashtags?: string[];
    title?: string;
    accountName?: string;
    accountHandle?: string;
}

// TikTok-style preview
function TikTokPreview({ mediaUrl, caption, hashtags, accountName = "youraccount" }: PlatformPreviewProps) {
    return (
        <div className="relative bg-black rounded-[2rem] overflow-hidden w-[280px] h-[560px] mx-auto shadow-xl">
            {/* Phone notch */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-20" />

            {/* Video content area */}
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                {mediaUrl ? (
                    <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center text-gray-500">
                        <Play className="w-16 h-16 mx-auto mb-2" />
                        <p className="text-sm">Video Preview</p>
                    </div>
                )}
            </div>

            {/* Right sidebar actions */}
            <div className="absolute right-3 bottom-24 flex flex-col items-center space-y-4 text-white z-10">
                <div className="w-10 h-10 rounded-full bg-gray-700 border-2 border-white" />
                <div className="flex flex-col items-center">
                    <Heart className="w-7 h-7" />
                    <span className="text-xs mt-1">12.3K</span>
                </div>
                <div className="flex flex-col items-center">
                    <MessageCircle className="w-7 h-7" />
                    <span className="text-xs mt-1">234</span>
                </div>
                <div className="flex flex-col items-center">
                    <Bookmark className="w-7 h-7" />
                    <span className="text-xs mt-1">1.2K</span>
                </div>
                <div className="flex flex-col items-center">
                    <Share2 className="w-7 h-7" />
                    <span className="text-xs mt-1">Share</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-600 animate-spin-slow" />
            </div>

            {/* Bottom content */}
            <div className="absolute bottom-0 left-0 right-14 p-4 bg-gradient-to-t from-black/80 to-transparent z-10">
                <p className="text-white font-semibold text-sm">@{accountName}</p>
                <p className="text-white text-sm mt-1 line-clamp-2">
                    {caption || "Your caption will appear here..."}
                </p>
                {hashtags && hashtags.length > 0 && (
                    <p className="text-white/80 text-xs mt-1">
                        {hashtags.slice(0, 3).map(tag => `#${tag}`).join(" ")}
                    </p>
                )}
                <div className="flex items-center mt-2 text-white/80 text-xs">
                    <Music2 className="w-3 h-3 mr-1" />
                    <span className="truncate">Original sound - {accountName}</span>
                </div>
            </div>
        </div>
    );
}

// Instagram-style preview (Feed Post)
function InstagramPreview({ mediaUrl, caption, hashtags, accountName = "youraccount" }: PlatformPreviewProps) {
    return (
        <div className="bg-white rounded-lg overflow-hidden w-[320px] mx-auto shadow-lg border border-gray-200">
            {/* Header */}
            <div className="flex items-center p-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-0.5">
                    <div className="w-full h-full rounded-full bg-white p-0.5">
                        <div className="w-full h-full rounded-full bg-gray-300" />
                    </div>
                </div>
                <span className="ml-2 font-semibold text-sm">{accountName}</span>
                <MoreHorizontal className="w-5 h-5 ml-auto text-gray-700" />
            </div>

            {/* Image */}
            <div className="aspect-square bg-gray-100">
                {mediaUrl ? (
                    <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                            <Smartphone className="w-12 h-12 mx-auto mb-2" />
                            <p className="text-sm">Image Preview</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="p-3">
                <div className="flex items-center space-x-4">
                    <Heart className="w-6 h-6" />
                    <MessageCircle className="w-6 h-6" />
                    <Share2 className="w-6 h-6" />
                    <Bookmark className="w-6 h-6 ml-auto" />
                </div>
                <p className="text-sm font-semibold mt-2">1,234 likes</p>
                <div className="mt-1">
                    <span className="text-sm font-semibold">{accountName}</span>
                    <span className="text-sm ml-1 text-gray-700 line-clamp-2">
                        {caption || "Your caption will appear here..."}
                    </span>
                </div>
                {hashtags && hashtags.length > 0 && (
                    <p className="text-sm text-blue-900 mt-1">
                        {hashtags.slice(0, 5).map(tag => `#${tag}`).join(" ")}
                    </p>
                )}
                <p className="text-xs text-gray-400 mt-2">2 HOURS AGO</p>
            </div>
        </div>
    );
}

// Instagram Reels preview
function InstagramReelsPreview({ mediaUrl, caption, hashtags, accountName = "youraccount" }: PlatformPreviewProps) {
    return (
        <div className="relative bg-black rounded-[2rem] overflow-hidden w-[280px] h-[560px] mx-auto shadow-xl">
            {/* Phone notch */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-20" />

            {/* Video content */}
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                {mediaUrl ? (
                    <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center text-gray-500">
                        <Play className="w-16 h-16 mx-auto mb-2" />
                        <p className="text-sm">Reel Preview</p>
                    </div>
                )}
            </div>

            {/* Right sidebar */}
            <div className="absolute right-3 bottom-24 flex flex-col items-center space-y-5 text-white z-10">
                <div className="flex flex-col items-center">
                    <Heart className="w-7 h-7" />
                    <span className="text-xs mt-1">45K</span>
                </div>
                <div className="flex flex-col items-center">
                    <MessageCircle className="w-7 h-7" />
                    <span className="text-xs mt-1">892</span>
                </div>
                <div className="flex flex-col items-center">
                    <Share2 className="w-7 h-7" />
                </div>
                <MoreHorizontal className="w-7 h-7" />
            </div>

            {/* Bottom content */}
            <div className="absolute bottom-0 left-0 right-14 p-4 bg-gradient-to-t from-black/80 to-transparent z-10">
                <p className="text-white font-semibold text-sm">{accountName}</p>
                <p className="text-white text-sm mt-1 line-clamp-2">
                    {caption || "Your caption..."}
                </p>
                {hashtags && hashtags.length > 0 && (
                    <p className="text-white/80 text-xs mt-1">
                        {hashtags.slice(0, 3).map(tag => `#${tag}`).join(" ")}
                    </p>
                )}
                <div className="flex items-center mt-2 text-white/80 text-xs">
                    <Music2 className="w-3 h-3 mr-1" />
                    <span className="truncate">Original audio</span>
                </div>
            </div>
        </div>
    );
}

// YouTube preview
function YouTubePreview({ mediaUrl, caption, title, accountName = "Your Channel" }: PlatformPreviewProps) {
    return (
        <div className="bg-white rounded-lg overflow-hidden w-[360px] mx-auto shadow-lg">
            {/* Thumbnail */}
            <div className="relative aspect-video bg-gray-900">
                {mediaUrl ? (
                    <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <Play className="w-16 h-16 mx-auto mb-2" />
                            <p className="text-sm">Video Thumbnail</p>
                        </div>
                    </div>
                )}
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
                    10:24
                </div>
            </div>

            {/* Video info */}
            <div className="p-3 flex">
                <div className="w-9 h-9 rounded-full bg-red-500 flex-shrink-0" />
                <div className="ml-3 flex-1 min-w-0">
                    <h3 className="text-sm font-semibold line-clamp-2 text-gray-900">
                        {title || caption || "Your video title will appear here"}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">{accountName}</p>
                    <p className="text-xs text-gray-600">123K views • 2 days ago</p>
                </div>
                <MoreHorizontal className="w-5 h-5 text-gray-600 flex-shrink-0 ml-2" />
            </div>
        </div>
    );
}

// YouTube Shorts preview
function YouTubeShortsPreview({ mediaUrl, caption, title, accountName = "Your Channel" }: PlatformPreviewProps) {
    return (
        <div className="relative bg-black rounded-[2rem] overflow-hidden w-[280px] h-[560px] mx-auto shadow-xl">
            {/* Video content */}
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                {mediaUrl ? (
                    <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center text-gray-500">
                        <Play className="w-16 h-16 mx-auto mb-2" />
                        <p className="text-sm">Short Preview</p>
                    </div>
                )}
            </div>

            {/* Shorts badge */}
            <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded z-10">
                Shorts
            </div>

            {/* Right sidebar */}
            <div className="absolute right-3 bottom-24 flex flex-col items-center space-y-5 text-white z-10">
                <div className="flex flex-col items-center">
                    <ThumbsUp className="w-7 h-7" />
                    <span className="text-xs mt-1">45K</span>
                </div>
                <div className="flex flex-col items-center">
                    <MessageCircle className="w-7 h-7" />
                    <span className="text-xs mt-1">892</span>
                </div>
                <div className="flex flex-col items-center">
                    <Share2 className="w-7 h-7" />
                    <span className="text-xs mt-1">Share</span>
                </div>
                <MoreHorizontal className="w-7 h-7" />
            </div>

            {/* Bottom content */}
            <div className="absolute bottom-0 left-0 right-14 p-4 bg-gradient-to-t from-black/80 to-transparent z-10">
                <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-red-500 flex-shrink-0" />
                    <span className="ml-2 text-white font-semibold text-sm">@{accountName}</span>
                    <button className="ml-2 bg-white text-black text-xs font-semibold px-3 py-1 rounded-full">
                        Subscribe
                    </button>
                </div>
                <p className="text-white text-sm mt-2 line-clamp-2">
                    {title || caption || "Your short title..."}
                </p>
            </div>
        </div>
    );
}

// Facebook preview
function FacebookPreview({ mediaUrl, caption, accountName = "Your Page" }: PlatformPreviewProps) {
    return (
        <div className="bg-white rounded-lg overflow-hidden w-[360px] mx-auto shadow-lg border border-gray-200">
            {/* Header */}
            <div className="p-3 flex items-start">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex-shrink-0" />
                <div className="ml-2 flex-1">
                    <p className="font-semibold text-sm text-gray-900">{accountName}</p>
                    <p className="text-xs text-gray-500">2h • 🌐</p>
                </div>
                <MoreHorizontal className="w-5 h-5 text-gray-600" />
            </div>

            {/* Caption */}
            <div className="px-3 pb-2">
                <p className="text-sm text-gray-900 line-clamp-3">
                    {caption || "Your post caption will appear here..."}
                </p>
            </div>

            {/* Image */}
            <div className="aspect-video bg-gray-100">
                {mediaUrl ? (
                    <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                            <Smartphone className="w-12 h-12 mx-auto mb-2" />
                            <p className="text-sm">Media Preview</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Engagement stats */}
            <div className="px-3 py-2 flex items-center justify-between text-gray-500 text-sm border-b border-gray-200">
                <div className="flex items-center">
                    <div className="flex -space-x-1">
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">👍</div>
                        <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">❤️</div>
                    </div>
                    <span className="ml-1">1.2K</span>
                </div>
                <div className="flex space-x-3">
                    <span>89 comments</span>
                    <span>23 shares</span>
                </div>
            </div>

            {/* Actions */}
            <div className="px-3 py-2 flex justify-around">
                <button className="flex items-center text-gray-600 text-sm font-semibold">
                    <ThumbsUp className="w-5 h-5 mr-1" /> Like
                </button>
                <button className="flex items-center text-gray-600 text-sm font-semibold">
                    <MessageCircle className="w-5 h-5 mr-1" /> Comment
                </button>
                <button className="flex items-center text-gray-600 text-sm font-semibold">
                    <Share2 className="w-5 h-5 mr-1" /> Share
                </button>
            </div>
        </div>
    );
}

export default function PlatformPreview(props: PlatformPreviewProps) {
    const { platform, format } = props;

    // Determine which preview to show based on platform and format
    const getPreview = () => {
        switch (platform) {
            case Platform.TIKTOK:
                return <TikTokPreview {...props} />;
            case Platform.INSTAGRAM:
                if (format === ContentFormat.SHORT_VIDEO) {
                    return <InstagramReelsPreview {...props} />;
                }
                return <InstagramPreview {...props} />;
            case Platform.YOUTUBE:
                return <YouTubePreview {...props} />;
            case Platform.YOUTUBE_SHORT:
                return <YouTubeShortsPreview {...props} />;
            case Platform.FACEBOOK:
                return <FacebookPreview {...props} />;
            default:
                return <InstagramPreview {...props} />;
        }
    };

    return (
        <div className="py-4">
            {getPreview()}
        </div>
    );
}

// Platform selector with previews
interface PlatformPreviewSelectorProps {
    currentPlatform: Platform;
    format: ContentFormat;
    mediaUrl?: string;
    caption?: string;
    hashtags?: string[];
    title?: string;
}

export function PlatformPreviewSelector({
    currentPlatform,
    format,
    mediaUrl,
    caption,
    hashtags,
    title,
}: PlatformPreviewSelectorProps) {
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>(currentPlatform);

    const platforms: { id: Platform; label: string; icon: string }[] = [
        { id: Platform.TIKTOK, label: "TikTok", icon: "🎵" },
        { id: Platform.INSTAGRAM, label: "Instagram", icon: "📸" },
        { id: Platform.YOUTUBE, label: "YouTube", icon: "▶️" },
        { id: Platform.YOUTUBE_SHORT, label: "YT Shorts", icon: "📱" },
        { id: Platform.FACEBOOK, label: "Facebook", icon: "👤" },
    ];

    return (
        <div className="space-y-4">
            {/* Platform tabs */}
            <div className="flex flex-wrap gap-2 justify-center">
                {platforms.map((p) => (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlatform(p.id)}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                            selectedPlatform === p.id
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                    >
                        <span className="mr-1">{p.icon}</span>
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Preview */}
            <div className="bg-gray-100 rounded-lg p-6">
                <PlatformPreview
                    platform={selectedPlatform}
                    format={format}
                    mediaUrl={mediaUrl}
                    caption={caption}
                    hashtags={hashtags}
                    title={title}
                />
            </div>

            {/* Tips based on platform */}
            <div className="text-center text-sm text-gray-500">
                {selectedPlatform === Platform.TIKTOK && "Tip: Keep videos under 60 seconds for best engagement"}
                {selectedPlatform === Platform.INSTAGRAM && format === ContentFormat.SHORT_VIDEO && "Tip: Reels perform best at 15-30 seconds"}
                {selectedPlatform === Platform.INSTAGRAM && format !== ContentFormat.SHORT_VIDEO && "Tip: Square (1:1) images get highest engagement"}
                {selectedPlatform === Platform.YOUTUBE && "Tip: Custom thumbnails increase click-through by 30%"}
                {selectedPlatform === Platform.YOUTUBE_SHORT && "Tip: Shorts should be under 60 seconds, vertical format"}
                {selectedPlatform === Platform.FACEBOOK && "Tip: Native video gets 10x more reach than links"}
            </div>
        </div>
    );
}

"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { contentService, approvalsService, commentsService } from "@/services/api";
import { ContentItem, Approval, Comment, ApprovalStatus, ContentState, UpdateContentDto, MediaAsset } from "@/types";
import { Loader2, CheckCircle, XCircle, AlertCircle, Send, Save, ArrowLeft, Edit2, Image as ImageIcon, Hash, Eye } from "lucide-react";
import MediaUploader from "@/components/media/MediaUploader";
import { PlatformPreviewSelector } from "@/components/content/PlatformPreview";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import dynamic from "next/dynamic";

// Dynamically import RichTextEditor to avoid SSR issues
const RichTextEditor = dynamic(() => import("@/components/editor/RichTextEditor"), {
    ssr: false,
    loading: () => <div className="h-40 bg-gray-50 rounded-lg animate-pulse" />,
});

export default function ContentDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const { tenantId } = useAuth();

    const [content, setContent] = useState<ContentItem | null>(null);
    const [approval, setApproval] = useState<Approval | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Editor state
    const [editTitle, setEditTitle] = useState("");
    const [editScript, setEditScript] = useState("");
    const [editCaption, setEditCaption] = useState("");
    const [editHashtags, setEditHashtags] = useState("");

    const [newComment, setNewComment] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);
    const [processingApproval, setProcessingApproval] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const fetchData = async () => {
        try {
            const [contentData, approvalData, commentsData] = await Promise.all([
                contentService.getById(id),
                approvalsService.get(id),
                commentsService.list(id),
            ]);
            setContent(contentData || null);
            setApproval(approvalData || null);
            setComments(commentsData || []);

            // Initialize editor state
            if (contentData) {
                setEditTitle(contentData.title || "");
                setEditScript(contentData.script || "");
                setEditCaption(contentData.caption || "");
                setEditHashtags(contentData.hashtags?.join(", ") || "");
            }
        } catch (error) {
            console.error("Failed to fetch content details", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id]);

    const handleSaveContent = async () => {
        if (!content) return;

        setSaving(true);
        try {
            const updateData: UpdateContentDto = {
                title: editTitle || undefined,
                script: editScript || undefined,
                caption: editCaption || undefined,
                hashtags: editHashtags ? editHashtags.split(",").map(h => h.trim().replace(/^#/, "")) : undefined,
            };

            await contentService.update(id, updateData);
            await fetchData();
            setIsEditing(false);
            toast.success("Content saved successfully");
        } catch (error) {
            console.error("Failed to save content", error);
            toast.error("Failed to save content");
        } finally {
            setSaving(false);
        }
    };

    const handleApproval = async (status: ApprovalStatus) => {
        setProcessingApproval(true);
        try {
            let notes = "";
            if (status === ApprovalStatus.CHANGES_REQUESTED) {
                notes = prompt("Please provide feedback for changes:") || "";
                if (!notes) {
                    setProcessingApproval(false);
                    return;
                }
            }

            await approvalsService.update(id, { status, notes });
            await fetchData();
            toast.success(`Content ${status.toLowerCase().replace("_", " ")}`);
        } catch (error) {
            console.error("Failed to update approval", error);
            toast.error("Failed to update approval");
        } finally {
            setProcessingApproval(false);
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setSubmittingComment(true);
        try {
            await commentsService.create({ contentId: id, body: newComment });
            setNewComment("");
            await fetchData();
            toast.success("Comment added");
        } catch (error) {
            console.error("Failed to post comment", error);
            toast.error("Failed to post comment");
        } finally {
            setSubmittingComment(false);
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

    if (!content) {
        return (
            <DashboardLayout>
                <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-gray-900">Content not found</h3>
                    <Link href="/dashboard/content" className="text-blue-600 hover:underline mt-2 inline-block">
                        Back to content list
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link
                            href="/dashboard/content"
                            className="p-2 rounded-full hover:bg-gray-100"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                {content.title || `${content.platform} - ${content.format}`}
                            </h2>
                            <div className="flex items-center space-x-3 mt-1">
                                <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full", getStateColor(content.state))}>
                                    {content.state}
                                </span>
                                <span className="text-sm text-gray-500">
                                    {content.scheduledFor
                                        ? `Scheduled: ${new Date(content.scheduledFor).toLocaleString()}`
                                        : "Unscheduled"}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            type="button"
                            onClick={() => setShowPreview(!showPreview)}
                            className={cn(
                                "inline-flex items-center px-4 py-2 text-sm font-medium rounded-md border transition-colors",
                                showPreview
                                    ? "bg-blue-50 text-blue-700 border-blue-300"
                                    : "text-gray-700 bg-white border-gray-300 hover:bg-gray-50"
                            )}
                        >
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                        </button>
                        {isEditing ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveContent}
                                    disabled={saving}
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Save
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                            </button>
                        )}
                    </div>
                </div>

                {/* Platform Preview Panel */}
                {showPreview && (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="font-medium text-gray-900">Platform Preview</h3>
                            <button
                                type="button"
                                onClick={() => setShowPreview(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-4">
                            <PlatformPreviewSelector
                                currentPlatform={content.platform}
                                format={content.format}
                                mediaUrl={content.mediaUrl || undefined}
                                caption={isEditing ? editCaption : content.caption || undefined}
                                hashtags={isEditing ? editHashtags.split(",").map(h => h.trim().replace(/^#/, "")).filter(Boolean) : content.hashtags}
                                title={isEditing ? editTitle : content.title || undefined}
                            />
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Media Preview/Upload */}
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="p-4 border-b border-gray-200">
                                <h3 className="font-medium text-gray-900">Media</h3>
                            </div>
                            <div className="p-4">
                                {isEditing && tenantId ? (
                                    <MediaUploader
                                        tenantId={tenantId}
                                        contentId={id}
                                        type={content.format === "SHORT_VIDEO" || content.format === "LONG_VIDEO" ? "video" : "image"}
                                        currentMediaUrl={content.mediaUrl || undefined}
                                        onUpload={(asset: MediaAsset) => {
                                            // Update content with new media URL
                                            contentService.update(id, { mediaUrl: asset.url });
                                            setContent(prev => prev ? { ...prev, mediaUrl: asset.url } : null);
                                        }}
                                    />
                                ) : content.mediaUrl ? (
                                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                        {content.format === "SHORT_VIDEO" || content.format === "LONG_VIDEO" ? (
                                            <video
                                                src={content.mediaUrl}
                                                className="w-full h-full object-cover"
                                                controls
                                            />
                                        ) : (
                                            <img
                                                src={content.mediaUrl}
                                                alt="Content media"
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>
                                ) : (
                                    <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                                        <div className="text-center">
                                            <ImageIcon className="w-12 h-12 mx-auto text-gray-400" />
                                            <p className="mt-2 text-sm text-gray-500">No media uploaded</p>
                                            <p className="mt-1 text-xs text-gray-400">Click Edit to upload media</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Script Editor */}
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="p-4 border-b border-gray-200">
                                <h3 className="font-medium text-gray-900">Script / Talking Points</h3>
                            </div>
                            <div className="p-4">
                                {isEditing ? (
                                    <RichTextEditor
                                        content={editScript}
                                        onChange={setEditScript}
                                        placeholder="Enter your script, talking points, or video structure..."
                                        minHeight="200px"
                                    />
                                ) : (
                                    <div className="prose prose-sm max-w-none">
                                        {content.script ? (
                                            <div
                                                className="text-gray-700"
                                                dangerouslySetInnerHTML={{ __html: content.script }}
                                            />
                                        ) : (
                                            <p className="text-gray-500 italic">No script added yet</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Caption Editor */}
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="p-4 border-b border-gray-200">
                                <h3 className="font-medium text-gray-900">Caption</h3>
                            </div>
                            <div className="p-4">
                                {isEditing ? (
                                    <RichTextEditor
                                        content={editCaption}
                                        onChange={setEditCaption}
                                        placeholder="Enter your caption..."
                                        minHeight="100px"
                                    />
                                ) : (
                                    <div className="prose prose-sm max-w-none">
                                        {content.caption ? (
                                            <div
                                                className="text-gray-700"
                                                dangerouslySetInnerHTML={{ __html: content.caption }}
                                            />
                                        ) : (
                                            <p className="text-gray-500 italic">No caption added yet</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Hashtags */}
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="p-4 border-b border-gray-200">
                                <div className="flex items-center">
                                    <Hash className="w-4 h-4 mr-2 text-gray-400" />
                                    <h3 className="font-medium text-gray-900">Hashtags</h3>
                                </div>
                            </div>
                            <div className="p-4">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editHashtags}
                                        onChange={(e) => setEditHashtags(e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-3"
                                        placeholder="marketing, socialmedia, contentcreator (comma separated)"
                                    />
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {content.hashtags && content.hashtags.length > 0 ? (
                                            content.hashtags.map((tag, i) => (
                                                <span
                                                    key={i}
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                                                >
                                                    #{tag}
                                                </span>
                                            ))
                                        ) : (
                                            <p className="text-gray-500 italic">No hashtags added yet</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Title Card */}
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="p-4 border-b border-gray-200">
                                <h3 className="font-medium text-gray-900">Title</h3>
                            </div>
                            <div className="p-4">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                        placeholder="Content title..."
                                    />
                                ) : (
                                    <p className="text-gray-700">{content.title || "Untitled"}</p>
                                )}
                            </div>
                        </div>

                        {/* Details Card */}
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="p-4 border-b border-gray-200">
                                <h3 className="font-medium text-gray-900">Details</h3>
                            </div>
                            <div className="p-4 space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Platform</span>
                                    <span className="font-medium">{content.platform}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Format</span>
                                    <span className="font-medium">{content.format}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Campaign</span>
                                    <span className="font-medium">
                                        {content.campaign?.name || "No campaign"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Created</span>
                                    <span className="font-medium">
                                        {new Date(content.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Approval Actions */}
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="p-4 border-b border-gray-200">
                                <h3 className="font-medium text-gray-900">Approval</h3>
                            </div>
                            <div className="p-4">
                                <p className="text-sm text-gray-500 mb-3">
                                    Status: <span className="font-semibold">{approval?.status || "PENDING"}</span>
                                </p>
                                {approval?.notes && (
                                    <p className="text-sm text-gray-500 mb-3 bg-gray-50 p-2 rounded">
                                        {approval.notes}
                                    </p>
                                )}
                                <div className="space-y-2">
                                    <button
                                        type="button"
                                        onClick={() => handleApproval(ApprovalStatus.APPROVED)}
                                        disabled={processingApproval}
                                        className="w-full inline-flex justify-center items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Approve
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleApproval(ApprovalStatus.CHANGES_REQUESTED)}
                                        disabled={processingApproval}
                                        className="w-full inline-flex justify-center items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                                    >
                                        <AlertCircle className="w-4 h-4 mr-2" />
                                        Request Changes
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleApproval(ApprovalStatus.REJECTED)}
                                        disabled={processingApproval}
                                        className="w-full inline-flex justify-center items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                                    >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Comments Section */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="font-medium text-gray-900">Comments ({comments.length})</h3>
                    </div>
                    <div className="p-4">
                        <div className="space-y-4 mb-6">
                            {comments.map((comment) => (
                                <div key={comment.id} className="flex space-x-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                            <span className="text-xs font-medium text-gray-600">
                                                {comment.authorId.slice(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">User {comment.authorId.slice(0, 8)}</p>
                                        <p className="text-sm text-gray-700 mt-1">{comment.body}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(comment.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {comments.length === 0 && (
                                <p className="text-center text-gray-500 text-sm py-4">No comments yet</p>
                            )}
                        </div>

                        <form onSubmit={handleCommentSubmit} className="flex space-x-3">
                            <div className="flex-1">
                                <label htmlFor="comment" className="sr-only">Comment</label>
                                <input
                                    type="text"
                                    name="comment"
                                    id="comment"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                    placeholder="Add a comment..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submittingComment || !newComment.trim()}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                                title="Send comment"
                                aria-label="Send comment"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

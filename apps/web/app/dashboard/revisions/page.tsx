"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { revisionsService, contentService } from "@/services/api";
import { ContentItem } from "@/types";
import { Loader2, Plus, X, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Revision {
    id: string;
    contentId: string;
    requestedBy: string;
    notes?: string;
    status: "OPEN" | "RESOLVED" | "REJECTED";
    content?: ContentItem;
    createdAt: string;
    updatedAt: string;
}

export default function RevisionsPage() {
    const [revisions, setRevisions] = useState<Revision[]>([]);
    const [contentItems, setContentItems] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>("ALL");

    // Form state
    const [selectedContentId, setSelectedContentId] = useState("");
    const [revisionNotes, setRevisionNotes] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [revisionsData, contentData] = await Promise.all([
                revisionsService.list(),
                contentService.list(),
            ]);
            setRevisions(revisionsData);
            setContentItems(contentData);
        } catch (error) {
            console.error("Failed to fetch revisions", error);
            toast.error("Failed to fetch revisions");
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setSelectedContentId("");
        setRevisionNotes("");
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedContentId) {
            toast.error("Please select a content item");
            return;
        }

        setSubmitting(true);
        try {
            await revisionsService.create({
                contentId: selectedContentId,
                notes: revisionNotes || undefined,
            });
            toast.success("Revision request created");
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Failed to create revision", error);
            toast.error("Failed to create revision request");
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusUpdate = async (id: string, status: "OPEN" | "RESOLVED" | "REJECTED") => {
        try {
            await revisionsService.updateStatus(id, status);
            toast.success(`Revision marked as ${status.toLowerCase()}`);
            fetchData();
        } catch (error) {
            console.error("Failed to update revision status", error);
            toast.error("Failed to update revision status");
        }
    };

    const filteredRevisions = revisions.filter((r) =>
        filterStatus === "ALL" ? true : r.status === filterStatus
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case "OPEN":
                return "bg-yellow-100 text-yellow-800";
            case "RESOLVED":
                return "bg-green-100 text-green-800";
            case "REJECTED":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "OPEN":
                return <Clock className="w-4 h-4" />;
            case "RESOLVED":
                return <CheckCircle className="w-4 h-4" />;
            case "REJECTED":
                return <XCircle className="w-4 h-4" />;
            default:
                return null;
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto">
                <div className="md:flex md:items-center md:justify-between mb-8">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                            Revision Requests
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Track and manage content revision requests.
                        </p>
                    </div>
                    <div className="mt-4 flex md:ml-4 md:mt-0">
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="ml-3 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            New Request
                        </button>
                    </div>
                </div>

                {/* Filter */}
                <div className="mb-6 flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">Filter by status:</span>
                    <div className="flex space-x-2">
                        {["ALL", "OPEN", "RESOLVED", "REJECTED"].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={cn(
                                    "px-3 py-1 text-sm font-medium rounded-full transition-colors",
                                    filterStatus === status
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                )}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : filteredRevisions.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No revision requests</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {filterStatus === "ALL"
                                ? "Create a revision request to track content changes."
                                : `No ${filterStatus.toLowerCase()} revision requests found.`}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200">
                            {filteredRevisions.map((revision) => (
                                <li key={revision.id}>
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-3",
                                                        getStatusColor(revision.status)
                                                    )}
                                                >
                                                    {getStatusIcon(revision.status)}
                                                    <span className="ml-1">{revision.status}</span>
                                                </span>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        Content: {revision.content?.platform || "Unknown"} -{" "}
                                                        {revision.content?.format || "Unknown"}
                                                    </p>
                                                    {revision.notes && (
                                                        <p className="text-sm text-gray-500 mt-1">
                                                            Notes: {revision.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <Link
                                                    href={`/dashboard/content/${revision.contentId}`}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="View content"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                {revision.status === "OPEN" && (
                                                    <>
                                                        <button
                                                            onClick={() =>
                                                                handleStatusUpdate(revision.id, "RESOLVED")
                                                            }
                                                            className="text-green-600 hover:text-green-800"
                                                            title="Mark as resolved"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleStatusUpdate(revision.id, "REJECTED")
                                                            }
                                                            className="text-red-600 hover:text-red-800"
                                                            title="Reject"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-500">
                                            Created {new Date(revision.createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Create Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                            <div className="flex justify-between items-center p-6 border-b">
                                <h3 className="text-lg font-medium">Create Revision Request</h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-500"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Select Content
                                    </label>
                                    <select
                                        required
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                        value={selectedContentId}
                                        onChange={(e) => setSelectedContentId(e.target.value)}
                                    >
                                        <option value="">Choose content...</option>
                                        {contentItems.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.platform} - {item.format} ({item.state})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Notes (Optional)
                                    </label>
                                    <textarea
                                        rows={3}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                        placeholder="Describe the changes needed..."
                                        value={revisionNotes}
                                        onChange={(e) => setRevisionNotes(e.target.value)}
                                    />
                                </div>

                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Create Request
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { campaignsService } from "@/services/api";
import { Campaign, CampaignStatus, CreateCampaignDto, UpdateCampaignDto } from "@/types";
import { Plus, Loader2, Edit2, Trash2, X, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [campaignName, setCampaignName] = useState("");
    const [campaignStatus, setCampaignStatus] = useState<CampaignStatus>(CampaignStatus.ACTIVE);

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            const data = await campaignsService.list();
            setCampaigns(data);
        } catch (error) {
            console.error("Failed to fetch campaigns", error);
            toast.error("Failed to fetch campaigns");
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingCampaign(null);
        setCampaignName("");
        setCampaignStatus(CampaignStatus.ACTIVE);
        setIsModalOpen(true);
    };

    const openEditModal = (campaign: Campaign) => {
        setEditingCampaign(campaign);
        setCampaignName(campaign.name);
        setCampaignStatus(campaign.status);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this campaign?")) return;
        try {
            await campaignsService.delete(id);
            toast.success("Campaign deleted successfully");
            fetchCampaigns();
        } catch (error) {
            console.error("Failed to delete campaign", error);
            toast.error("Failed to delete campaign");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            if (editingCampaign) {
                const dto: UpdateCampaignDto = {
                    name: campaignName,
                    status: campaignStatus,
                };
                await campaignsService.update(editingCampaign.id, dto);
                toast.success("Campaign updated successfully");
            } else {
                const dto: CreateCampaignDto = {
                    name: campaignName,
                };
                await campaignsService.create(dto);
                toast.success("Campaign created successfully");
            }
            setIsModalOpen(false);
            setCampaignName("");
            fetchCampaigns();
        } catch (error) {
            console.error("Failed to save campaign", error);
            toast.error("Failed to save campaign");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto">
                <div className="md:flex md:items-center md:justify-between mb-8">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                            Campaigns
                        </h2>
                    </div>
                    <div className="mt-4 flex md:ml-4 md:mt-0">
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="ml-3 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            New Campaign
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <ul role="list" className="divide-y divide-gray-200">
                            {campaigns.map((campaign) => (
                                <li key={campaign.id}>
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <div className="truncate">
                                                <div className="flex text-sm">
                                                    <p className="font-medium text-blue-600 truncate">{campaign.name}</p>
                                                    <p className="ml-1 flex-shrink-0 font-normal text-gray-500">
                                                        in {campaign.tenantId}
                                                    </p>
                                                </div>
                                                <div className="mt-2 flex">
                                                    <div className="flex items-center text-sm text-gray-500">
                                                        <p>
                                                            Created on{" "}
                                                            <time dateTime={campaign.createdAt}>
                                                                {new Date(campaign.createdAt).toLocaleDateString()}
                                                            </time>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                                                        campaign.status === "ACTIVE"
                                                            ? "bg-green-50 text-green-700 ring-green-600/20"
                                                            : "bg-gray-50 text-gray-600 ring-gray-500/10"
                                                    )}
                                                >
                                                    {campaign.status}
                                                </span>
                                                <Link
                                                    href={`/dashboard/campaigns/${campaign.id}`}
                                                    className="text-blue-400 hover:text-blue-500"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(campaign)}
                                                    className="text-gray-400 hover:text-gray-500"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(campaign.id)}
                                                    className="text-red-400 hover:text-red-500"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                            {campaigns.length === 0 && (
                                <li className="px-4 py-12 text-center text-gray-500">
                                    No campaigns found. Create one to get started.
                                </li>
                            )}
                        </ul>
                    </div>
                )}

                {/* Create/Edit Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                            <div className="flex justify-between items-center p-6 border-b">
                                <h3 className="text-lg font-medium">
                                    {editingCampaign ? "Edit Campaign" : "Create New Campaign"}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                        Campaign Name
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        required
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                        value={campaignName}
                                        onChange={(e) => setCampaignName(e.target.value)}
                                        placeholder="e.g. Summer Sale 2024"
                                    />
                                </div>

                                {editingCampaign && (
                                    <div>
                                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                                            Status
                                        </label>
                                        <select
                                            id="status"
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                            value={campaignStatus}
                                            onChange={(e) => setCampaignStatus(e.target.value as CampaignStatus)}
                                        >
                                            <option value={CampaignStatus.ACTIVE}>Active</option>
                                            <option value={CampaignStatus.PAUSED}>Paused</option>
                                            <option value={CampaignStatus.ARCHIVED}>Archived</option>
                                        </select>
                                    </div>
                                )}

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
                                        {editingCampaign ? "Save Changes" : "Create Campaign"}
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

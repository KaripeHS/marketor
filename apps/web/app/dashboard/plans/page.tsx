"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { plansService, strategyService } from "@/services/api";
import { Strategy, Platform, ContentFormat } from "@/types";
import { Loader2, Plus, X, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";

interface PlanItem {
    id: string;
    platform: Platform;
    format: ContentFormat;
    scheduledAt: string;
    topicSlug?: string;
    contentId?: string;
}

interface ContentPlan {
    id: string;
    tenantId: string;
    strategyId?: string;
    strategy?: Strategy;
    timeWindow: Record<string, any>;
    items: PlanItem[];
    createdAt: string;
    updatedAt: string;
}

export default function PlansPage() {
    const [plans, setPlans] = useState<ContentPlan[]>([]);
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [selectedStrategyId, setSelectedStrategyId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [planItems, setPlanItems] = useState<{
        platform: Platform;
        format: ContentFormat;
        scheduledAt: string;
        topicSlug: string;
    }[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [plansData, strategiesData] = await Promise.all([
                plansService.list(),
                strategyService.list(),
            ]);
            setPlans(plansData);
            setStrategies(strategiesData);
        } catch (error) {
            console.error("Failed to fetch data", error);
            toast.error("Failed to fetch content plans");
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setSelectedStrategyId("");
        setStartDate("");
        setEndDate("");
        setPlanItems([]);
        setIsModalOpen(true);
    };

    const addPlanItem = () => {
        setPlanItems([
            ...planItems,
            {
                platform: Platform.TIKTOK,
                format: ContentFormat.SHORT_VIDEO,
                scheduledAt: "",
                topicSlug: "",
            },
        ]);
    };

    const removePlanItem = (index: number) => {
        setPlanItems(planItems.filter((_, i) => i !== index));
    };

    const updatePlanItem = (index: number, field: string, value: string) => {
        const updated = [...planItems];
        updated[index] = { ...updated[index], [field]: value };
        setPlanItems(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDate || !endDate) {
            toast.error("Please select start and end dates");
            return;
        }
        if (planItems.length === 0) {
            toast.error("Please add at least one content item to the plan");
            return;
        }

        setSubmitting(true);
        try {
            await plansService.create({
                strategyId: selectedStrategyId || undefined,
                timeWindow: { start: startDate, end: endDate },
                items: planItems.map((item) => ({
                    platform: item.platform,
                    format: item.format,
                    scheduledAt: new Date(item.scheduledAt).toISOString(),
                    topicSlug: item.topicSlug || undefined,
                })),
            });
            toast.success("Content plan created successfully");
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Failed to create plan", error);
            toast.error("Failed to create content plan");
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
                            Content Plans
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Schedule and organize your content creation workflow.
                        </p>
                    </div>
                    <div className="mt-4 flex md:ml-4 md:mt-0">
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="ml-3 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            New Plan
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : plans.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                        <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No content plans</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Create a content plan to schedule your posts.
                        </p>
                        <div className="mt-6">
                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                New Plan
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200"
                            >
                                <div className="px-4 py-5 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                                            <h3 className="text-lg font-medium leading-6 text-gray-900">
                                                {plan.strategy?.name || "Untitled Plan"}
                                            </h3>
                                        </div>
                                    </div>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {plan.timeWindow?.start && plan.timeWindow?.end
                                            ? `${new Date(plan.timeWindow.start).toLocaleDateString()} - ${new Date(plan.timeWindow.end).toLocaleDateString()}`
                                            : "No date range set"}
                                    </p>
                                </div>
                                <div className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center text-sm text-gray-500">
                                        <Clock className="h-4 w-4 mr-1" />
                                        <span>{plan.items?.length || 0} scheduled items</span>
                                    </div>
                                    {plan.items && plan.items.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                            {plan.items.slice(0, 3).map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between text-xs bg-gray-50 rounded p-2"
                                                >
                                                    <span className="font-medium">{item.platform}</span>
                                                    <span className="text-gray-500">{item.format}</span>
                                                </div>
                                            ))}
                                            {plan.items.length > 3 && (
                                                <p className="text-xs text-gray-400 text-center">
                                                    +{plan.items.length - 3} more items
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create Plan Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center p-6 border-b">
                                <h3 className="text-lg font-medium">Create Content Plan</h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-500"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Link to Strategy (Optional)
                                    </label>
                                    <select
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                        value={selectedStrategyId}
                                        onChange={(e) => setSelectedStrategyId(e.target.value)}
                                    >
                                        <option value="">No strategy</option>
                                        {strategies.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            End Date
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Plan Items
                                        </label>
                                        <button
                                            type="button"
                                            onClick={addPlanItem}
                                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            + Add Item
                                        </button>
                                    </div>

                                    {planItems.length === 0 ? (
                                        <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                                            No items added. Click "Add Item" to start.
                                        </p>
                                    ) : (
                                        <div className="space-y-4">
                                            {planItems.map((item, index) => (
                                                <div
                                                    key={index}
                                                    className="border rounded-lg p-4 relative"
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => removePlanItem(index)}
                                                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-500">
                                                                Platform
                                                            </label>
                                                            <select
                                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-2"
                                                                value={item.platform}
                                                                onChange={(e) =>
                                                                    updatePlanItem(index, "platform", e.target.value)
                                                                }
                                                            >
                                                                {Object.values(Platform).map((p) => (
                                                                    <option key={p} value={p}>
                                                                        {p}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-500">
                                                                Format
                                                            </label>
                                                            <select
                                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-2"
                                                                value={item.format}
                                                                onChange={(e) =>
                                                                    updatePlanItem(index, "format", e.target.value)
                                                                }
                                                            >
                                                                {Object.values(ContentFormat).map((f) => (
                                                                    <option key={f} value={f}>
                                                                        {f}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-500">
                                                                Scheduled Date/Time
                                                            </label>
                                                            <input
                                                                type="datetime-local"
                                                                required
                                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-2"
                                                                value={item.scheduledAt}
                                                                onChange={(e) =>
                                                                    updatePlanItem(index, "scheduledAt", e.target.value)
                                                                }
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-500">
                                                                Topic (Optional)
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g., product-launch"
                                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-2"
                                                                value={item.topicSlug}
                                                                onChange={(e) =>
                                                                    updatePlanItem(index, "topicSlug", e.target.value)
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end space-x-3 pt-4 border-t">
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
                                        Create Plan
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

"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { strategyService, aiService } from "@/services/api";
import { Strategy, CreateStrategyDto, UpdateStrategyDto } from "@/types";
import { Loader2, Plus, X, Edit2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function StrategyPage() {
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [startsOn, setStartsOn] = useState("");
    const [endsOn, setEndsOn] = useState("");
    const [goals, setGoals] = useState("");
    const [pillars, setPillars] = useState("");
    const [platformFocus, setPlatformFocus] = useState("");

    useEffect(() => {
        fetchStrategies();
    }, []);

    const fetchStrategies = async () => {
        try {
            const data = await strategyService.list();
            setStrategies(data);
        } catch (error) {
            console.error("Failed to fetch strategies", error);
            toast.error("Failed to fetch strategies");
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingStrategy(null);
        resetForm();
        setIsModalOpen(true);
    };

    const openEditModal = (strategy: Strategy) => {
        setEditingStrategy(strategy);
        setName(strategy.name);
        setStartsOn(new Date(strategy.startsOn).toISOString().slice(0, 10));
        setEndsOn(new Date(strategy.endsOn).toISOString().slice(0, 10));
        setGoals(JSON.stringify(strategy.goals, null, 2));
        setPillars(JSON.stringify(strategy.pillars, null, 2));
        setPlatformFocus(JSON.stringify(strategy.platformFocus, null, 2));
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this strategy?")) return;
        try {
            await strategyService.delete(id);
            toast.success("Strategy deleted successfully");
            fetchStrategies();
        } catch (error) {
            console.error("Failed to delete strategy", error);
            toast.error("Failed to delete strategy");
        }
    };

    const handleGenerate = async () => {
        if (!name) {
            toast.error("Please enter a strategy name first to give context.");
            return;
        }
        setGenerating(true);
        try {
            const result = await aiService.generate("STRATEGY", { name });
            if (result && result.data) {
                if (result.data.goals) setGoals(JSON.stringify(result.data.goals, null, 2));
                if (result.data.pillars) setPillars(JSON.stringify(result.data.pillars, null, 2));
                if (result.data.platformFocus) setPlatformFocus(JSON.stringify(result.data.platformFocus, null, 2));
                toast.success("Strategy generated!");
            }
        } catch (error) {
            console.error("Failed to generate strategy", error);
            toast.error("Failed to generate strategy suggestions.");
        } finally {
            setGenerating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const parsedGoals = JSON.parse(goals || "{}");
            const parsedPillars = JSON.parse(pillars || "{}");
            const parsedPlatformFocus = JSON.parse(platformFocus || "{}");

            if (editingStrategy) {
                const dto: UpdateStrategyDto = {
                    name,
                    startsOn: new Date(startsOn).toISOString(),
                    endsOn: new Date(endsOn).toISOString(),
                    goals: parsedGoals,
                    pillars: parsedPillars,
                    platformFocus: parsedPlatformFocus,
                };
                await strategyService.update(editingStrategy.id, dto);
                toast.success("Strategy updated successfully");
            } else {
                const dto: CreateStrategyDto = {
                    name,
                    startsOn: new Date(startsOn).toISOString(),
                    endsOn: new Date(endsOn).toISOString(),
                    goals: parsedGoals,
                    pillars: parsedPillars,
                    platformFocus: parsedPlatformFocus,
                };
                await strategyService.create(dto);
                toast.success("Strategy created successfully");
            }

            setIsModalOpen(false);
            resetForm();
            fetchStrategies();
        } catch (error) {
            console.error("Failed to save strategy", error);
            toast.error("Failed to save strategy. Check JSON format.");
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setName("");
        setStartsOn("");
        setEndsOn("");
        setGoals("");
        setPillars("");
        setPlatformFocus("");
    };

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto">
                <div className="md:flex md:items-center md:justify-between mb-8">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                            Marketing Strategies
                        </h2>
                    </div>
                    <div className="mt-4 flex md:ml-4 md:mt-0">
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="ml-3 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            New Strategy
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {strategies.map((strategy) => (
                            <div key={strategy.id} className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200">
                                <div className="px-4 py-5 sm:px-6 flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-medium leading-6 text-gray-900">{strategy.name}</h3>
                                        <p className="mt-1 text-sm text-gray-500">
                                            {new Date(strategy.startsOn).toLocaleDateString()} - {new Date(strategy.endsOn).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => openEditModal(strategy)}
                                            className="text-gray-400 hover:text-gray-500"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(strategy.id)}
                                            className="text-red-400 hover:text-red-500"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="px-4 py-5 sm:p-6">
                                    <div className="text-sm text-gray-500 space-y-2">
                                        <p><span className="font-medium">Goals:</span> {JSON.stringify(strategy.goals).slice(0, 50)}...</p>
                                        <p><span className="font-medium">Pillars:</span> {JSON.stringify(strategy.pillars).slice(0, 50)}...</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {strategies.length === 0 && (
                            <div className="col-span-full text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                                <p className="text-gray-500">No strategies found. Create one to get started.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Create/Edit Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center p-6 border-b">
                                <h3 className="text-lg font-medium">
                                    {editingStrategy ? "Edit Strategy" : "Create New Strategy"}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                <div className="flex items-end gap-4">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700">Strategy Name</label>
                                        <input
                                            type="text"
                                            required
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g. Summer Growth 2024"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleGenerate}
                                        disabled={generating}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 mb-[1px]"
                                    >
                                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                        Auto-Generate
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Start Date</label>
                                        <input
                                            type="date"
                                            required
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                            value={startsOn}
                                            onChange={(e) => setStartsOn(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">End Date</label>
                                        <input
                                            type="date"
                                            required
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                            value={endsOn}
                                            onChange={(e) => setEndsOn(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Goals (JSON)</label>
                                    <textarea
                                        rows={3}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 font-mono"
                                        value={goals}
                                        onChange={(e) => setGoals(e.target.value)}
                                        placeholder='{"primary": "Increase leads by 20%"}'
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Pillars (JSON)</label>
                                    <textarea
                                        rows={3}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 font-mono"
                                        value={pillars}
                                        onChange={(e) => setPillars(e.target.value)}
                                        placeholder='["Education", "Behind the Scenes"]'
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Platform Focus (JSON)</label>
                                    <textarea
                                        rows={3}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 font-mono"
                                        value={platformFocus}
                                        onChange={(e) => setPlatformFocus(e.target.value)}
                                        placeholder='{"instagram": "Reels", "linkedin": "Articles"}'
                                    />
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
                                        {editingStrategy ? "Save Changes" : "Create Strategy"}
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

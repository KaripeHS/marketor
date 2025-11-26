"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { brandService } from "@/services/api";
import { BrandProfile, UpsertBrandDto } from "@/types";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export default function BrandPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [, setBrand] = useState<BrandProfile | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [voice, setVoice] = useState("");
    const [audiences, setAudiences] = useState("");
    const [valueProps, setValueProps] = useState("");
    const [visualStyle, setVisualStyle] = useState("");

    useEffect(() => {
        fetchBrand();
    }, []);

    const fetchBrand = async () => {
        try {
            const brands = await brandService.list();
            if (brands && brands.length > 0) {
                const current = brands[0];
                setBrand(current);
                setName(current.name);
                setVoice(JSON.stringify(current.voice, null, 2));
                setAudiences(JSON.stringify(current.audiences, null, 2));
                setValueProps(JSON.stringify(current.valueProps, null, 2));
                setVisualStyle(JSON.stringify(current.visualStyle, null, 2));
            }
        } catch (error) {
            console.error("Failed to fetch brand", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const dto: UpsertBrandDto = {
                name,
                voice: JSON.parse(voice || "{}"),
                audiences: JSON.parse(audiences || "{}"),
                valueProps: JSON.parse(valueProps || "{}"),
                visualStyle: JSON.parse(visualStyle || "{}"),
            };

            const updated = await brandService.upsert(dto);
            setBrand(updated);
            toast.success("Brand profile saved successfully!");
        } catch (error) {
            console.error("Failed to save brand", error);
            toast.error("Failed to save. Please check your JSON format.");
        } finally {
            setSaving(false);
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

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto">
                <div className="md:flex md:items-center md:justify-between mb-8">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                            Brand Profile
                        </h2>
                    </div>
                </div>

                <div className="bg-white shadow sm:rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <form onSubmit={handleSave} className="space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                    Brand Name
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        name="name"
                                        id="name"
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="voice" className="block text-sm font-medium text-gray-700">
                                    Voice (JSON)
                                </label>
                                <div className="mt-1">
                                    <textarea
                                        id="voice"
                                        name="voice"
                                        rows={4}
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border font-mono"
                                        value={voice}
                                        onChange={(e) => setVoice(e.target.value)}
                                        placeholder='{"tone": "Professional", "style": "Direct"}'
                                    />
                                </div>
                                <p className="mt-2 text-sm text-gray-500">Define your brand's voice and tone.</p>
                            </div>

                            <div>
                                <label htmlFor="audiences" className="block text-sm font-medium text-gray-700">
                                    Audiences (JSON)
                                </label>
                                <div className="mt-1">
                                    <textarea
                                        id="audiences"
                                        name="audiences"
                                        rows={4}
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border font-mono"
                                        value={audiences}
                                        onChange={(e) => setAudiences(e.target.value)}
                                        placeholder='{"primary": "Small Business Owners"}'
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="valueProps" className="block text-sm font-medium text-gray-700">
                                    Value Props (JSON)
                                </label>
                                <div className="mt-1">
                                    <textarea
                                        id="valueProps"
                                        name="valueProps"
                                        rows={4}
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border font-mono"
                                        value={valueProps}
                                        onChange={(e) => setValueProps(e.target.value)}
                                        placeholder='{"core": "Save time on marketing"}'
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="visualStyle" className="block text-sm font-medium text-gray-700">
                                    Visual Style (JSON)
                                </label>
                                <div className="mt-1">
                                    <textarea
                                        id="visualStyle"
                                        name="visualStyle"
                                        rows={4}
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border font-mono"
                                        value={visualStyle}
                                        onChange={(e) => setVisualStyle(e.target.value)}
                                        placeholder='{"colors": ["#000000", "#FFFFFF"]}'
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Save Profile
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

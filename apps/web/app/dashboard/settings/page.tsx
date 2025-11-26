"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { tenantsService } from "@/services/api";
import { toast } from "sonner";
import { Save, User, Building, Loader2 } from "lucide-react";

export default function SettingsPage() {
    const { currentUser, currentTenant, refreshAuth, isLoading } = useAuth();
    const [tenantName, setTenantName] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (currentTenant?.name) {
            setTenantName(currentTenant.name);
        }
    }, [currentTenant]);

    const handleSaveTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentTenant) return;

        setLoading(true);
        try {
            await tenantsService.update(currentTenant.id, { name: tenantName });
            await refreshAuth();
            toast.success("Tenant settings updated");
        } catch (error) {
            console.error("Failed to update tenant", error);
            toast.error("Failed to update settings");
        } finally {
            setLoading(false);
        }
    };

    if (isLoading || !currentUser || !currentTenant) {
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
            <div className="max-w-4xl mx-auto space-y-8">
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

            {/* Tenant Settings */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center">
                    <Building className="h-5 w-5 text-gray-400 mr-2" />
                    <h2 className="text-lg font-medium text-gray-900">Organization Settings</h2>
                </div>
                <div className="p-6">
                    <form onSubmit={handleSaveTenant} className="space-y-4">
                        <div>
                            <label htmlFor="tenantName" className="block text-sm font-medium text-gray-700">
                                Organization Name
                            </label>
                            <input
                                type="text"
                                id="tenantName"
                                value={tenantName}
                                onChange={(e) => setTenantName(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Tenant ID
                            </label>
                            <div className="mt-1 p-2 bg-gray-50 rounded-md text-gray-500 text-sm font-mono">
                                {currentTenant.id}
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {loading ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* User Profile (Read-only for now) */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-2" />
                    <h2 className="text-lg font-medium text-gray-900">User Profile</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Name
                        </label>
                        <div className="mt-1 text-gray-900">{currentUser.name}</div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Email
                        </label>
                        <div className="mt-1 text-gray-900">{currentUser.email}</div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            User ID
                        </label>
                        <div className="mt-1 p-2 bg-gray-50 rounded-md text-gray-500 text-sm font-mono">
                            {currentUser.id}
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </DashboardLayout>
    );
}

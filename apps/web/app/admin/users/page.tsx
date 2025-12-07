"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { adminService } from "@/services/api";
import {
    Loader2,
    ChevronLeft,
    ChevronRight,
    Search,
    Trash2,
    UserCog,
    Building2,
} from "lucide-react";

interface User {
    id: string;
    email: string;
    name: string | null;
    authProvider: string;
    createdAt: string;
    memberships: {
        tenantId: string;
        tenantName: string;
        role: string;
    }[];
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

const roleColors: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-800",
    AGENCY: "bg-blue-100 text-blue-800",
    CLIENT: "bg-green-100 text-green-800",
    REVIEWER: "bg-yellow-100 text-yellow-800",
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);

    useEffect(() => {
        loadUsers();
    }, [page]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await adminService.getUsers(page, 20);
            setUsers(data.data);
            setPagination(data.pagination);
        } catch (error) {
            console.error("Failed to load users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (userId: string, email: string) => {
        if (!confirm(`Are you sure you want to delete user ${email}? This cannot be undone.`)) {
            return;
        }
        try {
            await adminService.deleteUser(userId);
            loadUsers();
        } catch (error) {
            console.error("Failed to delete user:", error);
        }
    };

    const handleImpersonate = async (userId: string) => {
        if (!confirm("Are you sure you want to impersonate this user? This will be logged.")) {
            return;
        }
        try {
            const result = await adminService.impersonateUser(userId);
            console.log("Impersonation result:", result);
            alert(`Impersonation token generated for ${result.user.email}`);
        } catch (error) {
            console.error("Failed to impersonate user:", error);
        }
    };

    const filteredUsers = users.filter(
        (u) =>
            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Manage all users across the platform
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Auth Provider
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Memberships
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Joined
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                                                    <span className="text-purple-600 font-medium">
                                                        {(user.name || user.email).charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {user.name || "No name"}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {user.authProvider}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {user.memberships.length === 0 ? (
                                                    <span className="text-sm text-gray-400">
                                                        No memberships
                                                    </span>
                                                ) : (
                                                    user.memberships.slice(0, 3).map((m, i) => (
                                                        <div
                                                            key={i}
                                                            className="flex items-center gap-1 text-xs"
                                                        >
                                                            <Building2 className="w-3 h-3 text-gray-400" />
                                                            <span className="text-gray-600">
                                                                {m.tenantName}
                                                            </span>
                                                            <span
                                                                className={`px-1.5 py-0.5 rounded text-xs ${
                                                                    roleColors[m.role] || "bg-gray-100 text-gray-800"
                                                                }`}
                                                            >
                                                                {m.role}
                                                            </span>
                                                        </div>
                                                    ))
                                                )}
                                                {user.memberships.length > 3 && (
                                                    <span className="text-xs text-gray-400">
                                                        +{user.memberships.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleImpersonate(user.id)}
                                                    className="text-gray-400 hover:text-blue-600"
                                                    title="Impersonate user"
                                                >
                                                    <UserCog className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id, user.email)}
                                                    className="text-gray-400 hover:text-red-600"
                                                    title="Delete user"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* Pagination */}
                    {pagination && pagination.pages > 1 && (
                        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Showing{" "}
                                        <span className="font-medium">
                                            {(page - 1) * pagination.limit + 1}
                                        </span>{" "}
                                        to{" "}
                                        <span className="font-medium">
                                            {Math.min(page * pagination.limit, pagination.total)}
                                        </span>{" "}
                                        of <span className="font-medium">{pagination.total}</span>{" "}
                                        results
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                        <button
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <ChevronLeft className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() =>
                                                setPage((p) => Math.min(pagination.pages, p + 1))
                                            }
                                            disabled={page === pagination.pages}
                                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <ChevronRight className="h-5 w-5" />
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

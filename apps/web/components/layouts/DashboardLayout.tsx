"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Calendar, Megaphone, Settings, LogOut, BarChart3, FileText, Palette, Target, ClipboardList, GitBranch, History, Bell, Menu, X, Share2, Users } from "lucide-react";
import { useState } from "react";
import NotificationCenter from "../notifications/NotificationCenter";
import TenantSwitcher from "../TenantSwitcher";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { logout } = useAuth();

    const navItems = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone },
        { name: "Content", href: "/dashboard/content", icon: FileText },
        { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
        { name: "Brand", href: "/dashboard/brand", icon: Palette },
        { name: "Strategy", href: "/dashboard/strategy", icon: Target },
        { name: "Plans", href: "/dashboard/plans", icon: ClipboardList },
        { name: "Integrations", href: "/dashboard/integrations", icon: Share2 },
        { name: "Team", href: "/dashboard/team", icon: Users },
        { name: "Revisions", href: "/dashboard/revisions", icon: GitBranch },
        { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
        { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
        { name: "Audit Log", href: "/dashboard/audit", icon: History },
        { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ];

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Mobile menu overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 ease-in-out md:hidden",
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-900">Marketor</h1>
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-gray-500 hover:text-gray-700"
                        aria-label="Close menu"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Mobile Tenant Switcher */}
                <div className="px-4 py-2 border-b border-gray-100">
                    <TenantSwitcher />
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={cn(
                                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                                    isActive
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-gray-700 hover:bg-gray-100"
                                )}
                            >
                                <item.icon className="w-5 h-5 mr-3" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={() => { logout(); setMobileMenuOpen(false); }}
                        className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Desktop Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-gray-900">Marketor</h1>
                </div>

                {/* Desktop Tenant Switcher */}
                <div className="px-4 py-2 border-b border-gray-100">
                    <TenantSwitcher />
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                                    isActive
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-gray-700 hover:bg-gray-100"
                                )}
                            >
                                <item.icon className="w-5 h-5 mr-3" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={logout}
                        className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(true)}
                        className="md:hidden text-gray-500 hover:text-gray-700"
                        aria-label="Open menu"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex-1 md:hidden" />
                    <NotificationCenter />
                </header>
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

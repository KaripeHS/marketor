"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { notificationsService } from "@/services/api";
import { Notification as AppNotification } from "@/types";
import { Loader2, Bell, Check, CheckCheck, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "unread">("all");

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await notificationsService.list();
            setNotifications(data);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
            toast.error("Failed to load notifications");
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await notificationsService.markRead(id);
            setNotifications(notifications.map(n =>
                n.id === id ? { ...n, readAt: new Date().toISOString() } : n
            ));
            toast.success("Notification marked as read");
        } catch (error) {
            console.error("Failed to mark notification as read", error);
            toast.error("Failed to update notification");
        }
    };

    const handleMarkAllAsRead = async () => {
        const unread = notifications.filter(n => !n.readAt);
        try {
            await Promise.all(unread.map(n => notificationsService.markRead(n.id)));
            setNotifications(notifications.map(n => ({ ...n, readAt: new Date().toISOString() })));
            toast.success("All notifications marked as read");
        } catch (error) {
            console.error("Failed to mark all as read", error);
            toast.error("Failed to update notifications");
        }
    };

    const filteredNotifications = filter === "unread"
        ? notifications.filter(n => !n.readAt)
        : notifications;

    const unreadCount = notifications.filter(n => !n.readAt).length;

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case "approval":
                return "bg-green-100 text-green-600";
            case "revision":
                return "bg-yellow-100 text-yellow-600";
            case "comment":
                return "bg-blue-100 text-blue-600";
            default:
                return "bg-gray-100 text-gray-600";
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto">
                <div className="md:flex md:items-center md:justify-between mb-8">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                            Notifications
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
                        </p>
                    </div>
                    <div className="mt-4 flex items-center space-x-3 md:ml-4 md:mt-0">
                        <button
                            onClick={fetchNotifications}
                            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        >
                            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                            Refresh
                        </button>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                            >
                                <CheckCheck className="h-4 w-4 mr-2" />
                                Mark all read
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="mb-6 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setFilter("all")}
                            className={cn(
                                "whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm",
                                filter === "all"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            )}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter("unread")}
                            className={cn(
                                "whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm",
                                filter === "unread"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            )}
                        >
                            Unread
                            {unreadCount > 0 && (
                                <span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    </nav>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                        <Bell className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                            {filter === "unread" ? "No unread notifications" : "No notifications"}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {filter === "unread"
                                ? "You're all caught up!"
                                : "Notifications will appear here when there's activity."}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200">
                            {filteredNotifications.map((notification) => (
                                <li
                                    key={notification.id}
                                    className={cn(
                                        "px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors",
                                        !notification.readAt && "bg-blue-50/50"
                                    )}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start space-x-4">
                                            <div className={cn(
                                                "flex-shrink-0 rounded-full p-2",
                                                getNotificationIcon(notification.payload?.type as string || "default")
                                            )}>
                                                <Bell className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className={cn(
                                                    "text-sm",
                                                    !notification.readAt ? "font-medium text-gray-900" : "text-gray-700"
                                                )}>
                                                    {notification.payload?.message as string || "New notification"}
                                                </p>
                                                {notification.payload?.details && (
                                                    <p className="mt-1 text-sm text-gray-500">
                                                        {notification.payload.details as string}
                                                    </p>
                                                )}
                                                <p className="mt-1 text-xs text-gray-400">
                                                    {new Date(notification.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {!notification.readAt && (
                                                <button
                                                    onClick={() => handleMarkAsRead(notification.id)}
                                                    className="text-gray-400 hover:text-blue-600 p-1"
                                                    title="Mark as read"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

"use client";

import React, { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { notificationsService } from "@/services/api";
import { Notification as AppNotification } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        try {
            const data = await notificationsService.list();
            setNotifications(data);
            setUnreadCount(data.filter((n) => !n.readAt).length);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleMarkRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await notificationsService.markRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Failed to mark notification as read", error);
            toast.error("Failed to update notification");
        }
    };

    const toggleOpen = () => setIsOpen(!isOpen);

    return (
        <div className="relative">
            <button
                onClick={toggleOpen}
                className="p-2 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 relative"
            >
                <span className="sr-only">View notifications</span>
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-red-500" />
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10 cursor-default"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 max-h-96 overflow-y-auto">
                        <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                            <div className="px-4 py-2 border-b border-gray-100">
                                <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                            </div>
                            {notifications.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-gray-500">
                                    No notifications
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-100">
                                    {notifications.map((notification) => (
                                        <li
                                            key={notification.id}
                                            className={cn(
                                                "px-4 py-3 hover:bg-gray-50 transition-colors",
                                                !notification.readAt && "bg-blue-50"
                                            )}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {notification.type}
                                                    </p>
                                                    <p className="text-sm text-gray-500 truncate">
                                                        {JSON.stringify(notification.payload)}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {new Date(notification.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                                {!notification.readAt && (
                                                    <button
                                                        onClick={(e) => handleMarkRead(notification.id, e)}
                                                        className="ml-2 text-blue-600 hover:text-blue-800"
                                                        title="Mark as read"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { contentService, campaignsService } from "@/services/api";
import { ContentItem, ContentState, Campaign } from "@/types";
import { ChevronLeft, ChevronRight, Loader2, X, Eye, Clock, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function CalendarPage() {
    const [contentItems, setContentItems] = useState<ContentItem[]>([]);
    const [_campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduling, setScheduling] = useState(false);

    // Schedule form state
    const [scheduleContentId, setScheduleContentId] = useState<string>("");
    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduleTime, setScheduleTime] = useState("09:00");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [contentData, campaignData] = await Promise.all([
                    contentService.list(),
                    campaignsService.list(),
                ]);
                setContentItems(contentData);
                setCampaigns(campaignData);
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(currentDate);

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        setSelectedDay(null);
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        setSelectedDay(null);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
        setSelectedDay(new Date().getDate());
    };

    const getContentForDay = (day: number) => {
        return contentItems.filter((item) => {
            if (!item.scheduledFor) return false;
            const date = new Date(item.scheduledFor);
            return (
                date.getDate() === day &&
                date.getMonth() === currentDate.getMonth() &&
                date.getFullYear() === currentDate.getFullYear()
            );
        });
    };

    const getUnscheduledContent = () => {
        return contentItems.filter(item => !item.scheduledFor);
    };

    const handleDayClick = (day: number) => {
        setSelectedDay(day === selectedDay ? null : day);
    };

    const handleItemClick = (item: ContentItem, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedItem(item);
    };

    const openScheduleModal = (contentId?: string) => {
        if (contentId) {
            setScheduleContentId(contentId);
        }
        if (selectedDay) {
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, "0");
            const day = String(selectedDay).padStart(2, "0");
            setScheduleDate(`${year}-${month}-${day}`);
        } else {
            setScheduleDate("");
        }
        setIsScheduleModalOpen(true);
    };

    const handleSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scheduleContentId || !scheduleDate) return;

        setScheduling(true);
        try {
            const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}:00`);
            await contentService.updateState(scheduleContentId, {
                state: ContentState.SCHEDULED,
                scheduledFor: scheduledFor.toISOString()
            });

            // Refresh content
            const data = await contentService.list();
            setContentItems(data);

            setIsScheduleModalOpen(false);
            setScheduleContentId("");
            toast.success("Content scheduled successfully");
        } catch (error) {
            console.error("Failed to schedule content", error);
            toast.error("Failed to schedule content");
        } finally {
            setScheduling(false);
        }
    };

    const isToday = (day: number) => {
        const today = new Date();
        return (
            day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear()
        );
    };

    const getStateColor = (state: ContentState) => {
        switch (state) {
            case ContentState.PUBLISHED:
                return "bg-green-100 text-green-800 border-green-200";
            case ContentState.SCHEDULED:
                return "bg-blue-100 text-blue-800 border-blue-200";
            case ContentState.READY_TO_SCHEDULE:
                return "bg-purple-100 text-purple-800 border-purple-200";
            case ContentState.COMPLIANCE_REVIEW:
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const unscheduledContent = getUnscheduledContent();

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Content Calendar</h2>
                    <div className="flex items-center space-x-4">
                        <button
                            type="button"
                            onClick={goToToday}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Today
                        </button>
                        <div className="flex items-center space-x-2">
                            <button
                                type="button"
                                onClick={prevMonth}
                                className="p-2 rounded-full hover:bg-gray-100"
                                aria-label="Previous month"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-lg font-medium min-w-[180px] text-center">
                                {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
                            </span>
                            <button
                                type="button"
                                onClick={nextMonth}
                                className="p-2 rounded-full hover:bg-gray-100"
                                aria-label="Next month"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Calendar Grid */}
                        <div className="lg:col-span-3">
                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                        <div key={day} className="py-2 text-center text-sm font-semibold text-gray-700">
                                            {day}
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px">
                                    {[...Array(firstDay)].map((_, i) => (
                                        <div key={`empty-${i}`} className="bg-gray-50 min-h-[100px]" />
                                    ))}
                                    {[...Array(days)].map((_, i) => {
                                        const day = i + 1;
                                        const items = getContentForDay(day);
                                        const isSelected = selectedDay === day;
                                        return (
                                            <div
                                                key={day}
                                                onClick={() => handleDayClick(day)}
                                                className={cn(
                                                    "bg-white min-h-[100px] p-2 cursor-pointer transition-colors",
                                                    isSelected && "bg-blue-50 ring-2 ring-blue-500 ring-inset",
                                                    isToday(day) && !isSelected && "bg-yellow-50"
                                                )}
                                            >
                                                <div className={cn(
                                                    "text-sm font-medium mb-1",
                                                    isToday(day) ? "text-blue-600" : "text-gray-900"
                                                )}>
                                                    {day}
                                                </div>
                                                <div className="space-y-1">
                                                    {items.slice(0, 3).map((item) => (
                                                        <div
                                                            key={item.id}
                                                            onClick={(e) => handleItemClick(item, e)}
                                                            className={cn(
                                                                "text-xs p-1 rounded truncate border cursor-pointer hover:opacity-80",
                                                                getStateColor(item.state)
                                                            )}
                                                            title={`${item.platform} - ${item.format}`}
                                                        >
                                                            {item.platform}
                                                        </div>
                                                    ))}
                                                    {items.length > 3 && (
                                                        <div className="text-xs text-gray-500 pl-1">
                                                            +{items.length - 3} more
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Selected Day Details */}
                            {selectedDay && (
                                <div className="bg-white rounded-lg shadow p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-medium text-gray-900">
                                            {currentDate.toLocaleString("default", { month: "short" })} {selectedDay}
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => openScheduleModal()}
                                            className="text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            + Schedule
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {getContentForDay(selectedDay).map((item) => (
                                            <div
                                                key={item.id}
                                                className={cn(
                                                    "p-2 rounded border text-sm",
                                                    getStateColor(item.state)
                                                )}
                                            >
                                                <div className="font-medium">{item.platform}</div>
                                                <div className="text-xs opacity-75">{item.format}</div>
                                                {item.scheduledFor && (
                                                    <div className="text-xs opacity-75 mt-1">
                                                        <Clock className="w-3 h-3 inline mr-1" />
                                                        {new Date(item.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                    </div>
                                                )}
                                                <Link
                                                    href={`/dashboard/content/${item.id}`}
                                                    className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                                                >
                                                    View details
                                                </Link>
                                            </div>
                                        ))}
                                        {getContentForDay(selectedDay).length === 0 && (
                                            <p className="text-sm text-gray-500">No content scheduled</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Unscheduled Content */}
                            <div className="bg-white rounded-lg shadow p-4">
                                <h3 className="font-medium text-gray-900 mb-4">
                                    Unscheduled ({unscheduledContent.length})
                                </h3>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {unscheduledContent.map((item) => (
                                        <div
                                            key={item.id}
                                            className="p-2 rounded border border-gray-200 bg-gray-50 text-sm"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium text-gray-900">{item.platform}</div>
                                                    <div className="text-xs text-gray-500">{item.format}</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => openScheduleModal(item.id)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="Schedule"
                                                >
                                                    <CalendarIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {unscheduledContent.length === 0 && (
                                        <p className="text-sm text-gray-500">All content is scheduled</p>
                                    )}
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="bg-white rounded-lg shadow p-4">
                                <h3 className="font-medium text-gray-900 mb-3">Status Legend</h3>
                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center">
                                        <span className="w-3 h-3 rounded bg-green-100 border border-green-200 mr-2"></span>
                                        Published
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-3 h-3 rounded bg-blue-100 border border-blue-200 mr-2"></span>
                                        Scheduled
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-3 h-3 rounded bg-purple-100 border border-purple-200 mr-2"></span>
                                        Ready to Schedule
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200 mr-2"></span>
                                        In Review
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Item Detail Modal */}
                {selectedItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                            <div className="flex justify-between items-center p-6 border-b">
                                <h3 className="text-lg font-medium">Content Details</h3>
                                <button
                                    type="button"
                                    onClick={() => setSelectedItem(null)}
                                    className="text-gray-400 hover:text-gray-500"
                                    aria-label="Close"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Platform</label>
                                    <p className="text-gray-900">{selectedItem.platform}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Format</label>
                                    <p className="text-gray-900">{selectedItem.format}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Status</label>
                                    <p className={cn("inline-block px-2 py-1 rounded text-sm", getStateColor(selectedItem.state))}>
                                        {selectedItem.state}
                                    </p>
                                </div>
                                {selectedItem.scheduledFor && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Scheduled For</label>
                                        <p className="text-gray-900">
                                            {new Date(selectedItem.scheduledFor).toLocaleString()}
                                        </p>
                                    </div>
                                )}
                                <div className="pt-4 flex space-x-3">
                                    <Link
                                        href={`/dashboard/content/${selectedItem.id}`}
                                        className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        View Full Details
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Schedule Modal */}
                {isScheduleModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                            <div className="flex justify-between items-center p-6 border-b">
                                <h3 className="text-lg font-medium">Schedule Content</h3>
                                <button
                                    type="button"
                                    onClick={() => setIsScheduleModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-500"
                                    aria-label="Close"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSchedule} className="p-6 space-y-4">
                                <div>
                                    <label htmlFor="schedule-content" className="block text-sm font-medium text-gray-700 mb-1">
                                        Content to Schedule
                                    </label>
                                    <select
                                        id="schedule-content"
                                        title="Select content to schedule"
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                        value={scheduleContentId}
                                        onChange={(e) => setScheduleContentId(e.target.value)}
                                        required
                                    >
                                        <option value="">Select content...</option>
                                        {unscheduledContent.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.platform} - {item.format}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="schedule-date" className="block text-sm font-medium text-gray-700 mb-1">
                                        Date
                                    </label>
                                    <input
                                        id="schedule-date"
                                        type="date"
                                        title="Select date"
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                        value={scheduleDate}
                                        onChange={(e) => setScheduleDate(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="schedule-time" className="block text-sm font-medium text-gray-700 mb-1">
                                        Time
                                    </label>
                                    <input
                                        id="schedule-time"
                                        type="time"
                                        title="Select time"
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                        value={scheduleTime}
                                        onChange={(e) => setScheduleTime(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsScheduleModalOpen(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={scheduling}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {scheduling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Schedule
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

"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { billingService, Plan, Subscription, Usage, Invoice } from "@/services/api";
import {
    CreditCard,
    Check,
    Loader2,
    AlertTriangle,
    TrendingUp,
    Zap,
    Users,
    HardDrive,
    Share2,
    FileText,
    ExternalLink,
    Crown,
} from "lucide-react";

export default function BillingPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [usage, setUsage] = useState<Usage | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");

    useEffect(() => {
        loadBillingData();
    }, []);

    const loadBillingData = async () => {
        try {
            const [plansData, subData, usageData, invoicesData] = await Promise.all([
                billingService.getPlans(),
                billingService.getSubscription(),
                billingService.getUsage(),
                billingService.getInvoices(5),
            ]);
            setPlans(plansData);
            setSubscription(subData);
            setUsage(usageData);
            setInvoices(invoicesData);
        } catch (error) {
            console.error("Failed to load billing data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async (priceId: string) => {
        setActionLoading(priceId);
        try {
            const { url } = await billingService.createCheckout(
                priceId,
                `${window.location.origin}/dashboard/billing?success=true`,
                `${window.location.origin}/dashboard/billing?canceled=true`
            );
            window.location.href = url;
        } catch (error) {
            console.error("Failed to create checkout:", error);
            setActionLoading(null);
        }
    };

    const handleManageBilling = async () => {
        setActionLoading("portal");
        try {
            const { url } = await billingService.createPortal(
                `${window.location.origin}/dashboard/billing`
            );
            window.location.href = url;
        } catch (error) {
            console.error("Failed to open billing portal:", error);
            setActionLoading(null);
        }
    };

    const handleCancelSubscription = async () => {
        if (!confirm("Are you sure you want to cancel your subscription? You'll retain access until the end of your billing period.")) {
            return;
        }
        setActionLoading("cancel");
        try {
            await billingService.cancelSubscription();
            await loadBillingData();
        } catch (error) {
            console.error("Failed to cancel subscription:", error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleResumeSubscription = async () => {
        setActionLoading("resume");
        try {
            await billingService.resumeSubscription();
            await loadBillingData();
        } catch (error) {
            console.error("Failed to resume subscription:", error);
        } finally {
            setActionLoading(null);
        }
    };

    const getUsageColor = (percentage: number) => {
        if (percentage >= 90) return "bg-red-500";
        if (percentage >= 70) return "bg-yellow-500";
        return "bg-green-500";
    };

    const formatStorage = (bytes: number) => {
        if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
        if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
        return `${(bytes / 1024).toFixed(1)} KB`;
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

    const filteredPlans = plans.filter(p => p.interval === billingInterval);

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage your subscription, view usage, and download invoices
                    </p>
                </div>

                {/* Current Subscription */}
                {subscription && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Crown className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        {subscription.planName} Plan
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        {subscription.status === "trialing" && (
                                            <span className="text-blue-600">
                                                Trial ends {new Date(subscription.trialEnd!).toLocaleDateString()}
                                            </span>
                                        )}
                                        {subscription.status === "active" && !subscription.cancelAtPeriodEnd && (
                                            <span>
                                                Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                                            </span>
                                        )}
                                        {subscription.cancelAtPeriodEnd && (
                                            <span className="text-orange-600">
                                                Cancels {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {subscription.cancelAtPeriodEnd ? (
                                    <button
                                        onClick={handleResumeSubscription}
                                        disabled={actionLoading === "resume"}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {actionLoading === "resume" ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            "Resume Subscription"
                                        )}
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleManageBilling}
                                            disabled={actionLoading === "portal"}
                                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            {actionLoading === "portal" ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                "Manage Billing"
                                            )}
                                        </button>
                                        <button
                                            onClick={handleCancelSubscription}
                                            disabled={actionLoading === "cancel"}
                                            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Usage Overview */}
                {usage && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                            Current Usage
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {[
                                { key: "posts", label: "Posts", icon: FileText, format: (v: number) => v.toString() },
                                { key: "storage", label: "Storage", icon: HardDrive, format: formatStorage },
                                { key: "aiGenerations", label: "AI Generations", icon: Zap, format: (v: number) => v.toString() },
                                { key: "teamMembers", label: "Team Members", icon: Users, format: (v: number) => v.toString() },
                                { key: "socialConnections", label: "Connections", icon: Share2, format: (v: number) => v.toString() },
                            ].map(({ key, label, icon: Icon, format }) => {
                                const item = usage[key as keyof Usage];
                                return (
                                    <div key={key} className="bg-gray-50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-gray-500">{label}</span>
                                            <Icon className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <div className="text-lg font-semibold text-gray-900">
                                            {format(item.used)} / {item.limit === -1 ? "Unlimited" : format(item.limit)}
                                        </div>
                                        {item.limit !== -1 && (
                                            <div className="mt-2">
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${getUsageColor(item.percentage)}`}
                                                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">{item.percentage}% used</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Plans */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Available Plans</h2>
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setBillingInterval("month")}
                                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                                    billingInterval === "month"
                                        ? "bg-white shadow text-gray-900"
                                        : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBillingInterval("year")}
                                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                                    billingInterval === "year"
                                        ? "bg-white shadow text-gray-900"
                                        : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                Yearly <span className="text-green-600 text-xs">Save 20%</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {filteredPlans.map((plan) => {
                            const isCurrentPlan = subscription?.planId === plan.id;
                            return (
                                <div
                                    key={plan.id}
                                    className={`bg-white rounded-lg shadow p-6 relative ${
                                        plan.popular ? "ring-2 ring-blue-500" : ""
                                    }`}
                                >
                                    {plan.popular && (
                                        <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-3 py-1 rounded-full">
                                            Most Popular
                                        </span>
                                    )}
                                    <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                                    <div className="mt-2">
                                        <span className="text-3xl font-bold text-gray-900">
                                            ${plan.price}
                                        </span>
                                        <span className="text-gray-500">/{plan.interval}</span>
                                    </div>
                                    <ul className="mt-4 space-y-2">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        onClick={() => handleUpgrade(plan.priceId)}
                                        disabled={isCurrentPlan || actionLoading === plan.priceId}
                                        className={`mt-6 w-full py-2 px-4 rounded-lg font-medium ${
                                            isCurrentPlan
                                                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                                : plan.popular
                                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                                : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                                        } disabled:opacity-50`}
                                    >
                                        {actionLoading === plan.priceId ? (
                                            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                        ) : isCurrentPlan ? (
                                            "Current Plan"
                                        ) : (
                                            "Upgrade"
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Invoices */}
                {invoices.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-blue-500" />
                            Recent Invoices
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Invoice
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Date
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Amount
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {invoices.map((invoice) => (
                                        <tr key={invoice.id}>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {invoice.number}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {new Date(invoice.created).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                ${(invoice.amount / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                        invoice.status === "paid"
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-yellow-100 text-yellow-800"
                                                    }`}
                                                >
                                                    {invoice.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {invoice.hostedInvoiceUrl && (
                                                    <a
                                                        href={invoice.hostedInvoiceUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 text-sm inline-flex items-center gap-1"
                                                    >
                                                        View <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* No Subscription */}
                {!subscription && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                        <div className="flex items-start gap-4">
                            <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                            <div>
                                <h3 className="text-lg font-medium text-yellow-800">
                                    No Active Subscription
                                </h3>
                                <p className="text-sm text-yellow-700 mt-1">
                                    You are currently on the free tier. Upgrade to unlock more features,
                                    higher limits, and premium support.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

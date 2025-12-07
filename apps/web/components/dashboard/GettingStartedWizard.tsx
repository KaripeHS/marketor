"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
    Sparkles,
    Palette,
    Share2,
    FileText,
    Calendar,
    Check,
    ChevronRight,
    X,
} from "lucide-react";

interface Step {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    href: string;
    completed: boolean;
}

interface GettingStartedWizardProps {
    onDismiss?: () => void;
}

const INITIAL_STEPS: Step[] = [
    {
        id: "brand",
        title: "Set up your brand",
        description: "Create your brand profile with voice, colors, and guidelines",
        icon: Palette,
        href: "/dashboard/brand",
        completed: false,
    },
    {
        id: "connect",
        title: "Connect social accounts",
        description: "Link your social media platforms to start publishing",
        icon: Share2,
        href: "/dashboard/integrations",
        completed: false,
    },
    {
        id: "content",
        title: "Create your first content",
        description: "Use AI to generate compliant social media content",
        icon: FileText,
        href: "/dashboard/ai",
        completed: false,
    },
    {
        id: "schedule",
        title: "Schedule a post",
        description: "Plan your content calendar for consistent posting",
        icon: Calendar,
        href: "/dashboard/calendar",
        completed: false,
    },
];

export default function GettingStartedWizard({ onDismiss }: GettingStartedWizardProps) {
    const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
    const [dismissed, setDismissed] = useState(false);

    // Load completion status from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("gettingStartedSteps");
        if (saved) {
            try {
                const savedSteps = JSON.parse(saved);
                setSteps((prev) =>
                    prev.map((step) => ({
                        ...step,
                        completed: savedSteps[step.id] || false,
                    }))
                );
            } catch {
                // Ignore parse errors
            }
        }

        const wasDismissed = localStorage.getItem("gettingStartedDismissed");
        if (wasDismissed === "true") {
            setDismissed(true);
        }
    }, []);

    const completedCount = steps.filter((s) => s.completed).length;
    const progress = (completedCount / steps.length) * 100;

    const handleStepClick = (stepId: string) => {
        // Mark step as completed when clicked
        const newSteps = steps.map((step) =>
            step.id === stepId ? { ...step, completed: true } : step
        );
        setSteps(newSteps);

        // Save to localStorage
        const savedSteps: Record<string, boolean> = {};
        newSteps.forEach((step) => {
            savedSteps[step.id] = step.completed;
        });
        localStorage.setItem("gettingStartedSteps", JSON.stringify(savedSteps));
    };

    const handleDismiss = () => {
        setDismissed(true);
        localStorage.setItem("gettingStartedDismissed", "true");
        onDismiss?.();
    };

    if (dismissed || completedCount === steps.length) {
        return null;
    }

    return (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white mb-6">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">Getting Started</h2>
                        <p className="text-purple-100 text-sm">
                            Complete these steps to set up your account
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleDismiss}
                    className="text-white/60 hover:text-white p-1"
                    aria-label="Dismiss"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                    <span>{completedCount} of {steps.length} completed</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-white rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {steps.map((step) => (
                    <Link
                        key={step.id}
                        href={step.href}
                        onClick={() => handleStepClick(step.id)}
                        className={`block p-4 rounded-lg transition-all ${
                            step.completed
                                ? "bg-white/10"
                                : "bg-white/20 hover:bg-white/30"
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                step.completed ? "bg-green-500" : "bg-white/20"
                            }`}>
                                {step.completed ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <step.icon className="w-4 h-4" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className={`font-medium text-sm ${
                                    step.completed ? "line-through opacity-70" : ""
                                }`}>
                                    {step.title}
                                </h3>
                                <p className="text-xs text-purple-100 mt-0.5 truncate">
                                    {step.description}
                                </p>
                            </div>
                            {!step.completed && (
                                <ChevronRight className="w-4 h-4 text-purple-200 flex-shrink-0 mt-1" />
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

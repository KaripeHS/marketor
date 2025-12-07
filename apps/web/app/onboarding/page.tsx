"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
    Sparkles,
    Building2,
    Stethoscope,
    Scale,
    Briefcase,
    Users,
    User,
    ArrowRight,
    ArrowLeft,
    Check,
    Loader2,
    Palette,
    Target,
    Share2,
} from "lucide-react";

interface OnboardingData {
    industry: string;
    companyName: string;
    companySize: string;
    role: string;
    goals: string[];
    platforms: string[];
}

const INDUSTRIES = [
    { id: "healthcare", name: "Healthcare", icon: Stethoscope, description: "Medical practices, clinics, hospitals" },
    { id: "financial", name: "Financial Services", icon: Building2, description: "Advisors, banks, fintech" },
    { id: "legal", name: "Legal", icon: Scale, description: "Law firms, attorneys" },
    { id: "other", name: "Other Business", icon: Briefcase, description: "Other regulated industry" },
];

const COMPANY_SIZES = [
    { id: "solo", name: "Solo Practitioner", icon: User },
    { id: "small", name: "2-10 employees", icon: Users },
    { id: "medium", name: "11-50 employees", icon: Users },
    { id: "large", name: "50+ employees", icon: Building2 },
];

const ROLES = [
    { id: "owner", name: "Owner / Partner" },
    { id: "marketing", name: "Marketing Manager" },
    { id: "social", name: "Social Media Manager" },
    { id: "admin", name: "Office Administrator" },
    { id: "other", name: "Other" },
];

const GOALS = [
    { id: "awareness", name: "Build brand awareness", icon: Palette },
    { id: "leads", name: "Generate leads", icon: Target },
    { id: "engagement", name: "Increase engagement", icon: Users },
    { id: "compliance", name: "Stay compliant", icon: Check },
    { id: "time", name: "Save time on content", icon: Sparkles },
    { id: "consistency", name: "Post consistently", icon: Share2 },
];

const PLATFORMS = [
    { id: "instagram", name: "Instagram" },
    { id: "facebook", name: "Facebook" },
    { id: "linkedin", name: "LinkedIn" },
    { id: "tiktok", name: "TikTok" },
    { id: "youtube", name: "YouTube" },
    { id: "twitter", name: "Twitter/X" },
];

export default function OnboardingPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [data, setData] = useState<OnboardingData>({
        industry: "",
        companyName: "",
        companySize: "",
        role: "",
        goals: [],
        platforms: [],
    });

    const totalSteps = 5;

    // Redirect if not authenticated
    React.useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    const updateData = (key: keyof OnboardingData, value: string | string[]) => {
        setData((prev) => ({ ...prev, [key]: value }));
    };

    const toggleArrayItem = (key: "goals" | "platforms", item: string) => {
        setData((prev) => ({
            ...prev,
            [key]: prev[key].includes(item)
                ? prev[key].filter((i) => i !== item)
                : [...prev[key], item],
        }));
    };

    const canProceed = () => {
        switch (step) {
            case 1:
                return data.industry !== "";
            case 2:
                return data.companyName.trim() !== "" && data.companySize !== "";
            case 3:
                return data.role !== "";
            case 4:
                return data.goals.length > 0;
            case 5:
                return data.platforms.length > 0;
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (step < totalSteps) {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const handleComplete = async () => {
        setIsSubmitting(true);
        try {
            // TODO: Save onboarding data to API
            // await api.post("/onboarding", data);

            // For now, just simulate a delay
            await new Promise((resolve) => setTimeout(resolve, 1000));

            toast.success("Welcome to GrowthPilot!");
            router.push("/dashboard");
        } catch (error) {
            console.error("Onboarding error:", error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex flex-col">
            {/* Header */}
            <header className="p-6">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-8 h-8 text-purple-600" />
                    <span className="text-xl font-bold text-gray-900">GrowthPilot</span>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="px-6 max-w-2xl mx-auto w-full">
                <div className="flex items-center gap-2 mb-2">
                    {Array.from({ length: totalSteps }).map((_, i) => (
                        <div
                            key={i}
                            className={`h-2 flex-1 rounded-full transition-colors ${
                                i < step ? "bg-purple-600" : "bg-gray-200"
                            }`}
                        />
                    ))}
                </div>
                <p className="text-sm text-gray-500">Step {step} of {totalSteps}</p>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
                    {/* Step 1: Industry */}
                    {step === 1 && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                What industry are you in?
                            </h2>
                            <p className="text-gray-600 mb-8">
                                We&apos;ll customize your compliance settings and content suggestions.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {INDUSTRIES.map((industry) => (
                                    <button
                                        key={industry.id}
                                        type="button"
                                        onClick={() => updateData("industry", industry.id)}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                                            data.industry === industry.id
                                                ? "border-purple-500 bg-purple-50"
                                                : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    >
                                        <industry.icon className={`w-8 h-8 mb-3 ${
                                            data.industry === industry.id ? "text-purple-600" : "text-gray-400"
                                        }`} />
                                        <h3 className="font-semibold text-gray-900">{industry.name}</h3>
                                        <p className="text-sm text-gray-500">{industry.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Company Info */}
                    {step === 2 && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Tell us about your practice
                            </h2>
                            <p className="text-gray-600 mb-8">
                                This helps us tailor the experience for your team.
                            </p>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Practice or Company Name
                                    </label>
                                    <input
                                        type="text"
                                        value={data.companyName}
                                        onChange={(e) => updateData("companyName", e.target.value)}
                                        placeholder="Enter your practice name"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Team Size
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {COMPANY_SIZES.map((size) => (
                                            <button
                                                key={size.id}
                                                type="button"
                                                onClick={() => updateData("companySize", size.id)}
                                                className={`p-3 rounded-lg border-2 text-left transition-all ${
                                                    data.companySize === size.id
                                                        ? "border-purple-500 bg-purple-50"
                                                        : "border-gray-200 hover:border-gray-300"
                                                }`}
                                            >
                                                <size.icon className={`w-5 h-5 mb-1 ${
                                                    data.companySize === size.id ? "text-purple-600" : "text-gray-400"
                                                }`} />
                                                <span className="text-sm font-medium text-gray-900">{size.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Role */}
                    {step === 3 && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                What&apos;s your role?
                            </h2>
                            <p className="text-gray-600 mb-8">
                                We&apos;ll personalize your dashboard based on your responsibilities.
                            </p>
                            <div className="space-y-3">
                                {ROLES.map((role) => (
                                    <button
                                        key={role.id}
                                        type="button"
                                        onClick={() => updateData("role", role.id)}
                                        className={`w-full p-4 rounded-lg border-2 text-left transition-all flex items-center justify-between ${
                                            data.role === role.id
                                                ? "border-purple-500 bg-purple-50"
                                                : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    >
                                        <span className="font-medium text-gray-900">{role.name}</span>
                                        {data.role === role.id && (
                                            <Check className="w-5 h-5 text-purple-600" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Goals */}
                    {step === 4 && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                What are your main goals?
                            </h2>
                            <p className="text-gray-600 mb-8">
                                Select all that apply. We&apos;ll help you achieve them.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {GOALS.map((goal) => (
                                    <button
                                        key={goal.id}
                                        type="button"
                                        onClick={() => toggleArrayItem("goals", goal.id)}
                                        className={`p-4 rounded-lg border-2 text-left transition-all flex items-center gap-3 ${
                                            data.goals.includes(goal.id)
                                                ? "border-purple-500 bg-purple-50"
                                                : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    >
                                        <goal.icon className={`w-5 h-5 ${
                                            data.goals.includes(goal.id) ? "text-purple-600" : "text-gray-400"
                                        }`} />
                                        <span className="font-medium text-gray-900">{goal.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 5: Platforms */}
                    {step === 5 && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Which platforms do you use?
                            </h2>
                            <p className="text-gray-600 mb-8">
                                Select the social media platforms you want to manage.
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {PLATFORMS.map((platform) => (
                                    <button
                                        key={platform.id}
                                        type="button"
                                        onClick={() => toggleArrayItem("platforms", platform.id)}
                                        className={`p-4 rounded-lg border-2 text-center transition-all ${
                                            data.platforms.includes(platform.id)
                                                ? "border-purple-500 bg-purple-50"
                                                : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    >
                                        <span className={`font-medium ${
                                            data.platforms.includes(platform.id) ? "text-purple-600" : "text-gray-900"
                                        }`}>
                                            {platform.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100">
                        {step > 1 ? (
                            <button
                                type="button"
                                onClick={handleBack}
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </button>
                        ) : (
                            <div />
                        )}

                        {step < totalSteps ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={!canProceed()}
                                className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Continue
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleComplete}
                                disabled={!canProceed() || isSubmitting}
                                className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Setting up...
                                    </>
                                ) : (
                                    <>
                                        Get Started
                                        <Sparkles className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Skip option */}
            <div className="p-6 text-center">
                <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                >
                    Skip for now
                </button>
            </div>
        </div>
    );
}

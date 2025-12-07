"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
    Sparkles,
    Shield,
    BarChart3,
    Calendar,
    Users,
    Zap,
    Check,
    ArrowRight,
    Play,
    Building2,
    Stethoscope,
    Scale,
    Menu,
    X,
} from "lucide-react";

const FEATURES = [
    {
        icon: Sparkles,
        title: "AI-Powered Content",
        description: "Generate compliant social media content in seconds with our specialized AI agents.",
    },
    {
        icon: Shield,
        title: "Compliance First",
        description: "Built-in compliance checks for HIPAA, SEC, and industry-specific regulations.",
    },
    {
        icon: Calendar,
        title: "Smart Scheduling",
        description: "AI-optimized posting times across all major social platforms.",
    },
    {
        icon: BarChart3,
        title: "Advanced Analytics",
        description: "Track performance, engagement, and ROI with detailed insights.",
    },
    {
        icon: Users,
        title: "Team Collaboration",
        description: "Multi-user workflows with approval chains and role-based access.",
    },
    {
        icon: Zap,
        title: "Multi-Platform Publishing",
        description: "Publish to TikTok, Instagram, YouTube, LinkedIn, and more from one dashboard.",
    },
];

const INDUSTRIES = [
    {
        icon: Stethoscope,
        name: "Healthcare",
        description: "HIPAA-compliant content for medical practices, clinics, and healthcare providers.",
    },
    {
        icon: Building2,
        name: "Financial Services",
        description: "SEC and FINRA compliant marketing for advisors, firms, and fintech companies.",
    },
    {
        icon: Scale,
        name: "Legal",
        description: "Bar-compliant content for law firms and legal professionals.",
    },
];

const PLANS = [
    {
        name: "Starter",
        price: 29,
        description: "Perfect for solo practitioners",
        features: [
            "1 social account per platform",
            "50 AI generations/month",
            "Basic compliance checking",
            "Email support",
        ],
    },
    {
        name: "Professional",
        price: 79,
        description: "For growing practices",
        features: [
            "5 social accounts per platform",
            "500 AI generations/month",
            "Advanced compliance suite",
            "Team collaboration (3 users)",
            "Priority support",
            "Custom brand voice",
        ],
        popular: true,
    },
    {
        name: "Agency",
        price: 199,
        description: "For agencies and enterprises",
        features: [
            "Unlimited social accounts",
            "Unlimited AI generations",
            "White-label options",
            "Unlimited team members",
            "Dedicated account manager",
            "API access",
            "Custom integrations",
        ],
    },
];

export default function LandingPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.push("/dashboard");
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-8 h-8 text-purple-600" />
                            <span className="text-xl font-bold text-gray-900">GrowthPilot</span>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-8">
                            <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
                            <a href="#industries" className="text-gray-600 hover:text-gray-900">Industries</a>
                            <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
                        </div>

                        <div className="hidden md:flex items-center gap-4">
                            <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium">
                                Sign In
                            </Link>
                            <Link
                                href="/register"
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                            >
                                Start Free Trial
                            </Link>
                        </div>

                        {/* Mobile menu button */}
                        <button
                            type="button"
                            className="md:hidden p-2"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white border-b border-gray-100 py-4 px-4">
                        <div className="flex flex-col gap-4">
                            <a href="#features" className="text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>Features</a>
                            <a href="#industries" className="text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>Industries</a>
                            <a href="#pricing" className="text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
                            <hr className="border-gray-200" />
                            <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium">
                                Sign In
                            </Link>
                            <Link
                                href="/register"
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors text-center"
                            >
                                Start Free Trial
                            </Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                            <Shield className="w-4 h-4" />
                            Built for Regulated Industries
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                            Social Media Marketing{" "}
                            <span className="text-purple-600">Without the Compliance Risk</span>
                        </h1>
                        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                            AI-powered content creation and scheduling designed specifically for healthcare,
                            financial services, and legal professionals. Stay compliant while growing your practice.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center gap-2 bg-purple-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-purple-700 transition-colors"
                            >
                                Start Free Trial
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <button type="button" className="inline-flex items-center justify-center gap-2 border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-semibold text-lg hover:border-gray-400 transition-colors">
                                <Play className="w-5 h-5" />
                                Watch Demo
                            </button>
                        </div>

                        {/* Platform badges */}
                        <div className="mt-12 flex flex-wrap justify-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full">TikTok</span>
                            <span className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full">Instagram</span>
                            <span className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full">YouTube</span>
                            <span className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full">LinkedIn</span>
                            <span className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full">Facebook</span>
                            <span className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full">Twitter/X</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Social Proof */}
            <section className="py-12 bg-gray-50 border-y border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <div>
                            <div className="text-3xl font-bold text-gray-900">2,500+</div>
                            <div className="text-gray-600">Practices</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-gray-900">1M+</div>
                            <div className="text-gray-600">Posts Created</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-gray-900">99.9%</div>
                            <div className="text-gray-600">Compliance Rate</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-gray-900">4.9/5</div>
                            <div className="text-gray-600">Customer Rating</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                            Everything You Need to Grow
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Powerful tools designed to help regulated professionals build their online presence safely.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {FEATURES.map((feature) => (
                            <div key={feature.title} className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                                    <feature.icon className="w-6 h-6 text-purple-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                                <p className="text-gray-600">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Industries Section */}
            <section id="industries" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                            Built for Your Industry
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            We understand the unique compliance requirements of regulated industries.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {INDUSTRIES.map((industry) => (
                            <div key={industry.name} className="bg-white p-8 rounded-xl border border-gray-200 text-center">
                                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <industry.icon className="w-8 h-8 text-purple-600" />
                                </div>
                                <h3 className="text-2xl font-semibold text-gray-900 mb-3">{industry.name}</h3>
                                <p className="text-gray-600">{industry.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                            Simple, Transparent Pricing
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Start free for 14 days. No credit card required.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {PLANS.map((plan) => (
                            <div
                                key={plan.name}
                                className={`bg-white p-8 rounded-xl border-2 ${
                                    plan.popular ? "border-purple-500 ring-2 ring-purple-200" : "border-gray-200"
                                } relative`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                        <span className="bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                                            Most Popular
                                        </span>
                                    </div>
                                )}
                                <div className="text-center mb-6">
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
                                    <p className="text-gray-500 text-sm mb-4">{plan.description}</p>
                                    <div className="flex items-baseline justify-center gap-1">
                                        <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                                        <span className="text-gray-500">/month</span>
                                    </div>
                                </div>
                                <ul className="space-y-3 mb-8">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-2">
                                            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-600">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href="/register"
                                    className={`block w-full text-center py-3 px-4 rounded-lg font-medium transition-colors ${
                                        plan.popular
                                            ? "bg-purple-600 text-white hover:bg-purple-700"
                                            : "border-2 border-gray-300 text-gray-700 hover:border-gray-400"
                                    }`}
                                >
                                    Get Started
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-600 to-indigo-600">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                        Ready to Transform Your Social Media?
                    </h2>
                    <p className="text-xl text-purple-100 mb-8">
                        Join thousands of professionals who trust GrowthPilot for compliant social media marketing.
                    </p>
                    <Link
                        href="/register"
                        className="inline-flex items-center gap-2 bg-white text-purple-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors"
                    >
                        Start Your Free Trial
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="w-6 h-6 text-purple-400" />
                                <span className="text-lg font-bold text-white">GrowthPilot</span>
                            </div>
                            <p className="text-sm">
                                AI-powered social media marketing for regulated industries.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-4">Product</h4>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#features" className="hover:text-white">Features</a></li>
                                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                                <li><a href="#industries" className="hover:text-white">Industries</a></li>
                                <li><Link href="/login" className="hover:text-white">Sign In</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-4">Company</h4>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#" className="hover:text-white">About</a></li>
                                <li><a href="#" className="hover:text-white">Blog</a></li>
                                <li><a href="#" className="hover:text-white">Careers</a></li>
                                <li><a href="#" className="hover:text-white">Contact</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                                <li><a href="#" className="hover:text-white">HIPAA Compliance</a></li>
                                <li><a href="#" className="hover:text-white">Security</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 pt-8 text-center text-sm">
                        <p>&copy; {new Date().getFullYear()} GrowthPilot. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

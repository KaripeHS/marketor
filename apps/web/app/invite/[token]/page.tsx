"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { invitationsService } from "@/services/api";
import { Invitation, Role } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckCircle, XCircle, Building2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const roleDescriptions: Record<Role, string> = {
    ADMIN: "Full access including team and settings management",
    AGENCY: "Create and manage content, campaigns, and strategies",
    CLIENT: "View content and add comments",
    REVIEWER: "Approve or reject content, add comments",
};

export default function AcceptInvitePage() {
    const params = useParams();
    const router = useRouter();
    const { currentUser: user, isAuthenticated } = useAuth();
    const token = params.token as string;

    const [invitation, setInvitation] = useState<Invitation | null>(null);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [accepted, setAccepted] = useState(false);

    useEffect(() => {
        if (token) {
            verifyInvitation();
        }
    }, [token]);

    const verifyInvitation = async () => {
        try {
            const data = await invitationsService.verify(token);
            setInvitation(data);
        } catch (err: any) {
            setError(err.response?.data?.message || "Invalid or expired invitation");
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!isAuthenticated) {
            // Redirect to login with return URL
            router.push(`/login?redirect=/invite/${token}`);
            return;
        }

        setAccepting(true);
        try {
            await invitationsService.accept(token);
            setAccepted(true);
            toast.success("Invitation accepted! You've joined the organization.");
            // Redirect to dashboard after a brief delay
            setTimeout(() => {
                router.push("/dashboard");
            }, 2000);
        } catch (err: any) {
            const message = err.response?.data?.message || "Failed to accept invitation";
            toast.error(message);
            setError(message);
        } finally {
            setAccepting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
                    <p className="mt-4 text-gray-600">Verifying invitation...</p>
                </div>
            </div>
        );
    }

    if (error && !invitation) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full mx-4">
                    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                        <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                        <h1 className="mt-4 text-2xl font-bold text-gray-900">Invalid Invitation</h1>
                        <p className="mt-2 text-gray-600">{error}</p>
                        <Link
                            href="/login"
                            className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Go to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (accepted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full mx-4">
                    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                        <h1 className="mt-4 text-2xl font-bold text-gray-900">Welcome!</h1>
                        <p className="mt-2 text-gray-600">
                            You've successfully joined {invitation?.tenant?.name}.
                        </p>
                        <p className="mt-1 text-sm text-gray-500">Redirecting to dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full mx-4">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="bg-blue-600 px-6 py-8 text-center">
                        <Building2 className="w-12 h-12 text-white mx-auto" />
                        <h1 className="mt-4 text-2xl font-bold text-white">
                            You've been invited!
                        </h1>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="text-center">
                            <p className="text-gray-600">
                                You've been invited to join
                            </p>
                            <p className="text-xl font-semibold text-gray-900 mt-1">
                                {invitation?.tenant?.name}
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Your role</span>
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                    {invitation?.role}
                                </span>
                            </div>
                            <p className="mt-2 text-sm text-gray-600">
                                {invitation?.role && roleDescriptions[invitation.role]}
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center">
                                <UserCheck className="w-5 h-5 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-600">
                                    Invited to: <strong>{invitation?.email}</strong>
                                </span>
                            </div>
                        </div>

                        {!isAuthenticated && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-yellow-800">
                                    You need to log in or create an account with the email{" "}
                                    <strong>{invitation?.email}</strong> to accept this invitation.
                                </p>
                            </div>
                        )}

                        {isAuthenticated && user?.email?.toLowerCase() !== invitation?.email?.toLowerCase() && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-sm text-red-800">
                                    This invitation was sent to <strong>{invitation?.email}</strong>,
                                    but you're logged in as <strong>{user?.email}</strong>.
                                    Please log out and log in with the correct account.
                                </p>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        <div className="flex flex-col space-y-3">
                            <button
                                type="button"
                                onClick={handleAccept}
                                disabled={accepting || (isAuthenticated && user?.email?.toLowerCase() !== invitation?.email?.toLowerCase())}
                                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {accepting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Accepting...
                                    </>
                                ) : isAuthenticated ? (
                                    "Accept Invitation"
                                ) : (
                                    "Log in to Accept"
                                )}
                            </button>

                            <Link
                                href="/"
                                className="w-full px-6 py-3 text-center text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Decline
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

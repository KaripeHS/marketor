"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { invitationsService, usersService } from "@/services/api";
import { Invitation, InvitationStatus, Role } from "@/types";
import {
    Loader2,
    UserPlus,
    Mail,
    Clock,
    XCircle,
    RefreshCw,
    Users,
    Shield
} from "lucide-react";
import { toast } from "sonner";

const roleColors: Record<Role, string> = {
    ADMIN: "bg-red-100 text-red-800",
    AGENCY: "bg-purple-100 text-purple-800",
    CLIENT: "bg-blue-100 text-blue-800",
    REVIEWER: "bg-green-100 text-green-800",
};

const statusColors: Record<InvitationStatus, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    ACCEPTED: "bg-green-100 text-green-800",
    EXPIRED: "bg-gray-100 text-gray-800",
    CANCELLED: "bg-red-100 text-red-800",
};

interface TeamMember {
    id: string;
    userId: string;
    role: Role;
    user: {
        id: string;
        email: string;
        name?: string;
    };
}

export default function TeamPage() {
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<Role>(Role.CLIENT);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [invitationsData, usersData] = await Promise.all([
                invitationsService.list(),
                usersService.list(),
            ]);
            setInvitations(invitationsData);
            // Transform users data to team members format
            setMembers(usersData.map((u: any) => ({
                id: u.id,
                userId: u.id,
                role: u.role || Role.CLIENT,
                user: { id: u.id, email: u.email, name: u.name }
            })));
        } catch (error) {
            console.error("Failed to fetch team data", error);
            toast.error("Failed to load team data");
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        setSubmitting(true);
        try {
            await invitationsService.create({
                email: inviteEmail.trim().toLowerCase(),
                role: inviteRole,
            });
            toast.success(`Invitation sent to ${inviteEmail}`);
            setShowInviteModal(false);
            setInviteEmail("");
            setInviteRole(Role.CLIENT);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to send invitation");
        } finally {
            setSubmitting(false);
        }
    };

    const handleResend = async (id: string) => {
        try {
            await invitationsService.resend(id);
            toast.success("Invitation resent");
            fetchData();
        } catch (error) {
            toast.error("Failed to resend invitation");
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm("Are you sure you want to cancel this invitation?")) return;
        try {
            await invitationsService.cancel(id);
            toast.success("Invitation cancelled");
            fetchData();
        } catch (error) {
            toast.error("Failed to cancel invitation");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this invitation?")) return;
        try {
            await invitationsService.delete(id);
            toast.success("Invitation deleted");
            fetchData();
        } catch (error) {
            toast.error("Failed to delete invitation");
        }
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

    const pendingInvitations = invitations.filter(i => i.status === InvitationStatus.PENDING);
    const otherInvitations = invitations.filter(i => i.status !== InvitationStatus.PENDING);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Team</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Manage team members and invitations
                        </p>
                    </div>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite Member
                    </button>
                </div>

                {/* Team Members */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                        <div className="flex items-center">
                            <Users className="w-5 h-5 text-gray-500 mr-2" />
                            <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
                        </div>
                    </div>
                    <div className="p-4">
                        {members.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">
                                No team members yet. Invite someone to get started.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {members.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between p-4 rounded-lg border border-gray-200"
                                    >
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                                <span className="text-gray-600 font-medium">
                                                    {member.user.name?.[0]?.toUpperCase() || member.user.email[0].toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="ml-4">
                                                <p className="font-medium text-gray-900">
                                                    {member.user.name || member.user.email}
                                                </p>
                                                <p className="text-sm text-gray-500">{member.user.email}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[member.role]}`}>
                                            {member.role}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Pending Invitations */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                        <div className="flex items-center">
                            <Clock className="w-5 h-5 text-yellow-500 mr-2" />
                            <h3 className="text-lg font-medium text-gray-900">Pending Invitations</h3>
                            <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                {pendingInvitations.length}
                            </span>
                        </div>
                    </div>
                    <div className="p-4">
                        {pendingInvitations.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">
                                No pending invitations.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {pendingInvitations.map((invitation) => (
                                    <div
                                        key={invitation.id}
                                        className="flex items-center justify-between p-4 rounded-lg border border-gray-200"
                                    >
                                        <div className="flex items-center">
                                            <Mail className="w-5 h-5 text-gray-400 mr-3" />
                                            <div>
                                                <p className="font-medium text-gray-900">{invitation.email}</p>
                                                <p className="text-sm text-gray-500">
                                                    Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[invitation.role]}`}>
                                                {invitation.role}
                                            </span>
                                            <button
                                                onClick={() => handleResend(invitation.id)}
                                                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                                title="Resend invitation"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleCancel(invitation.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                                title="Cancel invitation"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Invitation History */}
                {otherInvitations.length > 0 && (
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">Invitation History</h3>
                        </div>
                        <div className="p-4">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {otherInvitations.map((invitation) => (
                                            <tr key={invitation.id}>
                                                <td className="px-4 py-3 text-sm text-gray-900">{invitation.email}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[invitation.role]}`}>
                                                        {invitation.role}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[invitation.status]}`}>
                                                        {invitation.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500">
                                                    {new Date(invitation.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => handleDelete(invitation.id)}
                                                        className="text-red-600 hover:text-red-800 text-sm"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Invite Modal */}
                {showInviteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="text-lg font-medium text-gray-900">Invite Team Member</h3>
                                <button
                                    onClick={() => setShowInviteModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    &times;
                                </button>
                            </div>
                            <form onSubmit={handleInvite} className="p-6 space-y-4">
                                <div>
                                    <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address
                                    </label>
                                    <input
                                        id="invite-email"
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="colleague@example.com"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700 mb-1">
                                        Role
                                    </label>
                                    <select
                                        id="invite-role"
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value as Role)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value={Role.CLIENT}>Client - View and comment on content</option>
                                        <option value={Role.REVIEWER}>Reviewer - Approve/reject content</option>
                                        <option value={Role.AGENCY}>Agency - Full content management</option>
                                        <option value={Role.ADMIN}>Admin - Full access including settings</option>
                                    </select>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="flex items-start">
                                        <Shield className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                                        <div className="text-sm text-gray-600">
                                            <p className="font-medium">Role Permissions:</p>
                                            <ul className="mt-1 space-y-1 text-xs">
                                                <li><strong>Client:</strong> View content, add comments</li>
                                                <li><strong>Reviewer:</strong> Approve/reject content, add comments</li>
                                                <li><strong>Agency:</strong> Create/edit content, manage campaigns</li>
                                                <li><strong>Admin:</strong> Full access, manage team and settings</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowInviteModal(false)}
                                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                                    >
                                        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Send Invitation
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

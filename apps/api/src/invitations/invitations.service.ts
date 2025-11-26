import { Injectable, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Role, InvitationStatus } from "@prisma/client";
import * as crypto from "crypto";

interface CreateInvitationDto {
    email: string;
    role: Role;
}

@Injectable()
export class InvitationsService {
    constructor(private readonly prisma: PrismaService) { }

    async list(tenantId: string) {
        return this.prisma.invitation.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" },
            include: {
                tenant: { select: { name: true, slug: true } },
            },
        });
    }

    async getById(id: string) {
        const invitation = await this.prisma.invitation.findUnique({
            where: { id },
            include: {
                tenant: { select: { name: true, slug: true } },
            },
        });
        if (!invitation) throw new NotFoundException("Invitation not found");
        return invitation;
    }

    async getByToken(token: string) {
        const invitation = await this.prisma.invitation.findUnique({
            where: { token },
            include: {
                tenant: { select: { id: true, name: true, slug: true } },
            },
        });
        if (!invitation) throw new NotFoundException("Invitation not found");
        return invitation;
    }

    async create(tenantId: string, invitedBy: string, dto: CreateInvitationDto) {
        // Check if user already has membership in this tenant
        const existingMembership = await this.prisma.userTenantRole.findFirst({
            where: {
                tenantId,
                user: { email: dto.email },
            },
        });

        if (existingMembership) {
            throw new ConflictException("User is already a member of this organization");
        }

        // Check for existing pending invitation
        const existingInvitation = await this.prisma.invitation.findUnique({
            where: {
                tenantId_email: { tenantId, email: dto.email },
            },
        });

        if (existingInvitation) {
            if (existingInvitation.status === InvitationStatus.PENDING) {
                // Resend - update token and expiry
                const token = this.generateToken();
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

                return this.prisma.invitation.update({
                    where: { id: existingInvitation.id },
                    data: {
                        token,
                        expiresAt,
                        invitedBy,
                        role: dto.role,
                    },
                    include: {
                        tenant: { select: { name: true, slug: true } },
                    },
                });
            } else if (existingInvitation.status === InvitationStatus.ACCEPTED) {
                throw new ConflictException("Invitation was already accepted");
            }
            // If expired or cancelled, delete and create new
            await this.prisma.invitation.delete({ where: { id: existingInvitation.id } });
        }

        const token = this.generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        return this.prisma.invitation.create({
            data: {
                tenantId,
                email: dto.email.toLowerCase(),
                role: dto.role,
                token,
                invitedBy,
                expiresAt,
            },
            include: {
                tenant: { select: { name: true, slug: true } },
            },
        });
    }

    async accept(token: string, userId: string) {
        const invitation = await this.getByToken(token);

        if (invitation.status !== InvitationStatus.PENDING) {
            throw new BadRequestException(`Invitation is ${invitation.status.toLowerCase()}`);
        }

        if (new Date() > invitation.expiresAt) {
            await this.prisma.invitation.update({
                where: { id: invitation.id },
                data: { status: InvitationStatus.EXPIRED },
            });
            throw new BadRequestException("Invitation has expired");
        }

        // Get the user to verify email matches
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException("User not found");

        if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
            throw new BadRequestException("This invitation was sent to a different email address");
        }

        // Check if user already has membership
        const existingMembership = await this.prisma.userTenantRole.findUnique({
            where: {
                userId_tenantId: { userId, tenantId: invitation.tenantId },
            },
        });

        if (existingMembership) {
            // Update invitation status but don't create duplicate membership
            await this.prisma.invitation.update({
                where: { id: invitation.id },
                data: {
                    status: InvitationStatus.ACCEPTED,
                    acceptedAt: new Date(),
                },
            });
            throw new ConflictException("You are already a member of this organization");
        }

        // Create membership and update invitation in transaction
        const [membership] = await this.prisma.$transaction([
            this.prisma.userTenantRole.create({
                data: {
                    userId,
                    tenantId: invitation.tenantId,
                    role: invitation.role,
                },
                include: {
                    tenant: { select: { id: true, name: true, slug: true } },
                },
            }),
            this.prisma.invitation.update({
                where: { id: invitation.id },
                data: {
                    status: InvitationStatus.ACCEPTED,
                    acceptedAt: new Date(),
                },
            }),
        ]);

        return membership;
    }

    async cancel(id: string, tenantId: string) {
        const invitation = await this.getById(id);

        if (invitation.tenantId !== tenantId) {
            throw new BadRequestException("Invitation does not belong to this tenant");
        }

        if (invitation.status !== InvitationStatus.PENDING) {
            throw new BadRequestException("Can only cancel pending invitations");
        }

        return this.prisma.invitation.update({
            where: { id },
            data: { status: InvitationStatus.CANCELLED },
        });
    }

    async resend(id: string, tenantId: string, invitedBy: string) {
        const invitation = await this.getById(id);

        if (invitation.tenantId !== tenantId) {
            throw new BadRequestException("Invitation does not belong to this tenant");
        }

        if (invitation.status !== InvitationStatus.PENDING && invitation.status !== InvitationStatus.EXPIRED) {
            throw new BadRequestException("Can only resend pending or expired invitations");
        }

        const token = this.generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        return this.prisma.invitation.update({
            where: { id },
            data: {
                token,
                expiresAt,
                invitedBy,
                status: InvitationStatus.PENDING,
            },
            include: {
                tenant: { select: { name: true, slug: true } },
            },
        });
    }

    async delete(id: string, tenantId: string) {
        const invitation = await this.getById(id);

        if (invitation.tenantId !== tenantId) {
            throw new BadRequestException("Invitation does not belong to this tenant");
        }

        await this.prisma.invitation.delete({ where: { id } });
        return { success: true };
    }

    async getPendingForEmail(email: string) {
        return this.prisma.invitation.findMany({
            where: {
                email: email.toLowerCase(),
                status: InvitationStatus.PENDING,
                expiresAt: { gt: new Date() },
            },
            include: {
                tenant: { select: { id: true, name: true, slug: true } },
            },
        });
    }

    async getPendingForUser(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) return [];
        return this.getPendingForEmail(user.email);
    }

    private generateToken(): string {
        return crypto.randomBytes(32).toString("hex");
    }
}

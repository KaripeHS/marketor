import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('AuthService', () => {
    let service: AuthService;
    let prismaService: jest.Mocked<PrismaService>;
    let jwtService: jest.Mocked<JwtService>;

    const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed-password',
        authProvider: 'local',
        memberships: [
            {
                tenant: {
                    id: 'tenant-1',
                    name: 'Test Workspace',
                    slug: 'test-workspace',
                },
                role: 'ADMIN',
            },
        ],
    };

    beforeEach(() => {
        prismaService = {
            user: {
                findUnique: jest.fn(),
                create: jest.fn(),
            },
            tenant: {
                create: jest.fn(),
            },
            userTenantRole: {
                create: jest.fn(),
            },
        } as unknown as jest.Mocked<PrismaService>;

        jwtService = {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn(),
        } as unknown as jest.Mocked<JwtService>;

        service = new AuthService(prismaService, jwtService);
    });

    describe('register', () => {
        it('should throw BadRequestException if email already exists', async () => {
            (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

            await expect(
                service.register('test@example.com', 'password123', 'Test User')
            ).rejects.toThrow(BadRequestException);
        });

        it('should create user, tenant, and membership for new registration', async () => {
            (prismaService.user.findUnique as jest.Mock)
                .mockResolvedValueOnce(null) // First call - check if exists
                .mockResolvedValueOnce(mockUser); // Second call - generateTokenResponse

            (prismaService.user.create as jest.Mock).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
            });

            (prismaService.tenant.create as jest.Mock).mockResolvedValue({
                id: 'tenant-1',
                name: "Test User's Workspace",
                slug: 'workspace-user-1',
            });

            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

            const result = await service.register('test@example.com', 'password123', 'Test User');

            expect(prismaService.user.create).toHaveBeenCalled();
            expect(prismaService.tenant.create).toHaveBeenCalled();
            expect(prismaService.userTenantRole.create).toHaveBeenCalled();
            expect(result.accessToken).toBe('mock-jwt-token');
        });

        it('should lowercase email on registration', async () => {
            (prismaService.user.findUnique as jest.Mock)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(mockUser);

            (prismaService.user.create as jest.Mock).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
            });

            (prismaService.tenant.create as jest.Mock).mockResolvedValue({
                id: 'tenant-1',
            });

            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

            await service.register('TEST@EXAMPLE.COM', 'password123');

            expect(prismaService.user.findUnique).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
            });
        });
    });

    describe('login', () => {
        it('should throw UnauthorizedException if user not found', async () => {
            (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(
                service.login('test@example.com', 'password123')
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException if user has no password', async () => {
            (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
                ...mockUser,
                passwordHash: null,
            });

            await expect(
                service.login('test@example.com', 'password123')
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException if password is invalid', async () => {
            (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(
                service.login('test@example.com', 'wrong-password')
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should return token response on successful login', async () => {
            (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await service.login('test@example.com', 'password123');

            expect(result.accessToken).toBe('mock-jwt-token');
            expect(result.user.email).toBe('test@example.com');
            expect(result.memberships).toHaveLength(1);
        });
    });

    describe('validateToken', () => {
        it('should return payload for valid token', async () => {
            const payload = { sub: 'user-1', email: 'test@example.com' };
            (jwtService.verify as jest.Mock).mockReturnValue(payload);

            const result = await service.validateToken('valid-token');

            expect(result).toEqual(payload);
        });

        it('should throw UnauthorizedException for invalid token', async () => {
            (jwtService.verify as jest.Mock).mockImplementation(() => {
                throw new Error('Invalid token');
            });

            await expect(service.validateToken('invalid-token')).rejects.toThrow(
                UnauthorizedException
            );
        });
    });
});

import { ContentService } from '../content/content.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { ContentFormat, ContentState, Platform } from '@prisma/client';

describe('ContentService', () => {
    let service: ContentService;
    let prismaService: jest.Mocked<PrismaService>;
    let cacheService: jest.Mocked<CacheService>;

    const mockContentItem = {
        id: 'content-1',
        tenantId: 'tenant-1',
        campaignId: 'campaign-1',
        platform: Platform.INSTAGRAM,
        format: ContentFormat.IMAGE,
        state: ContentState.DRAFT,
        scheduledFor: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        campaign: {
            id: 'campaign-1',
            name: 'Test Campaign',
        },
    };

    beforeEach(() => {
        prismaService = {
            contentItem: {
                findMany: jest.fn(),
                findUnique: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            },
        } as unknown as jest.Mocked<PrismaService>;

        // Mock CacheService - bypass caching by always calling the factory
        cacheService = {
            get: jest.fn().mockResolvedValue(undefined),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
            getOrSet: jest.fn().mockImplementation(async (_key, factory) => factory()),
            keys: {
                content: (id: string) => `content:${id}`,
                contentByTenant: (tenantId: string) => `content:tenant:${tenantId}`,
                contentByCampaign: (campaignId: string) => `content:campaign:${campaignId}`,
            },
            ttl: {
                short: 30000,
                medium: 300000,
            },
        } as unknown as jest.Mocked<CacheService>;

        service = new ContentService(prismaService, cacheService);
    });

    describe('list', () => {
        it('should return all content items with campaigns', async () => {
            const mockItems = [mockContentItem];
            (prismaService.contentItem.findMany as jest.Mock).mockResolvedValue(mockItems);

            const result = await service.list();

            expect(prismaService.contentItem.findMany).toHaveBeenCalledWith({
                where: {},
                include: { campaign: true },
                orderBy: { createdAt: 'desc' },
            });
            expect(result).toEqual(mockItems);
        });

        it('should filter by tenant', async () => {
            (prismaService.contentItem.findMany as jest.Mock).mockResolvedValue([]);

            await service.list({ tenantId: 'tenant-1' });

            expect(prismaService.contentItem.findMany).toHaveBeenCalledWith({
                where: { tenantId: 'tenant-1' },
                include: { campaign: true },
                orderBy: { createdAt: 'desc' },
            });
        });

        it('should filter by state', async () => {
            (prismaService.contentItem.findMany as jest.Mock).mockResolvedValue([]);

            await service.list({ state: ContentState.PUBLISHED });

            expect(prismaService.contentItem.findMany).toHaveBeenCalledWith({
                where: { state: ContentState.PUBLISHED },
                include: { campaign: true },
                orderBy: { createdAt: 'desc' },
            });
        });
    });

    describe('findById', () => {
        it('should return content item with related data', async () => {
            const fullContentItem = {
                ...mockContentItem,
                approval: null,
                comments: [],
                revisions: [],
            };
            (prismaService.contentItem.findUnique as jest.Mock).mockResolvedValue(fullContentItem);

            const result = await service.findById('content-1');

            expect(prismaService.contentItem.findUnique).toHaveBeenCalledWith({
                where: { id: 'content-1' },
                include: {
                    campaign: true,
                    approval: true,
                    comments: { orderBy: { createdAt: 'desc' } },
                    revisions: { orderBy: { createdAt: 'desc' } },
                },
            });
            expect(result).toEqual(fullContentItem);
        });

        it('should return null for non-existent content', async () => {
            (prismaService.contentItem.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await service.findById('non-existent');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('should create content item with default state', async () => {
            (prismaService.contentItem.create as jest.Mock).mockResolvedValue(mockContentItem);

            const result = await service.create({
                tenantId: 'tenant-1',
                platform: Platform.INSTAGRAM,
                format: ContentFormat.IMAGE,
            });

            expect(prismaService.contentItem.create).toHaveBeenCalledWith({
                data: {
                    tenantId: 'tenant-1',
                    campaignId: null,
                    platform: Platform.INSTAGRAM,
                    format: ContentFormat.IMAGE,
                    state: ContentState.DRAFT,
                    scheduledFor: null,
                },
            });
            expect(result).toEqual(mockContentItem);
        });

        it('should create content item with custom state', async () => {
            (prismaService.contentItem.create as jest.Mock).mockResolvedValue(mockContentItem);

            await service.create({
                tenantId: 'tenant-1',
                platform: Platform.TIKTOK,
                format: ContentFormat.SHORT_VIDEO,
                state: ContentState.COMPLIANCE_REVIEW,
                campaignId: 'campaign-1',
            });

            expect(prismaService.contentItem.create).toHaveBeenCalledWith({
                data: {
                    tenantId: 'tenant-1',
                    campaignId: 'campaign-1',
                    platform: Platform.TIKTOK,
                    format: ContentFormat.SHORT_VIDEO,
                    state: ContentState.COMPLIANCE_REVIEW,
                    scheduledFor: null,
                },
            });
        });

        it('should create content item with scheduled date', async () => {
            const scheduledDate = new Date('2025-12-01T10:00:00Z');
            (prismaService.contentItem.create as jest.Mock).mockResolvedValue(mockContentItem);

            await service.create({
                tenantId: 'tenant-1',
                platform: Platform.YOUTUBE,
                format: ContentFormat.LONG_VIDEO,
                scheduledFor: scheduledDate,
            });

            expect(prismaService.contentItem.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    scheduledFor: scheduledDate,
                }),
            });
        });
    });

    describe('updateState', () => {
        it('should update content state', async () => {
            (prismaService.contentItem.update as jest.Mock).mockResolvedValue({
                ...mockContentItem,
                state: ContentState.PUBLISHED,
            });

            const result = await service.updateState('content-1', ContentState.PUBLISHED);

            expect(prismaService.contentItem.update).toHaveBeenCalledWith({
                where: { id: 'content-1' },
                data: { state: ContentState.PUBLISHED, scheduledFor: null },
            });
            expect(result.state).toBe(ContentState.PUBLISHED);
        });

        it('should update state with scheduled date', async () => {
            const scheduledDate = new Date('2025-12-01T10:00:00Z');
            (prismaService.contentItem.update as jest.Mock).mockResolvedValue(mockContentItem);

            await service.updateState('content-1', ContentState.SCHEDULED, scheduledDate);

            expect(prismaService.contentItem.update).toHaveBeenCalledWith({
                where: { id: 'content-1' },
                data: { state: ContentState.SCHEDULED, scheduledFor: scheduledDate },
            });
        });
    });

    describe('update', () => {
        it('should update content item with provided data', async () => {
            (prismaService.contentItem.update as jest.Mock).mockResolvedValue(mockContentItem);

            await service.update('content-1', { platform: Platform.FACEBOOK });

            expect(prismaService.contentItem.update).toHaveBeenCalledWith({
                where: { id: 'content-1' },
                data: { platform: Platform.FACEBOOK },
            });
        });
    });

    describe('delete', () => {
        it('should delete content item', async () => {
            (prismaService.contentItem.delete as jest.Mock).mockResolvedValue(mockContentItem);

            const result = await service.delete('content-1');

            expect(prismaService.contentItem.delete).toHaveBeenCalledWith({
                where: { id: 'content-1' },
            });
            expect(result).toEqual(mockContentItem);
        });
    });
});

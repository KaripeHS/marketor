import { MediaService } from '../media/media.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

// Mock Vercel Blob
jest.mock('@vercel/blob', () => ({
    put: jest.fn(),
    del: jest.fn(),
}));

describe('MediaService', () => {
    let service: MediaService;
    let prismaService: jest.Mocked<PrismaService>;

    beforeEach(() => {
        // Mock PrismaService
        prismaService = {
            mediaAsset: {
                create: jest.fn(),
                findMany: jest.fn(),
                findFirst: jest.fn(),
                delete: jest.fn(),
                update: jest.fn(),
            },
        } as unknown as jest.Mocked<PrismaService>;

        service = new MediaService(prismaService);
    });

    describe('validateFile', () => {
        it('should throw BadRequestException when no file is provided', () => {
            expect(() => service.validateFile(null as any, 'image')).toThrow(BadRequestException);
        });

        it('should throw BadRequestException when file size exceeds limit', () => {
            const file = {
                size: 200 * 1024 * 1024, // 200MB
                mimetype: 'image/jpeg',
            } as Express.Multer.File;

            expect(() => service.validateFile(file, 'image')).toThrow(BadRequestException);
        });

        it('should throw BadRequestException for invalid image type', () => {
            const file = {
                size: 1024,
                mimetype: 'application/pdf',
            } as Express.Multer.File;

            expect(() => service.validateFile(file, 'image')).toThrow(BadRequestException);
        });

        it('should accept valid image file', () => {
            const file = {
                size: 1024,
                mimetype: 'image/jpeg',
            } as Express.Multer.File;

            expect(() => service.validateFile(file, 'image')).not.toThrow();
        });

        it('should accept valid video file', () => {
            const file = {
                size: 50 * 1024 * 1024, // 50MB
                mimetype: 'video/mp4',
            } as Express.Multer.File;

            expect(() => service.validateFile(file, 'video')).not.toThrow();
        });
    });

    describe('generateFilename', () => {
        it('should generate a unique filename with timestamp and hash', () => {
            const filename1 = service.generateFilename('test.jpg');
            const filename2 = service.generateFilename('test.jpg');

            expect(filename1).toMatch(/^\d+-[a-f0-9]+\.jpg$/);
            expect(filename2).toMatch(/^\d+-[a-f0-9]+\.jpg$/);
            expect(filename1).not.toBe(filename2);
        });

        it('should preserve file extension', () => {
            expect(service.generateFilename('image.png')).toMatch(/\.png$/);
            expect(service.generateFilename('video.mp4')).toMatch(/\.mp4$/);
        });
    });

    describe('getByContent', () => {
        it('should return media assets for content', async () => {
            const mockAssets = [
                { id: '1', filename: 'test.jpg' },
                { id: '2', filename: 'test2.jpg' },
            ];

            (prismaService.mediaAsset.findMany as jest.Mock).mockResolvedValue(mockAssets);

            const result = await service.getByContent('content-1', 'tenant-1');

            expect(prismaService.mediaAsset.findMany).toHaveBeenCalledWith({
                where: { contentId: 'content-1', tenantId: 'tenant-1' },
                orderBy: { createdAt: 'desc' },
            });
            expect(result).toEqual(mockAssets);
        });
    });

    describe('delete', () => {
        it('should throw BadRequestException when asset not found', async () => {
            (prismaService.mediaAsset.findFirst as jest.Mock).mockResolvedValue(null);

            await expect(service.delete('asset-1', 'tenant-1')).rejects.toThrow(BadRequestException);
        });
    });
});

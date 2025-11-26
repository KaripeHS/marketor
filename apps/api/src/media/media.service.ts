import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MediaAsset } from "@prisma/client";
import { put, del } from "@vercel/blob";
import * as crypto from "crypto";

export { MediaAsset };

// Storage adapter interface for different storage backends
interface StorageAdapter {
    upload(file: Buffer, filename: string, contentType: string): Promise<{ url: string; key: string }>;
    delete(key: string): Promise<void>;
    getSignedUrl(key: string): Promise<string>;
}

// Mock storage adapter for development/testing
class MockStorageAdapter implements StorageAdapter {
    async upload(_file: Buffer, filename: string, _contentType: string): Promise<{ url: string; key: string }> {
        const key = `mock/${Date.now()}-${filename}`;
        // In development, return a placeholder URL
        return {
            url: `https://placeholder.com/${key}`,
            key,
        };
    }

    async delete(key: string): Promise<void> {
        console.log(`[Mock] Would delete: ${key}`);
    }

    async getSignedUrl(key: string): Promise<string> {
        return `https://placeholder.com/${key}?signed=true`;
    }
}

// Vercel Blob storage adapter - production-ready
class VercelBlobAdapter implements StorageAdapter {
    async upload(file: Buffer, filename: string, contentType: string): Promise<{ url: string; key: string }> {
        const blob = await put(filename, file, {
            access: "public",
            contentType,
        });
        return {
            url: blob.url,
            key: blob.url, // Vercel Blob uses URL as the key for deletion
        };
    }

    async delete(url: string): Promise<void> {
        await del(url);
    }

    async getSignedUrl(url: string): Promise<string> {
        // Vercel Blob public URLs don't need signing
        return url;
    }
}

interface UploadOptions {
    tenantId: string;
    contentId?: string;
    type: "image" | "video" | "thumbnail";
}

@Injectable()
export class MediaService {
    private storage: StorageAdapter;
    private readonly maxFileSize = 100 * 1024 * 1024; // 100MB
    private readonly allowedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    private readonly allowedVideoTypes = ["video/mp4", "video/quicktime", "video/webm"];

    constructor(private readonly prisma: PrismaService) {
        // Initialize storage adapter based on environment
        const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
        if (blobToken) {
            this.storage = new VercelBlobAdapter();
        } else {
            this.storage = new MockStorageAdapter();
        }
    }

    validateFile(file: Express.Multer.File, type: "image" | "video" | "thumbnail"): void {
        if (!file) {
            throw new BadRequestException("No file provided");
        }

        if (file.size > this.maxFileSize) {
            throw new BadRequestException(`File size exceeds maximum of ${this.maxFileSize / 1024 / 1024}MB`);
        }

        const allowedTypes = type === "video" ? this.allowedVideoTypes : this.allowedImageTypes;
        if (!allowedTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`
            );
        }
    }

    generateFilename(originalName: string): string {
        const ext = originalName.split(".").pop() || "";
        const hash = crypto.randomBytes(8).toString("hex");
        return `${Date.now()}-${hash}.${ext}`;
    }

    async upload(
        file: Express.Multer.File,
        options: UploadOptions
    ): Promise<MediaAsset> {
        this.validateFile(file, options.type);

        const filename = this.generateFilename(file.originalname);
        const { url, key } = await this.storage.upload(
            file.buffer,
            `${options.tenantId}/${filename}`,
            file.mimetype
        );

        // Store metadata in database
        const asset = await this.prisma.mediaAsset.create({
            data: {
                tenantId: options.tenantId,
                contentId: options.contentId || null,
                filename,
                originalFilename: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                url,
                storageKey: key,
                type: options.type,
            },
        });

        return asset;
    }

    async getByContent(contentId: string, tenantId: string): Promise<MediaAsset[]> {
        return this.prisma.mediaAsset.findMany({
            where: { contentId, tenantId },
            orderBy: { createdAt: "desc" },
        });
    }

    async getByTenant(tenantId: string): Promise<MediaAsset[]> {
        return this.prisma.mediaAsset.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" },
            take: 100, // Limit for performance
        });
    }

    async delete(id: string, tenantId: string): Promise<void> {
        const asset = await this.prisma.mediaAsset.findFirst({
            where: { id, tenantId },
        });

        if (!asset) {
            throw new BadRequestException("Asset not found");
        }

        // Delete from storage
        await this.storage.delete(asset.storageKey);

        // Delete from database
        await this.prisma.mediaAsset.delete({ where: { id } });
    }

    async attachToContent(assetId: string, contentId: string, tenantId: string): Promise<MediaAsset> {
        const asset = await this.prisma.mediaAsset.findFirst({
            where: { id: assetId, tenantId },
        });

        if (!asset) {
            throw new BadRequestException("Asset not found");
        }

        return this.prisma.mediaAsset.update({
            where: { id: assetId },
            data: { contentId },
        });
    }
}

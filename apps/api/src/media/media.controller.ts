import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Body,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    Query,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { MediaService, MediaAsset } from "./media.service";
import { Roles } from "../auth/roles.decorator";

@Controller("media")
export class MediaController {
    constructor(private readonly mediaService: MediaService) { }

    @Post("upload")
    @Roles("ADMIN", "AGENCY", "CLIENT")
    @UseInterceptors(FileInterceptor("file", {
        limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    }))
    async upload(
        @UploadedFile() file: Express.Multer.File,
        @Body("tenantId") tenantId: string,
        @Body("contentId") contentId: string | undefined,
        @Body("type") type: "image" | "video" | "thumbnail" = "image",
    ): Promise<MediaAsset> {
        if (!tenantId) {
            throw new BadRequestException("tenantId is required");
        }

        return this.mediaService.upload(file, {
            tenantId,
            contentId,
            type,
        });
    }

    @Get()
    @Roles("ADMIN", "AGENCY", "CLIENT", "REVIEWER")
    async listByTenant(@Query("tenantId") tenantId: string): Promise<MediaAsset[]> {
        if (!tenantId) {
            throw new BadRequestException("tenantId is required");
        }
        return this.mediaService.getByTenant(tenantId);
    }

    @Get("content/:contentId")
    @Roles("ADMIN", "AGENCY", "CLIENT", "REVIEWER")
    async listByContent(
        @Param("contentId") contentId: string,
        @Query("tenantId") tenantId: string,
    ): Promise<MediaAsset[]> {
        if (!tenantId) {
            throw new BadRequestException("tenantId is required");
        }
        return this.mediaService.getByContent(contentId, tenantId);
    }

    @Post(":id/attach")
    @Roles("ADMIN", "AGENCY", "CLIENT")
    async attachToContent(
        @Param("id") id: string,
        @Body("contentId") contentId: string,
        @Body("tenantId") tenantId: string,
    ): Promise<MediaAsset> {
        if (!contentId || !tenantId) {
            throw new BadRequestException("contentId and tenantId are required");
        }
        return this.mediaService.attachToContent(id, contentId, tenantId);
    }

    @Delete(":id")
    @Roles("ADMIN", "AGENCY")
    async delete(
        @Param("id") id: string,
        @Query("tenantId") tenantId: string,
    ) {
        if (!tenantId) {
            throw new BadRequestException("tenantId is required");
        }
        await this.mediaService.delete(id, tenantId);
        return { success: true };
    }
}

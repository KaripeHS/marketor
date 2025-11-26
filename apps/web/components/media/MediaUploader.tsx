"use client";

import React, { useRef, useState } from "react";
import { mediaService } from "@/services/api";
import { MediaAsset, MediaType } from "@/types";
import { Upload, X, Loader2, Image, Film, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MediaUploaderProps {
    tenantId: string;
    contentId?: string;
    type?: MediaType;
    onUpload?: (asset: MediaAsset) => void;
    accept?: string;
    maxSize?: number; // in MB
    className?: string;
    currentMediaUrl?: string;
}

export default function MediaUploader({
    tenantId,
    contentId,
    type = "image",
    onUpload,
    accept,
    maxSize = 100,
    className,
    currentMediaUrl,
}: MediaUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(currentMediaUrl || null);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const acceptTypes = accept || (type === "video"
        ? "video/mp4,video/quicktime,video/webm"
        : "image/jpeg,image/png,image/gif,image/webp");

    const handleFileSelect = async (file: File) => {
        setError(null);

        // Validate file size
        if (file.size > maxSize * 1024 * 1024) {
            setError(`File size exceeds ${maxSize}MB limit`);
            return;
        }

        // Validate file type
        const allowedTypes = acceptTypes.split(",");
        if (!allowedTypes.includes(file.type)) {
            setError(`Invalid file type. Allowed: ${allowedTypes.join(", ")}`);
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Upload file
        setUploading(true);
        try {
            const asset = await mediaService.upload(file, tenantId, type, contentId);
            toast.success("Media uploaded successfully");
            setPreview(asset.url);
            onUpload?.(asset);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to upload file");
            setPreview(null);
            toast.error("Failed to upload media");
        } finally {
            setUploading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    };

    const clearPreview = () => {
        setPreview(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const isVideo = type === "video" || preview?.startsWith("data:video");

    return (
        <div className={cn("space-y-2", className)}>
            <input
                ref={fileInputRef}
                type="file"
                accept={acceptTypes}
                onChange={handleInputChange}
                className="hidden"
            />

            {preview ? (
                <div className="relative rounded-lg overflow-hidden bg-gray-100">
                    {isVideo ? (
                        <video
                            src={preview}
                            className="w-full aspect-video object-cover"
                            controls
                        />
                    ) : (
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-full aspect-video object-cover"
                        />
                    )}
                    <button
                        type="button"
                        onClick={clearPreview}
                        className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                    )}
                </div>
            ) : (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={cn(
                        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                        dragOver
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-300 hover:border-gray-400",
                        uploading && "pointer-events-none opacity-50"
                    )}
                >
                    {uploading ? (
                        <div className="flex flex-col items-center">
                            <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
                            <p className="mt-2 text-sm text-gray-500">Uploading...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            {type === "video" ? (
                                <Film className="w-10 h-10 text-gray-400" />
                            ) : (
                                <Image className="w-10 h-10 text-gray-400" />
                            )}
                            <div className="mt-2">
                                <span className="text-blue-600 font-medium">Click to upload</span>
                                <span className="text-gray-500"> or drag and drop</span>
                            </div>
                            <p className="mt-1 text-xs text-gray-400">
                                {type === "video" ? "MP4, MOV, WebM" : "JPG, PNG, GIF, WebP"} up to {maxSize}MB
                            </p>
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {!preview && !uploading && (
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <Upload className="w-4 h-4" />
                    Upload {type === "video" ? "Video" : "Image"}
                </button>
            )}
        </div>
    );
}

import { PublisherService } from "./publisher.service";
import { TikTokPublisher } from "./tiktok.publisher";
import { InstagramPublisher } from "./instagram.publisher";
import { YouTubePublisher, YouTubeShortPublisher } from "./youtube.publisher";
import { FacebookPublisher } from "./facebook.publisher";
import { Platform } from "@prisma/client";
import { PublishContent } from "./publisher.interface";

describe("PublisherService", () => {
    let service: PublisherService;
    let tiktokPublisher: TikTokPublisher;
    let instagramPublisher: InstagramPublisher;
    let youtubePublisher: YouTubePublisher;
    let youtubeShortPublisher: YouTubeShortPublisher;
    let facebookPublisher: FacebookPublisher;

    beforeEach(() => {
        tiktokPublisher = new TikTokPublisher();
        instagramPublisher = new InstagramPublisher();
        youtubePublisher = new YouTubePublisher();
        youtubeShortPublisher = new YouTubeShortPublisher();
        facebookPublisher = new FacebookPublisher();

        service = new PublisherService(
            tiktokPublisher,
            instagramPublisher,
            youtubePublisher,
            youtubeShortPublisher,
            facebookPublisher
        );
    });

    describe("getSupportedPlatforms", () => {
        it("should return all 5 platforms", () => {
            const platforms = service.getSupportedPlatforms();
            expect(platforms).toHaveLength(5);
            expect(platforms).toContain(Platform.TIKTOK);
            expect(platforms).toContain(Platform.INSTAGRAM);
            expect(platforms).toContain(Platform.YOUTUBE);
            expect(platforms).toContain(Platform.YOUTUBE_SHORT);
            expect(platforms).toContain(Platform.FACEBOOK);
        });
    });

    describe("isSupported", () => {
        it("should return true for supported platforms", () => {
            expect(service.isSupported(Platform.TIKTOK)).toBe(true);
            expect(service.isSupported(Platform.INSTAGRAM)).toBe(true);
            expect(service.isSupported(Platform.YOUTUBE)).toBe(true);
            expect(service.isSupported(Platform.YOUTUBE_SHORT)).toBe(true);
            expect(service.isSupported(Platform.FACEBOOK)).toBe(true);
        });
    });

    describe("getPublisher", () => {
        it("should return correct publisher for each platform", () => {
            expect(service.getPublisher(Platform.TIKTOK)).toBe(tiktokPublisher);
            expect(service.getPublisher(Platform.INSTAGRAM)).toBe(instagramPublisher);
            expect(service.getPublisher(Platform.YOUTUBE)).toBe(youtubePublisher);
            expect(service.getPublisher(Platform.YOUTUBE_SHORT)).toBe(youtubeShortPublisher);
            expect(service.getPublisher(Platform.FACEBOOK)).toBe(facebookPublisher);
        });
    });

    describe("validateContent", () => {
        it("should validate TikTok content requires video", () => {
            const content: PublishContent = {
                id: "test-id",
                caption: "Test caption",
                // No mediaUrl
            };

            const result = service.validateContent(Platform.TIKTOK, content);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain("TikTok requires a video URL");
        });

        it("should validate TikTok caption length", () => {
            const content: PublishContent = {
                id: "test-id",
                mediaUrl: "https://example.com/video.mp4",
                caption: "a".repeat(2201), // 1 char over limit
            };

            const result = service.validateContent(Platform.TIKTOK, content);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain("TikTok caption must be 2200 characters or less");
        });

        it("should pass valid TikTok content", () => {
            const content: PublishContent = {
                id: "test-id",
                mediaUrl: "https://example.com/video.mp4",
                caption: "Valid caption",
                format: "SHORT_VIDEO",
            };

            const result = service.validateContent(Platform.TIKTOK, content);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it("should validate Instagram content requires media", () => {
            const content: PublishContent = {
                id: "test-id",
                caption: "Test caption",
            };

            const result = service.validateContent(Platform.INSTAGRAM, content);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain("Instagram requires a media URL");
        });

        it("should validate YouTube requires title", () => {
            const content: PublishContent = {
                id: "test-id",
                mediaUrl: "https://example.com/video.mp4",
                // No title
            };

            const result = service.validateContent(Platform.YOUTUBE, content);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain("YouTube videos require a title");
        });

        it("should validate Facebook allows text-only posts", () => {
            const content: PublishContent = {
                id: "test-id",
                caption: "Text post without media",
            };

            const result = service.validateContent(Platform.FACEBOOK, content);
            expect(result.valid).toBe(true);
        });

        it("should reject Facebook posts without text or media", () => {
            const content: PublishContent = {
                id: "test-id",
            };

            const result = service.validateContent(Platform.FACEBOOK, content);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain("Facebook posts require either text or media");
        });
    });
});

describe("TikTokPublisher", () => {
    let publisher: TikTokPublisher;

    beforeEach(() => {
        publisher = new TikTokPublisher();
    });

    describe("validateContent", () => {
        it("should reject non-video formats", () => {
            const content: PublishContent = {
                id: "test",
                mediaUrl: "https://example.com/image.jpg",
                format: "IMAGE",
            };

            const result = publisher.validateContent(content);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain("TikTok only supports video content");
        });

        it("should accept SHORT_VIDEO format", () => {
            const content: PublishContent = {
                id: "test",
                mediaUrl: "https://example.com/video.mp4",
                format: "SHORT_VIDEO",
            };

            const result = publisher.validateContent(content);
            expect(result.valid).toBe(true);
        });

        it("should accept LONG_VIDEO format", () => {
            const content: PublishContent = {
                id: "test",
                mediaUrl: "https://example.com/video.mp4",
                format: "LONG_VIDEO",
            };

            const result = publisher.validateContent(content);
            expect(result.valid).toBe(true);
        });
    });
});

describe("InstagramPublisher", () => {
    let publisher: InstagramPublisher;

    beforeEach(() => {
        publisher = new InstagramPublisher();
    });

    describe("validateContent", () => {
        it("should accept image content", () => {
            const content: PublishContent = {
                id: "test",
                mediaUrl: "https://example.com/image.jpg",
                format: "IMAGE",
            };

            const result = publisher.validateContent(content);
            expect(result.valid).toBe(true);
        });

        it("should accept video content", () => {
            const content: PublishContent = {
                id: "test",
                mediaUrl: "https://example.com/video.mp4",
                format: "SHORT_VIDEO",
            };

            const result = publisher.validateContent(content);
            expect(result.valid).toBe(true);
        });
    });
});

describe("YouTubePublisher", () => {
    let publisher: YouTubePublisher;

    beforeEach(() => {
        publisher = new YouTubePublisher();
    });

    describe("validateContent", () => {
        it("should require title", () => {
            const content: PublishContent = {
                id: "test",
                mediaUrl: "https://example.com/video.mp4",
            };

            const result = publisher.validateContent(content);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain("YouTube videos require a title");
        });

        it("should reject title over 100 characters", () => {
            const content: PublishContent = {
                id: "test",
                mediaUrl: "https://example.com/video.mp4",
                title: "a".repeat(101),
            };

            const result = publisher.validateContent(content);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain("YouTube title must be 100 characters or less");
        });

        it("should reject description over 5000 characters", () => {
            const content: PublishContent = {
                id: "test",
                mediaUrl: "https://example.com/video.mp4",
                title: "Test Title",
                script: "a".repeat(5001),
            };

            const result = publisher.validateContent(content);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain("YouTube description must be 5000 characters or less");
        });

        it("should accept valid content", () => {
            const content: PublishContent = {
                id: "test",
                mediaUrl: "https://example.com/video.mp4",
                title: "My Video Title",
                script: "Video description",
                format: "LONG_VIDEO",
            };

            const result = publisher.validateContent(content);
            expect(result.valid).toBe(true);
        });
    });
});

describe("FacebookPublisher", () => {
    let publisher: FacebookPublisher;

    beforeEach(() => {
        publisher = new FacebookPublisher();
    });

    describe("validateContent", () => {
        it("should allow text-only posts", () => {
            const content: PublishContent = {
                id: "test",
                caption: "Just text, no media",
            };

            const result = publisher.validateContent(content);
            expect(result.valid).toBe(true);
        });

        it("should allow media-only posts", () => {
            const content: PublishContent = {
                id: "test",
                mediaUrl: "https://example.com/image.jpg",
            };

            const result = publisher.validateContent(content);
            expect(result.valid).toBe(true);
        });

        it("should reject posts with neither text nor media", () => {
            const content: PublishContent = {
                id: "test",
            };

            const result = publisher.validateContent(content);
            expect(result.valid).toBe(false);
        });

        it("should reject caption over 63206 characters", () => {
            const content: PublishContent = {
                id: "test",
                caption: "a".repeat(63207),
            };

            const result = publisher.validateContent(content);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain("Facebook post text must be 63,206 characters or less");
        });
    });
});

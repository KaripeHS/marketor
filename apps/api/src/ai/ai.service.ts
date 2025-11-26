import { Injectable } from "@nestjs/common";
import OpenAI from "openai";

@Injectable()
export class AiService {
    private openai: OpenAI | null = null;

    constructor() {
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
        }
    }

    async generate(type: "STRATEGY" | "CONTENT", context: Record<string, any>, prompt?: string) {
        if (!this.openai) {
            console.warn("OPENAI_API_KEY not found, returning mock data.");
            return this.getMockData(type);
        }

        try {
            const systemPrompt = this.getSystemPrompt(type);
            const userPrompt = `Context: ${JSON.stringify(context)}\n\nRequest: ${prompt || "Generate suggestions based on the context."}`;

            const completion = await this.openai.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                model: "gpt-3.5-turbo",
                response_format: { type: "json_object" },
            });

            const content = completion.choices[0].message.content;
            return JSON.parse(content || "{}");
        } catch (error) {
            console.error("AI Generation failed:", error);
            return this.getMockData(type);
        }
    }

    private getSystemPrompt(type: "STRATEGY" | "CONTENT"): string {
        if (type === "STRATEGY") {
            return `You are a marketing strategist. Generate a marketing strategy in JSON format with the following keys:
      - goals: object (e.g. { "primary": "..." })
      - pillars: object (e.g. { "pillar1": "..." })
      - platformFocus: object (e.g. { "instagram": "..." })
      Ensure the response is valid JSON.`;
        } else {
            return `You are a creative content director. Generate content ideas in JSON format with a key "ideas" containing an array of objects.
      Each object should have:
      - platform: string (TIKTOK, INSTAGRAM, YOUTUBE, FACEBOOK)
      - format: string (SHORT_VIDEO, IMAGE, CAROUSEL, TEXT)
      - topic: string
      - description: string
      Ensure the response is valid JSON.`;
        }
    }

    private getMockData(type: "STRATEGY" | "CONTENT") {
        if (type === "STRATEGY") {
            return {
                goals: {
                    primary: "Increase brand awareness by 20%",
                    secondary: "Generate 50 qualified leads per month"
                },
                pillars: {
                    education: "Teach audience about industry trends",
                    community: "Highlight user success stories"
                },
                platformFocus: {
                    linkedin: "Thought leadership articles",
                    twitter: "Daily engagement and news"
                }
            };
        } else {
            return {
                ideas: [
                    {
                        platform: "TIKTOK",
                        format: "SHORT_VIDEO",
                        topic: "Behind the Scenes",
                        description: "Show the team working on the new feature."
                    },
                    {
                        platform: "INSTAGRAM",
                        format: "CAROUSEL",
                        topic: "5 Tips for Success",
                        description: "Educational carousel with actionable advice."
                    }
                ]
            };
        }
    }
}

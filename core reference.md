
# 🤖 AUTOPILOT VIRAL GROWTH MACHINE  
## INTERNAL AGENT ARCHITECTURE SPEC  
**Version:** 1.0  
**Purpose:** Reference file for NotebookLM / multi-agent orchestration

---

## 1. Overview

This document describes the **internal agent architecture** of the Autopilot Viral Growth Machine.

The system is implemented as a **multi-agent AI network** coordinated by a central **Orchestrator Agent**. Each agent has:

- A clear **responsibility**
- Defined **inputs** and **outputs**
- A well-scoped **context**
- A predictable **data contract**

The goal is to allow a supervising system (e.g., NotebookLM, an AI orchestrator, or a server backend) to:

- Plug agents together
- Swap models under the hood
- Scale pieces independently
- Maintain clarity in flow and ownership

---

## 2. Agent List (Bird’s-Eye View)

The system is composed of the following core agents:

1. **Orchestrator Agent**
2. **Brand Ingestion Agent**
3. **Knowledge Graph / Brand Memory Service** (supporting service, not a “chat agent”)
4. **Trend & Keyword Research Agent**
5. **Content Strategy Agent**
6. **Content Planning Agent** (Daily/Weekly Planner)
7. **Script & Narrative Agent**
8. **Image Generation Agent**
9. **Video Assembly Agent**
10. **Caption & Metadata Agent**
11. **Scheduler & Publishing Agent**
12. **Engagement & Analytics Agent**
13. **Learning & Optimization Agent**
14. **Reporting & Insights Agent**
15. **Security & Compliance Guardian** (cross-cutting gatekeeper)

---

## 3. Orchestrator Agent

### 3.1 Responsibility

The **Orchestrator Agent** is the “brainstem” of the system. It:

- Receives high-level objectives (e.g., “Run daily viral growth loop for United Vows”)
- Breaks them into sub-tasks
- Dispatches appropriate agents
- Ensures dependencies are respected
- Handles failure, retries, and escalations

### 3.2 Inputs

- **System configuration** (platforms enabled, posting frequency, timezone)
- **Brand identity key** (reference to brand memory store)
- **Operational schedule** (cron-like triggers: daily, weekly, monthly)
- Event triggers:
  - `DAILY_CONTENT_CYCLE`
  - `WEEKLY_REPORT_CYCLE`
  - `MODEL_RETRAINING_CYCLE` (if applicable)

### 3.3 Outputs

- Internal task graph for the day
- Execution logs and status
- Escalation events (e.g., “human review required”)
- Summary snapshots for the Reporting Agent

### 3.4 Core Behaviors

- Decide which agents to invoke, in what order
- Pass context (brand, goals, history) to each agent
- Receive outputs and validate schemas
- Short-circuit flows on critical failure (e.g., publishing disabled if auth broken)

---

## 4. Brand Ingestion Agent

### 4.1 Responsibility

Ingests and interprets **brand data**:

- Website content
- About pages, FAQs, product pages
- Optional PDFs, decks, documents
- Initial human brief (if provided)

### 4.2 Inputs

```json
{
  "brand_id": "united_vows",
  "website_urls": ["https://example.com"],
  "extra_docs_refs": ["doc://brand_manifesto", "doc://deck_v1"],
  "business_goals": [
    "Increase organic traffic",
    "Attract engaged couples",
    "Attract high-quality vendors"
  ]
}
````

### 4.3 Outputs (Brand Profile Object)

```json
{
  "brand_id": "united_vows",
  "brand_voice": {
    "tone": ["warm", "expert", "trust-building"],
    "do_say": ["Transparent", "Helpful", "On the couple's side"],
    "dont_say": ["Pushy sales", "Fear-mongering"]
  },
  "target_audiences": [
    {
      "name": "Engaged Couples",
      "pain_points": [...],
      "desired_outcomes": [...]
    },
    {
      "name": "Wedding Vendors",
      "pain_points": [...],
      "desired_outcomes": [...]
    }
  ],
  "value_proposition": [
    "Safer, smarter wedding platform",
    "Anti lead-gen, pro-vendor"
  ],
  "core_topics": [
    "wedding planning",
    "vendor selection",
    "escrow & trust",
    "budgeting",
    "inspiration"
  ],
  "visual_style": {
    "palette": ["#F5EFE5", "#..."],
    "imagery": ["weddings", "flowers", "couples", "venues"],
    "overall_vibe": "modern, elegant, joyful"
  }
}
```

### 4.4 Persistence

The output is stored in the **Brand Memory Service** for reuse by all agents.

---

## 5. Knowledge Graph / Brand Memory Service

*(Support service, not a conversational agent.)*

### 5.1 Responsibility

* Store **brand profile**
* Store **content history**
* Store **platform statistics**
* Provide **fast retrieval** for other agents

### 5.2 Key Data Types

* `BrandProfile`
* `TrendMap`
* `ContentPlan`
* `PostArtifact` (video/image/caption + metadata)
* `AnalyticsSnapshot`
* `LearningSummary`

### 5.3 Access

All agents **read** from and **write** to this service through stable APIs:

* `GET /brand_profile/{brand_id}`
* `PUT /brand_profile/{brand_id}`
* `GET /content_history?brand_id=...`
* `PUT /analytics_snapshot`
* etc.

---

## 6. Trend & Keyword Research Agent

### 6.1 Responsibility

Continuously maps the **external world**:

* Viral topics
* High-value keywords
* Popular content formats
* Emerging themes in the wedding space (or niche)

### 6.2 Inputs

```json
{
  "brand_id": "united_vows",
  "target_audiences": [...],
  "seed_topics": ["wedding planning", "vendors", "budget", "escrow"],
  "platforms": ["tiktok", "instagram", "youtube", "facebook"]
}
```

### 6.3 Outputs (Trend Map)

```json
{
  "brand_id": "united_vows",
  "generated_at": "2025-06-14T12:00:00Z",
  "viral_topics": [
    {
      "topic": "wedding horror stories",
      "platform": "tiktok",
      "engagement_score": 0.92
    }
  ],
  "keyword_clusters": [
    {
      "cluster_name": "vendor red flags",
      "keywords": ["wedding vendor red flags", "questions to ask vendors"]
    }
  ],
  "popular_formats": [
    { "platform": "tiktok", "format": "storytime", "length": "15-30s" },
    { "platform": "youtube", "format": "deep guide", "length": "8-12min" }
  ],
  "content_gaps": [
    "Escrow explanation in simple language",
    "Side-by-side comparison vs traditional platforms"
  ]
}
```

### 6.4 Use

* Provides **fuel** to the Content Strategy Agent
* Refreshed daily or weekly

---

## 7. Content Strategy Agent

### 7.1 Responsibility

Convert:

* Brand profile
* Trend map
* Historical performance

into a **strategic content direction** for the next period (day/week/month).

### 7.2 Inputs

```json
{
  "brand_profile": { ... },
  "trend_map": { ... },
  "analytics_summary": { ... },   // optional on Day 1
  "time_horizon": "7_days"
}
```

### 7.3 Outputs (Strategy Object)

```json
{
  "brand_id": "united_vows",
  "time_window": {
    "start": "2025-06-14",
    "end": "2025-06-21"
  },
  "primary_goals": [
    "Educate couples on safer booking",
    "Attract new vendors with fair economics messaging"
  ],
  "message_pillars": [
    "trust & escrow",
    "vendor fairness",
    "planning tips",
    "real stories"
  ],
  "platform_focus": {
    "tiktok": {
      "priority": "high",
      "key_formats": ["storytime horror vs. safe outcome", "3 quick tips"]
    },
    "youtube": {
      "priority": "medium",
      "key_formats": ["explainers", "step-by-step guides"]
    }
  },
  "topic_pipeline": [
    {
      "slug": "3_red_flags_when_booking_a_vendor",
      "target_audience": "couples",
      "platforms": ["tiktok", "instagram", "youtube_short", "facebook"]
    },
    {
      "slug": "how_united_vows_protects_vendors",
      "target_audience": "vendors",
      "platforms": ["youtube_long", "instagram"]
    }
  ]
}
```

---

## 8. Content Planning Agent (Daily/Weekly Planner)

### 8.1 Responsibility

Transform **strategy** into a **concrete content calendar**:

* Which topic
* Which format
* Which platform
* Which day/time

### 8.2 Inputs

```json
{
  "brand_id": "united_vows",
  "strategy": { ... },
  "posting_rules": {
    "tiktok": "1_per_day",
    "instagram": "1_per_day",
    "youtube_short": "1_per_day",
    "youtube_long": "1_per_week",
    "facebook": "1_per_day"
  },
  "time_zone": "America/New_York"
}
```

### 8.3 Outputs (Content Plan)

```json
{
  "plan_id": "plan_2025_06_14_week_01",
  "brand_id": "united_vows",
  "items": [
    {
      "content_id": "2025-06-15_tiktok_01",
      "platform": "tiktok",
      "topic_slug": "3_red_flags_when_booking_a_vendor",
      "scheduled_time": "2025-06-15T12:00:00-05:00",
      "format": "short_video"
    },
    {
      "content_id": "2025-06-15_instagram_01",
      "platform": "instagram",
      "topic_slug": "3_red_flags_when_booking_a_vendor",
      "scheduled_time": "2025-06-15T12:05:00-05:00",
      "format": "carousel"
    }
  ]
}
```

This is the **blueprint** the creation agents will follow.

---

## 9. Script & Narrative Agent

### 9.1 Responsibility

Generate **scripts, storyboards, and textual skeletons** for each planned item.

### 9.2 Inputs

For each `content_id`:

```json
{
  "brand_profile": { ... },
  "topic": {
    "slug": "3_red_flags_when_booking_a_vendor",
    "context": "...",
    "angle": "protecting couples"
  },
  "platform": "tiktok",
  "format": "short_video",
  "duration_target": "15-20s",
  "goal": "hook + educate + CTA"
}
```

### 9.3 Outputs

```json
{
  "content_id": "2025-06-15_tiktok_01",
  "script": {
    "hook": "Never pay a wedding vendor like this...",
    "beats": [
      "Introduce common mistake",
      "Show consequence",
      "Offer safe alternative via escrow",
      "Name United Vows as example"
    ],
    "cta": "Follow for more wedding vendor tips 👇"
  },
  "narration_text": "Never pay a wedding vendor in full, upfront...",
  "scene_descriptions": [
    "Shot of stressed couple looking at phone",
    "Overlay: 'Red Flag #1: No contract'",
    "Cut to safer version with platform UI example"
  ],
  "text_overlays": [
    "Red Flag #1: No contract",
    "Red Flag #2: Cash only",
    "Use escrow instead"
  ]
}
```

---

## 10. Image Generation Agent

### 10.1 Responsibility

Create all **static visual assets** needed:

* Thumbnails
* Instagram posts
* Carousel slides
* Facebook images
* Some B-roll frames for videos

### 10.2 Inputs

```json
{
  "content_id": "2025-06-15_instagram_01",
  "brand_visual_style": { ... },
  "scene_descriptions": [
    "Elegant wedding reception setup with neutral colors",
    "Text overlay area on right side"
  ],
  "text_overlays": [
    "3 Vendor Red Flags 🚩",
    "Save this for later"
  ]
}
```

### 10.3 Outputs

```json
{
  "content_id": "2025-06-15_instagram_01",
  "images": [
    { "file_ref": "img://2025-06-15_instagram_01_slide_1.jpg" },
    { "file_ref": "img://2025-06-15_instagram_01_slide_2.jpg" }
  ],
  "thumbnail_suggestion": {
    "file_ref": "img://2025-06-15_instagram_01_thumb.jpg",
    "recommended_text": "Vendor Red Flags"
  }
}
```

---

## 11. Video Assembly Agent

### 11.1 Responsibility

Turn script + visuals into **final video files**:

* Build sequence
* Add transitions
* Add on-screen text
* Add background music / trending sounds

### 11.2 Inputs

```json
{
  "content_id": "2025-06-15_tiktok_01",
  "script": { ... },
  "narration_text": "...",
  "image_assets": [...],
  "brand_visual_style": { ... },
  "platform_requirements": {
    "aspect_ratio": "9:16",
    "max_duration_sec": 20
  }
}
```

### 11.3 Outputs

```json
{
  "content_id": "2025-06-15_tiktok_01",
  "video_file": "video://2025-06-15_tiktok_01.mp4",
  "thumbnail_file": "img://2025-06-15_tiktok_01_thumb.jpg",
  "duration_sec": 18,
  "technical_metadata": {
    "resolution": "1080x1920",
    "fps": 30
  }
}
```

---

## 12. Caption & Metadata Agent

### 12.1 Responsibility

Generate **platform-specific text**:

* Captions
* Hashtags
* Titles
* Descriptions
* CTAs
* Alt text (for accessibility)

### 12.2 Inputs

```json
{
  "content_id": "2025-06-15_tiktok_01",
  "platform": "tiktok",
  "script_summary": "...",
  "target_audience": "couples",
  "brand_voice": { ... },
  "keyword_context": [
    "wedding vendor red flags",
    "wedding planning tips"
  ]
}
```

### 12.3 Outputs

```json
{
  "content_id": "2025-06-15_tiktok_01",
  "platform": "tiktok",
  "caption": "🚩 3 wedding vendor red flags no one tells you about.\n\n#WeddingTok #WeddingPlanning #VendorTips #UnitedVows",
  "hashtags": [
    "#WeddingTok",
    "#WeddingPlanning",
    "#VendorTips",
    "#UnitedVows"
  ],
  "cta": "Follow for more stress-free wedding planning tips 💍"
}
```

---

## 13. Scheduler & Publishing Agent

### 13.1 Responsibility

* Schedule posts
* Handle timezones
* Call platform APIs
* Confirm success / log failures

### 13.2 Inputs

```json
{
  "content_id": "2025-06-15_tiktok_01",
  "platform": "tiktok",
  "scheduled_time": "2025-06-15T12:00:00-05:00",
  "video_file": "video://2025-06-15_tiktok_01.mp4",
  "caption": "...",
  "metadata": { ... },
  "auth_token_ref": "auth://tiktok_united_vows"
}
```

### 13.3 Outputs

```json
{
  "content_id": "2025-06-15_tiktok_01",
  "platform": "tiktok",
  "post_status": "success",
  "platform_post_id": "tiktok_123456789",
  "published_at": "2025-06-15T12:00:05-05:00"
}
```

Failures are logged with reason (e.g., auth error, network error) and retried or escalated.

---

## 14. Engagement & Analytics Agent

### 14.1 Responsibility

Regularly read **performance metrics** from each platform and normalize them.

### 14.2 Inputs

```json
{
  "brand_id": "united_vows",
  "platform": "tiktok",
  "time_window": {
    "start": "2025-06-15T00:00:00Z",
    "end": "2025-06-16T00:00:00Z"
  }
}
```

### 14.3 Outputs (Analytics Snapshot)

```json
{
  "snapshot_id": "analytics_2025-06-15",
  "brand_id": "united_vows",
  "platform": "tiktok",
  "posts": [
    {
      "content_id": "2025-06-15_tiktok_01",
      "platform_post_id": "tiktok_123456789",
      "likes": 1240,
      "comments": 87,
      "shares": 312,
      "saves": 215,
      "views": 15000,
      "avg_watch_time_sec": 12.4,
      "audience": {
        "demographics": "...",
        "locations": "..."
      }
    }
  ]
}
```

This is stored in Brand Memory and fed into the **Learning & Optimization Agent**.

---

## 15. Learning & Optimization Agent

### 15.1 Responsibility

Use analytics data to **improve future content**:

* Detect patterns
* Adjust strategy
* Suggest new topics
* Tune hooks, formats, timings

### 15.2 Inputs

```json
{
  "brand_profile": { ... },
  "recent_trend_maps": [ ... ],
  "recent_analytics_snapshots": [ ... ],
  "recent_content_plans": [ ... ]
}
```

### 15.3 Outputs (Learning Summary)

```json
{
  "brand_id": "united_vows",
  "generated_at": "2025-06-21T00:00:00Z",
  "what_worked": [
    "TikTok storytime videos around vendor horror stories",
    "Instagram carousels with 'swipe to see tips'"
  ],
  "what_did_not_work": [
    "Long captions on Facebook with no image"
  ],
  "new_hypotheses": [
    "Shorten hooks to < 3 seconds on TikTok",
    "Use bolder text overlays on thumbnails"
  ],
  "recommended_changes": {
    "content_strategy": {
      "increase_topics": ["budget tips", "checklists"],
      "decrease_topics": ["generic inspiration posts"]
    },
    "platform_mix": {
      "tiktok": { "priority": "very_high" },
      "facebook": { "priority": "medium" }
    }
  }
}
```

### 15.4 Effect

This summary is passed to the **Content Strategy Agent** for the next cycle, forming a continuous improvement loop.

---

## 16. Reporting & Insights Agent

### 16.1 Responsibility

Convert complex internal data into **human-readable reports** for the owner.

### 16.2 Inputs

* `BrandProfile`
* `TrendMap(s)`
* `AnalyticsSnapshot(s)`
* `LearningSummary`
* High-level KPIs from Orchestrator

### 16.3 Outputs

#### 16.3.1 Weekly Report

Human-readable summary plus structured JSON:

```json
{
  "report_id": "weekly_2025-06-21",
  "brand_id": "united_vows",
  "period": "2025-06-14 to 2025-06-21",
  "kpis": {
    "new_followers": 1345,
    "website_clicks": 420,
    "avg_engagement_rate": 0.087
  },
  "top_posts": [
    {
      "content_id": "2025-06-18_tiktok_02",
      "reason": "High watch time + high share rate"
    }
  ],
  "narrative_summary": "This week, couples strongly engaged with...",
  "next_week_focus": [
    "More vendor red flag content",
    "Explainer videos on escrow process"
  ]
}
```

---

## 17. Security & Compliance Guardian

*(Cross-cutting / Gatekeeper agent)*

### 17.1 Responsibility

* Ensure generated content is safe and compliant
* Prevent publishing harmful, misleading, or policy-violating material
* Enforce brand safety rules

### 17.2 Inputs

* Candidate posts (video + captions)
* Brand safety rules
* Platform policies summary

### 17.3 Outputs

* `approved: true/false`
* If false: reasons + redrafted alternative suggestion

```json
{
  "content_id": "2025-06-15_tiktok_01",
  "approved": true,
  "notes": "No compliance issues detected."
}
```

This agent sits **between** the creation agents and the Scheduler & Publishing Agent.

---

## 18. End-to-End Daily Flow (Sequence)

Below is a simplified daily run:

1. **Orchestrator** triggers `DAILY_CONTENT_CYCLE`.
2. Orchestrator retrieves `BrandProfile` and yesterday’s `AnalyticsSnapshots`.
3. Orchestrator calls **Trend & Keyword Research Agent** (if refresh day).
4. Orchestrator calls **Content Strategy Agent**.
5. Orchestrator calls **Content Planning Agent** to produce `ContentPlan`.
6. For each `content_id` in `ContentPlan`:

   * Call **Script & Narrative Agent**
   * Call **Image Generation Agent** (as needed)
   * Call **Video Assembly Agent** (for video platforms)
   * Call **Caption & Metadata Agent**
   * Call **Security & Compliance Guardian**
   * If approved → pass package to **Scheduler & Publishing Agent**
7. Later in the day or next day:

   * **Engagement & Analytics Agent** fetches performance
   * Data stored in Brand Memory
8. On weekly basis:

   * **Learning & Optimization Agent** runs
   * **Reporting & Insights Agent** produces human report

This loop repeats indefinitely, continuously improving quality and performance.

---

## 19. Summary

This architecture:

* Keeps **each responsibility small and clear**
* Allows replacement or upgrading of individual agents
* Supports scaling specific parts (e.g., video generation, analytics)
* Provides clean data contracts that tools like NotebookLM or an AI orchestrator can reason about and extend

The **Orchestrator Agent** plus these **specialized agents** form a complete “autopilot marketing department” capable of:

* Understanding a brand
* Researching trends
* Planning content
* Producing videos & images
* Posting everywhere
* Learning from responses
* Reporting in plain language

This file can be used as a **core reference** for building, simulating, or prompting this system inside NotebookLM or any multi-agent framework.



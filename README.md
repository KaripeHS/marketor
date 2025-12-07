# GrowthPilot AI - Social Media Marketing Platform

A multi-tenant SaaS platform for social media content management, publishing, and analytics with AI-powered content generation. Built for regulated professionals (healthcare, finance, legal) with compliance-first design and human-in-loop safety.

## Tech Stack

- **Backend**: NestJS with TypeScript, Prisma ORM, PostgreSQL
- **Frontend**: Next.js 15 with React, TailwindCSS
- **Mobile**: Expo/React Native
- **Queue**: BullMQ with Redis
- **Real-time**: WebSockets (Socket.IO)
- **Payments**: Stripe
- **Storage**: Vercel Blob
- **Caching**: Redis with cache-manager
- **Monitoring**: Prometheus metrics, Sentry error tracking

## Features

### Core Platform
- **Multi-tenancy**: Full tenant isolation with role-based access (Admin, Agency, Client, Reviewer)
- **Content Management**: Create, schedule, and publish content across multiple platforms
- **Campaign Management**: Organize content into campaigns with status tracking
- **Approval Workflows**: Multi-step approval process with revision requests and comments
- **Compliance Review**: Automated compliance checking for regulated industries

### Social Media Integration
- **Supported Platforms**: TikTok, Instagram, YouTube, Facebook, Twitter/X, LinkedIn, Pinterest
- **OAuth Integration**: Secure connection management with token refresh
- **Publishing**: Direct publishing with retry logic and rate limiting
- **Analytics**: Performance metrics ingestion and aggregation

### AI Features
- **Content Generation**: AI-powered script, caption, and hashtag generation
- **Brand Voice**: Custom brand profiles for consistent content
- **Learning Insights**: ML-based recommendations from performance data
- **Trend Analysis**: Platform-specific trend mapping

### Billing & Subscriptions
- **Stripe Integration**: Checkout sessions, customer portal, webhooks
- **Plan Tiers**: Free, Starter, Professional, Agency, Enterprise
- **Usage Tracking**: Metered billing for posts, storage, AI generations
- **Entitlements**: Feature gating based on subscription plan

### Notifications
- **Multi-channel**: In-app, email (via Resend), push notifications
- **Templating**: Customizable notification templates
- **Preferences**: User-configurable notification settings
- **Digest Emails**: Weekly summary reports

### Security
- **Authentication**: JWT-based auth with refresh tokens
- **Rate Limiting**: Global and endpoint-specific throttling
- **CORS**: Configurable cross-origin settings
- **Helmet**: Security headers for production
- **Encryption**: AES-256 for sensitive data (tokens)
- **Audit Logging**: Comprehensive action tracking

## Project Structure

```
marketor/
├── apps/
│   ├── api/           # NestJS backend
│   │   ├── src/
│   │   │   ├── admin/        # Admin dashboard endpoints
│   │   │   ├── ai/           # AI content generation
│   │   │   ├── analytics/    # Metrics & insights
│   │   │   ├── approvals/    # Approval workflows
│   │   │   ├── auth/         # Authentication
│   │   │   ├── billing/      # Stripe integration
│   │   │   ├── brand/        # Brand profiles
│   │   │   ├── cache/        # Redis caching
│   │   │   ├── campaigns/    # Campaign management
│   │   │   ├── comments/     # Content comments
│   │   │   ├── compliance/   # Compliance rules
│   │   │   ├── content/      # Content CRUD
│   │   │   ├── crypto/       # Encryption service
│   │   │   ├── invitations/  # Team invitations
│   │   │   ├── media/        # File uploads
│   │   │   ├── metrics/      # Prometheus metrics
│   │   │   ├── notifications/# All notification channels
│   │   │   ├── plans/        # Content planning
│   │   │   ├── prisma/       # Database service
│   │   │   ├── queue/        # BullMQ jobs
│   │   │   ├── ratelimit/    # API rate limiting
│   │   │   ├── revisions/    # Revision requests
│   │   │   ├── social/       # Social connections & publishing
│   │   │   ├── strategy/     # Marketing strategy
│   │   │   ├── tenants/      # Multi-tenancy
│   │   │   ├── throttle/     # HTTP rate limiting
│   │   │   ├── users/        # User management
│   │   │   └── websocket/    # Real-time events
│   │   └── prisma/
│   │       └── schema.prisma # Database schema
│   │
│   ├── web/           # Next.js dashboard
│   │   ├── app/              # App router pages
│   │   │   ├── admin/        # Admin dashboard
│   │   │   ├── dashboard/    # Main dashboard
│   │   │   ├── login/        # Auth pages
│   │   │   └── register/
│   │   ├── components/       # React components
│   │   ├── e2e/             # Playwright tests
│   │   └── services/        # API client
│   │
│   └── mobile/        # Expo React Native app
│       ├── app/             # Expo Router screens
│       ├── components/      # Mobile components
│       └── services/        # Mobile API client
│
└── packages/
    ├── shared/        # Shared types & utilities
    └── docs/          # Documentation
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (or Neon.tech)
- Redis instance (for caching & queues)
- Stripe account (for billing)

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate --workspace apps/api

# Push database schema
npm run prisma:push --workspace apps/api
```

### Environment Variables

Create `.env` files in `apps/api` and `apps/web`:

**API (.env)**
```env
# Database
DATABASE_URL="postgresql://..."

# Auth
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"

# Redis
REDIS_URL="redis://localhost:6379"

# Stripe
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_..."

# AI
OPENAI_API_KEY="sk-..."

# Email
RESEND_API_KEY="re_..."

# Security
ENCRYPTION_KEY="32-byte-hex-key"

# Social OAuth (per platform)
TWITTER_CLIENT_ID=""
TWITTER_CLIENT_SECRET=""
# ... (Instagram, Facebook, LinkedIn, etc.)

# Optional
SENTRY_DSN=""
API_PORT=4000
```

**Web (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Development

```bash
# Run API server
npm run api:dev

# Run web dashboard
npm run web:dev

# Run mobile app
npm run mobile:dev
```

### Testing

```bash
# API unit tests
npm run test --workspace apps/api

# E2E tests (web)
cd apps/web && npx playwright test

# E2E tests (mobile with Detox)
cd apps/mobile
npm run build:e2e:ios    # Build for iOS
npm run test:e2e:ios     # Run iOS tests
npm run build:e2e:android # Build for Android
npm run test:e2e:android  # Run Android tests
```

## API Documentation

When running the API, Swagger documentation is available at:
- **Local**: http://localhost:4000/api/docs
- **Production**: https://your-api.com/api/docs

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | User registration |
| `/auth/login` | POST | User authentication |
| `/tenants` | GET/POST | Tenant management |
| `/campaigns` | GET/POST | Campaign CRUD |
| `/content` | GET/POST | Content management |
| `/approvals/:id/approve` | POST | Approve content |
| `/social/connections` | GET/POST | Social accounts |
| `/social/publish/:contentId` | POST | Publish content |
| `/analytics/metrics/:contentId` | GET | Content metrics |
| `/billing/checkout` | POST | Create checkout |
| `/admin/*` | * | Admin operations |

## Deployment

### Vercel (Web)

```bash
vercel --prod
```

### API

The API can be deployed to any Node.js hosting (Railway, Render, AWS, etc.):

```bash
npm run api:build
npm run api:start
```

### Environment Setup

Ensure all environment variables are set in your deployment platform.

## Database Indexes

The schema includes performance indexes for:
- Foreign key relationships
- Status/state columns
- Timestamp columns (createdAt, scheduledFor)
- Frequently queried fields

## Rate Limiting

| Endpoint Type | Limit |
|--------------|-------|
| Global | 100 req/min |
| Auth (login/register) | 5-10 req/min |
| Admin operations | 30 req/min |
| Sensitive admin (delete/impersonate) | 3-10 req/min |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

Proprietary - All rights reserved

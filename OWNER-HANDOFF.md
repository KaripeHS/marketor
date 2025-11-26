# Owner Handoff - Configuration Checklist

This document lists all environment variables, API keys, and configurations you need to set up before launching GrowthPilot in production.

## Required for Core Functionality

### Database
| Variable | Description | Required | How to Get |
|----------|-------------|----------|------------|
| `DATABASE_URL` | PostgreSQL connection string | **Yes** | Neon, Supabase, or any PostgreSQL provider |

### Authentication
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `JWT_SECRET` | Secret key for JWT signing | **Yes** | Generate with `openssl rand -base64 32` |

---

## Optional - Enhanced Features

### Email Notifications (Resend)
| Variable | Description | Required | How to Get |
|----------|-------------|----------|------------|
| `RESEND_API_KEY` | Resend API key for transactional emails | No | [resend.com/api-keys](https://resend.com/api-keys) |
| `EMAIL_FROM` | Sender email address | No | Default: `GrowthPilot <noreply@growthpilot.io>` |
| `APP_URL` | Base URL for links in emails | No | Default: `http://localhost:3000` |

### Media Storage (Vercel Blob)
| Variable | Description | Required | How to Get |
|----------|-------------|----------|------------|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token | No | Vercel Dashboard > Storage > Blob |

### Queue System (BullMQ/Redis)
| Variable | Description | Required | How to Get |
|----------|-------------|----------|------------|
| `REDIS_URL` | Redis connection string | No | Upstash, Redis Cloud, or self-hosted |

### Token Encryption
| Variable | Description | Required | How to Get |
|----------|-------------|----------|------------|
| `TOKEN_ENCRYPTION_KEY` | 64 hex chars for AES-256-GCM | No | Generate with `openssl rand -hex 32` |

### Error Monitoring (Sentry)
| Variable | Description | Required | How to Get |
|----------|-------------|----------|------------|
| `SENTRY_DSN` | Sentry DSN for API | No | [sentry.io](https://sentry.io) project settings |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for Web | No | Same project or separate frontend project |

### AI Features (OpenAI)
| Variable | Description | Required | How to Get |
|----------|-------------|----------|------------|
| `OPENAI_API_KEY` | OpenAI API key | No | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |

---

## Billing (Stripe)

| Variable | Description | Required | How to Get |
|----------|-------------|----------|------------|
| `STRIPE_SECRET_KEY` | Stripe secret key | No | [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (frontend) | No | Same page as above |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | No | Create webhook endpoint in Stripe Dashboard |

### Stripe Setup Steps
1. Create products in Stripe for each plan (Starter, Professional, Agency)
2. Create prices for monthly and yearly billing
3. Update `PlanDefinition` records with `stripePriceId` and `stripeProductId`
4. Create webhook endpoint pointing to `https://your-api.com/billing/webhook`
5. Enable these webhook events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

---

## Social Platform OAuth Credentials

### TikTok
| Variable | Description | How to Get |
|----------|-------------|------------|
| `TIKTOK_CLIENT_KEY` | TikTok app client key | [developers.tiktok.com](https://developers.tiktok.com) |
| `TIKTOK_CLIENT_SECRET` | TikTok app client secret | Same portal |
| `TIKTOK_REDIRECT_URI` | OAuth callback URL | `https://your-api.com/social/oauth/tiktok/callback` |

### Instagram/Facebook
| Variable | Description | How to Get |
|----------|-------------|------------|
| `INSTAGRAM_CLIENT_ID` | Instagram app ID | [developers.facebook.com](https://developers.facebook.com) |
| `INSTAGRAM_CLIENT_SECRET` | Instagram app secret | Same portal |
| `FACEBOOK_APP_ID` | Facebook app ID | Same portal |
| `FACEBOOK_APP_SECRET` | Facebook app secret | Same portal |

### YouTube/Google
| Variable | Description | How to Get |
|----------|-------------|------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Same console |
| `YOUTUBE_REDIRECT_URI` | OAuth callback URL | `https://your-api.com/social/oauth/youtube/callback` |

### API URLs
| Variable | Description | Example |
|----------|-------------|---------|
| `API_URL` | Backend API base URL | `https://api.growthpilot.io` |
| `WEB_APP_URL` | Frontend app URL | `https://app.growthpilot.io` |

---

## Quick Start - Minimum Required

For a basic working setup, you only need:

```bash
# .env file
DATABASE_URL="postgresql://user:pass@host/db"
JWT_SECRET="your-32-char-secret-here"
```

## Recommended for Production

```bash
# Core
DATABASE_URL="postgresql://..."
JWT_SECRET="..."

# Email
RESEND_API_KEY="re_..."
EMAIL_FROM="GrowthPilot <noreply@yourdomain.com>"
APP_URL="https://app.yourdomain.com"

# Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_..."

# Queue (for scheduled posts)
REDIS_URL="redis://..."

# Security
TOKEN_ENCRYPTION_KEY="64-hex-chars..."

# Monitoring
SENTRY_DSN="https://..."
NEXT_PUBLIC_SENTRY_DSN="https://..."

# AI
OPENAI_API_KEY="sk-..."

# Billing
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

---

## Vercel Environment Variables

Add all production variables to your Vercel project:
1. Go to Vercel Dashboard > Project Settings > Environment Variables
2. Add each variable for the appropriate environment (Production, Preview, Development)
3. Redeploy to apply changes

---

## Checklist

### Before Soft Launch
- [ ] DATABASE_URL configured
- [ ] JWT_SECRET set (unique, secure)
- [ ] Basic deployment working

### Before Public Launch
- [ ] RESEND_API_KEY for email notifications
- [ ] BLOB_READ_WRITE_TOKEN for media uploads
- [ ] SENTRY_DSN for error tracking
- [ ] REDIS_URL for background jobs
- [ ] TOKEN_ENCRYPTION_KEY for secure token storage

### Before Paid Plans
- [ ] STRIPE_SECRET_KEY configured
- [ ] Stripe products/prices created
- [ ] Webhook endpoint verified
- [ ] Test subscription flow end-to-end

### Before Social Integrations
- [ ] TikTok app approved
- [ ] Facebook/Instagram app reviewed
- [ ] YouTube API enabled
- [ ] All OAuth redirect URIs configured

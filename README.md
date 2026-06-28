# CreditMap

Alternative credit scoring for unbanked and thin-file Indians. Users self-report income, bill payments, and UPI/cash transactions; the platform computes a 300–850 score and surfaces matched microfinance and personal loan products.

> **Demo project.** The scoring algorithm is a simplified heuristic — not a licensed credit bureau product. See [Demo Limitations](#demo-limitations).

[![CI](https://github.com/aaditxndxlkar/CreditMap/actions/workflows/ci.yml/badge.svg)](https://github.com/aaditxndxlkar/CreditMap/actions/workflows/ci.yml)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│  Next.js 15 App Router  (localhost:3000)                        │
│  · Auth context + JWT in localStorage                           │
│  · Dashboard, Score, Loans, Documents, Notifications, Admin     │
└───────────────────────┬─────────────────────────────────────────┘
                        │ REST / JSON
┌───────────────────────▼─────────────────────────────────────────┐
│  NestJS 10  (localhost:3001)                                    │
│  · JWT global guard + @Public() opt-out                         │
│  · Modules: Auth, Users, Profile, Income, Bills, Transactions,  │
│             Documents, Scores, Loans, Notifications, Admin      │
└──────┬──────────────────────────────┬───────────────────────────┘
       │ TypeORM                      │ Bull v4
┌──────▼──────────┐          ┌────────▼────────────────────────────┐
│  PostgreSQL 16  │          │  Redis 7  (queue)                   │
│  (localhost:5432│          │  score-recompute jobs               │
│   via Docker)   │          │  → ScoreRecomputeProcessor          │
└─────────────────┘          │    calls ScoringEngineService       │
                             │    .computeAndSave(userId)          │
                             └─────────────────────────────────────┘
```

---

## Tech Stack

| Layer       | Technology                                                    |
|-------------|---------------------------------------------------------------|
| Frontend    | Next.js 15, TypeScript 5, Tailwind CSS, shadcn/ui, Recharts  |
| Backend     | NestJS 10, TypeORM, PostgreSQL 16, Redis 7, Bull v4          |
| Auth        | JWT (access token), bcrypt, global JwtAuthGuard              |
| File upload | AWS S3 (presigned PUT), stored as `Document` records         |
| Tooling     | pnpm workspaces, Docker Compose, ESLint, Prettier, Husky     |
| CI          | GitHub Actions (typecheck + tests on push, builds on PR)     |

---

## Local Setup

### Prerequisites

- Node.js >= 22
- pnpm >= 9
- Docker & Docker Compose

### Steps

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file and fill in values (see .env.example)
cp .env.example .env

# 3. Start Postgres + Redis
pnpm docker:up

# 4. Seed reference data (loan products + demo users)
pnpm --filter @creditmap/api seed:all

# 5. Start API and web in parallel
pnpm dev
```

### Development URLs

| Service          | URL                        |
|------------------|----------------------------|
| Frontend         | http://localhost:3000       |
| Backend API      | http://localhost:3001       |
| API Swagger docs | http://localhost:3001/api   |
| pgAdmin          | http://localhost:5050       |
| Redis Commander  | http://localhost:8081       |

### Docker commands

```bash
pnpm docker:up      # Start Postgres + Redis (+ optional tools)
pnpm docker:down    # Stop containers
pnpm docker:logs    # Stream container logs
pnpm docker:reset   # Wipe volumes and restart (destructive)

# Dev tools (pgAdmin + Redis Commander)
docker compose --profile tools up -d
```

### Useful scripts

```bash
pnpm dev              # Start all apps in watch mode
pnpm build            # Build all apps
pnpm typecheck        # Type-check all packages
pnpm lint             # Lint all packages
pnpm format           # Format all files with Prettier

pnpm --filter @creditmap/api test        # Run unit tests
pnpm --filter @creditmap/api seed:loans  # Seed 10 loan products
pnpm --filter @creditmap/api seed:demo   # Seed 5 demo users + compute scores
pnpm --filter @creditmap/api seed:all    # Both in sequence
```

---

## Demo Credentials

| Role  | Email                      | Password    | Score | Tier      |
|-------|----------------------------|-------------|-------|-----------|
| User  | meera@demo.creditmap.in    | Demo@1234   | ~355  | Poor      |
| User  | ahmed@demo.creditmap.in    | Demo@1234   | ~617  | Fair      |
| User  | raju@demo.creditmap.in     | Demo@1234   | ~731  | Very Good |
| User  | sunita@demo.creditmap.in   | Demo@1234   | ~810  | Excellent |
| Admin | admin@creditmap.in         | Admin@1234  | —     | (no score)|

> Scores shown above are computed from the demo seed data. Re-running `seed:demo` is idempotent — it skips existing users and recomputes their scores.

---

## Scoring Methodology

Scores range from **300** (minimum, no data) to **850** (maximum). The formula is:

```
totalScore = 300 + round((weightedScore / 100) × 550)
```

Five components are combined with fixed weights:

| Component        | Weight | What it measures                                              |
|------------------|--------|---------------------------------------------------------------|
| Income Score     | 25 %   | Consistency (months covered), regularity, average level       |
| Bill Payment     | 30 %   | On-time rate, payment rate, variety of bill types             |
| Cash Flow        | 20 %   | Net flow positivity, digital payment share, channel variety   |
| Profile          | 15 %   | Bank account, UPI, Jan Dhan, occupation type, completeness    |
| Data Richness    | 10 %   | Volume of income records, bills, and transactions supplied    |

### Income Score (0–100)

| Factor                             | Max pts |
|------------------------------------|---------|
| Months of data (n / 12)            | 40      |
| % of months flagged as regular     | 35      |
| Average monthly income level       | 25      |

Income level bands: < ₹5 k → 5 pts, ₹5–10 k → 10, ₹10–15 k → 12, ₹15–30 k → 15, ₹30–50 k → 20, ≥ ₹50 k → 25.

### Bill Payment Score (0–100)

| Factor                             | Max pts |
|------------------------------------|---------|
| On-time payment rate               | 50      |
| Overall payment rate               | 30      |
| Variety of bill types (out of 5)   | 20      |

Returns 0 if no bills are recorded.

### Cash Flow Score (0–100)

| Factor                                         | Max pts |
|------------------------------------------------|---------|
| Net flow ratio (credits − debits) / credits    | 40      |
| Digital transaction share (UPI/NEFT/IMPS/bank) | 40      |
| Number of distinct digital channels (out of 4) | 20      |

### Profile Score (0–100)

| Factor                            | Max pts |
|-----------------------------------|---------|
| Has bank account                  | 25      |
| Has UPI                           | 20      |
| Has Jan Dhan account              | 15      |
| Occupation type                   | 5–25    |
| Profile completeness (5 fields)   | 15      |

Occupation points: salaried 25, self-employed 20, gig/freelance 15, student/farm/daily-wage 5–10.  
Returns 0 if no profile row exists.

### Data Richness Score (0–100)

| Factor                           | Max pts |
|----------------------------------|---------|
| Income months (capped at 6)      | 35      |
| Bill records (capped at 6)       | 35      |
| Transaction records (capped at 12)| 30     |

---

## Score Tiers

| Tier      | Range   |
|-----------|---------|
| Poor      | 300–549 |
| Fair      | 550–649 |
| Good      | 650–699 |
| Very Good | 700–749 |
| Excellent | 750–850 |

---

## API Overview

All endpoints require `Authorization: Bearer <token>` unless marked public.

| Method | Path                                  | Description                        |
|--------|---------------------------------------|------------------------------------|
| POST   | /auth/register ⬡                    | Register new user                  |
| POST   | /auth/login ⬡                       | Login, receive JWT                 |
| GET    | /auth/me                              | Current user                       |
| GET/PUT| /profile                              | Get / upsert profile               |
| POST   | /income                               | Add income record                  |
| GET    | /income                               | List income records                |
| POST   | /bills                                | Add bill payment                   |
| GET    | /bills                                | List bill payments                 |
| POST   | /transactions                         | Add transaction                    |
| GET    | /transactions                         | List transactions                  |
| GET    | /scores/latest                        | Latest credit score                |
| GET    | /scores/history                       | Score history                      |
| POST   | /scores/recompute                     | Enqueue recomputation job          |
| GET    | /documents/upload-url                 | Get S3 presigned upload URL        |
| POST   | /documents                            | Register uploaded document         |
| GET    | /loans/products                       | Matched loan products for user     |
| GET    | /notifications                        | Paginated notifications            |
| GET    | /notifications/unread-count           | Unread notification count          |
| PATCH  | /notifications/:id/read               | Mark notification read             |
| PATCH  | /notifications/read-all               | Mark all notifications read        |
| GET    | /admin/stats ★                       | Platform-wide stats                |
| GET    | /admin/users ★                       | Paginated user list with filters   |
| GET    | /admin/users/:id ★                   | User detail with all data          |
| PATCH  | /admin/users/:id/verify-document ★   | Verify a user's document           |

⬡ = public (no auth)  ★ = admin role required

Full Swagger docs: `http://localhost:3001/api`

---

## CI / CD

| Trigger              | Jobs                                                    |
|----------------------|---------------------------------------------------------|
| Push (any branch)    | typecheck-api, test-api, typecheck-web (parallel)       |
| PR → main/master     | Above 3 + build-api (after typecheck+test), build-web  |

Builds are gated on PRs only — no point burning minutes on build artifacts for feature branch pushes.

---

## Demo Limitations

This is a portfolio/demo project. The following capabilities are **not** implemented:

| Area                   | Reality                                                                |
|------------------------|------------------------------------------------------------------------|
| Credit bureau data     | No CIBIL/Experian/CRIF integration — all data is self-reported         |
| Bank account linking   | No Account Aggregator (AA) or OCEN integration                         |
| UPI transaction pull   | Transactions are manually entered, not fetched from a bank             |
| KYC / Aadhaar          | No DigiLocker, eSign, or Aadhaar OTP verification                     |
| Document verification  | Admin can mark docs "verified" — no OCR or third-party check          |
| Notifications          | In-app only (polled every 60 s) — no SMS, push, or WhatsApp           |
| Loan application       | Products are displayed with external URLs — no in-platform apply flow |
| Score regulation       | The algorithm is a demo heuristic — not a licensed scoring model       |
| Multi-tenancy / SLAs   | Single-instance, no rate limiting beyond NestJS defaults               |

The scoring algorithm is open-source and visible in `apps/api/src/modules/scores/scoring-engine.service.ts`. Unit tests for the pure `compute()` function are in `scoring-engine.service.spec.ts`.

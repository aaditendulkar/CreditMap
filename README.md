# CreditMap

A production-grade credit mapping platform built as a pnpm monorepo.

## Tech Stack

| Layer     | Technology                          |
| --------- | ----------------------------------- |
| Frontend  | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui |
| Backend   | NestJS, TypeORM, PostgreSQL, Redis, BullMQ |
| Tooling   | pnpm workspaces, Docker Compose, ESLint, Prettier, Husky |

## Project Structure

```
creditmap/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js 15 frontend
├── packages/
│   ├── types/        # Shared TypeScript types
│   └── utils/        # Shared utilities
├── docker/
│   └── postgres/     # DB init scripts
├── docker-compose.yml
├── .env.example
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env file
cp .env.example .env

# 3. Start infrastructure
pnpm docker:up

# 4. Start dev servers
pnpm dev
```

### Development URLs

| Service        | URL                         |
| -------------- | --------------------------- |
| Frontend       | http://localhost:3000        |
| Backend API    | http://localhost:3001        |
| pgAdmin        | http://localhost:5050        |
| Redis Commander| http://localhost:8081        |

### Docker Commands

```bash
pnpm docker:up       # Start all services
pnpm docker:down     # Stop all services
pnpm docker:logs     # Stream logs
pnpm docker:reset    # Wipe volumes and restart
```

### Dev Tools (optional profile)

```bash
docker compose --profile tools up -d   # Starts pgAdmin + Redis Commander
```

## Scripts

```bash
pnpm dev             # Start all apps in parallel
pnpm build           # Build all apps
pnpm lint            # Lint all packages
pnpm format          # Format all files
pnpm typecheck       # Type-check all packages
```

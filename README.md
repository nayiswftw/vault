# Finance Backend API

Production-focused NestJS backend for financial record processing, role-based access control, and dashboard analytics.

## What This Service Provides

- JWT authentication and authenticated profile endpoint
- User lifecycle management (create, list, get by id, update, delete)
- Role-based authorization (viewer, analyst, admin)
- Active or inactive user enforcement
- Financial records CRUD with filtering and cursor pagination
- CSV export for filtered records
- Audit log tracking and admin query endpoint
- Dashboard summary aggregation (income, expenses, net, category splits, monthly trends, recent activity)
- PostgreSQL persistence through Prisma
- Swagger/OpenAPI docs
- Health and readiness probes
- Global request validation, security headers, and request throttling

## Tech Stack

- Node.js + TypeScript
- NestJS 11
- Prisma ORM + PostgreSQL
- Passport JWT
- class-validator + class-transformer
- Helmet
- NestJS Throttler
- Jest + Supertest

## Runtime Requirements

- Node.js 20.19+ (required by Prisma 7)
- pnpm 9+
- PostgreSQL 14+

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Generate Prisma client:

```bash
pnpm run prisma:generate
```

4. Sync schema to database:

```bash
pnpm run prisma:db:push
```

5. Seed baseline users:

```bash
pnpm run prisma:seed
```

6. Start locally:

```bash
pnpm run start:dev
```

One-command DB bootstrap:

```bash
pnpm run db:setup
```

## Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | Runtime mode |
| `PORT` | No | `3000` | HTTP port |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `JWT_SECRET` | Yes | - | JWT signing secret (minimum 32 chars) |
| `JWT_EXPIRES_IN` | No | `1h` | JWT expiry (`3600`, `30m`, `24h`, etc.) |
| `CORS_ORIGIN` | No | `*` | Comma-separated allowed origins or `*` |
| `THROTTLE_TTL_MS` | No | `60000` | Throttle window in milliseconds |
| `THROTTLE_LIMIT` | No | `100` | Allowed requests per throttle window |
| `SEED_ADMIN_EMAIL` | No | `admin@company.com` | Admin seed user email |
| `SEED_ADMIN_PASSWORD` | No | `Admin123!` | Admin seed user password |
| `SEED_ANALYST_EMAIL` | No | `analyst@company.com` | Analyst seed user email |
| `SEED_ANALYST_PASSWORD` | No | `Analyst123!` | Analyst seed user password |
| `SEED_VIEWER_EMAIL` | No | `viewer@company.com` | Viewer seed user email |
| `SEED_VIEWER_PASSWORD` | No | `Viewer123!` | Viewer seed user password |

## Security and Reliability Defaults

- Global input validation with whitelist enforcement
- Unknown request properties rejected
- JWT auth required for protected routes
- Inactive users blocked at sign-in and token validation
- Role checks enforced with `@Roles(...)` and `RolesGuard`
- Helmet security headers enabled
- Global request throttling enabled
- Readiness endpoint checks DB connectivity

## API Documentation and Probes

- Swagger UI: `GET /docs`
- OpenAPI JSON: `GET /docs/json`
- Liveness: `GET /health`
- Readiness: `GET /ready`

## Access Matrix

| Endpoint | Viewer | Analyst | Admin |
| --- | --- | --- | --- |
| `POST /auth/login` | Yes (public) | Yes (public) | Yes (public) |
| `GET /auth/profile` | Yes | Yes | Yes |
| `GET /health` | Yes (public) | Yes (public) | Yes (public) |
| `GET /ready` | Yes (public) | Yes (public) | Yes (public) |
| `GET /users/me` | Yes | Yes | Yes |
| `GET /users` | No | No | Yes |
| `GET /users/:id` | No | No | Yes |
| `POST /users` | No | No | Yes |
| `PATCH /users/:id` | No | No | Yes |
| `DELETE /users/:id` | No | No | Yes |
| `POST /records` | No | No | Yes |
| `GET /records` | No | Yes | Yes |
| `GET /records/export` | No | Yes | Yes |
| `GET /records/:id` | No | Yes | Yes |
| `PATCH /records/:id` | No | No | Yes |
| `DELETE /records/:id` | No | No | Yes |
| `GET /audit-logs` | No | No | Yes |
| `GET /dashboard/summary` | Yes | Yes | Yes |

## Testing

Run unit tests:

```bash
pnpm run test
```

Run e2e tests:

```bash
pnpm run test:e2e
```

Run both:

```bash
pnpm run test:all
```

Run lint and apply safe autofixes:

```bash
pnpm run lint
```

## Seed Strategy

The seed script is idempotent:

- It upserts three baseline users (admin, analyst, viewer)
- Existing records are updated by email instead of duplicated
- Emails are normalized to lowercase before upsert
- Password hashes are regenerated from configured seed passwords

File: `prisma/seed.ts`

## Operational Notes

- Replace all default seed credentials before non-local deployment
- Use strong JWT secrets and scoped CORS origins outside local development
- Keep migration history in version control and run deploy migrations in CI/CD
- Prefer `prisma:migrate:deploy` in non-development environments

## Project Structure

- `src/auth`: authentication and token issuance
- `src/audit`: audit log querying endpoints for administrators
- `src/users`: user management and account state
- `src/records`: financial records CRUD and filters
- `src/dashboard`: aggregated analytics endpoints
- `src/common`: shared decorators, enums, guards, interfaces
- `src/prisma`: Prisma client lifecycle module and service
- `prisma/schema.prisma`: database models and enums
- `prisma/migrations`: migration history (optional in this repo until migrations are introduced)
- `prisma/seed.ts`: baseline data seed script

## Current Scope and Next Enhancements

Current implementation focuses on a reliable, single-service backend with clear authorization boundaries and data validation.

Potential next steps for enterprise deployment:

- Structured logging and request correlation IDs
- Metrics and tracing export (OpenTelemetry)
- Refresh token flow and token revocation strategy
- Backup/restore runbook and disaster recovery checks
- CI pipeline gates for migration safety and smoke tests

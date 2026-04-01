# Vault API

![NestJS](https://img.shields.io/badge/nestjs-E0234E?style=for-the-badge&logo=nestjs&logoColor=white) 
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white) 
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white) 
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white) 

**Vault** is a backend REST API designed for centralized financial management. Built with robust enterprise accounting principles, it provides ledgering services utilizing Role-Based Access Control (RBAC), secure Session Management, untamperable audit logging, and aggregated reporting mechanisms.

---

## 🚀 Features & Core Capabilities

- **Secure Authentication Layer:** Hybrid approach using short-lived stateless JWT access tokens paired with stateful, database-backed refresh tokens for remote device session revocation.
- **Granular RBAC:** Tiered access limits (`ADMIN`, `ANALYST`, `VIEWER`) securely enforced at the controller level via custom NestJS guards.
- **Immutable Audit Trails:** Automatic database-level tracking of all mutating actions (recording who changed what, action types `CREATE`/`UPDATE`/`DELETE`, with full JSON state diffs).
- **Financial Ledgering:** Core CRUD for income and expenses, ensuring soft-deletion to maintain historical accuracy.
- **Analytics & Dashboarding:** Read-only aggregations for front-end charts displaying net balances, category breakdowns, and monthly trends, optimized with in-memory caching.
- **Robust Exception Handling & Observability:** Global logging and timeout interceptors (5000ms limitation), unified HTTP exception formatting, and rate limiting against brute force attempts.

---

## 🛠️ Architecture

The project adheres to a Domain-Driven Design (DDD) methodology with strictly isolated modules:

- **`auth/`**: Authentication controllers, secure token rotation, hashing (bcryptjs), and session invalidation logics.
- **`users/`**: Identity and role management, handling user active/inactive statuses.
- **`records/`**: The core ledger domain maintaining business records. Responsible for parsing `income` vs. `expense` records and streaming paginated CSV exports.
- **`dashboard/`**: Aggregator service executing heavy calculations (totals, breakdowns, trends) for visual reporting. Uses `@nestjs/cache-manager`.
- **`audit/`**: Read-only tracking module that exposes the system's `audit_logs` table cleanly to Administrators.
- **`common/`**: Reusable infrastructure like decorators (`@CurrentUser`, `@Roles`), generalized guards, and interceptors.

---

## ⚙️ Setup Process & Deployment

### Prerequisites
- **Node.js**: Version `18` or higher
- **Package Manager**: `pnpm`
- **Database**: PostgreSQL (running locally, via Docker, or Neon DB)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Environment Configuration
Copy the sample environment variable file to create your local `.env`:
```bash
cp .env.example .env
```
Ensure required variables are populated correctly:
```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/finance_dashboard?sslmode=verify-full"

# Highly sensitive security keys
JWT_SECRET="change_this_to_a_long_random_secret_at_least_32_chars"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# Rate Limiting
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=100
```
*(Optional)* Define default seeding credentials via `SEED_ADMIN_EMAIL`, `SEED_ANALYST_EMAIL`, etc.

### 3. Database Initialization & Seeding
Push the Prisma schema to your PostgreSQL database, generate the strictly-typed client, and seed the initial users:
```bash
pnpm run db:setup
```
*Note: By default, this seeds three users: `admin@company.com`, `analyst@company.com`, and `viewer@company.com` (Passwords: `[Role]123!`).*

### 4. Run the Application
Start the development server with live reload:
```bash
pnpm run start:dev
```

---

## 📡 API Overview & Documentation

The API supports a fully interactive **Swagger OpenAPI Interface**. When running the application locally, visit:
**[`http://localhost:3000/docs`](http://localhost:3000/docs)**

Additionally, a pre-configured **Postman Collection** is available in the `postman/` directory (`postman/collections.json`). You can import this directly into Postman to explore and test all available endpoints with predefined request payloads and environmental variables across different RBAC roles.

### Key Endpoint Groups

#### Root / System
- `GET /health` : Liveness probe.
- `GET /ready` : Readiness probe (ensures DB connection is active).

#### Auth (`/auth`)
- `POST /auth/login` : Issue short-lived Access Token & long-lived Refresh Token.
- `POST /auth/refresh` : Rotate refresh tokens securely.
- `POST /auth/logout` : Safely revoke the current refresh token session.
- `GET /auth/sessions` : View active login sessions across devices.
- `DELETE /auth/sessions/:id` / `POST /auth/sessions/revoke-all` : Terminate specific or all account sessions.

#### Ledger Records (`/records`) [RBAC Restrained]
- `GET /records` : Paginated fetch of financial records (Cursor-based).
- `POST /records` : Add an Income/Expense. (Admin Only)
- `PATCH /records/:id` / `DELETE /records/:id`: Mutate records. (Admin Only)
- `GET /records/export` : Download a generated `.csv` sheet of queried records.

#### Dashboard & Analytics (`/dashboard`)
- `GET /dashboard/summary` : Aggregated response containing net balances, recent activity, and historical monthly trends. Data is cached for 60 seconds to protect database resources.

#### Auditing (`/audit-logs`)
- `GET /audit-logs` : Cursor-paginated trail of all system mutations. (Admin Only)

---

## 🛡️ Role-Based Access Control (RBAC)

The system utilizes predefined roles to segment access strictly:

1. **`ADMIN`**: Complete system access. Capable of user management (`/users`), writing/mutating ledger records, and inspecting `/audit-logs`.
2. **`ANALYST`**: Intermediate access. Capable of globally querying ledger records (`/records`), generating CSV exports, and viewing the `/dashboard`. Restricted from mutations.
3. **`VIEWER`**: Heavily restricted read-only state. Limited strictly to hitting the `/dashboard/summary` aggregations and viewing their logged-in profile.

---

## ⚖️ Assumptions & Tradeoffs

- **Stateful Refresh Tokens vs. Stateless JWT:**
  - *Decision:* Opted for a hybrid approach (Stateless Access JWTs + Stateful DB-backed Refresh Tokens).
  - *Tradeoff:* Increases database overhead slightly on token rotation. However, it ensures enterprise-level security by allowing the immediate invalidation of hijacked sessions, a capability lost in pure stateless JWT setups.
- **Relational Integrity is Paramount:**
  - *Decision:* Hard requirement for PostgreSQL over NoSQL.
  - *Reasoning:* Financial applications demand ACID compliance, complex relational rollups (ledger aggregations), and static table structures.
- **Cursor-Based Pagination for Data Feeds:**
  - *Decision:* Used `skip/take` with `cursor` tracking instead of standard `LIMIT`/`OFFSET` for the Records array.
  - *Reasoning:* `OFFSET` behaves poorly at massive scales (e.g. 50,000+ ledger entities). Cursor pagination scales identically regardless of table depth.
- **Monolithic Architecture vs Microservices:**
  - *Decision:* Centralized Monolith built with DDD logic boundaries.
  - *Tradeoff:* We combined Auth, Analytics, and ledger logging together instead of splitting them up contextually (e.g. via gRPC or message queues). This massively accelerates velocity and minimizes dev-ops load without compromising the ability to split folders logically into their own services down the line if horizontal scalability demands it.
- **Soft Deletions:**
  - *Decision:* A `deletedAt` table column limits row visibility globally.
  - *Reasoning:* Ledger events are financial history. True row deletion is destructive; hiding the data and capturing the event via the `audit_logs` ensures an uncorrupted paper trail.

---

## 🧪 Testing

The codebase relies heavily on robust integration capabilities, utilizing Jest alongside Supertest to establish automated end-to-end verifications spanning all application tiers.

To invoke the End-to-End suite:
```bash
pnpm run test:e2e
```
Coverage entails authentication rotation lifecycles, role-based boundary validations, validation pipe rejection criteria, pagination constraints, and end-to-end CRUD persistence checking.

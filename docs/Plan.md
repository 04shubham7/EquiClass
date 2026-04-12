# ClassSwap - Architecture & Development Plan

## 1) Product Vision
ClassSwap is a MERN-stack web app + PWA for university professors to manage class cover obligations, trade coverage fairly, and maintain a transparent ledger of who owes whom classes.

Primary goals:
- Prevent scheduling conflicts before coverage is accepted.
- Maintain a tamper-resistant, auditable ledger of class debt.
- Provide fast, mobile-friendly workflows for urgent leave scenarios.

## 2) Core Domain Concepts
- User (Professor): Authenticated account with profile and role metadata.
- Timetable: Weekly availability and teaching slots for each professor.
- Coverage Request: A request from requester (Prof A) to coverer (Prof B) for a specific class occurrence.
- Ledger Transaction: Immutable record of debt movement after fulfillment.
- Net Balance: Computed view of pairwise debt (A owes B = N classes).

## 3) High-Level Architecture
- Frontend: React + Vite + TypeScript, PWA enabled via vite-plugin-pwa.
- Backend: Node.js + Express + TypeScript.
- Database: MongoDB + Mongoose.
- Auth: Custom JWT (access + refresh token strategy).
- Real-time/Notifications (phase 2): Socket.IO or Web Push.

Data flow:
1. User authenticates and receives tokens.
2. User submits/updates weekly timetable.
3. Requester creates coverage request for a specific class slot.
4. Backend validates coverer availability and conflict rules.
5. Coverer accepts or declines.
6. On accept, system creates ledger transaction and updates request state atomically.

## 4) Database Schema Design

### 4.1 users collection
Purpose: Identity, authentication, and professor profile.

Fields:
- _id: ObjectId
- email: string (unique, indexed, lowercase)
- passwordHash: string
- fullName: string
- department: string
- employeeCode: string (optional, unique sparse)
- roles: string[] (default ["professor"])
- isActive: boolean (default true)
- onboardingCompleted: boolean (default false)
- timezone: string (default "UTC")
- createdAt: Date
- updatedAt: Date
- lastLoginAt: Date (optional)

Indexes:
- unique(email)
- unique(employeeCode, sparse)
- index(department)

Validation notes:
- Enforce institutional email format if needed (e.g., *@university.edu).
- Use strong password policy + Argon2 or bcrypt hashing.

### 4.2 timetables collection
Purpose: Weekly recurring schedule and availability per professor.

Recommended model: one timetable document per user + academic term.

Fields:
- _id: ObjectId
- userId: ObjectId (ref users, indexed)
- termId: string (e.g., "2026-Spring", indexed)
- weeklySlots: [
  {
    dayOfWeek: number (0-6),
    startTime: string ("HH:mm"),
    endTime: string ("HH:mm"),
    type: "teaching" | "busy" | "free" | "office",
    courseCode: string (optional),
    room: string (optional),
    recurrenceRule: string (optional)
  }
]
- exceptions: [
  {
    date: string (YYYY-MM-DD),
    startTime: string,
    endTime: string,
    type: "override_busy" | "override_free" | "cancelled_class",
    note: string
  }
]
- createdAt: Date
- updatedAt: Date

Indexes:
- unique(userId, termId)
- index(userId, updatedAt)

Conflict-check strategy:
- Convert target class datetime to professor local timezone.
- Check exceptions first (specific date overrides recurring pattern).
- Then check weeklySlots overlap where type implies not available.

### 4.3 requests collection
Purpose: Lifecycle of class coverage requests.

Fields:
- _id: ObjectId
- requesterId: ObjectId (Prof A, ref users, indexed)
- covererId: ObjectId (Prof B, ref users, indexed)
- termId: string (indexed)
- classEvent: {
  date: string (YYYY-MM-DD),
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  courseCode: string,
  room: string,
  department: string
}
- status: "pending" | "accepted" | "declined" | "cancelled" | "expired"
- reason: string (optional)
- requesterComment: string (optional)
- covererComment: string (optional)
- availabilitySnapshot: {
  checkedAt: Date,
  isCovererFree: boolean,
  conflictDetails: string[]
}
- respondedAt: Date (optional)
- expiresAt: Date (optional)
- createdAt: Date
- updatedAt: Date

Indexes:
- index(requesterId, status, createdAt)
- index(covererId, status, createdAt)
- index(termId, classEvent.date)
- index(status, expiresAt)

Business rules:
- requesterId != covererId
- Cannot create request in the past.
- Must be pending to accept/decline.
- On accept, re-check availability (prevent race conditions).

### 4.4 ledgerTransactions collection
Purpose: Immutable accounting entries when coverage is fulfilled.

Fields:
- _id: ObjectId
- requestId: ObjectId (ref requests, unique index for idempotency)
- debtorId: ObjectId (who now owes, typically requester Prof A)
- creditorId: ObjectId (who is owed, typically coverer Prof B)
- units: number (default 1)
- unitType: "class"
- termId: string
- classEvent: {
  date: string,
  startTime: string,
  endTime: string,
  courseCode: string
}
- note: string (optional)
- createdBySystem: boolean (default true)
- createdAt: Date

Indexes:
- unique(requestId)
- index(debtorId, creditorId, createdAt)
- index(termId, createdAt)

Immutability:
- Do not update/delete transactions except via admin correction entries.
- Any reversal should create compensating transaction (units: -1 if policy allows), not mutate history.

### 4.5 Optional materialized balances collection (performance optimization)
Purpose: Fast dashboard reads for "who owes whom".

Fields:
- _id: ObjectId
- userAId: ObjectId
- userBId: ObjectId
- netUnitsAtoB: number (positive => A owes B)
- updatedAt: Date

Indexes:
- unique(userAId, userBId)

Alternative:
- Skip this initially and compute balances via aggregation pipeline from ledgerTransactions.

## 5) API and Service Boundaries (Suggested)

Auth:
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- GET /api/auth/me

Timetables:
- GET /api/timetables/me?termId=...
- PUT /api/timetables/me
- POST /api/timetables/me/validate-slot

Requests:
- POST /api/requests
- GET /api/requests/incoming
- GET /api/requests/outgoing
- PATCH /api/requests/:id/accept
- PATCH /api/requests/:id/decline
- PATCH /api/requests/:id/cancel

Ledger:
- GET /api/ledger/me/summary
- GET /api/ledger/me/transactions
- GET /api/ledger/pairwise?withUserId=...

System behavior for accept endpoint:
1. Begin DB transaction/session.
2. Load request (must be pending).
3. Re-run availability check for coverer.
4. If free, set request status=accepted.
5. Insert ledger transaction (requestId unique prevents double write).
6. Commit.

## 6) Tech Stack Configuration

### Frontend (React + Vite + PWA)
- React 19 + TypeScript
- Vite
- State: TanStack Query + lightweight local store (Zustand/Context)
- Routing: React Router
- Forms: React Hook Form + Zod
- UI: Tailwind CSS + component primitives
- Date handling: dayjs or date-fns with timezone plugin
- PWA: vite-plugin-pwa

PWA requirements:
- Manifest: name, short_name, icons, theme_color, background_color, display=standalone.
- Service Worker: precache shell + runtime caching for API GET where safe.
- Offline UX:
  - View cached ledger/timetable snapshots.
  - Queue actions (optional phase 3) for retry when online.
- Installability and responsive UX for mobile and desktop.

### Backend (Node + Express)
- Node.js LTS
- Express + TypeScript
- Validation: Zod/Joi at request boundary
- Auth: jsonwebtoken + rotating refresh tokens
- Password hashing: Argon2 (preferred) or bcrypt
- Security: helmet, cors, express-rate-limit, mongo-sanitize
- Logging: pino
- Testing: Vitest/Jest + Supertest

### Database (MongoDB)
- MongoDB Atlas (recommended)
- Mongoose ODM
- Multi-document transactions (Replica Set required)
- Seed scripts for test timetable/user data

### DevOps / Tooling
- Monorepo (optional): pnpm workspaces (client/server/shared)
- Lint/format: ESLint + Prettier
- Git hooks: lint-staged + Husky
- CI: GitHub Actions (test, lint, build)
- Deployment:
  - Frontend: Vercel/Netlify
  - Backend: Render/Fly.io/Azure
  - DB: MongoDB Atlas

## 7) Security and Compliance Checklist
- Store secrets in environment variables only.
- Use short-lived access token + longer-lived refresh token.
- Hash refresh tokens in DB if persisted.
- Implement role checks for admin endpoints.
- Add request throttling on auth endpoints.
- Validate and sanitize all inputs.
- Implement audit logging for request status changes and ledger writes.
- Enforce HTTPS and secure cookie flags in production.

## 8) Development Roadmap (Step-by-Step)

### Phase 0: Discovery & Domain Finalization
1. Finalize glossary and business rules (debt unit, expiry, reversal policy).
2. Confirm semester/term model and timezone policy.
3. Define acceptance criteria for conflict checking.

Deliverables:
- Product requirements baseline
- Domain rules document

### Phase 1: Project Bootstrap
1. Initialize repository structure:
   - /client (React + Vite + PWA)
   - /server (Express + TS)
   - /shared (types/contracts, optional)
2. Configure linting, formatting, commit hooks, CI.
3. Setup environment configuration and secrets strategy.

Deliverables:
- Running client/server skeleton
- CI passing for lint + test stubs

### Phase 2: Authentication Foundation
1. Implement user schema + registration/login.
2. Add JWT issuance (access + refresh), refresh rotation, logout.
3. Add auth middleware and /me endpoint.
4. Add tests for auth flows and token expiry edge cases.

Deliverables:
- Secure auth module
- Auth API test coverage

### Phase 3: Timetable Onboarding
1. Build timetable schema + CRUD endpoints.
2. Implement onboarding UI wizard for weekly schedule input.
3. Add timetable conflict utility (slot overlap + exceptions).
4. Mark onboardingCompleted once validated timetable saved.

Deliverables:
- Professor onboarding complete path
- Validated timetable persistence

### Phase 4: Request Engine
1. Implement request creation endpoint with initial availability check.
2. Build incoming/outgoing request dashboards.
3. Implement accept/decline/cancel endpoints.
4. On accept, re-check availability and perform atomic state + ledger write.

Deliverables:
- End-to-end request lifecycle
- Idempotent acceptance flow

### Phase 5: Ledger Dashboard
1. Implement ledgerTransactions read APIs.
2. Build summary cards:
   - "You owe"
   - "Owed to you"
   - Pairwise balances
3. Build transaction history with filters by term/date/professor.
4. Optimize using aggregation/materialized balances if needed.

Deliverables:
- Splitwise-like debt transparency dashboard
- Efficient ledger queries

### Phase 6: PWA Hardening + Notifications
1. Add install prompt UX and offline fallback pages.
2. Cache non-sensitive read endpoints and static assets.
3. Add push/in-app notifications for incoming requests/responses.
4. Test mobile installability and background behavior.

Deliverables:
- Production-ready PWA experience
- Near real-time request awareness

### Phase 7: Quality, Security, and Launch
1. Add integration tests for critical flows:
   - create request -> accept -> ledger increment
   - conflict case (coverer busy) -> rejection
2. Perform security audit and dependency checks.
3. Load test key endpoints (requests, ledger summary).
4. Prepare runbooks, monitoring dashboards, and release checklist.

Deliverables:
- Launch candidate
- Operational readiness package

## 9) Critical Edge Cases to Handle Early
- Simultaneous accepts (double-click/race condition).
- Timetable changes after request creation but before acceptance.
- Cross-timezone scheduling near day boundaries.
- Request expiry and stale pending states.
- Duplicate coverage requests for the same class slot.
- Professor deactivation while requests are pending.

## 10) Definition of Done (MVP)
- Professors can register/login securely.
- Professors can input/update timetable via onboarding.
- Coverage request creation validates coverer free time.
- Acceptance atomically increases requester debt by 1 class.
- Ledger dashboard accurately reflects pairwise balances.
- App is installable as a PWA and usable on mobile.

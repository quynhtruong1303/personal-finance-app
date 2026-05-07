# AI Personal Finance Platform — Project Build Plan

> This file is the source of truth for the project. Reference it at the start of every session.
> Generated from a job board skills survey + architecture planning session (May 2026).

---

## How Claude should help on this project

**Teaching mode is on.** The goal of this project is to learn, not just ship. Claude should act as a senior engineer and mentor — not a code dispenser. Follow these rules in every session:

### At the start of each week
When the developer says something like "starting week 1" or "let's begin phase 2", Claude should:
1. Give a plain-English overview of what this week is about and *why* it matters
2. Break the week's tasks into a numbered day-by-day or step-by-step plan (not all at once)
3. Ask which step they want to tackle first before doing anything else

### During each step
- **Ask before telling.** Before explaining how to do something, ask: *"What do you think the right approach is here?"* or *"Have you seen this pattern before?"*
- **Explain the why.** When introducing a concept (e.g. Prisma migrations, Clerk middleware), briefly explain why it exists and what problem it solves before showing any code
- **Guide, don't solve.** If the developer is stuck, give a hint or point to the right concept — not the finished code. Only provide a full solution if they've made a genuine attempt and are still blocked
- **Check understanding.** After each step, ask a quick follow-up question to confirm the concept landed (e.g. *"Why do you think we're using `upsert` here instead of `create`?"*)

### Code reviews
When the developer shares code they've written, Claude should review it like a senior engineer on a PR — point out what's good, what could be improved, and explain *why* before suggesting a rewrite.

### What Claude should NOT do
- Do not write entire files or large blocks of code unprompted
- Do not jump ahead to the next step before the current one is understood
- Do not give the answer when a hint would do
- Do not skip the explanation and go straight to the implementation

### Weekly check-in prompt
At the start of each session, the developer can say: **"Weekly check-in: [phase number]"** and Claude will respond with:
- A recap of what was covered last session (if context is available)
- A step-by-step plan for the current week's tasks
- A warm-up question to get thinking before diving in

---

---

## What we're building

An AI-powered personal finance platform to fill the gap left by Mint's shutdown. Users connect their bank accounts, get automatic transaction categorization, AI-generated spending insights, and can ask questions in plain English like *"How much did I spend on food last month?"*

**Monetization**: Freemium — free tier (CSV import, 1 account), Pro at $9/mo (unlimited bank accounts, AI insights, monthly reports).

---

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 14 + TypeScript | App Router, server components |
| UI | Tailwind CSS + shadcn/ui | shadcn = copy-paste components built on Radix + Tailwind |
| Auth | Clerk | Email + Google OAuth, fastest path to secure auth |
| API | Node.js + Express (or Next.js Route Handlers) | Same language as frontend |
| Background jobs | BullMQ + Redis | Nightly bank sync, retries built in |
| ORM | Prisma | Best-in-class TypeScript DB client |
| Database | PostgreSQL (AWS RDS in prod) | Relational — right call for financial data |
| Cache | Redis (ElastiCache in prod) | Sessions, rate limiting, balance caching |
| Bank data | Plaid API | Industry standard, use sandbox mode in dev |
| AI | Claude API via Vercel AI SDK | NLQ + auto-categorization + insights |
| Infra | Docker + AWS ECS | Container-native, horizontally scalable |
| CI/CD | GitHub Actions | Lint → test → deploy on merge to main |
| Payments | Stripe | Freemium billing, webhooks for plan changes |
| Monitoring | Sentry (errors) + Axiom (logs) | Observability from day one |

---

## System architecture

```
┌─────────────────────────────────────────────────────────┐
│                   CLIENT LAYER                          │
│         Next.js 14 + TypeScript + shadcn/ui             │
│         App Router · React Query · Tailwind             │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────────┐
│                  SERVICES LAYER                         │
│              API Gateway (Node.js)                      │
│         Auth · Rate limiting · Routing                  │
│                     │                                   │
│   ┌─────────────────┼──────────────────────┐           │
│   │                 │                      │            │
│   ▼                 ▼                      ▼            │
│ Transactions     Budgets             AI Insights        │
│ Sync/categorize  Goals/alerts        Claude API · NLQ   │
│                                                         │
│                  Background Jobs                        │
│                  BullMQ · cron                          │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
┌──────────▼──────────┐   ┌──────────▼──────────────────┐
│    DATA LAYER        │   │     EXTERNAL APIs            │
│  PostgreSQL (Prisma) │   │  Plaid — bank accounts       │
│  Redis — cache/jobs  │   │  Claude API — AI features    │
│                      │   │  Stripe — billing            │
└──────────────────────┘   └──────────────────────────────┘

Deployment: Docker → AWS ECS · RDS · ElastiCache · GitHub Actions
```

---

## Database schema

```prisma
model User {
  id               String        @id @default(uuid())
  email            String        @unique
  name             String?
  plaidAccessToken String?
  stripeCustomerId String?
  plan             String        @default("free")
  createdAt        DateTime      @default(now())
  accounts         Account[]
  budgets          Budget[]
  aiQueries        AiQuery[]
}

model Account {
  id             String        @id @default(uuid())
  userId         String
  plaidAccountId String        @unique
  name           String
  type           String        // checking | savings | credit
  balance        Decimal
  syncedAt       DateTime?
  user           User          @relation(fields: [userId], references: [id])
  transactions   Transaction[]
}

model Transaction {
  id           String    @id @default(uuid())
  accountId    String
  categoryId   String?
  plaidTxnId   String?   @unique
  amount       Decimal
  merchant     String?
  date         DateTime
  pending      Boolean   @default(false)
  account      Account   @relation(fields: [accountId], references: [id])
  category     Category? @relation(fields: [categoryId], references: [id])
}

model Category {
  id           String        @id @default(uuid())
  name         String
  icon         String?
  isSystem     Boolean       @default(false)
  transactions Transaction[]
  budgets      Budget[]
}

model Budget {
  id          String   @id @default(uuid())
  userId      String
  categoryId  String
  limitAmount Decimal
  period      String   // monthly | weekly
  startsAt    DateTime
  user        User     @relation(fields: [userId], references: [id])
  category    Category @relation(fields: [categoryId], references: [id])
}

model AiQuery {
  id        String   @id @default(uuid())
  userId    String
  prompt    String
  response  String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```

---

## Recommended folder structure

```
finance-app/
├── apps/
│   ├── web/                        # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/             # Login, signup pages
│   │   │   ├── (dashboard)/        # Protected app pages
│   │   │   │   ├── page.tsx        # Main dashboard
│   │   │   │   ├── transactions/
│   │   │   │   ├── budgets/
│   │   │   │   ├── accounts/
│   │   │   │   └── insights/       # AI chat interface
│   │   │   └── api/
│   │   │       ├── plaid/          # Plaid Link + webhooks
│   │   │       ├── ai/             # Claude streaming route
│   │   │       └── stripe/         # Billing webhooks
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui components (auto-generated)
│   │   │   ├── charts/             # Recharts wrappers
│   │   │   └── finance/            # Domain-specific components
│   │   └── lib/
│   │       ├── db.ts               # Prisma client
│   │       ├── plaid.ts            # Plaid client setup
│   │       ├── ai.ts               # Claude client setup
│   │       └── stripe.ts           # Stripe client setup
│   └── worker/                     # BullMQ background jobs
│       ├── jobs/
│       │   ├── sync-transactions.ts
│       │   ├── categorize.ts
│       │   └── monthly-report.ts
│       └── index.ts
├── packages/
│   └── db/                         # Shared Prisma schema + migrations
│       ├── schema.prisma
│       └── migrations/
├── docker-compose.yml              # Local dev: postgres + redis
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD pipeline
└── CLAUDE.md                       # This file
```

---

## Phased build plan

### Phase 1 — Foundation (Weeks 1–2)
**Goal**: Working app with auth, DB, and manual CSV import. Ship something real before touching any external APIs.

- [ ] Init Next.js 14 project with TypeScript, Tailwind, ESLint, Prettier
- [ ] Install and configure shadcn/ui (`npx shadcn-ui@latest init`)
- [ ] Set up Clerk for auth (email + Google OAuth)
- [ ] Set up PostgreSQL locally via Docker (`docker-compose.yml`)
- [ ] Set up Prisma — write schema, run first migration
- [ ] Build CSV upload flow — parse, store transactions
- [ ] Build manual category assignment UI
- [ ] Dashboard page: net worth card, spending by category chart (Recharts), recent transactions table
- [ ] Deploy to Vercel (frontend) + Railway (DB) for early preview

**Key skills practiced**: Next.js App Router, TypeScript, Prisma, PostgreSQL, shadcn/ui

---

### Phase 2 — AI Layer (Weeks 3–4)
**Goal**: The feature that makes this stand out. Integrate Claude for categorization and natural language queries.

- [ ] Set up Claude API client (`@anthropic-ai/sdk`)
- [ ] Auto-categorize transactions on CSV import using Claude
- [ ] Build the NLQ chat interface (streaming via Vercel AI SDK)
  - System prompt: inject user's transaction history as context
  - Example queries: "How much on groceries last month?", "Am I on track with my budget?"
- [ ] AI-generated monthly spending summary (cron job, stored in `AiQuery`)
- [ ] Budget suggestions — Claude recommends limits based on 3-month history
- [ ] Store all AI queries in DB for history/audit trail

**Key prompt pattern for NLQ**:
```
System: You are a personal finance assistant. The user's recent transactions are:
{JSON of last 90 days of transactions}
Answer questions concisely. Format currency as USD. Today is {date}.

User: {natural language question}
```

**Key skills practiced**: Claude API, prompt engineering, streaming, Vercel AI SDK

---

### Phase 3 — Bank Sync via Plaid (Weeks 5–6)
**Goal**: Replace manual CSV with real automated bank data.

- [ ] Apply for Plaid developer account (use sandbox while waiting)
- [ ] Build Plaid Link flow — frontend iframe + backend token exchange
- [ ] Store `access_token` encrypted in DB per user
- [ ] Write `sync-transactions` BullMQ job — pull new txns nightly via cron
- [ ] Handle Plaid webhooks (`TRANSACTIONS_SYNC`) for real-time updates
- [ ] Set up Redis locally (`docker-compose.yml`) for BullMQ + balance caching
- [ ] Multi-account view: net worth across checking, savings, credit

**Plaid flow**:
```
Frontend: Plaid Link opens → user selects bank → returns public_token
Backend:  POST /api/plaid/exchange → trades public_token for access_token → saves to DB
Worker:   Nightly job fetches /transactions/sync with access_token → upserts to DB
```

**Key skills practiced**: OAuth flows, webhooks, background jobs, BullMQ, Redis, Plaid API

---

### Phase 4 — Production & Billing (Weeks 7–8)
**Goal**: Real infrastructure, monitoring, and monetization.

- [ ] Write `Dockerfile` for web app and worker
- [ ] Write `docker-compose.prod.yml` for local prod simulation
- [ ] AWS setup: ECS cluster, RDS (PostgreSQL), ElastiCache (Redis), ECR (Docker registry)
- [ ] GitHub Actions pipeline:
  ```
  push to main → lint → test → docker build → push to ECR → deploy to ECS
  ```
- [ ] Set up Sentry for error tracking (frontend + backend)
- [ ] Add Stripe: create products (Free, Pro), checkout session, billing portal
- [ ] Stripe webhook: update `user.plan` on subscription changes
- [ ] Gate Pro features behind plan check middleware
- [ ] Write `README.md` with setup instructions + architecture diagram

**Key skills practiced**: Docker, AWS ECS, GitHub Actions, Stripe webhooks, CI/CD

---

## Key implementation notes

### Security (non-negotiable)
- Never log or expose Plaid `access_token` values
- Store Plaid tokens encrypted at rest (use `@prisma/client` with field-level encryption or AWS KMS)
- All API routes must verify Clerk session before touching DB
- Rate limit AI endpoints — Claude calls are expensive

### AI cost management
- Cache AI query responses for identical questions (Redis, 1hr TTL)
- Limit NLQ to Pro tier or N free queries/month
- Use `claude-haiku` for categorization (cheap + fast), `claude-sonnet` for NLQ (smarter)

### Local dev setup
```bash
# Start postgres + redis
docker-compose up -d

# Install deps
pnpm install

# Set up DB
pnpm prisma migrate dev

# Start web app
pnpm --filter web dev

# Start worker
pnpm --filter worker dev
```

### Environment variables needed
```env
# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://localhost:6379

# Plaid
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox

# AI
ANTHROPIC_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## Quality assurance

### Tools

| Tool | Purpose | Config file |
|---|---|---|
| Vitest | Unit + integration tests | `vitest.config.ts` |
| Playwright | End-to-end browser tests | `playwright.config.ts` |
| React Testing Library | Component tests | via Vitest |
| MSW (Mock Service Worker) | Mock Plaid + Stripe in tests | `src/mocks/` |
| ESLint + Prettier | Linting + formatting | `.eslintrc.json` |
| TypeScript strict mode | Type safety | `tsconfig.json` |
| Husky + lint-staged | Pre-commit hooks | `.husky/` |

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:e2e": "playwright test",
    "test:coverage": "vitest --coverage",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit"
  }
}
```

---

### What to test — by layer

#### Unit tests (Vitest)
Focus on pure logic that doesn't need a DB or browser.

```typescript
// tests/unit/categorize.test.ts
// Test the AI categorization logic with mock Claude responses
describe('categorizeTransaction', () => {
  it('maps "WHOLEFDS" merchant to Groceries', async () => {
    const mockClaude = vi.fn().mockResolvedValue('Groceries');
    const result = await categorizeTransaction({ merchant: 'WHOLEFDS 10001' }, mockClaude);
    expect(result).toBe('Groceries');
  });

  it('falls back to "Uncategorized" on API error', async () => {
    const mockClaude = vi.fn().mockRejectedValue(new Error('rate limited'));
    const result = await categorizeTransaction({ merchant: 'UNKNOWN' }, mockClaude);
    expect(result).toBe('Uncategorized');
  });
});

// tests/unit/budget.test.ts
describe('isBudgetExceeded', () => {
  it('returns true when spending exceeds limit', () => {
    expect(isBudgetExceeded({ spent: 550, limit: 500 })).toBe(true);
  });
  it('returns false at exactly the limit', () => {
    expect(isBudgetExceeded({ spent: 500, limit: 500 })).toBe(false);
  });
});
```

#### Integration tests (Vitest + test DB)
Test API routes against a real PostgreSQL test database. Spin up a test DB in CI using Docker.

```typescript
// tests/integration/transactions.test.ts
describe('POST /api/transactions/import', () => {
  beforeEach(async () => {
    await db.transaction.deleteMany(); // clean slate
  });

  it('imports CSV and stores transactions', async () => {
    const csv = 'date,merchant,amount\n2024-01-15,WHOLEFDS,-82.50';
    const res = await request(app)
      .post('/api/transactions/import')
      .set('Authorization', `Bearer ${testUserToken}`)
      .attach('file', Buffer.from(csv), 'transactions.csv');
    expect(res.status).toBe(200);
    const txns = await db.transaction.findMany({ where: { userId: testUserId } });
    expect(txns).toHaveLength(1);
    expect(txns[0].merchant).toBe('WHOLEFDS');
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).post('/api/transactions/import');
    expect(res.status).toBe(401);
  });
});
```

#### Component tests (React Testing Library)
Test UI components in isolation — especially ones with complex state.

```typescript
// tests/components/BudgetCard.test.tsx
describe('BudgetCard', () => {
  it('shows warning color when over 80% spent', () => {
    render(<BudgetCard spent={420} limit={500} category="Groceries" />);
    expect(screen.getByRole('progressbar')).toHaveClass('bg-warning');
  });

  it('shows exceeded state when over limit', () => {
    render(<BudgetCard spent={550} limit={500} category="Groceries" />);
    expect(screen.getByText(/over budget/i)).toBeInTheDocument();
  });
});
```

#### End-to-end tests (Playwright)
Test full user flows in a real browser. Use Plaid sandbox and Stripe test mode.

```typescript
// tests/e2e/onboarding.spec.ts
test('user can sign up and import their first transactions', async ({ page }) => {
  await page.goto('/sign-up');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'Test1234!');
  await page.click('button[type=submit]');
  await expect(page).toHaveURL('/dashboard');

  // Upload CSV
  await page.click('text=Import transactions');
  await page.setInputFiles('input[type=file]', 'tests/fixtures/sample.csv');
  await page.click('text=Import');
  await expect(page.locator('[data-testid=transaction-row]')).toHaveCount(5);
});

// tests/e2e/nlq.spec.ts
test('NLQ returns a spending answer', async ({ page }) => {
  await loginAsTestUser(page);
  await page.goto('/insights');
  await page.fill('[data-testid=nlq-input]', 'How much did I spend on food last month?');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-testid=nlq-response]')).toContainText('$', { timeout: 10000 });
});
```

---

### Critical test cases — finance-specific

These are the scenarios that absolutely must be covered before shipping:

| Scenario | Type | Why it matters |
|---|---|---|
| User can only see their own transactions | Integration | Data isolation — a bug here is catastrophic |
| Duplicate Plaid transactions are not imported twice | Integration | `plaidTxnId` unique constraint must be enforced |
| Budget alert fires at correct threshold | Unit | Core feature correctness |
| Stripe webhook updates plan after payment | Integration | Revenue depends on this |
| NLQ never returns another user's data | Integration | Privacy — inject wrong userId and verify empty result |
| CSV import handles negative amounts (expenses) correctly | Unit | Financial math must be exact |
| Plaid token is never logged or exposed in responses | Integration | Security |
| AI categorization falls back gracefully on API timeout | Unit | Resilience |

---

### CI/CD quality gates

Add these checks to your GitHub Actions pipeline — the deploy must not proceed if any fail:

```yaml
# .github/workflows/deploy.yml
jobs:
  quality:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: pnpm install
      - run: pnpm typecheck          # TypeScript must compile clean
      - run: pnpm lint               # ESLint must pass
      - run: pnpm test --coverage    # Unit + integration tests
      - run: pnpm test:e2e           # Playwright E2E
      - name: Coverage gate
        run: npx vitest --coverage --reporter=json | node scripts/check-coverage.js
        # Fails if coverage drops below 70%
```

---

### Pre-commit hooks (Husky)

Catch issues before they ever hit CI:

```bash
# .husky/pre-commit
pnpm lint-staged

# lint-staged.config.js
module.exports = {
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md}': ['prettier --write'],
};
```

---

### QA references

- [Vitest docs](https://vitest.dev/)
- [Playwright docs](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW (Mock Service Worker)](https://mswjs.io/)

---

## Useful references

---

*This plan was designed to cover the most in-demand fullstack skills from 2026 job boards:*
*React/TypeScript · Node.js · PostgreSQL · AWS · Docker · REST APIs · AI integration · CI/CD*

# Cortex

A personalized learning webapp for Grade 7 math. Each student has a knowledge graph that tracks both mastery (per concept, via Bayesian Knowledge Tracing) and behavioral signals (curiosity, motivation, engagement, persistence). Teachers get a per-student view of how each kid actually learns, not just whether they got the last quiz right.

Built with Next.js 16 (App Router), React 19, Prisma + Postgres, Clerk, tRPC, and Tailwind v4.

## Quick start

The app runs against built-in mock data with no env setup, so you can click through every page immediately.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Full setup (real auth + DB)

You only need this if you want sign-in to work and data to persist.

### 1. Database

Any Postgres works. [Neon](https://neon.tech) is what this is wired for. Create a project and grab two connection strings from the dashboard:

- Pooled connection -> `DATABASE_URL`
- Direct connection -> `DIRECT_URL` (Prisma uses this for migrations)

### 2. Auth

Create an app at [clerk.com](https://clerk.com) and copy from the API Keys page:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

For production, also set up a webhook pointing at `/api/webhooks/clerk` and put the signing secret in `CLERK_WEBHOOK_SECRET`.

### 3. Env file

```bash
cp .env.example .env.local
# fill in the values
```

### 4. Migrate + seed

```bash
npm run db:push      # push schema to the DB
npm run db:seed      # seed Grade 7 Common Core curriculum + sample questions
npm run db:studio    # optional, opens Prisma Studio
```

### 5. Run

```bash
npm run dev
```

Sign up via Clerk. The role you pick on `/sign-up` is stored in Clerk's `unsafeMetadata.role` and used to route you to the right dashboard.

## Project layout

```
src/
  app/                              Next.js App Router
    page.tsx                        Landing
    sign-in/, sign-up/              Clerk auth pages
    dashboard-redirect/             Routes to teacher or student dashboard by role
    teacher/
      dashboard/                    Stats, classes, recent activity
      classes/                      Class list, roster, per-student knowledge graph
      assignments/                  List + 4-step create wizard
      curriculum/                   Browse the curriculum graph
      lesson-plans/                 AI-curated lesson plans
    student/
      dashboard/                    Mastery overview + due assignments
      assignments/                  List + focus-mode question UI
      progress/                     Student's own knowledge graph + achievements
    api/
      interactions/attempt          POST: record a question attempt -> BKT update
      interactions/event            POST: record any interaction event
      cron/update-graphs            GET: batch-recompute behavioral scores
      webhooks/clerk                POST: sync Clerk users into the DB

  components/cortex/
    tokens.ts                       Color + font tokens
    primitives.tsx                  Logo, Btn, Card, Badge, Radial, Bar, Avatar
    Icon.tsx                        Icon set
    GraphBG.tsx                     Animated canvas background
    KnowledgeGraph.tsx              Interactive SVG knowledge graph
    shells.tsx                      TeacherShell, StudentShell

  server/
    db.ts                           Prisma client singleton
    services/
      mastery/                      BKT math + update orchestrator
      behavioral/                   Curiosity/motivation/engagement/persistence

prisma/
  schema.prisma
  seed.ts
```

## Data model

**Nodes**

- `CurriculumNode`: math concepts in a 4-level hierarchy (Domain > Cluster > Standard > Skill), each tagged with a difficulty baseline and Bloom level.
- `Question`: assessment items linked to curriculum nodes. Each has `commonErrors` (mapping wrong answers to error types: computational, conceptual, careless, notation) and progressive `hints`.
- `StudentProfile`: per-student identity that ties together all the learning state.

**Edges**

- `CurriculumPrerequisite`: directed prereq relationships between concepts (`HARD`, `SOFT`, `RELATED`) with strength.
- `StudentConceptMastery`: live student x concept matrix. Updated on every question attempt via Bayesian Knowledge Tracing (`src/server/services/mastery/bkt.ts`), with adjustments for guessing, slipping, hint usage, and time-decay (forgetting).
- `StudentBehavioralProfile`: per-student aggregate scores recomputed every 15 min by the cron job from raw `InteractionEvent`s.

## Behavioral scoring

Defined in `src/server/services/behavioral/scores.ts`:

- **Curiosity** = 0.3 exploration + 0.3 challenge-seeking + 0.2 inquiry + 0.2 beyond-assigned
- **Motivation** = 0.35 persistence + 0.25 completion + 0.2 resilience + 0.2 trend
- **Engagement** = 0.25 frequency + 0.25 duration + 0.3 assignment-completion + 0.2 recency
- **Persistence** = 0.6 retry-rate + 0.4 session-duration

## Event pipeline

When a student answers a question:

1. The focus-mode UI POSTs to `/api/interactions/attempt`.
2. `recordQuestionAttempt()` (`src/server/services/mastery/update.ts`) runs:
   - Append the raw `InteractionEvent` for the audit trail.
   - Read existing `StudentConceptMastery`.
   - Apply BKT update (decay, posterior, learn) with adjustments for hints, time, error type.
   - Update aggregates: attempts, hint-rate, streak, error-pattern counts.
   - Persist.
3. Returns the new mastery so the UI can show the delta.

Separately, a Vercel Cron hits `/api/cron/update-graphs` every 15 min, which calls `recomputeAllStudents()` to aggregate the last 30 days of events and refresh behavioral scores.

## Status

| Surface | State |
|---|---|
| All UI screens | Render with mock data out of the box |
| Knowledge graph (interactive SVG) | Working |
| Question interface (answer, hint, submit, next) | Working |
| Mastery + behavioral algorithms | Implemented and type-checked |
| API endpoints | Validate via Zod, persist when DB is configured |
| Clerk auth | Wired; activates when env vars are present |
| Class/assignment data | Still mock-only; needs Prisma queries (next phase) |

## Roadmap

- tRPC layer to replace mock data in pages with type-safe DB queries
- Real class create/join flow against `Class` + `ClassEnrollment`
- AI tutor: wire the "Ask Tutor" button to the Anthropic API
- AI lesson plan generator using class mastery data
- Live graph updates (SSE or Pusher) so teachers see mastery change in real time

## Scripts

```bash
npm run dev            # dev server on http://localhost:3000
npm run build          # production build (runs typecheck)
npm run db:push        # sync prisma schema to the DB (dev)
npm run db:migrate     # create + apply a migration
npm run db:seed        # seed curriculum + sample questions
npm run db:studio      # open Prisma Studio
npm run db:generate    # regenerate the Prisma client
```

## Design source

The original design files (vanilla React, inline styles) live in `_design-source/cortex/` for reference. The full spec is in `_design-source/DESIGN_SPEC.md`. The production app uses the same tokens, ported into TypeScript modules in `src/components/cortex/`.

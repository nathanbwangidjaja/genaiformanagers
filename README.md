# Cortex

Cortex is a B2B personalized learning platform. The core idea is that understanding a student goes well beyond tracking right and wrong answers — you also need to know how curious they are, how motivated they stay after a failure, how consistently they show up, and how they engage with material that wasn't assigned to them. Cortex captures all of this and builds a live knowledge graph for each student that reflects both what they know and how they learn.

The platform has two sides. For students, it adapts to where they actually are: surfacing the right practice, showing them their own progress as a visual knowledge graph, and giving them hints and feedback that match their specific error patterns. For teachers, it's a tool for understanding their class at depth — not just aggregate scores, but per-student breakdowns of mastery, engagement, and behavioral signals — so they can write lesson plans, homework, and exams that actually meet students where they are. That's the B2B angle: the product is sold to schools and districts, and the primary workflow it improves is the teacher's.

The current implementation covers Grade 7 math (Common Core), which serves as a well-scoped domain to prove out the model. The curriculum is structured as a graph of concepts with prerequisite relationships, so the system knows not just that a student struggles with ratios, but that they probably haven't solidified unit rates first. The architecture is designed to generalize to other subjects and grade levels.

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

## How interactions build the knowledge graph

Every action a student takes is recorded as an `InteractionEvent` — answering a question, using a hint, asking a freeform question, voluntarily attempting a harder problem, exploring a concept that wasn't assigned. These events feed two separate pipelines that together build the student's graph.

**Mastery (real-time).** When a student submits an answer, the app POSTs to `/api/interactions/attempt`. This immediately runs a Bayesian Knowledge Tracing update on that concept node: it reads the student's current mastery estimate, applies forgetting decay based on how long it's been since they last practiced, computes a posterior from the correctness observation, and then applies the learning prior. The update isn't just correct/incorrect — it accounts for hints used (which lower the signal value of a correct answer) and error type (a computational slip is treated differently from a conceptual gap). The updated mastery propagates back to the UI so the student sees their graph change in real time.

**Behavioral scores (batched).** Separately, a cron job runs every 15 minutes and aggregates the last 30 days of raw events for every student into four behavioral scores: curiosity, motivation, engagement, and persistence. Each score is a weighted combination of signals — curiosity, for example, weights voluntary exploration, self-initiated harder problems, freeform questions, and time spent on concepts beyond what was assigned. These scores surface on the teacher's per-student view alongside mastery, giving them a much richer picture than grades alone.

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


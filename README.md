# Hive Buckhead — Reservation Management System

A production-grade staff reservation management app built with Next.js 14, Supabase, and Prisma.

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 (App Router) | Server Components, API routes, built-in TypeScript |
| UI | shadcn/ui + Tailwind CSS | Composable, accessible, no lock-in |
| Database | PostgreSQL via Supabase | + Auth, Realtime, Storage in one platform |
| ORM | Prisma | Type-safe queries, schema migrations |
| Client state | Zustand | Lightweight, zero-boilerplate |
| Server state | TanStack Query | Caching, background sync, optimistic updates |
| Real-time | Supabase Realtime | Postgres changes → browser via WebSocket |
| Deployment | Vercel | Zero-config Next.js, preview branches |

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login/logout — no nav wrapper
│   ├── (dashboard)/      # Protected pages — nav + sidebar
│   │   ├── reservations/ # Main reservations view
│   │   ├── floor/        # Live floor plan
│   │   ├── schedule/     # Staff scheduling
│   │   ├── admin/        # Staff, tables, hours config
│   │   └── analytics/    # Revenue, performance reports
│   ├── api/              # API Route handlers
│   └── rsvp/             # Public guest RSVP form
├── components/
│   ├── ui/               # shadcn/ui base components
│   ├── layout/           # Nav, sidebar, providers
│   ├── reservations/     # Reservation-specific components
│   ├── floor/            # Floor plan SVG components
│   ├── schedule/         # Calendar, shift grid
│   └── shared/           # Status badges, avatars, etc.
├── hooks/                # React Query hooks
├── lib/
│   ├── auth/             # Supabase client, session helpers
│   ├── db/               # Prisma singleton
│   ├── realtime/         # Supabase realtime hooks
│   ├── utils/            # Pure utility functions
│   └── validations/      # Zod schemas (shared: forms + API)
├── stores/               # Zustand stores (UI state only)
├── styles/               # Global CSS, CSS variables
└── types/                # TypeScript types (single source of truth)
prisma/
├── schema.prisma         # Database schema
└── seed.ts               # Seed with Hive data
```

## Setup

### 1. Clone and install

```bash
git clone https://github.com/c3jumpw/hive-buckhead.git
cd hive-buckhead
npm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name: `hive-buckhead`
3. Note your **Project URL** and **anon key** from Settings → API

### 3. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### 4. Set up database

```bash
# Push the schema to Supabase
npm run db:push

# Seed with staff, tables, and operating hours
npm run db:seed
```

### 5. Enable Supabase Realtime

In Supabase dashboard → Database → Replication:
- Enable realtime for: `reservations`, `tables`

### 6. Run development server

```bash
npm run dev
# Open http://localhost:3000
```

Login with:
- Select **Admin User** → PIN: `1234`

> ⚠️ **Change all PINs before going live!**

## Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# (same as .env.local, minus NEXT_PUBLIC_ prefix for sensitive ones)
```

## Staff Access Levels

| Level | Role | Access |
|-------|------|--------|
| ADMIN | Manager / Owner | All pages, settings, analytics |
| STAFF | Server / Bartender | Reservations + Floor + Schedule |
| FLOOR | Host | Floor view only |

## Key Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run typecheck    # TypeScript check (no emit)
npm run db:studio    # Prisma Studio (DB GUI)
npm run db:migrate   # Create a new migration
npm run db:seed      # Re-seed the database
```

## Architecture Decisions

**Why Supabase over Firebase?**
Postgres is relational — reservations, staff, tables all have clear relationships and foreign keys. Supabase gives you Postgres + Auth + Realtime + Storage in one platform with no vendor lock-in (it's just Postgres underneath).

**Why Prisma over Supabase's auto-generated client?**
Prisma's type safety is unmatched for complex queries. The schema is the single source of truth for your data model. Migrations are explicit and reviewable.

**Why React Query over SWR?**
Better mutation handling, more granular cache invalidation, and better DevTools. The query key factory pattern (in `use-reservations.ts`) makes cache management maintainable.

**Why Zustand over Redux?**
Zero boilerplate, TypeScript-first, and perfect for UI state (selected row, filter panel open, etc.). Server state lives in React Query — Zustand is only for client-side UI concerns.

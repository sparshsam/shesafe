# Architecture

## Overview

SheSafe is a community safety map application. Users place, categorize, and discuss safety-related pins on an interactive map.

```mermaid
flowchart TB
    subgraph Client [Browser]
        A[Next.js App Router]
        M[Leaflet Map]
        U[Auth UI]
    end

    subgraph Supabase [Supabase]
        DB[(PostgreSQL + RLS)]
        Auth[Auth Service]
    end

    subgraph Admin [Admin Panel]
        AD[Flag Review]
        AM[Moderation]
    end

    A --> M
    A --> U
    U <--> Auth
    A -- API routes --> DB
    AD --> DB
    AM --> DB
```

## Data Model

```mermaid
erDiagram
    Pin ||--o{ PinComment : has
    Pin ||--o{ PinUpvote : receives
    Pin ||--o{ PinFlag : may_be_flagged

    Pin {
        uuid id PK
        float lat
        float lng
        enum safety_tag
        enum category
        enum time_of_day
        text description
        timestamp created_at
    }

    PinComment {
        uuid id PK
        uuid pin_id FK
        text body
        timestamp created_at
    }

    PinUpvote {
        uuid id PK
        uuid pin_id FK
        uuid user_id FK
    }

    PinFlag {
        uuid id PK
        uuid pin_id FK
        uuid user_id FK
        text reason
        boolean resolved
    }
```

## Route Design

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/` | Main map view with pins | No (guest read) |
| `/auth` | Sign in / sign up | No |
| `/admin` | Moderation dashboard | Yes |
| `/api/pins` | Pin CRUD | Varies |
| `/api/pins/:id/comments` | Pin comments | No (read) / Yes (write) |
| `/api/pins/:id/upvote` | Upvote a pin | Yes |
| `/api/pins/:id/flag` | Flag a pin | Yes |
| `/api/admin/flags` | List/resolve flags | Admin only |

## Key Design Decisions

1. **Guest read access** — The map is publicly viewable to maximize community usefulness. Writing requires authentication.
2. **Supabase RLS** — Row-level security enforces data isolation at the database level, not just in application code.
3. **No background tracking** — All pins are intentionally placed by users. There is no passive location collection.
4. **Category + tag system** — Pins have both a category (lighting, harassment, etc.) and a safety tag (safe, mixed, unsafe) for flexible filtering.

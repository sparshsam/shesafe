# SheSafe Full Relaunch — Implementation Plan

> **Stack:** Next.js (App Router) + Supabase + Vercel
> **For Hermes:** Use subagent-driven-development to implement this plan task-by-task.
> **Architecture:** Modern SPA with server components + client interactive map. Supabase for auth, DB, real-time, and storage. Deployed on Vercel with zero-config.

**Goal:** Revive SheSafe as a production-ready crowdsourced safety map platform — users can drop pins, filter by safety + time, discuss locations, and view safety trends. Moderation and abuse prevention built in.

**Tech Stack:**
- **Framework:** Next.js 14+ (App Router)
- **Database:** Supabase (Postgres + Row Level Security)
- **Auth:** Supabase Auth (anonymous + Google OAuth)
- **Maps:** Leaflet via react-leaflet
- **UI:** Tailwind CSS + shadcn/ui
- **Deploy:** Vercel (free tier)
- **Testing:** Vitest + Playwright

---

## Phase 0: Scaffold & Supabase Setup

### Task 0.1: Initialize Next.js project

**Objective:** Create the Next.js App Router project with TypeScript and Tailwind.

**Files:**
- Create: Project root with `npx create-next-app@latest`

**Step 1: Scaffold the project**

```bash
cd /home/spars/.hermes/workspace/shesafe
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack --no-git
```

Expected: Clean Next.js project in current directory.

**Step 2: Install core dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr react-leaflet leaflet @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-slot @radix-ui/react-toast class-variance-authority clsx lucide-react tailwind-merge tailwindcss-animate date-fns uuid
npm install -D @types/leaflet @types/uuid vitest @testing-library/react @testing-library/jest-dom @playwright/test
```

**Step 3: Set up shadcn/ui**

```bash
npx shadcn-ui@latest init -d
npx shadcn-ui@latest add button card badge avatar toast input select textarea dialog dropdown-menu --y
```

**Step 4: Clean default files**

- Modify: `src/app/page.tsx` — remove boilerplate
- Modify: `src/app/layout.tsx` — basic layout shell

**Step 5: Initial commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Tailwind + shadcn/ui"
```

---

### Task 0.2: Create Supabase project & schema

**Objective:** Set up Supabase project, define the database schema, and enable Row Level Security.

**Actions (manual by Sparsh):**
1. Go to [supabase.com](https://supabase.com) → Create new project (free tier, choose nearest region)
2. Copy project URL and `anon` public API key

**Step 1: Create Supabase client lib**

- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`

```typescript
// src/lib/supabase/client.ts — browser client
import { createBrowserClient } from '@supabase/ssr';
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
```

```typescript
// src/lib/supabase/server.ts — server component client
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export const createClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
};
```

```typescript
// src/lib/supabase/middleware.ts — middleware client
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
export const createClient = (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({ request });
  createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );
  return supabaseResponse;
};
```

**Step 2: Create .env.local**

- Create: `.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Step 3: Define database schema (SQL to run in Supabase SQL Editor)**

```sql
-- Enable PostGIS for location queries (optional but useful)
create extension if not exists postgis;

-- Profiles table (synced from auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Safety pins
create table pins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete set null,
  lat double precision not null,
  lng double precision not null,
  -- geom geometry(Point, 4326) if using PostGIS
  tag text not null check (tag in ('safe', 'mixed', 'unsafe')),
  category text check (category in ('lighting', 'harassment', 'traffic', 'security', 'general', 'other')),
  description text,
  time_of_day text check (time_of_day in ('morning', 'afternoon', 'evening', 'night', 'any')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Pin upvotes (for pin verification)
create table pin_upvotes (
  id uuid default gen_random_uuid() primary key,
  pin_id uuid references pins(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(pin_id, user_id)
);

-- Pin comments
create table pin_comments (
  id uuid default gen_random_uuid() primary key,
  pin_id uuid references pins(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete set null,
  body text not null,
  created_at timestamptz default now()
);

-- Pin flags (for moderation)
create table pin_flags (
  id uuid default gen_random_uuid() primary key,
  pin_id uuid references pins(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete set null,
  reason text,
  created_at timestamptz default now()
);

-- Indexes for performance
create index pins_location_idx on pins (lat, lng);
create index pins_tag_idx on pins (tag);
create index pins_created_at_idx on pins (created_at desc);
create index pin_upvotes_pin_id_idx on pin_upvotes (pin_id);
create index pin_comments_pin_id_idx on pin_comments (pin_id);

-- Enable RLS
alter table profiles enable row level security;
alter table pins enable row level security;
alter table pin_upvotes enable row level security;
alter table pin_comments enable row level security;
alter table pin_flags enable row level security;
```

**Step 4: RLS Policies (SQL to run after schema)**

```sql
-- Profiles: users can read all profiles, update only own
create policy "Profiles are publicly readable"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Pins: anyone can read, authenticated users can insert
create policy "Pins are publicly readable"
  on pins for select using (true);

create policy "Authenticated users can insert pins"
  on pins for insert with check (auth.role() = 'authenticated');

create policy "Users can update own pins"
  on pins for update using (auth.uid() = user_id);

create policy "Users can delete own pins"
  on pins for delete using (auth.uid() = user_id);

-- Upvotes: anyone can read, authenticated can insert/delete own
create policy "Upvotes are publicly readable"
  on pin_upvotes for select using (true);

create policy "Users can upvote"
  on pin_upvotes for insert with check (auth.uid() = user_id);

create policy "Users can remove own upvote"
  on pin_upvotes for delete using (auth.uid() = user_id);

-- Comments: anyone can read, authenticated can insert own
create policy "Comments are publicly readable"
  on pin_comments for select using (true);

create policy "Users can comment"
  on pin_comments for insert with check (auth.uid() = user_id);

-- Flags: authenticated can insert
create policy "Users can flag pins"
  on pin_flags for insert with check (auth.uid() = user_id);
```

**Step 5: Commit**

```bash
git add src/lib/supabase/ .env.local
git commit -m "feat: add Supabase client lib and env config"
```

---

## Phase 1: Auth & User System

### Task 1.1: Set up Auth UI

**Objective:** Add sign-in/registration with anonymous + Google OAuth.

**Files:**
- Create: `src/app/auth/callback/route.ts` — OAuth callback handler
- Create: `src/app/auth/page.tsx` — Auth page
- Create: `src/components/auth/auth-dialog.tsx` — Auth modal component
- Create: `src/components/auth/auth-button.tsx` — Nav auth button

**Step 1: Auth callback route**

```typescript
// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_callback_error`);
}
```

**Step 2: Auth page**

```typescript
// src/app/auth/page.tsx
'use client';
import { AuthCard } from '@/components/auth/auth-card';
export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
      <AuthCard />
    </div>
  );
}
```

**Step 3: Auth card component with Google OAuth + Anonymous**

```typescript
// src/components/auth/auth-card.tsx
'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function AuthCard() {
  const [loading, setLoading] = useState<'google' | 'anonymous' | null>(null);
  const supabase = createClient();

  const signInWithGoogle = async () => {
    setLoading('google');
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/auth/callback` } });
  };

  const signInAnonymously = async () => {
    setLoading('anonymous');
    const { error } = await supabase.auth.signInAnonymously();
    if (!error) window.location.href = '/';
    setLoading(null);
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl">🛡️ SheSafe?</CardTitle>
        <CardDescription>Join the community keeping public spaces safe</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={signInWithGoogle} disabled={!!loading} variant="outline" className="w-full gap-2">
          {loading === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Continue with Google
        </Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
        </div>
        <Button onClick={signInAnonymously} disabled={!!loading} variant="secondary" className="w-full">
          {loading === 'anonymous' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Continue Anonymously
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Step 4: AuthButton component (shows user avatar or sign-in button)**

- Create: `src/components/auth/auth-button.tsx`

```typescript
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!user) return <Button asChild variant="default" size="sm"><Link href="/auth">Sign In</Link></Button>;

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-8 w-8">
        <AvatarImage src={user.user_metadata?.avatar_url} />
        <AvatarFallback>{(user.email?.[0] || 'U').toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="text-sm hidden md:inline">{user.email || 'Anonymous'}</span>
    </div>
  );
}
```

**Step 5: Profile auto-creation trigger**

Run in Supabase SQL Editor:
```sql
-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Anonymous'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

**Step 6: Add middleware for route protection**

- Create: `src/middleware.ts`

```typescript
import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';
import { NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { supabaseResponse } = createClient(request);
  const { data: { user } } = await supabaseResponse.auth.getUser();

  // Protected routes
  const protectedPaths = ['/profile', '/pins/new'];
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p));

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  return supabaseResponse;
}

export const config = { matcher: ['/profile/:path*', '/pins/new'] };
```

**Step 7: Commit**

```bash
git add src/app/auth/ src/components/auth/ src/middleware.ts
git commit -m "feat: add auth system with Google OAuth and anonymous sign-in"
```

---

## Phase 2: Core Map & Pins

### Task 2.1: Map component with Leaflet

**Objective:** Create the interactive map component with OpenStreetMap tiles.

**Files:**
- Create: `src/components/map/map.tsx`
- Create: `src/components/map/map-provider.tsx`
- Modify: `src/app/layout.tsx` — add MapProvider

**Step 1: Create MapProvider (handles Leaflet CSS import)**

```typescript
// src/components/map/map-provider.tsx
'use client';
import { useEffect } from 'react';

export function MapProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => { import('leaflet/dist/leaflet.css'); }, []);
  return <>{children}</>;
}
```

Modify `src/app/layout.tsx`:
```typescript
import { MapProvider } from '@/components/map/map-provider';
// ... wrap children:
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MapProvider>{children}</MapProvider>
      </body>
    </html>
  );
}
```

**Step 2: Map component**

```typescript
// src/components/map/map.tsx
'use client';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import type { Pin } from '@/lib/types';
import { PinMarkers } from './pin-markers';
import { MapClickHandler } from './map-click-handler';

interface MapProps {
  pins: Pin[];
  onMapClick?: (lat: number, lng: number) => void;
  selectedPinId?: string | null;
  onPinClick?: (pin: Pin) => void;
  height?: string;
  center?: [number, number];
  zoom?: number;
}

export function Map({ pins, onMapClick, selectedPinId, onPinClick, height = '100%', center = [20, 78], zoom = 5 }: MapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="w-full"
      style={{ height }}
      zoomControl={false}
    >
      <ZoomControl position="bottomright" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <PinMarkers pins={pins} selectedPinId={selectedPinId} onPinClick={onPinClick} />
      {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
    </MapContainer>
  );
}
```

**Step 3: Pin markers component**

```typescript
// src/components/map/pin-markers.tsx
'use client';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Pin } from '@/lib/types';

const iconMap: Record<string, L.DivIcon> = {
  safe: L.divIcon({ className: 'custom-marker', html: '✅', iconSize: [30, 30], iconAnchor: [15, 30] }),
  mixed: L.divIcon({ className: 'custom-marker', html: '⚠️', iconSize: [30, 30], iconAnchor: [15, 30] }),
  unsafe: L.divIcon({ className: 'custom-marker', html: '🚫', iconSize: [30, 30], iconAnchor: [15, 30] }),
};

export function PinMarkers({ pins, selectedPinId, onPinClick }: {
  pins: Pin[];
  selectedPinId?: string | null;
  onPinClick?: (pin: Pin) => void;
}) {
  return (
    <>
      {pins.map(pin => (
        <Marker
          key={pin.id}
          position={[pin.lat, pin.lng]}
          icon={iconMap[pin.tag] || iconMap.mixed}
          eventHandlers={{ click: () => onPinClick?.(pin) }}
        >
          <Popup>
            <div className="text-sm">
              <b>{iconMap[pin.tag]?.options.html || ''} {pin.tag}</b>
              {pin.description && <p className="mt-1">{pin.description}</p>}
              {pin.category && <p className="text-xs text-muted-foreground mt-1">Category: {pin.category}</p>}
              <p className="text-xs text-muted-foreground">{new Date(pin.created_at).toLocaleDateString()}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
```

**Step 4: Map click handler**

```typescript
// src/components/map/map-click-handler.tsx
'use client';
import { useMapEvents } from 'react-leaflet';

export function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onMapClick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}
```

**Step 5: Define types**

- Create: `src/lib/types.ts`

```typescript
export type SafetyTag = 'safe' | 'mixed' | 'unsafe';
export type PinCategory = 'lighting' | 'harassment' | 'traffic' | 'security' | 'general' | 'other';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night' | 'any';

export interface Pin {
  id: string;
  user_id: string | null;
  lat: number;
  lng: number;
  tag: SafetyTag;
  category: PinCategory | null;
  description: string | null;
  time_of_day: TimeOfDay | null;
  created_at: string;
  updated_at: string;
  upvotes?: number;
  user_has_upvoted?: boolean;
  comment_count?: number;
}

export interface PinComment {
  id: string;
  pin_id: string;
  user_id: string | null;
  body: string;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null };
}
```

**Step 6: Commit**

```bash
git add src/components/map/ src/lib/types.ts
git commit -m "feat: add Leaflet map with pin markers"
```

---

### Task 2.2: Pin API routes

**Objective:** Create API routes for CRUD operations on pins.

**Files:**
- Create: `src/app/api/pins/route.ts` — GET (list), POST (create)
- Create: `src/app/api/pins/[id]/route.ts` — GET, PATCH, DELETE
- Create: `src/app/api/pins/[id]/upvote/route.ts` — POST, DELETE
- Create: `src/app/api/pins/[id]/comments/route.ts` — GET, POST
- Create: `src/app/api/pins/[id]/flag/route.ts` — POST

**Step 1: List + Create pins**

```typescript
// src/app/api/pins/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('pins')
    .select('*, pin_upvotes(count), pin_comments(count)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flatten counts
  const pins = data.map(pin => ({
    ...pin,
    upvotes: pin.pin_upvotes?.[0]?.count ?? 0,
    comment_count: pin.pin_comments?.[0]?.count ?? 0,
    pin_upvotes: undefined,
    pin_comments: undefined,
  }));

  return NextResponse.json(pins);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { lat, lng, tag, category, description, time_of_day } = body;

  if (!lat || !lng || !tag) {
    return NextResponse.json({ error: 'lat, lng, and tag are required' }, { status: 400 });
  }

  if (!['safe', 'mixed', 'unsafe'].includes(tag)) {
    return NextResponse.json({ error: 'Invalid tag' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('pins')
    .insert({ user_id: user.id, lat, lng, tag, category, description, time_of_day })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
```

**Step 2: Single pin CRUD**

```typescript
// src/app/api/pins/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.from('pins').select('*, upvotes:pin_upvotes(count), comments:pin_comments(count)').eq('id', id).single();
  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ...data, upvotes: (data as any).upvotes?.[0]?.count ?? 0, comment_count: (data as any).comments?.[0]?.count ?? 0 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: pin } = await supabase.from('pins').select('user_id').eq('id', id).single();
  if (!pin || pin.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { data, error } = await supabase.from('pins').update(body).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: pin } = await supabase.from('pins').select('user_id').eq('id', id).single();
  if (!pin) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (pin.user_id !== user.id && user.email !== 'admin@shesafe.app') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await supabase.from('pins').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

**Step 3: Upvote route**

```typescript
// src/app/api/pins/[id]/upvote/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase.from('pin_upvotes').insert({ pin_id: id, user_id: user.id });
  if (error?.code === '23505') return NextResponse.json({ error: 'Already upvoted' }, { status: 409 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase.from('pin_upvotes').delete().eq('pin_id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

**Step 4: Comments + Flag routes**

```typescript
// src/app/api/pins/[id]/comments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.from('pin_comments').select('*, profile:profiles(display_name, avatar_url)').eq('pin_id', id).order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { body } = await request.json();
  if (!body?.trim()) return NextResponse.json({ error: 'Comment body is required' }, { status: 400 });

  const { data, error } = await supabase.from('pin_comments').insert({ pin_id: id, user_id: user.id, body }).select('*, profile:profiles(display_name, avatar_url)').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

```typescript
// src/app/api/pins/[id]/flag/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { reason } = await request.json();
  const { error } = await supabase.from('pin_flags').insert({ pin_id: id, user_id: user.id, reason });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

**Step 5: Commit**

```bash
git add src/app/api/pins/
git commit -m "feat: add pin CRUD, upvote, comment, and flag API routes"
```

---

## Phase 3: Main App UI

### Task 3.1: Main page with map + sidebar

**Objective:** Build the main page showing the full-screen map with a sidebar for filters and pin details.

**Files:**
- Modify: `src/app/page.tsx` — main map page
- Create: `src/components/map/pin-submit-dialog.tsx` — pin submission form
- Create: `src/components/map/pin-detail-panel.tsx` — click-to-view pin details
- Create: `src/components/map/pin-filters.tsx` — filter controls
- Create: `src/components/navbar.tsx` — top navigation bar

**Step 1: Navbar**

```typescript
// src/components/navbar.tsx
'use client';
import Link from 'next/link';
import { AuthButton } from './auth/auth-button';
import { Button } from '@/components/ui/button';
import { ShieldPlus } from 'lucide-react';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-[9999] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          🛡️ SheSafe?
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/pins/new"><ShieldPlus className="h-4 w-4 mr-1" />Add Pin</Link>
          </Button>
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}
```

**Step 2: Main page layout**

```typescript
// src/app/page.tsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Navbar } from '@/components/navbar';
import { Map } from '@/components/map/map';
import { PinFilters } from '@/components/map/pin-filters';
import { PinDetailPanel } from '@/components/map/pin-detail-panel';
import { PinSubmitDialog } from '@/components/map/pin-submit-dialog';
import type { Pin, SafetyTag, PinCategory, TimeOfDay } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [filteredPins, setFilteredPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [submitCoords, setSubmitCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  // Filters
  const [tagFilter, setTagFilter] = useState<SafetyTag | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<PinCategory | 'all'>('all');
  const [timeFilter, setTimeFilter] = useState<TimeOfDay | 'all'>('all');
  const [userFilter, setUserFilter] = useState<'all' | 'mine'>('all');

  const fetchPins = useCallback(async () => {
    const res = await fetch('/api/pins');
    if (res.ok) {
      const data = await res.json();
      setPins(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPins(); }, [fetchPins]);

  // Realtime subscription for new pins
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel('pins-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pins' }, (payload) => {
        setPins(prev => [payload.new as Pin, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...pins];
    if (tagFilter !== 'all') filtered = filtered.filter(p => p.tag === tagFilter);
    if (categoryFilter !== 'all') filtered = filtered.filter(p => p.category === categoryFilter);
    if (timeFilter !== 'all') filtered = filtered.filter(p => p.time_of_day === timeFilter);
    setFilteredPins(filtered);
  }, [pins, tagFilter, categoryFilter, timeFilter]);

  const handleMapClick = (lat: number, lng: number) => {
    setSubmitCoords({ lat, lng });
    setShowSubmitDialog(true);
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 border-r p-4 overflow-y-auto space-y-4 bg-background shrink-0">
          <div className="space-y-1">
            <h2 className="font-semibold text-lg">Filters</h2>
            <p className="text-xs text-muted-foreground">{filteredPins.length} pins shown</p>
          </div>
          <PinFilters
            tagFilter={tagFilter} onTagFilterChange={setTagFilter}
            categoryFilter={categoryFilter} onCategoryFilterChange={setCategoryFilter}
            timeFilter={timeFilter} onTimeFilterChange={setTimeFilter}
          />
          <div className="border-t pt-4">
            <h3 className="font-semibold text-sm mb-2">Legend</h3>
            <div className="space-y-1 text-sm">
              <div>✅ Safe</div>
              <div>⚠️ Mixed</div>
              <div>🚫 Unsafe</div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <Map
            pins={filteredPins}
            onMapClick={handleMapClick}
            onPinClick={setSelectedPin}
            selectedPinId={selectedPin?.id}
          />
        </div>

        {/* Pin detail panel */}
        <PinDetailPanel pin={selectedPin} onClose={() => setSelectedPin(null)} />
      </div>

      {/* Submit dialog */}
      <PinSubmitDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        coords={submitCoords}
        onSuccess={() => { setShowSubmitDialog(false); setSubmitCoords(null); }}
      />
    </div>
  );
}
```

**Step 3: Pin filters component**

```typescript
// src/components/map/pin-filters.tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SafetyTag, PinCategory, TimeOfDay } from '@/lib/types';

interface PinFiltersProps {
  tagFilter: SafetyTag | 'all';
  onTagFilterChange: (v: SafetyTag | 'all') => void;
  categoryFilter: PinCategory | 'all';
  onCategoryFilterChange: (v: PinCategory | 'all') => void;
  timeFilter: TimeOfDay | 'all';
  onTimeFilterChange: (v: TimeOfDay | 'all') => void;
}

export function PinFilters({ tagFilter, onTagFilterChange, categoryFilter, onCategoryFilterChange, timeFilter, onTimeFilterChange }: PinFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Safety</label>
        <Select value={tagFilter} onValueChange={(v) => onTagFilterChange(v as SafetyTag | 'all')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="safe">✅ Safe</SelectItem>
            <SelectItem value="mixed">⚠️ Mixed</SelectItem>
            <SelectItem value="unsafe">🚫 Unsafe</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Category</label>
        <Select value={categoryFilter} onValueChange={(v) => onCategoryFilterChange(v as PinCategory | 'all')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="lighting">💡 Lighting</SelectItem>
            <SelectItem value="harassment">🚨 Harassment</SelectItem>
            <SelectItem value="traffic">🚦 Traffic</SelectItem>
            <SelectItem value="security">🔒 Security</SelectItem>
            <SelectItem value="general">📍 General</SelectItem>
            <SelectItem value="other">❓ Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Time of Day</label>
        <Select value={timeFilter} onValueChange={(v) => onTimeFilterChange(v as TimeOfDay | 'all')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Time</SelectItem>
            <SelectItem value="morning">🌅 Morning</SelectItem>
            <SelectItem value="afternoon">☀️ Afternoon</SelectItem>
            <SelectItem value="evening">🌆 Evening</SelectItem>
            <SelectItem value="night">🌙 Night</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
```

**Step 4: Pin submit dialog**

```typescript
// src/components/map/pin-submit-dialog.tsx
'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import type { SafetyTag, PinCategory, TimeOfDay } from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coords: { lat: number; lng: number } | null;
  onSuccess: () => void;
}

export function PinSubmitDialog({ open, onOpenChange, coords, onSuccess }: Props) {
  const [tag, setTag] = useState<SafetyTag>('safe');
  const [category, setCategory] = useState<PinCategory>('general');
  const [description, setDescription] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('any');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!coords) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: coords.lat, lng: coords.lng, tag, category, description, time_of_day: timeOfDay }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit');
      }
      toast({ title: 'Pin submitted!', description: 'Thank you for contributing to safety.' });
      setDescription('');
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Safety Pin</DialogTitle>
          <DialogDescription>
            {coords ? `Location: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Click on the map to select a location'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Safety Level</label>
            <Select value={tag} onValueChange={(v) => setTag(v as SafetyTag)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="safe">✅ Safe</SelectItem>
                <SelectItem value="mixed">⚠️ Mixed</SelectItem>
                <SelectItem value="unsafe">🚫 Unsafe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v as PinCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lighting">💡 Lighting</SelectItem>
                <SelectItem value="harassment">🚨 Harassment</SelectItem>
                <SelectItem value="traffic">🚦 Traffic</SelectItem>
                <SelectItem value="security">🔒 Security</SelectItem>
                <SelectItem value="general">📍 General</SelectItem>
                <SelectItem value="other">❓ Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Time of Day</label>
            <Select value={timeOfDay} onValueChange={(v) => setTimeOfDay(v as TimeOfDay)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Time</SelectItem>
                <SelectItem value="morning">🌅 Morning</SelectItem>
                <SelectItem value="afternoon">☀️ Afternoon</SelectItem>
                <SelectItem value="evening">🌆 Evening</SelectItem>
                <SelectItem value="night">🌙 Night</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Description (optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your experience..."
              rows={3}
            />
          </div>
          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Submit Pin
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 5: Pin detail panel (slide-out)**

```typescript
// src/components/map/pin-detail-panel.tsx
'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThumbsUp, Flag, MessageSquare, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import type { Pin, PinComment } from '@/lib/types';

const tagLabels: Record<string, string> = { safe: '✅ Safe', mixed: '⚠️ Mixed', unsafe: '🚫 Unsafe' };

export function PinDetailPanel({ pin, onClose }: { pin: Pin | null; onClose: () => void }) {
  const [comments, setComments] = useState<PinComment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [upvoted, setUpvoted] = useState(false);

  useEffect(() => {
    if (!pin) return;
    fetch(`/api/pins/${pin.id}/comments`).then(r => r.ok && r.json().then(setComments));
  }, [pin]);

  if (!pin) return null;

  const handleUpvote = async () => {
    const res = await fetch(`/api/pins/${pin.id}/upvote`, { method: upvoted ? 'DELETE' : 'POST' });
    if (res.ok) setUpvoted(!upvoted);
    else toast({ title: 'Error', description: 'Failed to toggle upvote', variant: 'destructive' });
  };

  const handleComment = async () => {
    if (!commentBody.trim()) return;
    const res = await fetch(`/api/pins/${pin.id}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: commentBody }),
    });
    if (res.ok) {
      const comment = await res.json();
      setComments(prev => [...prev, comment]);
      setCommentBody('');
    } else toast({ title: 'Error', variant: 'destructive' });
  };

  const handleFlag = async () => {
    await fetch(`/api/pins/${pin.id}/flag`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'inappropriate' }) });
    toast({ title: 'Flagged for review' });
  };

  return (
    <div className="w-96 border-l bg-background p-4 overflow-y-auto shrink-0">
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-semibold text-lg">{tagLabels[pin.tag]}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      <div className="space-y-2 text-sm mb-4">
        <p><span className="text-muted-foreground">Category:</span> {pin.category || 'General'}</p>
        <p><span className="text-muted-foreground">Time:</span> {pin.time_of_day || 'Any'}</p>
        <p><span className="text-muted-foreground">Reported:</span> {new Date(pin.created_at).toLocaleDateString()}</p>
        {pin.description && <p className="mt-2 p-3 bg-muted rounded-md">{pin.description}</p>}
      </div>

      <div className="flex gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={handleUpvote}>
          <ThumbsUp className={`h-4 w-4 mr-1 ${upvoted ? 'fill-current' : ''}`} /> {pin.upvotes}
        </Button>
        <Button variant="outline" size="sm" onClick={handleFlag}>
          <Flag className="h-4 w-4 mr-1" /> Flag
        </Button>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-1">
          <MessageSquare className="h-4 w-4" /> Comments ({comments.length})
        </h4>
        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2">
              <Avatar className="h-6 w-6"><AvatarFallback>U</AvatarFallback></Avatar>
              <div>
                <p className="text-xs text-muted-foreground">{c.profile?.display_name || 'Anonymous'}</p>
                <p className="text-sm">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-md px-3 py-2 text-sm"
            placeholder="Add a comment..."
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleComment()}
          />
          <Button size="sm" onClick={handleComment}>Post</Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 6: Commit**

```bash
git add src/app/page.tsx src/components/map/pin-submit-dialog.tsx src/components/map/pin-detail-panel.tsx src/components/map/pin-filters.tsx src/components/navbar.tsx
git commit -m "feat: main map UI with sidebar, filters, submit dialog, and pin detail"
```

---

## Phase 4: Moderation & Admin

### Task 4.1: Moderation dashboard

**Objective:** Build an admin panel to review flagged pins with moderation actions (warn, hide, delete).

**Files:**
- Create: `src/app/admin/page.tsx` — moderation dashboard
- Create: `src/app/admin/layout.tsx` — admin layout (auth guard)

**Step 1: Admin layout with auth guard**

```typescript
// src/app/admin/layout.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Simple admin check — check if user email is authorized
  // In production, use a proper admin role in profiles table
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  if (!user || !adminEmails.includes(user.email?.toLowerCase() || '')) {
    redirect('/');
  }

  return <>{children}</>;
}
```

**Step 2: Admin dashboard**

```typescript
// src/app/admin/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface FlaggedPin {
  pin: any;
  flags: any[];
  flag_count: number;
}

export default function AdminPage() {
  const [flaggedPins, setFlaggedPins] = useState<FlaggedPin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/flags').then(r => r.ok && r.json()).then(setFlaggedPins).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (pinId: string) => {
    if (!confirm('Delete this pin permanently?')) return;
    const res = await fetch(`/api/pins/${pinId}`, { method: 'DELETE' });
    if (res.ok) {
      setFlaggedPins(prev => prev.filter(p => p.pin.id !== pinId));
      toast({ title: 'Pin deleted' });
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Moderation Dashboard</h1>
      </div>
      {flaggedPins.length === 0 ? (
        <p className="text-muted-foreground">No flagged pins to review. ✨</p>
      ) : (
        <div className="grid gap-4">
          {flaggedPins.map(({ pin, flags, flag_count }) => (
            <Card key={pin.id}>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{pin.tag} at ({pin.lat.toFixed(4)}, {pin.lng.toFixed(4)})</span>
                  <span className="text-destructive text-xs">{flag_count} flag{flag_count > 1 ? 's' : ''}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{pin.description || 'No description'}</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  {flags.map((f: any) => (
                    <p key={f.id}>Flagged: {f.reason || 'No reason'} — {new Date(f.created_at).toLocaleString()}</p>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(pin.id)}>Delete Pin</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Add admin API endpoint**

- Create: `src/app/api/admin/flags/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  if (!user || !adminEmails.includes(user.email?.toLowerCase() || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: flagGroups } = await supabase
    .from('pin_flags')
    .select('pin_id, pin:pins(*), count:pin_id')
    .order('created_at', { ascending: false });

  // Group flags by pin
  const { data: rawFlags } = await supabase.from('pin_flags').select('*, pin:pins(*)').order('created_at', { ascending: false });

  // Deduplicate by pin
  const seen = new Set();
  const grouped = rawFlags?.reduce((acc: any[], f: any) => {
    if (!seen.has(f.pin_id)) {
      seen.add(f.pin_id);
      acc.push({ pin: f.pin, flags: [f], flag_count: 1 });
    } else {
      const existing = acc.find((g: any) => g.pin.id === f.pin_id);
      if (existing) { existing.flags.push(f); existing.flag_count++; }
    }
    return acc;
  }, []) || [];

  return NextResponse.json(grouped);
}
```

**Step 4: Commit**

```bash
git add src/app/admin/ src/app/api/admin/
git commit -m "feat: add moderation dashboard for flagged pins"
```

---

## Phase 5: Polish & Deploy

### Task 5.1: Profile page

**Objective:** User profile page with their pins and stats.

**Files:**
- Create: `src/app/profile/page.tsx`

### Task 5.2: SEO & Meta

**Objective:** Add metadata, OG tags, and favicon.

- Modify: `src/app/layout.tsx` — add metadata export

### Task 5.3: Mobile responsiveness

**Objective:** Make the map and sidebar work well on mobile.

**Details:**
- Sidebar collapses to a drawer/bottom sheet on mobile (<768px)
- Submit dialog scrolls properly on small screens
- Navbar is compact

### Task 5.4: Deploy to Vercel

**Step 1: Push to GitHub**

```bash
git remote set-url origin https://github.com/sparshsam/shesafe.git
git push -u origin main
```

**Step 2: Deploy on Vercel**

- Connect GitHub repo to Vercel
- Set environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `ADMIN_EMAILS` (comma-separated)
- Deploy

**Step 3: Set up custom domain (optional)**

- Add `shesafe.app` or keep Vercel domain
- Configure DNS

**Step 4: Verify**

- Visit deployed URL
- Sign in with Google
- Drop a test pin
- Verify real-time updates work

---

## Risks & Open Questions

1. **Rate limiting:** The old app had aggressive rate limiting (1 pin per 10 min). For the new app, consider Supabase RLS-based rate limiting or a middleware check.
2. **Abuse prevention:** Beyond flags, consider:
   - Rate limiting per user (5 pins/hour)
   - IP-based rate limiting for anonymous users
   - CAPTCHA on first pin
3. **Protected zones:** The old code blocked pins near (28.6129, 77.2295) — revisit whether this is still needed and expand the zone list.
4. **Heatmap:** Consider adding a safety heatmap layer as a future enhancement.
5. **Map tiles:** Free OpenStreetMap tiles are fine for MVP but have usage limits — consider MapTiler or Mapbox for scale.
6. **Legal:** Unmoderated user content can be a liability. Add a terms-of-service page and content warning.

---

## Execution Plan

Phase | Tasks | Est. Time
------|-------|----------
Phase 0: Scaffold & Supabase | 0.1–0.2 | ~1 hour
Phase 1: Auth | 1.1 | ~1 hour
Phase 2: Map & API | 2.1–2.2 | ~2 hours
Phase 3: Main UI | 3.1 | ~2 hours
Phase 4: Moderation | 4.1 | ~1 hour
Phase 5: Polish & Deploy | 5.1–5.4 | ~1 hour

**Total: ~8 hours of implementation**

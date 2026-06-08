# Deployment

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

### Required environment variables

```
NEXT_PUBLIC_SUPABASE_URL=<your-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase-schema.sql` in the SQL editor to create tables and RLS policies.
3. Enable Supabase Auth (email/password or OAuth providers).
4. Copy your project URL and anon key into `.env.local`.

## Production Deployment (Vercel)

```bash
npx vercel --prod
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel environment variables.

## Database Migrations

Schema changes should be applied through the Supabase SQL editor or via `supabase-schema.sql` updates tracked in version control. The `supabase-schema.sql` file in the repository root is the authoritative schema reference.

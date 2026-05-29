import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client using the anon key, with NO auth cookie handling.
 * Use this for public operations that don't require authenticated sessions
 * (e.g., guest pin submissions, upvotes, comments, flags).
 *
 * RLS on the server handles access control:
 * - anon role can insert rows with a session_id
 * - authenticated role can insert with user_id
 */
export const createPublicClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

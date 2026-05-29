import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  const protectedPaths = ['/profile', '/admin'];
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p));

  if (isProtected && !user) {
    const url = new URL('/auth', request.url);
    return Response.redirect(url);
  }

  return supabaseResponse;
}

export const config = { matcher: ['/profile/:path*', '/admin/:path*'] };

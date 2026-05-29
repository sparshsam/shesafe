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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!user) return <Link href="/auth"><Button variant="default" size="sm">Sign In</Button></Link>;

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-8 w-8 cursor-pointer" onClick={handleSignOut} title="Click to sign out">
        <AvatarImage src={user.user_metadata?.avatar_url} />
        <AvatarFallback>{(user.email?.[0] || 'U').toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="text-sm hidden md:inline">{user.email || 'Anonymous'}</span>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export function AuthCard() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill in all fields');
    setLoading(true);

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Check your email for a confirmation link!', { description: 'You can close this page.' });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        window.location.href = '/';
      }
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl">🛡️ SheSafe?</CardTitle>
        <CardDescription>
          Sign in to manage your pins or access the admin dashboard.
          You don&apos;t need an account to use the map!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email/Password form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Password</label>
            <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
            {mode === 'signup' ? 'Create Account' : 'Sign In'}
          </Button>
        </form>

        {/* Toggle sign in / sign up */}
        <p className="text-xs text-center text-muted-foreground">
          {mode === 'signin' ? (
            <>Don&apos;t have an account? <button onClick={() => setMode('signup')} className="underline text-primary cursor-pointer">Sign up</button></>
          ) : (
            <>Already have an account? <button onClick={() => setMode('signin')} className="underline text-primary cursor-pointer">Sign in</button></>
          )}
        </p>

        <div className="pt-2">
          <p className="text-xs text-center text-muted-foreground">
            <Link href="/" className="underline hover:text-primary">← Back to map</Link> — no account needed to drop pins.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

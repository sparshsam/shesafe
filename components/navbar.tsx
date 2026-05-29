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
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}

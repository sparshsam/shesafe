'use client';

import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'shesafe_guest_id';

/** Get or create a persistent guest session ID stored in localStorage. */
export function getGuestSession(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** In-memory rate-limit counter for the current session. */
const actionCounts: Record<string, { count: number; resetAt: number }> = {};

const LIMITS: Record<string, number> = {
  pins: 5,       // max 5 pins per hour
  upvotes: 30,   // max 30 upvotes per hour
  comments: 10,  // max 10 comments per hour
  flags: 5,      // max 5 flags per hour
};

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Check if a guest action is rate-limited.
 * Returns true if the action is allowed, false if rate-limited.
 */
export function checkRateLimit(action: string): boolean {
  const now = Date.now();
  const key = action;

  if (!actionCounts[key] || now > actionCounts[key].resetAt) {
    actionCounts[key] = { count: 1, resetAt: now + WINDOW_MS };
    return true;
  }

  if (actionCounts[key].count >= (LIMITS[key] ?? 100)) {
    return false;
  }

  actionCounts[key].count++;
  return true;
}

/** Get remaining actions allowed for a given action type. */
export function getRemaining(action: string): number {
  const key = action;
  const entry = actionCounts[key];
  if (!entry) return LIMITS[key] ?? 100;
  return Math.max(0, (LIMITS[key] ?? 100) - entry.count);
}

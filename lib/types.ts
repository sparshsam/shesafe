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

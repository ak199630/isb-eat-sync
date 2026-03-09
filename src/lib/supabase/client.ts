import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/** Returns Supabase client, or null if env vars are not set (e.g. before .env.local is configured). */
export function createClient(): SupabaseClient | null {
  if (cached) return cached;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  cached = createSupabaseClient(supabaseUrl, supabaseAnonKey);
  return cached;
}

export const SUPABASE_NOT_CONFIGURED =
  "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and run the schema migrations.";

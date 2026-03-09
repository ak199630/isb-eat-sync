/** Database row types (snake_case) for Supabase responses */

export interface DbStall {
  id: string;
  location_id: string;
  name: string;
  status: "open" | "busy" | "closed";
  default_prep_time_minutes: number;
  current_prep_time_minutes: number;
  requires_authorized_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbMenuItem {
  id: string;
  stall_id: string;
  name: string;
  price_cents: number;
  category: string;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbMenuItemWithStall extends DbMenuItem {
  stalls?: DbStall | null;
}

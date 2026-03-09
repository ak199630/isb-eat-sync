import { createClient, SUPABASE_NOT_CONFIGURED } from "@/lib/supabase/client";
import type { ResidentialBlock } from "@/types";

export async function fetchResidentialBlocks(): Promise<ResidentialBlock[]> {
  const supabase = createClient();
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED);

  const { data, error } = await supabase
    .from("residential_blocks")
    .select("id, code, display_name")
    .order("code");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    displayName: row.display_name,
  }));
}

import { createClient, SUPABASE_NOT_CONFIGURED } from "@/lib/supabase/client";

/**
 * Returns walk time in minutes from residential block to stall.
 * Used for "Leave now" calculation: leave_at = target_pickup_start - walk_minutes - 2.
 */
export async function getWalkMinutes(
  residentialBlockId: string,
  stallId: string
): Promise<number> {
  const supabase = createClient();
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED);

  const { data: stall, error: stallErr } = await supabase
    .from("stalls")
    .select("location_id")
    .eq("id", stallId)
    .single();

  if (stallErr || !stall) throw new Error("Stall not found");

  const { data: wt, error: wtErr } = await supabase
    .from("walk_times")
    .select("walk_minutes")
    .eq("residential_block_id", residentialBlockId)
    .eq("stall_location_id", stall.location_id)
    .single();

  if (wtErr || !wt) throw new Error("Walk time not found for this block and stall");
  return wt.walk_minutes;
}

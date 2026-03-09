import { createClient, SUPABASE_NOT_CONFIGURED } from "@/lib/supabase/client";
import type { User } from "@/types";

export async function createUserProfile(
  authUserId: string,
  email: string,
  displayName: string,
  residentialBlockId: string | null
): Promise<void> {
  const supabase = createClient();
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED);

  const { error } = await supabase.from("users").insert({
    id: authUserId,
    email,
    display_name: displayName,
    role: "student",
    residential_block_id: residentialBlockId,
  });

  if (error) throw new Error(error.message);
}

export async function fetchUserProfile(userId: string): Promise<User | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("users")
    .select("id, display_name, role, residential_block_id, stall_id")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    displayName: data.display_name,
    role: data.role as User["role"],
    residentialBlockId: data.residential_block_id ?? null,
    stallId: data.stall_id ?? null,
  };
}

export async function updateUserResidentialBlock(
  userId: string,
  residentialBlockId: string | null
): Promise<void> {
  const supabase = createClient();
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED);

  const { error } = await supabase
    .from("users")
    .update({ residential_block_id: residentialBlockId })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

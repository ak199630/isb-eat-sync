import { createClient, SUPABASE_NOT_CONFIGURED } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stall, MenuItem } from "@/types";
import type { DbStall, DbMenuItem } from "./types";

function mapDbStall(row: DbStall, menuRows: DbMenuItem[]): Stall {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    estimatedPrepTimeMinutes: row.current_prep_time_minutes,
    requiresAuthorizedRole: row.requires_authorized_role,
    menuItems: menuRows
      .filter((m) => m.stall_id === row.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(mapDbMenuItem),
  };
}

function mapDbMenuItem(row: DbMenuItem): MenuItem {
  return {
    id: row.id,
    name: row.name,
    price: row.price_cents / 100,
    category: row.category as MenuItem["category"],
    isAvailable: row.is_available,
  };
}

/** Long enough for a paused Supabase project (free tier) to wake on first request. */
const STALLS_FETCH_TIMEOUT_MS = 25_000;
const STALLS_CACHE_TTL_MS = 30_000; // 30s: instant back-navigation, Realtime still refreshes

let stallsCache: { data: Stall[]; expiresAt: number } | null = null;

/** Clear stalls cache (e.g. after Realtime update so next load is fresh). */
export function invalidateStallsCache(): void {
  stallsCache = null;
}

/** Single query: stalls + nested menu_items (one round-trip, smaller payload). Cached 30s. */
export async function fetchStallsWithMenu(): Promise<Stall[]> {
  const now = Date.now();
  if (stallsCache && stallsCache.expiresAt > now) return stallsCache.data;

  const supabase = createClient();
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED);

  const fetchWithTimeout = async () => {
    const { data, error } = await supabase
      .from("stalls")
      .select(
        `
        id,
        name,
        status,
        current_prep_time_minutes,
        requires_authorized_role,
        menu_items (
          id,
          stall_id,
          name,
          price_cents,
          category,
          is_available,
          sort_order
        )
        `
      )
      .order("name");

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<
      Omit<DbStall, "location_id" | "default_prep_time_minutes" | "created_at" | "updated_at"> & {
        menu_items: DbMenuItem[] | null;
      }
    >;

    const result = rows.map((row) => {
      const menuRows = row.menu_items ?? [];
      menuRows.sort((a, b) => a.sort_order - b.sort_order);
      return mapDbStall(
        {
          ...row,
          location_id: "",
          default_prep_time_minutes: row.current_prep_time_minutes,
          created_at: "",
          updated_at: "",
        } as DbStall,
        menuRows
      );
    });

    stallsCache = { data: result, expiresAt: now + STALLS_CACHE_TTL_MS };
    return result;
  };

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () =>
        reject(
          new Error(
            "Connection timed out. Your Supabase project may be paused (free tier). Open your project in the Supabase Dashboard to wake it up, then Retry. Or check .env.local (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY). Test connectivity: GET /api/health"
          )
        ),
      STALLS_FETCH_TIMEOUT_MS
    );
  });

  return Promise.race([fetchWithTimeout(), timeoutPromise]);
}

export async function updateMenuItemAvailability(
  itemId: string,
  isAvailable: boolean
): Promise<void> {
  const supabase = createClient();
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED);
  const { error } = await supabase
    .from("menu_items")
    .update({ is_available: isAvailable })
    .eq("id", itemId);

  if (error) throw new Error(error.message);
}

export async function updateStallStatus(
  stallId: string,
  status: "open" | "busy" | "closed"
): Promise<void> {
  const supabase = createClient();
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED);
  const { error } = await supabase
    .from("stalls")
    .update({ status })
    .eq("id", stallId);

  if (error) throw new Error(error.message);
}

export async function updateStallPrepTime(
  stallId: string,
  currentPrepTimeMinutes: number
): Promise<void> {
  const supabase = createClient();
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED);
  const { error } = await supabase
    .from("stalls")
    .update({ current_prep_time_minutes: currentPrepTimeMinutes })
    .eq("id", stallId);

  if (error) throw new Error(error.message);
}

export async function fetchStallName(stallId: string): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("stalls")
    .select("name")
    .eq("id", stallId)
    .single();
  if (error || !data) return null;
  return data.name as string;
}

/** Get stall's current prep time in minutes (for queue ETA). */
export async function getStallPrepTimeMinutes(stallId: string): Promise<number> {
  const supabase = createClient();
  if (!supabase) return 15;
  const { data, error } = await supabase
    .from("stalls")
    .select("current_prep_time_minutes")
    .eq("id", stallId)
    .single();
  if (error || !data) return 15;
  return (data.current_prep_time_minutes as number) ?? 15;
}

/** For vendor dashboard: name and current status (Open / Busy / Closed). */
export async function fetchStallForVendor(
  stallId: string
): Promise<{ name: string; status: "open" | "busy" | "closed" } | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("stalls")
    .select("name, status")
    .eq("id", stallId)
    .single();
  if (error || !data) return null;
  return {
    name: data.name as string,
    status: data.status as "open" | "busy" | "closed",
  };
}

/** Menu item row for vendor sold-out management. */
export interface VendorMenuItem {
  id: string;
  name: string;
  category: string;
  priceCents: number;
  isAvailable: boolean;
  sortOrder: number;
  /** NULL = manual mode. Set = inventory tracking; decrements on fulfill. */
  initialInventory: number | null;
  currentInventory: number | null;
}

/** Fetch menu items for a stall (vendor menu / availability page). */
export async function fetchMenuItemsForStall(
  stallId: string
): Promise<VendorMenuItem[]> {
  const supabase = createClient();
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED);
  const { data, error } = await supabase
    .from("menu_items")
    .select("id, name, category, price_cents, is_available, sort_order, initial_inventory, current_inventory")
    .eq("stall_id", stallId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    category: row.category as string,
    priceCents: row.price_cents as number,
    isAvailable: row.is_available as boolean,
    sortOrder: row.sort_order as number,
    initialInventory: (row.initial_inventory as number | null) ?? null,
    currentInventory: (row.current_inventory as number | null) ?? null,
  }));
}

/** Set initial inventory for an item (enables inventory mode). Sets current_inventory and is_available = true if qty > 0. */
export async function setInitialInventory(
  menuItemId: string,
  quantity: number
): Promise<void> {
  if (quantity < 0) throw new Error("Quantity must be >= 0");
  const supabase = createClient();
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED);
  const { error } = await supabase
    .from("menu_items")
    .update({
      initial_inventory: quantity,
      current_inventory: quantity,
      is_available: quantity > 0,
    })
    .eq("id", menuItemId);
  if (error) throw new Error(error.message);
}

/** Switch item to manual mode (no inventory tracking). Clears initial/current inventory. */
export async function switchToManualMode(menuItemId: string): Promise<void> {
  const supabase = createClient();
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED);
  const { error } = await supabase
    .from("menu_items")
    .update({ initial_inventory: null, current_inventory: null })
    .eq("id", menuItemId);
  if (error) throw new Error(error.message);
}

/** Restock: set current_inventory to a new value and set is_available = true if > 0. */
export async function restockInventory(
  menuItemId: string,
  quantity: number
): Promise<void> {
  if (quantity < 0) throw new Error("Quantity must be >= 0");
  const supabase = createClient();
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED);
  const { error } = await supabase
    .from("menu_items")
    .update({
      current_inventory: quantity,
      is_available: quantity > 0,
    })
    .eq("id", menuItemId);
  if (error) throw new Error(error.message);
}

/** Decrement inventory for each order_item when order is fulfilled. Items with current_inventory NULL are skipped. At 0, is_available = false. */
export async function decrementInventoryForFulfilledOrder(
  orderId: string,
  supabaseInstance?: SupabaseClient
): Promise<void> {
  const supabase = supabaseInstance ?? createClient();
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED);

  const { data: orderItems, error: fetchErr } = await supabase
    .from("order_items")
    .select("menu_item_id, quantity")
    .eq("order_id", orderId);

  if (fetchErr) throw new Error(fetchErr.message);
  if (!orderItems?.length) return;

  for (const row of orderItems as { menu_item_id: string; quantity: number }[]) {
    const { data: item, error: itemErr } = await supabase
      .from("menu_items")
      .select("id, current_inventory, is_available")
      .eq("id", row.menu_item_id)
      .single();

    if (itemErr || !item) continue;
    const current = (item as { current_inventory: number | null }).current_inventory;
    if (current === null) continue; // manual mode

    const newQty = Math.max(0, current - row.quantity);
    const { error: updateErr } = await supabase
      .from("menu_items")
      .update({
        current_inventory: newQty,
        is_available: newQty > 0,
      })
      .eq("id", row.menu_item_id);
    if (updateErr) throw new Error(updateErr.message);
  }
}

/** Set all menu items for a stall to available or unavailable (bulk sold out). */
export async function setAllMenuItemsAvailability(
  stallId: string,
  isAvailable: boolean
): Promise<void> {
  const supabase = createClient();
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED);
  const { error } = await supabase
    .from("menu_items")
    .update({ is_available: isAvailable })
    .eq("stall_id", stallId);
  if (error) throw new Error(error.message);
}

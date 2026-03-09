import { createClient, SUPABASE_NOT_CONFIGURED } from "@/lib/supabase/client";
import { getStallPrepTimeMinutes } from "@/lib/db/stalls";
import type { VendorOrderListItem } from "@/types";

const STATUS_FILTER_VALUES = [
  "all",
  "pending",
  "accepted",
  "preparing",
  "ready_for_pickup",
  "fulfilled",
] as const;
export type VendorOrderStatusFilter = (typeof STATUS_FILTER_VALUES)[number];

function shortId(orderId: string): string {
  return orderId.replace(/-/g, "").slice(-6).toUpperCase();
}

/**
 * Today in local date (start and end of day in ISO for the app timezone).
 * Uses UTC for simplicity; for strict "campus day" use a fixed offset or env TZ.
 */
function todayStartEnd(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export async function fetchVendorOrders(
  stallId: string,
  statusFilter: VendorOrderStatusFilter = "all"
): Promise<VendorOrderListItem[]> {
  const supabase = createClient();
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED);

  const { start, end } = todayStartEnd();

  let query = supabase
    .from("orders")
    .select(
      `
      id,
      status,
      target_pickup_start,
      target_pickup_end,
      total_cents,
      order_notes,
      customer_left_at,
      assigned_to,
      created_at,
      residential_blocks (code),
      order_items (quantity, menu_items (name))
    `
    )
    .eq("stall_id", stallId)
    .gte("target_pickup_start", start)
    .lt("target_pickup_start", end)
    .neq("status", "cancelled")
    .order("target_pickup_start", { ascending: true })
    .order("created_at", { ascending: true });

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const [ordersResult, prepMinutes] = await Promise.all([
    query,
    getStallPrepTimeMinutes(stallId),
  ]);

  const { data: orders, error } = ordersResult;
  if (error) throw new Error(error.message);

  const rows = (orders ?? []) as Array<Record<string, unknown>>;
  const list: VendorOrderListItem[] = rows.map((row) => {
    const block = row.residential_blocks as { code: string } | { code: string }[] | null;
    const blockCode = Array.isArray(block) ? block[0]?.code : block?.code;
    const items = (row.order_items ?? []) as Array<{
      quantity: number;
      menu_items: { name: string } | { name: string }[] | null;
    }>;
    const names = items.map((i) => {
      const mi = i.menu_items;
      const name = Array.isArray(mi) ? mi[0]?.name : mi?.name;
      return `${i.quantity}× ${name ?? "?"}`;
    });
    const itemSummary = names.slice(0, 3).join(", ") + (names.length > 3 ? "…" : "");
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

    return {
      id: row.id as string,
      shortId: shortId(row.id as string),
      status: row.status as string,
      targetPickupStart: new Date(row.target_pickup_start as string),
      targetPickupEnd: new Date(row.target_pickup_end as string),
      totalCents: row.total_cents as number,
      itemSummary: itemSummary || "—",
      itemCount,
      residentialBlockCode: blockCode ?? null,
      orderNotes: (row.order_notes as string | null) ?? null,
      customerLeftAt: row.customer_left_at ? new Date(row.customer_left_at as string) : null,
      assignedTo: (row.assigned_to as string | null) ?? null,
      estimatedReadyAt: null,
      createdAt: new Date(row.created_at as string),
    };
  });

  // Queue = accepted + preparing, same order (pickup then created_at). Compute ETA for each.
  const queue = list.filter((o) => o.status === "accepted" || o.status === "preparing");
  const now = new Date();
  queue.forEach((order, index) => {
    const orderInList = list.find((o) => o.id === order.id);
    if (!orderInList) return;
    const minutesAhead = (index + 1) * prepMinutes;
    const readyAt = new Date(now.getTime() + minutesAhead * 60 * 1000);
    orderInList.estimatedReadyAt = readyAt;
  });

  return list;
}

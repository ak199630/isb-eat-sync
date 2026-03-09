import { createClient, SUPABASE_NOT_CONFIGURED } from "@/lib/supabase/client";
import type { CartItem } from "@/types";

export interface CreateOrderInput {
  userId: string | null;
  guestResidentialBlockId: string | null;
  stallId: string;
  items: CartItem[];
  targetPickupStart: Date;
  targetPickupEnd: Date;
  prepTimeMinutes: number;
}

export interface CreateOrderResult {
  orderId: string;
  qrToken: string;
}

function generateQrToken(): string {
  return `ord_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const supabase = createClient();
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED);

  if (!input.guestResidentialBlockId) {
    throw new Error("Residential block is required for walk time");
  }

  const totalCents = input.items.reduce(
    (sum, i) => sum + Math.round(i.price * 100) * i.quantity,
    0
  );
  const qrToken = generateQrToken();

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      user_id: input.userId ?? null,
      guest_residential_block_id: input.guestResidentialBlockId,
      stall_id: input.stallId,
      status: "pending",
      target_pickup_start: input.targetPickupStart.toISOString(),
      target_pickup_end: input.targetPickupEnd.toISOString(),
      prep_time_minutes: input.prepTimeMinutes,
      total_cents: totalCents,
      qr_token: qrToken,
    })
    .select("id")
    .single();

  if (orderErr) throw new Error(orderErr.message);
  if (!order) throw new Error("Failed to create order");

  const orderItems = input.items.map((item) => ({
    order_id: order.id,
    menu_item_id: item.menuItemId,
    quantity: item.quantity,
    unit_price_cents: Math.round(item.price * 100),
  }));

  const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
  if (itemsErr) throw new Error(itemsErr.message);

  return { orderId: order.id, qrToken };
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["preparing"],
  preparing: ["ready_for_pickup"],
  ready_for_pickup: ["fulfilled"],
};

export type OrderStatusUpdate =
  | "accepted"
  | "preparing"
  | "ready_for_pickup"
  | "fulfilled"
  | "cancelled";

/** Vendor updates order status. RLS ensures only their stall. Validates allowed transitions. */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatusUpdate,
  cancelledReason?: string | null
): Promise<void> {
  const supabase = createClient();
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED);

  const { data: existing } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();

  if (!existing) throw new Error("Order not found");
  const current = existing.status as string;
  const allowed = ALLOWED_TRANSITIONS[current];
  if (!allowed?.includes(newStatus)) {
    throw new Error(`Cannot change status from ${current} to ${newStatus}`);
  }

  const payload: {
    status: string;
    cancelled_reason?: string | null;
    fulfilled_at?: string;
  } = { status: newStatus };
  if (newStatus === "cancelled" && cancelledReason !== undefined) {
    payload.cancelled_reason = cancelledReason || null;
  }
  if (newStatus === "fulfilled") {
    payload.fulfilled_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("orders")
    .update(payload)
    .eq("id", orderId);

  if (error) throw new Error(error.message);
}

/** Vendor sets free-text "Assigned to" (cook or station). RLS restricts to their stall. */
export async function updateOrderAssignedTo(
  orderId: string,
  assignedTo: string | null
): Promise<void> {
  const supabase = createClient();
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED);
  const { error } = await supabase
    .from("orders")
    .update({ assigned_to: assignedTo?.trim() || null })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
}

export async function fetchOrderById(orderId: string) {
  const supabase = createClient();
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED);

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(`
      id,
      user_id,
      guest_residential_block_id,
      stall_id,
      status,
      target_pickup_start,
      target_pickup_end,
      prep_time_minutes,
      total_cents,
      qr_token,
      leave_now_notification_sent_at,
      cancelled_reason,
      customer_left_at,
      created_at,
      stalls (name),
      users (residential_block_id)
    `)
    .eq("id", orderId)
    .single();

  if (orderErr || !order) throw new Error("Order not found");

  const stallData = order.stalls as { name: string } | { name: string }[] | null;
  const stall = Array.isArray(stallData) ? stallData[0] : stallData;
  const stallName = stall?.name ?? "Stall";

  const userData = order.users as { residential_block_id: string } | { residential_block_id: string }[] | null;
  const user = Array.isArray(userData) ? userData[0] : userData;
  const userBlockId = user?.residential_block_id;

  return {
    id: order.id,
    stallId: order.stall_id,
    stallName,
    status: order.status,
    targetPickupStart: new Date(order.target_pickup_start),
    targetPickupEnd: new Date(order.target_pickup_end),
    prepTimeMinutes: order.prep_time_minutes,
    totalCents: order.total_cents,
    qrToken: order.qr_token,
    residentialBlockId: order.guest_residential_block_id ?? userBlockId ?? null,
    leaveNowNotificationSentAt: order.leave_now_notification_sent_at
      ? new Date(order.leave_now_notification_sent_at)
      : null,
    cancelledReason: (order as { cancelled_reason?: string | null }).cancelled_reason ?? null,
    customerLeftAt: (order as { customer_left_at?: string | null }).customer_left_at
      ? new Date((order as { customer_left_at: string }).customer_left_at)
      : null,
    createdAt: new Date(order.created_at),
  };
}

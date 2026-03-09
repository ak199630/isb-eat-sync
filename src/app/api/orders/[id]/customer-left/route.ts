import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/orders/[id]/customer-left
 * Customer taps "I'm leaving". Sets orders.customer_left_at once (idempotent).
 * Works for guest and logged-in. Vendor sees it on dashboard.
 * Set SUPABASE_SERVICE_ROLE_KEY in .env.local so this update is allowed (RLS does not let anon update orders).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: "Order ID required" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("id, customer_left_at, status")
    .eq("id", orderId)
    .single();

  if (fetchErr || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if ((order as { customer_left_at: string | null }).customer_left_at) {
    return NextResponse.json({ ok: true, alreadySet: true });
  }

  const status = (order as { status: string }).status;
  if (status === "fulfilled" || status === "cancelled") {
    return NextResponse.json({ error: "Order no longer active" }, { status: 400 });
  }

  const { error: updateErr } = await supabase
    .from("orders")
    .update({ customer_left_at: new Date().toISOString() })
    .eq("id", orderId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

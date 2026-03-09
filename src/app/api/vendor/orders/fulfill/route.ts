import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrementInventoryForFulfilledOrder } from "@/lib/db/stalls";

/**
 * POST /api/vendor/orders/fulfill
 * Body: { qrToken: string }
 * Vendor scans customer's order QR; we validate qr_token, stall, and status (ready_for_pickup), then set fulfilled and decrement inventory.
 * Requires authenticated vendor session (cookie).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, stall_id")
    .eq("id", session.user.id)
    .single();

  if (
    !profile ||
    (profile as { role: string }).role !== "vendor" ||
    !(profile as { stall_id: string | null }).stall_id
  ) {
    return NextResponse.json({ error: "Vendor access required" }, { status: 403 });
  }

  const stallId = (profile as { stall_id: string }).stall_id;

  let body: { qrToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const qrToken =
    typeof body.qrToken === "string" ? body.qrToken.trim() : "";
  if (!qrToken) {
    return NextResponse.json(
      { error: "qrToken is required" },
      { status: 400 }
    );
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, status, stall_id")
    .eq("qr_token", qrToken)
    .single();

  if (orderErr || !order) {
    return NextResponse.json(
      { error: "Order not found or not for your stall" },
      { status: 404 }
    );
  }

  const orderStallId = (order as { stall_id: string }).stall_id;
  if (orderStallId !== stallId) {
    return NextResponse.json(
      { error: "Order not found or not for your stall" },
      { status: 404 }
    );
  }

  const status = (order as { status: string }).status;
  if (status !== "ready_for_pickup") {
    return NextResponse.json(
      {
        error:
          status === "fulfilled"
            ? "Order already fulfilled"
            : "Order must be marked Ready for pickup before scanning",
      },
      { status: 400 }
    );
  }

  const orderId = (order as { id: string }).id;

  const { error: updateErr } = await supabase
    .from("orders")
    .update({
      status: "fulfilled",
      fulfilled_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateErr) {
    return NextResponse.json(
      { error: updateErr.message },
      { status: 500 }
    );
  }

  try {
    await decrementInventoryForFulfilledOrder(orderId, supabase);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update inventory" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, orderId });
}

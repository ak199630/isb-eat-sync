import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Cron endpoint: finds orders due for "Leave now" and marks notification sent.
 * Call every minute: GET /api/leave-now (with CRON_SECRET header for auth).
 *
 * FCM push: To send actual push, add firebase-admin and call for each user with fcm_token.
 * For Sprint 2 we only update leave_now_notification_sent_at; FCM can be added when configured.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      id,
      user_id,
      guest_residential_block_id,
      stall_id,
      target_pickup_start,
      leave_now_notification_sent_at,
      stalls (name, location_id),
      users (fcm_token)
    `)
    .is("leave_now_notification_sent_at", null)
    .in("status", ["accepted", "preparing", "ready_for_pickup"]);

  if (!orders?.length) {
    return NextResponse.json({ processed: 0 });
  }

  const now = new Date();
  const toNotify: { orderId: string; fcmToken: string | null }[] = [];

  for (const o of orders) {
    const targetStart = new Date(o.target_pickup_start);
    const blockId = o.guest_residential_block_id;
    const stallData = o.stalls as { name: string; location_id: string } | { name: string; location_id: string }[] | null;
    const stall = Array.isArray(stallData) ? stallData[0] : stallData;
    if (!blockId || !stall?.location_id) continue;

    const { data: wt } = await supabase
      .from("walk_times")
      .select("walk_minutes")
      .eq("residential_block_id", blockId)
      .eq("stall_location_id", stall.location_id)
      .single();

    if (!wt) continue;
    const leaveBy = new Date(targetStart);
    leaveBy.setMinutes(leaveBy.getMinutes() - wt.walk_minutes - 2);

    if (now >= leaveBy) {
      const userData = o.users as { fcm_token: string } | { fcm_token: string }[] | null;
      const user = Array.isArray(userData) ? userData[0] : userData;
      const fcmToken = o.user_id ? user?.fcm_token ?? null : null;
      toNotify.push({ orderId: o.id, fcmToken });
    }
  }

  for (const { orderId, fcmToken } of toNotify) {
    await supabase
      .from("orders")
      .update({ leave_now_notification_sent_at: new Date().toISOString() })
      .eq("id", orderId);

    // TODO: Send FCM when firebase-admin is configured
    // if (fcmToken) { await sendFcm(fcmToken, "Time to head out!", `Leave now for your pickup.`); }
  }

  return NextResponse.json({ processed: toNotify.length });
}

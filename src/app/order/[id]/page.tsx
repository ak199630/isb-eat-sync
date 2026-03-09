"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchOrderById } from "@/lib/db/orders";
import { getWalkMinutes } from "@/lib/db/walkTimes";

const LEAVE_BUFFER_MINUTES = 2;

export default function OrderPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<{
    id: string;
    stallName: string;
    status: string;
    targetPickupStart: Date;
    targetPickupEnd: Date;
    prepTimeMinutes: number;
    totalCents: number;
    qrToken: string;
    residentialBlockId: string | null;
    leaveNowNotificationSentAt: Date | null;
    cancelledReason: string | null;
    customerLeftAt: Date | null;
    createdAt: Date;
  } | null>(null);
  const [leaveAt, setLeaveAt] = useState<Date | null>(null);
  const [showLeaveNow, setShowLeaveNow] = useState(false);
  const [customerLeftSending, setCustomerLeftSending] = useState(false);
  const [customerLeftSent, setCustomerLeftSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrderById(orderId)
      .then(async (o) => {
        setOrder(o);
        if (o.customerLeftAt) setCustomerLeftSent(true);
        if (o.residentialBlockId) {
          const walkMins = await getWalkMinutes(o.residentialBlockId, o.stallId);
          const leave = new Date(o.targetPickupStart);
          leave.setMinutes(leave.getMinutes() - walkMins - LEAVE_BUFFER_MINUTES);
          setLeaveAt(leave);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load order"));
  }, [orderId]);

  const handleCustomerLeft = async () => {
    if (!order || customerLeftSent || customerLeftSending) return;
    setCustomerLeftSending(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/customer-left`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to notify");
      setCustomerLeftSent(true);
      setOrder((prev) => prev ? { ...prev, customerLeftAt: new Date() } : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to notify stall");
    } finally {
      setCustomerLeftSending(false);
    }
  };

  useEffect(() => {
    if (!leaveAt) return;
    const check = () => {
      if (new Date() >= leaveAt) setShowLeaveNow(true);
    };
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [leaveAt]);

  if (error) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <p className="text-destructive">{error}</p>
        <Link href="/" className="mt-2 inline-block text-primary underline-offset-4 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Loading order…</p>
      </div>
    );
  }

  const pickupWindow = `${formatTime(order.targetPickupStart)} - ${formatTime(order.targetPickupEnd)}`;

  if (order.status === "cancelled") {
    return (
      <div className="container mx-auto max-w-2xl space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Order #{order.id.slice(0, 8)}</h1>
        </div>
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle>Order could not be fulfilled</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              This order was cancelled by {order.stallName}.
              {order.cancelledReason ? ` Reason: ${order.cancelledReason}` : ""}
            </p>
            <p className="mt-2 text-sm">Contact the stall if you have questions.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-6">
      {showLeaveNow && (
        <div className="rounded-lg border-2 border-primary bg-primary/10 p-4 text-center">
          <p className="text-lg font-bold text-primary">Time to head out!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Leave now to reach {order.stallName} in time for your pickup.
          </p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Order #{order.id.slice(0, 8)}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{order.stallName}</CardTitle>
          <p className="text-sm text-muted-foreground capitalize">{order.status.replace(/_/g, " ")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Pickup: {pickupWindow}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Total: ₹{(order.totalCents / 100).toFixed(0)}</span>
          </div>
          {leaveAt && !showLeaveNow && (
            <p className="text-sm text-muted-foreground">
              Leave by {formatTime(leaveAt)} to arrive on time.
            </p>
          )}
        </CardContent>
      </Card>

      {order.status !== "fulfilled" && order.status !== "cancelled" && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            {customerLeftSent || order.customerLeftAt ? (
              <p className="text-center font-medium text-primary">
                Vendor notified — they know you&apos;re on your way.
              </p>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <p className="text-center text-sm text-muted-foreground">
                  Tap when you leave so the stall can time your order.
                </p>
                <button
                  type="button"
                  onClick={handleCustomerLeft}
                  disabled={customerLeftSending}
                  className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {customerLeftSending ? "Sending…" : "I'm leaving"}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/20">
        <CardContent className="flex flex-col items-center gap-2 pt-6">
          <p className="text-center text-sm font-medium">
            Show this QR at pickup for the vendor to scan
          </p>
          <div className="rounded-lg border bg-white p-3">
            <QRCodeSVG
              value={order.qrToken}
              size={180}
              level="M"
              includeMargin
              aria-label="Order QR code for vendor scan"
            />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Order #{order.id.slice(0, 8)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function formatTime(d: Date): string {
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

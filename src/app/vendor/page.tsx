"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchVendorOrders,
  type VendorOrderStatusFilter,
} from "@/lib/db/vendorOrders";
import { updateOrderStatus, updateOrderAssignedTo, type OrderStatusUpdate } from "@/lib/db/orders";
import { decrementInventoryForFulfilledOrder } from "@/lib/db/stalls";
import { VendorScanQR } from "@/components/vendor/VendorScanQR";
import type { VendorOrderListItem } from "@/types";

const FILTERS: { value: VendorOrderStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "preparing", label: "Preparing" },
  { value: "ready_for_pickup", label: "Ready" },
  { value: "fulfilled", label: "Fulfilled" },
];

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatPickupWindow(start: Date, end: Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

function statusLabel(s: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    accepted: "Accepted",
    preparing: "Preparing",
    ready_for_pickup: "Ready",
    fulfilled: "Fulfilled",
    cancelled: "Cancelled",
  };
  return labels[s] ?? s;
}

function OrderCard({
  order,
  onStatusChange,
  onAssignedToChange,
  updatingId,
}: {
  order: VendorOrderListItem;
  onStatusChange: (orderId: string, status: OrderStatusUpdate, cancelledReason?: string | null) => Promise<void>;
  onAssignedToChange: (orderId: string, assignedTo: string | null) => Promise<void>;
  updatingId: string | null;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [assignedInput, setAssignedInput] = useState(order.assignedTo ?? "");
  const [assignedSaving, setAssignedSaving] = useState(false);
  const updating = updatingId === order.id;

  useEffect(() => {
    setAssignedInput(order.assignedTo ?? "");
  }, [order.assignedTo]);

  const saveAssignedTo = () => {
    const val = assignedInput.trim() || null;
    if (val === (order.assignedTo ?? "") || (val === null && !order.assignedTo)) return;
    setAssignedSaving(true);
    onAssignedToChange(order.id, val).finally(() => setAssignedSaving(false));
  };

  const handleAccept = () => onStatusChange(order.id, "accepted");
  const handleReject = async () => {
    if (!rejecting) {
      setRejecting(true);
      return;
    }
    await onStatusChange(order.id, "cancelled", rejectReason || null);
    setRejecting(false);
    setRejectReason("");
  };
  const handleStartPreparing = () => onStatusChange(order.id, "preparing");
  const handleMarkReady = () => onStatusChange(order.id, "ready_for_pickup");
  const handleFulfill = () => onStatusChange(order.id, "fulfilled");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="font-mono text-sm text-muted-foreground">
          #{order.shortId}
        </span>
        <Badge variant="secondary">{statusLabel(order.status)}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          <span className="text-muted-foreground">Pickup:</span>{" "}
          {formatPickupWindow(order.targetPickupStart, order.targetPickupEnd)}
        </p>
        <p>
          <span className="text-muted-foreground">Total:</span> ₹
          {(order.totalCents / 100).toFixed(0)}
        </p>
        <p>
          <span className="text-muted-foreground">Items:</span> {order.itemSummary}{" "}
          {order.itemCount > 0 && `(${order.itemCount})`}
        </p>
        <p>
          <span className="text-muted-foreground">Block:</span>{" "}
          {order.residentialBlockCode ?? "—"}
        </p>
        {order.customerLeftAt && (
          <p className="text-green-600 font-medium">
            Customer left at {formatTime(order.customerLeftAt)}
          </p>
        )}
        {order.orderNotes && (
          <p>
            <span className="text-muted-foreground">Notes:</span>{" "}
            {order.orderNotes}
          </p>
        )}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground shrink-0">Assigned to:</span>
          <input
            type="text"
            value={assignedInput}
            onChange={(e) => setAssignedInput(e.target.value)}
            onBlur={saveAssignedTo}
            onKeyDown={(e) => e.key === "Enter" && saveAssignedTo()}
            placeholder="Name or station…"
            className="max-w-[140px] rounded-md border bg-background px-2 py-1 text-sm"
          />
          {assignedSaving && (
            <span className="text-muted-foreground text-xs">Saving…</span>
          )}
        </div>
        {order.estimatedReadyAt && (
          <p className="text-primary font-medium">
            {(() => {
              const mins = Math.round((order.estimatedReadyAt.getTime() - Date.now()) / 60000);
              if (mins <= 0) return <>Ready by {formatTime(order.estimatedReadyAt)}</>;
              return (
                <>Ready in ~{mins} min <span className="text-muted-foreground font-normal">(by {formatTime(order.estimatedReadyAt)})</span></>
              );
            })()}
          </p>
        )}

        {/* Status actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {order.status === "pending" && (
            <>
              <Button size="sm" onClick={handleAccept} disabled={updating}>
                Accept
              </Button>
              {!rejecting ? (
                <Button size="sm" variant="outline" onClick={() => setRejecting(true)} disabled={updating}>
                  Reject
                </Button>
              ) : (
                <div className="flex flex-col gap-2 w-full">
                  <input
                    type="text"
                    placeholder="Reason (optional)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="rounded-md border bg-background px-2 py-1 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={handleReject} disabled={updating}>
                      Confirm reject
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setRejecting(false); setRejectReason(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
          {order.status === "accepted" && (
            <Button size="sm" onClick={handleStartPreparing} disabled={updating}>
              Start preparing
            </Button>
          )}
          {order.status === "preparing" && (
            <Button size="sm" onClick={handleMarkReady} disabled={updating}>
              Mark ready
            </Button>
          )}
          {order.status === "ready_for_pickup" && (
            <Button size="sm" onClick={handleFulfill} disabled={updating}>
              Fulfill (delivered)
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function VendorOrdersPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<VendorOrderStatusFilter>("all");
  const [orders, setOrders] = useState<VendorOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOrders = useCallback(() => {
    if (!user?.stallId) return;
    setLoading(true);
    setError(null);
    fetchVendorOrders(user.stallId, filter)
      .then(setOrders)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user?.stallId, filter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleStatusChange = useCallback(
    async (orderId: string, status: OrderStatusUpdate, cancelledReason?: string | null) => {
      setUpdatingId(orderId);
      try {
        await updateOrderStatus(orderId, status, cancelledReason);
        if (status === "fulfilled") {
          await decrementInventoryForFulfilledOrder(orderId);
        }
        await loadOrders();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update status");
      } finally {
        setUpdatingId(null);
      }
    },
    [loadOrders]
  );

  const handleAssignedToChange = useCallback(
    async (orderId: string, assignedTo: string | null) => {
      await updateOrderAssignedTo(orderId, assignedTo);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, assignedTo } : o))
      );
    },
    []
  );

  if (!user?.stallId) return null;

  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Order inbox</h1>
          <p className="text-muted-foreground text-sm">
            Today&apos;s orders, sorted by pickup time. Accept, reject, or move through preparing → ready.
          </p>
        </div>
        <VendorScanQR onFulfilled={loadOrders} />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "secondary" : "outline"}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No orders today for this filter.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderCard
                order={order}
                onStatusChange={handleStatusChange}
                onAssignedToChange={handleAssignedToChange}
                updatingId={updatingId}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

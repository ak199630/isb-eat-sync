"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/contexts/CartContext";
import { useStalls } from "@/contexts/StallsContext";
import { fetchResidentialBlocks } from "@/lib/db/residentialBlocks";
import { createOrder } from "@/lib/db/orders";
import { getAvailableSlotsForDate } from "@/lib/config/operatingHours";
import type { ResidentialBlock } from "@/types";
import type { TimeSlot } from "@/lib/config/operatingHours";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(s: string): boolean {
  return UUID_REGEX.test(s);
}

export default function CheckoutPage() {
  const router = useRouter();
  const { stall, items, updateQuantity, removeItem, clearCart, total } = useCart();
  const { user } = useStalls();
  const [blocks, setBlocks] = useState<ResidentialBlock[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string>("");
  const [pickupOption, setPickupOption] = useState<"as_soon_as_ready" | "slot">("as_soon_as_ready");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBlocks = useCallback(() => {
    setBlocksLoading(true);
    setBlocksError(null);
    fetchResidentialBlocks()
      .then((data) => {
        setBlocks(data);
        if (data.length > 0) setSelectedBlockId((prev) => prev || data[0].id);
      })
      .catch((e) => {
        setBlocksError(e instanceof Error ? e.message : "Failed to load blocks");
        setBlocks([]);
      })
      .finally(() => setBlocksLoading(false));
  }, []);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  useEffect(() => {
    const today = new Date();
    setSlots(getAvailableSlotsForDate(today));
  }, []);

  if (!stall || items.length === 0) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Link href="/" className="mt-2 inline-block text-primary underline-offset-4 hover:underline">
          Browse stalls
        </Link>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    if (!selectedBlockId) {
      setError("Please select your residential block.");
      return;
    }
    if (pickupOption === "slot" && !selectedSlot) {
      setError("Please select a pickup time.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    let targetStart: Date;
    let targetEnd: Date;

    if (pickupOption === "as_soon_as_ready") {
      const now = new Date();
      targetStart = new Date(now.getTime() + stall.estimatedPrepTimeMinutes * 60 * 1000);
      targetEnd = new Date(targetStart.getTime() + 15 * 60 * 1000);
    } else {
      if (!selectedSlot) {
        setError("Please select a pickup time.");
        setIsSubmitting(false);
        return;
      }
      targetStart = selectedSlot.start;
      targetEnd = selectedSlot.end;
    }

    try {
      const userId = user?.id && isValidUuid(user.id) ? user.id : null;
      const { orderId } = await createOrder({
        userId,
        guestResidentialBlockId: selectedBlockId,
        stallId: stall.id,
        items,
        targetPickupStart: targetStart,
        targetPickupEnd: targetEnd,
        prepTimeMinutes: stall.estimatedPrepTimeMinutes,
      });

      clearCart();
      router.push(`/order/${orderId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link
          href={stall ? `/stall/${stall.id}` : "/"}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Checkout</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{stall.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div key={item.menuItemId} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">₹{item.price} × {item.quantity}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-6 text-center">{item.quantity}</span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <p className="text-right font-semibold">Total: ₹{total.toFixed(0)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leaving from</CardTitle>
          <p className="text-sm text-muted-foreground">Your residential block (for walk time)</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {blocksLoading && (
            <p className="text-sm text-muted-foreground">Loading blocks…</p>
          )}
          {blocksError && (
            <div className="space-y-2">
              <p className="text-sm text-destructive">{blocksError}</p>
              <Button type="button" variant="outline" size="sm" onClick={loadBlocks}>
                Retry
              </Button>
            </div>
          )}
          {!blocksLoading && !blocksError && (
            <select
              value={selectedBlockId}
              onChange={(e) => setSelectedBlockId(e.target.value)}
              disabled={blocks.length === 0}
              className="w-full rounded-md border bg-background px-3 py-2 disabled:opacity-50"
              aria-label="Residential block"
            >
              {blocks.length === 0 ? (
                <option value="">No blocks — run schema seed (007_seed.sql) in Supabase</option>
              ) : (
                blocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.displayName}
                  </option>
                ))
              )}
            </select>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pickup time</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="pickup"
              checked={pickupOption === "as_soon_as_ready"}
              onChange={() => setPickupOption("as_soon_as_ready")}
            />
            As soon as ready (~{stall.estimatedPrepTimeMinutes} min)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="pickup"
              checked={pickupOption === "slot"}
              onChange={() => setPickupOption("slot")}
            />
            Pick a time
          </label>
          {pickupOption === "slot" && (
            <div className="grid grid-cols-2 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.label}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`rounded-md border p-2 text-left text-sm ${
                    selectedSlot?.label === slot.label
                      ? "border-primary bg-primary/10"
                      : "hover:bg-muted"
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm">
          {error}
        </div>
      )}

      <Button
        className="w-full"
        size="lg"
        onClick={handlePlaceOrder}
        disabled={isSubmitting || blocksLoading || blocks.length === 0}
      >
        {isSubmitting ? "Placing order…" : "Place order"}
      </Button>
    </div>
  );
}

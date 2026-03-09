"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchMenuItemsForStall,
  setAllMenuItemsAvailability,
  setInitialInventory,
  switchToManualMode,
  restockInventory,
  updateMenuItemAvailability,
  type VendorMenuItem,
} from "@/lib/db/stalls";

export default function VendorMenuPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<VendorMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [inventoryInputs, setInventoryInputs] = useState<Record<string, string>>({});

  const loadItems = useCallback(() => {
    if (!user?.stallId) return;
    setLoading(true);
    setError(null);
    fetchMenuItemsForStall(user.stallId)
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user?.stallId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleToggle = useCallback(
    async (item: VendorMenuItem) => {
      setUpdatingId(item.id);
      try {
        await updateMenuItemAvailability(item.id, !item.isAvailable);
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i
          )
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update");
      } finally {
        setUpdatingId(null);
      }
    },
    []
  );

  const handleMarkAllSoldOut = useCallback(async () => {
    if (!user?.stallId) return;
    setBulkUpdating(true);
    try {
      await setAllMenuItemsAvailability(user.stallId, false);
      setItems((prev) => prev.map((i) => ({ ...i, isAvailable: false })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setBulkUpdating(false);
    }
  }, [user?.stallId]);

  const handleMarkAllAvailable = useCallback(async () => {
    if (!user?.stallId) return;
    setBulkUpdating(true);
    try {
      await setAllMenuItemsAvailability(user.stallId, true);
      setItems((prev) => prev.map((i) => ({ ...i, isAvailable: true })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setBulkUpdating(false);
    }
  }, [user?.stallId]);

  const handleSetInitialInventory = useCallback(
    async (item: VendorMenuItem, raw: string) => {
      const qty = parseInt(raw, 10);
      if (isNaN(qty) || qty < 0) {
        setError("Enter a valid number ≥ 0");
        return;
      }
      setUpdatingId(item.id);
      setError(null);
      try {
        await setInitialInventory(item.id, qty);
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  initialInventory: qty,
                  currentInventory: qty,
                  isAvailable: qty > 0,
                }
              : i
          )
        );
        setInventoryInputs((prev) => ({ ...prev, [item.id]: "" }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to set inventory");
      } finally {
        setUpdatingId(null);
      }
    },
    []
  );

  const handleSwitchToManual = useCallback(async (item: VendorMenuItem) => {
    setUpdatingId(item.id);
    setError(null);
    try {
      await switchToManualMode(item.id);
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, initialInventory: null, currentInventory: null }
            : i
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to switch to manual");
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const handleRestock = useCallback(
    async (item: VendorMenuItem, raw: string) => {
      const qty = parseInt(raw, 10);
      if (isNaN(qty) || qty < 0) {
        setError("Enter a valid number ≥ 0");
        return;
      }
      setUpdatingId(item.id);
      setError(null);
      try {
        await restockInventory(item.id, qty);
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, currentInventory: qty, isAvailable: qty > 0 }
              : i
          )
        );
        setInventoryInputs((prev) => ({ ...prev, [item.id]: "" }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to restock");
      } finally {
        setUpdatingId(null);
      }
    },
    []
  );

  if (!user?.stallId) return null;

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Menu & availability</h1>
      <p className="text-muted-foreground text-sm">
        Set initial inventory (auto sold-out at 0 when orders are fulfilled) or use manual mode and mark sold out yourself.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleMarkAllSoldOut}
          disabled={bulkUpdating || items.every((i) => !i.isAvailable)}
        >
          Mark all sold out
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleMarkAllAvailable}
          disabled={bulkUpdating || items.every((i) => i.isAvailable)}
        >
          Mark all available
        </Button>
      </div>

      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No menu items for this stall.
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="space-y-2 rounded-lg border p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground text-sm">
                      ₹{(item.priceCents / 100).toFixed(0)} · {item.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={item.isAvailable ? "default" : "secondary"}
                      className={!item.isAvailable ? "bg-muted text-muted-foreground" : ""}
                    >
                      {item.isAvailable ? "Available" : "Sold out"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingId === item.id}
                      onClick={() => handleToggle(item)}
                    >
                      {item.isAvailable ? "Mark sold out" : "Back in stock"}
                    </Button>
                  </div>
                </div>
                {/* Inventory vs manual */}
                <div className="flex flex-wrap items-center gap-2 border-t pt-2 text-sm">
                  {item.currentInventory !== null ? (
                    <>
                      <span className="text-muted-foreground">
                        Inventory: <strong>{item.currentInventory}</strong> left
                      </span>
                      <input
                        type="number"
                        min={0}
                        placeholder="Restock qty"
                        value={inventoryInputs[item.id] ?? ""}
                        onChange={(e) =>
                          setInventoryInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        className="w-20 rounded border bg-background px-2 py-1 text-sm"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={updatingId === item.id}
                        onClick={() =>
                          handleRestock(item, inventoryInputs[item.id] ?? "")
                        }
                      >
                        Restock
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        disabled={updatingId === item.id}
                        onClick={() => handleSwitchToManual(item)}
                      >
                        Switch to manual
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground">Manual (no inventory)</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="Initial qty"
                        value={inventoryInputs[item.id] ?? ""}
                        onChange={(e) =>
                          setInventoryInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        className="w-20 rounded border bg-background px-2 py-1 text-sm"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={updatingId === item.id}
                        onClick={() =>
                          handleSetInitialInventory(item, inventoryInputs[item.id] ?? "")
                        }
                      >
                        Set initial inventory
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

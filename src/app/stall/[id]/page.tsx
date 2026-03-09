"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStalls } from "@/contexts/StallsContext";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import type { MenuCategory, Stall } from "@/types";

const categoryLabels: Record<MenuCategory, string> = {
  main: "Main",
  beverage: "Beverage",
  snack: "Snack",
  breakfast: "Breakfast",
  other: "Other",
};

export default function StallPage() {
  const params = useParams();
  const { getStallById, user, isLoading, refetchSilent } = useStalls();
  const stallId = params.id as string;
  const stall = getStallById(stallId);

  // Refetch stalls in background when viewing a stall so we get latest status (open/busy/closed) from vendor
  useEffect(() => {
    if (stallId) refetchSilent();
  }, [stallId, refetchSilent]);

  if (isLoading && !stall) {
    return (
      <div className="container mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Loading menu…</p>
      </div>
    );
  }

  if (!stall) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <p className="text-muted-foreground">Stall not found.</p>
        <Link href="/" className="mt-2 inline-block text-primary underline-offset-4 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const isAuthorizedOnly = stall.requiresAuthorizedRole;
  const canAccess = !isAuthorizedOnly || user.role === "authorized";

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          aria-label="Back"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{stall.name}</h1>
          {isAuthorizedOnly && (
            <Badge variant="restricted" className="mt-1">
              Authorized access only
            </Badge>
          )}
        </div>
      </div>

      {!canAccess ? (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle>Access restricted</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Bajaj Dining Hall is only visible and orderable for authorized
            users. Your current role is &quot;{user.role}&quot;. Switch to
            &quot;Authorized&quot; in the header to view the menu.
          </CardContent>
        </Card>
      ) : stall.status === "closed" ? (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle>Stall closed</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            This stall is not accepting orders right now. Check back later.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {stall.status === "busy" && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              This stall is busy — orders may take longer than usual.
            </p>
          )}
          {(["main", "breakfast", "snack", "beverage", "other"] as MenuCategory[]).map(
            (cat) => {
              const items = stall.menuItems.filter((i) => i.category === cat);
              if (items.length === 0) return null;
              return (
                <Card key={cat}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-muted-foreground">
                      {categoryLabels[cat]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {items.map((item) => (
                      <MenuItemRow key={item.id} stall={stall} item={item} />
                    ))}
                  </CardContent>
                </Card>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

/** Customer view: menu item with price, availability, and Add to cart. */
function MenuItemRow({
  stall,
  item,
}: {
  stall: Stall;
  item: { id: string; name: string; price: number; isAvailable: boolean };
}) {
  const { addItem } = useCart();
  const canAdd = item.isAvailable && stall.status !== "closed";

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-3 transition-colors",
        !item.isAvailable && "opacity-60"
      )}
    >
      <div>
        <p className="font-medium">{item.name}</p>
        <p className="text-sm text-muted-foreground">
          ₹{item.price}
          {!item.isAvailable && (
            <span className="ml-2 text-amber-600 dark:text-amber-400">
              · Sold out
            </span>
          )}
        </p>
      </div>
      {canAdd && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => addItem(stall, item.id, item.name, item.price, 1)}
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      )}
    </div>
  );
}

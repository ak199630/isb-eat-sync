"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchStallForVendor, updateStallStatus } from "@/lib/db/stalls";
import { playAlertSound } from "@/lib/vendorAlerts";
import type { StallStatus } from "@/types";

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, signOut } = useAuth();
  const [stallName, setStallName] = useState<string | null>(null);
  const [stallStatus, setStallStatus] = useState<StallStatus | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [customerLeftCount, setCustomerLeftCount] = useState(0);

  useEffect(() => {
    if (!user?.stallId) return;
    fetchStallForVendor(user.stallId).then((data) => {
      if (data) {
        setStallName(data.name);
        setStallStatus(data.status);
      }
    });
  }, [user?.stallId]);

  // Realtime: new-order and customer-left alerts. Clear badges when on orders page.
  useEffect(() => {
    if (pathname === "/vendor") {
      setNewOrderCount(0);
      setCustomerLeftCount(0);
    }
  }, [pathname]);

  useEffect(() => {
    const stallId = user?.stallId;
    if (!stallId) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`vendor-orders-${stallId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `stall_id=eq.${stallId}`,
        },
        () => {
          setNewOrderCount((c) => c + 1);
          playAlertSound("new_order");
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `stall_id=eq.${stallId}`,
        },
        (payload) => {
          const oldRow = payload.old as { customer_left_at?: string | null } | undefined;
          const newRow = payload.new as { customer_left_at?: string | null } | undefined;
          if (
            newRow?.customer_left_at &&
            !oldRow?.customer_left_at
          ) {
            setCustomerLeftCount((c) => c + 1);
            playAlertSound("customer_left");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.stallId]);

  const handleStatusChange = async (newStatus: StallStatus) => {
    if (!user?.stallId || stallStatus === newStatus || statusUpdating) return;
    setStatusUpdating(true);
    try {
      await updateStallStatus(user.stallId, newStatus);
      setStallStatus(newStatus);
    } finally {
      setStatusUpdating(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/signin?next=/vendor");
      return;
    }
    if (user.role !== "vendor") {
      router.replace("/");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== "vendor") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/vendor" className="font-semibold text-lg">
              {stallName ?? "Vendor"} · ISB Eat-Sync
            </Link>
            <nav className="flex gap-2">
              <Link href="/vendor" className="relative">
                <Button variant={pathname === "/vendor" ? "secondary" : "ghost"} size="sm">
                  Orders
                </Button>
                {(newOrderCount + customerLeftCount) > 0 && (
                  <span
                    className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground"
                    aria-label={`${newOrderCount + customerLeftCount} new alerts`}
                  >
                    {newOrderCount + customerLeftCount}
                  </span>
                )}
              </Link>
              <Link href="/vendor/menu">
                <Button variant={pathname?.startsWith("/vendor/menu") ? "secondary" : "ghost"} size="sm">
                  Menu
                </Button>
              </Link>
            </nav>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm font-medium">Stall status:</span>
              {stallStatus === null ? (
                <span className="text-muted-foreground text-sm">Loading…</span>
              ) : (
                <div className="flex gap-1 rounded-md border p-1" role="group" aria-label="Stall status">
                  {(["open", "busy", "closed"] as const).map((s) => (
                    <Button
                      key={s}
                      variant={stallStatus === s ? "secondary" : "ghost"}
                      size="sm"
                      className="capitalize"
                      disabled={statusUpdating}
                      onClick={() => handleStatusChange(s)}
                    >
                      {s === "open" ? "Open" : s === "busy" ? "Busy" : "Closed"}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm">Customer app</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

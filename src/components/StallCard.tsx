"use client";

import Link from "next/link";
import { Clock, UtensilsCrossed } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Stall, StallStatus } from "@/types";

const statusConfig: Record<StallStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  busy: { label: "Busy", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground" },
};

interface StallCardProps {
  stall: Stall;
}

export function StallCard({ stall }: StallCardProps) {
  const { label, className } = statusConfig[stall.status];
  const showQuickBite =
    stall.status !== "closed" && stall.estimatedPrepTimeMinutes < 10;

  return (
    <Link href={`/stall/${stall.id}`} className="block">
      <Card
        className={cn(
          "transition-shadow hover:shadow-md",
          stall.status === "closed" && "opacity-75"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />
            <span className="text-lg font-semibold">{stall.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {stall.requiresAuthorizedRole && (
              <Badge variant="restricted">Authorized only</Badge>
            )}
            {showQuickBite && (
              <Badge variant="quickBite">Quick Bite</Badge>
            )}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                className
              )}
            >
              {label}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Est. prep: {stall.estimatedPrepTimeMinutes} min
              {stall.menuItems.some((i) => !i.isAvailable) && (
                <span className="ml-2 text-amber-600 dark:text-amber-400">
                  · Some items sold out
                </span>
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}


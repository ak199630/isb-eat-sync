"use client";

import { useStalls } from "@/contexts/StallsContext";
import { StallCard } from "@/components/StallCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { stalls, isLoading, error, refetch } = useStalls();

  if (isLoading) {
    return (
      <div className="container mx-auto flex max-w-3xl flex-col items-center justify-center gap-4 p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading stalls…</p>
      </div>
    );
  }

  if (error) {
    const isTimeout = /timed out|timeout/i.test(error);
    return (
      <div className="container mx-auto max-w-3xl space-y-4 p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Could not load stalls</p>
          <p className="mt-1 text-sm">{error}</p>
          {isTimeout && (
            <p className="mt-3 text-sm opacity-90">
              If you use Supabase free tier: open your project in the Supabase Dashboard so it can wake up, then click Retry. You can also open <code className="rounded bg-black/20 px-1">/api/health</code> in the browser to test connectivity.
            </p>
          )}
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Campus Stalls</h1>
        <p className="text-muted-foreground">
          Tap a stall to view menu. &quot;Quick Bite&quot; = under 10 min prep.
        </p>
      </div>
      <div className="space-y-4">
        {stalls.length === 0 ? (
          <p className="text-muted-foreground">No stalls found. Run the schema seed.</p>
        ) : (
          stalls.map((stall) => (
            <StallCard key={stall.id} stall={stall} />
          ))
        )}
      </div>
    </div>
  );
}

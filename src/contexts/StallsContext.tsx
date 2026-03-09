"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { MenuItem, Stall, User, UserRole } from "@/types";
import {
  fetchStallsWithMenu,
  invalidateStallsCache,
  updateMenuItemAvailability as dbUpdateItemAvailability,
  updateStallStatus as dbUpdateStallStatus,
  updateStallPrepTime as dbUpdateStallPrepTime,
} from "@/lib/db/stalls";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface StallsContextValue {
  stalls: Stall[];
  user: User;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Refetch stalls in background without setting isLoading (e.g. to get latest open/closed status). */
  refetchSilent: () => Promise<void>;
  setUserRole: (role: UserRole) => void;
  setStallStatus: (stallId: string, status: Stall["status"]) => void;
  setPrepTime: (stallId: string, minutes: number) => void;
  setItemAvailability: (stallId: string, itemId: string, isAvailable: boolean) => void;
  getStallById: (stallId: string) => Stall | undefined;
}

const StallsContext = createContext<StallsContextValue | null>(null);

const guestUser: User = {
  id: "",
  displayName: "Guest",
  role: "student",
};

export function StallsProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser } = useAuth();
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [roleOverride, setRoleOverride] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user: User = useMemo(() => {
    if (authUser) {
      return { ...authUser, role: roleOverride ?? authUser.role };
    }
    return guestUser;
  }, [authUser, roleOverride]);

  const loadStalls = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchStallsWithMenu();
      setStalls(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stalls");
      setStalls([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetchSilent = useCallback(async () => {
    try {
      const data = await fetchStallsWithMenu();
      setStalls(data);
    } catch {
      // Keep existing data on silent failure
    }
  }, []);

  useEffect(() => {
    loadStalls();
  }, [loadStalls]);

  useEffect(() => {
    setRoleOverride(null);
  }, [authUser?.id]);

  const supabase = createClient();
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel("stalls-menu-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "menu_items" },
        (payload) => {
          invalidateStallsCache();
          const row = payload.new as { id: string; stall_id: string; is_available: boolean };
          setStalls((prev) =>
            prev.map((s) => {
              if (s.id !== row.stall_id) return s;
              return {
                ...s,
                menuItems: s.menuItems.map((i) =>
                  i.id === row.id ? { ...i, isAvailable: row.is_available } : i
                ),
              };
            })
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "stalls" },
        (payload) => {
          invalidateStallsCache();
          const row = payload.new as {
            id: string;
            status: Stall["status"];
            current_prep_time_minutes: number;
          };
          setStalls((prev) =>
            prev.map((s) =>
              s.id === row.id
                ? {
                    ...s,
                    status: row.status,
                    estimatedPrepTimeMinutes: row.current_prep_time_minutes,
                  }
                : s
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const refetch = useCallback(() => loadStalls(), [loadStalls]);

  const setUserRole = useCallback((role: UserRole) => {
    setRoleOverride(role);
  }, []);

  const setStallStatus = useCallback(
    async (stallId: string, status: Stall["status"]) => {
      setStalls((prev) =>
        prev.map((s) => (s.id === stallId ? { ...s, status } : s))
      );
      try {
        await dbUpdateStallStatus(stallId, status);
      } catch (e) {
        refetch();
      }
    },
    [refetch]
  );

  const setPrepTime = useCallback(
    async (stallId: string, minutes: number) => {
      setStalls((prev) =>
        prev.map((s) =>
          s.id === stallId ? { ...s, estimatedPrepTimeMinutes: minutes } : s
        )
      );
      try {
        await dbUpdateStallPrepTime(stallId, minutes);
      } catch (e) {
        refetch();
      }
    },
    [refetch]
  );

  const setItemAvailability = useCallback(
    async (stallId: string, itemId: string, isAvailable: boolean) => {
      setStalls((prev) =>
        prev.map((s) => {
          if (s.id !== stallId) return s;
          return {
            ...s,
            menuItems: s.menuItems.map((i) =>
              i.id === itemId ? { ...i, isAvailable } : i
            ),
          };
        })
      );
      try {
        await dbUpdateItemAvailability(itemId, isAvailable);
      } catch (e) {
        refetch();
      }
    },
    [refetch]
  );

  const getStallById = useCallback(
    (stallId: string) => stalls.find((s) => s.id === stallId),
    [stalls]
  );

  const value = useMemo<StallsContextValue>(
    () => ({
      stalls,
      user,
      isLoading,
      error,
      refetch,
      refetchSilent,
      setUserRole,
      setStallStatus,
      setPrepTime,
      setItemAvailability,
      getStallById,
    }),
    [
      stalls,
      user,
      isLoading,
      error,
      refetch,
      refetchSilent,
      setUserRole,
      setStallStatus,
      setPrepTime,
      setItemAvailability,
      getStallById,
    ]
  );

  return (
    <StallsContext.Provider value={value}>
      {children}
    </StallsContext.Provider>
  );
}

export function useStalls() {
  const ctx = useContext(StallsContext);
  if (!ctx) throw new Error("useStalls must be used within StallsProvider");
  return ctx;
}

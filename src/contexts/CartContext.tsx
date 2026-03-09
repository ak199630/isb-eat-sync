"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { CartItem, Stall } from "@/types";

interface CartContextValue {
  stall: Stall | null;
  items: CartItem[];
  addItem: (stall: Stall, menuItemId: string, name: string, price: number, quantity?: number) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [stall, setStall] = useState<Stall | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback(
    (s: Stall, menuItemId: string, name: string, price: number, quantity = 1) => {
      setStall((prev) => {
        if (prev && prev.id !== s.id) {
          setItems([]);
          return s;
        }
        return s;
      });
      setItems((prev) => {
        const existing = prev.find((i) => i.menuItemId === menuItemId);
        if (existing) {
          return prev.map((i) =>
            i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + quantity } : i
          );
        }
        return [...prev, { menuItemId, name, price, quantity }];
      });
    },
    []
  );

  const removeItem = useCallback((menuItemId: string) => {
    setItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  }, []);

  const updateQuantity = useCallback((menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity } : i))
    );
  }, []);

  const clearCart = useCallback(() => {
    setStall(null);
    setItems([]);
  }, []);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      stall,
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      total,
    }),
    [stall, items, addItem, removeItem, updateQuantity, clearCart, total]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

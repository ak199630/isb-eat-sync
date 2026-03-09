"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

export function CartLink() {
  const { items } = useCart();
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  if (count === 0) return null;

  return (
    <Link
      href="/checkout"
      className="relative inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
    >
      <ShoppingCart className="h-5 w-5" />
      <span>Cart ({count})</span>
    </Link>
  );
}

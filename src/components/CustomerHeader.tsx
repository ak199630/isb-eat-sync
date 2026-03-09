"use client";

import { usePathname } from "next/navigation";
import { CartLink } from "@/components/CartLink";
import { HeaderAuth } from "@/components/HeaderAuth";

export function CustomerHeader() {
  const pathname = usePathname();
  if (pathname?.startsWith("/vendor")) return null;
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <a href="/" className="font-semibold text-lg">
          ISB Eat-Sync
        </a>
        <div className="flex items-center gap-2">
          <CartLink />
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
}

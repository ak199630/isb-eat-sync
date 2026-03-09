"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { Button } from "@/components/ui/button";

export function HeaderAuth() {
  const { user, isLoading, signOut } = useAuth();

  if (isLoading) {
    return <span className="text-muted-foreground text-sm">…</span>;
  }

  if (user) {
    if (user.role === "vendor") {
      return (
        <div className="flex items-center gap-2">
          <Link href="/vendor">
            <Button variant="ghost" size="sm">Vendor dashboard</Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <RoleSwitcher />
        <span className="text-muted-foreground text-sm max-w-[120px] truncate" title={user.displayName}>
          {user.displayName}
        </span>
        <Button variant="ghost" size="sm" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/signup">
        <Button variant="ghost" size="sm">Create account</Button>
      </Link>
      <Link href="/signin">
        <Button variant="outline" size="sm">Sign in</Button>
      </Link>
    </div>
  );
}

"use client";

import { useStalls } from "@/contexts/StallsContext";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types";

export function RoleSwitcher() {
  const { user, setUserRole } = useStalls();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Role:</span>
      <Button
        variant={user.role === "student" ? "default" : "outline"}
        size="sm"
        onClick={() => setUserRole("student")}
      >
        Student
      </Button>
      <Button
        variant={user.role === "authorized" ? "default" : "outline"}
        size="sm"
        onClick={() => setUserRole("authorized")}
      >
        Authorized
      </Button>
    </div>
  );
}

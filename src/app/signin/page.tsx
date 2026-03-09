"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchUserProfile } from "@/lib/db/users";

export default function SignInPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role === "vendor") router.replace("/vendor");
    else router.replace("/");
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const { error: err } = await signIn(email.trim(), password);
    if (err) {
      setIsSubmitting(false);
      setError(err);
      return;
    }
    const supabase = createClient();
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    const profile = session?.user?.id ? await fetchUserProfile(session.user.id) : null;
    setIsSubmitting(false);
    if (!profile) {
      setError("No profile found for this account. Vendors: ensure an admin added you to public.users with role=vendor.");
      return;
    }
    if (profile.role === "vendor") router.replace("/vendor");
    else router.replace("/");
  };

  if (authLoading) {
    return (
      <div className="container flex max-w-md flex-col items-center justify-center gap-4 py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="container flex max-w-md flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Use your ISB Eat-Sync account.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
                placeholder="you@isb.edu"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </div>
            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-muted-foreground text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}

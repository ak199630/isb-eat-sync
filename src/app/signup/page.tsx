"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { fetchResidentialBlocks } from "@/lib/db/residentialBlocks";
import type { ResidentialBlock } from "@/types";

export default function SignUpPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, signUp } = useAuth();
  const [blocks, setBlocks] = useState<ResidentialBlock[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [residentialBlockId, setResidentialBlockId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  useEffect(() => {
    fetchResidentialBlocks().then(setBlocks).catch(() => setBlocks([]));
  }, []);

  useEffect(() => {
    if (blocks.length > 0 && !residentialBlockId) setResidentialBlockId(blocks[0].id);
  }, [blocks, residentialBlockId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const { error: err } = await signUp(
      email.trim(),
      password,
      displayName.trim(),
      residentialBlockId || null
    );
    setIsSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    router.replace("/");
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
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Use your account to save your block and get push notifications.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sign up</CardTitle>
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium mb-1">
                Display name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="block" className="block text-sm font-medium mb-1">
                Residential block (default for checkout)
              </label>
              <select
                id="block"
                value={residentialBlockId}
                onChange={(e) => setResidentialBlockId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
              >
                {blocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.displayName}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-muted-foreground text-sm">
        Already have an account?{" "}
        <Link href="/signin" className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

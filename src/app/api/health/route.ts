import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const HEALTH_TIMEOUT_MS = 10_000;

/**
 * GET /api/health – Quick Supabase connectivity check.
 * Use this to verify your project URL and anon key, and that the project is not paused.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.",
      },
      { status: 503 }
    );
  }

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () =>
        reject(
          new Error(
            "Connection timed out. Your Supabase project may be paused (free tier). Open it in the Dashboard to wake it up."
          )
        ),
      HEALTH_TIMEOUT_MS
    );
  });

  try {
    const supabase = await createClient();
    const queryPromise = supabase.from("stalls").select("id").limit(1);
    const result = await Promise.race([queryPromise, timeoutPromise]);

    if (result.error) {
      return NextResponse.json(
        { ok: false, error: result.error.message },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Supabase unreachable";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}

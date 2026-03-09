# ISB Eat-Sync

Hyper-local campus food orchestration for the Indian School of Business. Sprint 1 + Sprint 2 (JIT ordering).

## Setup

1. **Install and run schema**
   - Create a [Supabase](https://supabase.com) project.
   - In SQL Editor, run the files in `schema/` in order: `001_...` through `007_seed.sql`.
   - **Sprint 2:** Run `008_sprint2_guest_orders.sql` and `009_rls_sprint2.sql`.
   - (Optional) Enable Realtime: Database → Replication → turn on for `stalls` and `menu_items`.

2. **Env**
   - Copy `.env.local.example` to `.env.local`.
   - Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project settings.

3. **Run app**
   ```bash
   npm install
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Sprint 1 – What’s included

- **5 Stalls** (from DB): Goer, TCC, MFC, Nescafe, Bajaj Dining — name, status, prep time, menu items.
- **Role-based access**: Bajaj Dining Hall only visible when role is **Authorized**.
- **Quick Bite badge**: Stalls with prep time &lt; 10 min.
- **Sold-out**: Customers see availability; marking sold out is **vendor-side** (Sprint 3).

## Create account / Sign in

- **Create account** (`/signup`): Email, password, display name, residential block. Creates Supabase Auth user and a row in `public.users`.
- **Sign in** (`/signin`): Email and password.
- **Header**: When signed out, “Create account” and “Sign in”. When signed in, display name and “Sign out”. Role switcher (Student / Authorized) shown when signed in for Bajaj testing.
- Run `schema/010_rls_users_auth.sql` so users can insert/read/update their own profile.

## Sprint 2 – What’s included

- **Cart + Add to cart** on stall menu.
- **Checkout**: Pick residential block (SV1–SV4), pickup window (“As soon as ready” or fixed slot, same day, 11 AM–9 PM).
- **Place order**: Guest or logged-in; orders auto-set to `accepted`; QR token generated.
- **Order page** (`/order/[id]`): Shows pickup time, “Leave by X” when applicable.
- **“Time to head out”**: In-app banner when it’s time to leave (client timer).
- **API** `/api/leave-now`: Cron endpoint to mark leave-now notifications sent; FCM can be added when configured.

## Deploy & production demo

To host and demo the app (Vercel, env vars, Supabase production setup, vendor user, Realtime): see **[docs/DEPLOYMENT_AND_PRODUCTION.md](docs/DEPLOYMENT_AND_PRODUCTION.md)**.

## Tech stack

- Next.js 15 (App Router), TypeScript, Tailwind CSS
- Supabase (Postgres) for stalls, menu, orders, walk times
- UI: custom components (Shadcn-style with CVA)

## Project layout

- `src/app` – pages (home, stall/[id], checkout, order/[id]), api/leave-now
- `src/contexts` – StallsContext, CartContext
- `src/lib/db` – stalls, orders, walkTimes, residentialBlocks
- `schema/` – Postgres migrations and seed

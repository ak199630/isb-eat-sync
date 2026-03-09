# ISB Eat-Sync – Deployment & production demo

How to host the app and make it demo-ready.

---

## 1. Hosting (recommended: Vercel)

**Vercel** is the simplest for Next.js: connect the repo, set env vars, deploy.

### Steps

1. **Push code to GitHub** (if not already).
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/isb-eat-sync.git
   git push -u origin main
   ```

2. **Create a Vercel project**
   - Go to [vercel.com](https://vercel.com) → Sign in → **Add New** → **Project**.
   - Import the GitHub repo.
   - **Framework Preset:** Next.js (auto-detected).
   - **Root Directory:** leave default.
   - Do **not** deploy yet.

3. **Set environment variables** (Project → Settings → Environment Variables). Add:

   | Name | Value | Notes |
   |------|--------|--------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | From Supabase → Project Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon/public key | Same page; safe for client |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your service_role key | **Secret** – for customer-left & fulfill API only |

   Apply to **Production** (and Preview if you want).

4. **Deploy**
   - **Deploy** (or push to `main` to trigger a deploy).
   - Your app will be at `https://your-project.vercel.app`.

### Other hosts

- **Netlify:** Next.js supported; add build command `npm run build`, publish directory `.next` (or use Next runtime).
- **Railway / Render:** Use `npm run build` and `npm run start`; set env vars in dashboard.
- **Self-hosted:** `npm run build && npm run start` (Node 18+); put behind nginx/Caddy for HTTPS.

---

## 2. Supabase (production database)

Use **one** Supabase project for both dev and demo, or a **separate** project for production. Same steps either way.

### 2.1 Run migrations

In **Supabase Dashboard → SQL Editor**, run in order:

1. `001_extensions_and_enums.sql`
2. `002_locations_and_walk_times.sql`
3. `003_users.sql`
4. `004_stalls_and_menu.sql`
5. `005_orders_and_notifications.sql`
6. `006_triggers.sql`
7. `007_seed.sql` (idempotent – safe to run again)
8. `008_sprint2_guest_orders.sql`
9. `009_rls_sprint2.sql`
10. `010_rls_users_auth.sql`
11. `011_vendor_enum.sql`
12. `011_vendor_access.sql`
13. `012_order_status_flow.sql`
14. `013_menu_inventory.sql`
15. `014_customer_left_at.sql`
16. `015_orders_assigned_to.sql`
17. `016_orders_replica_identity.sql`

(Or run `schema/run_all.sql` once for a fresh DB, then run 008–016.)

### 2.2 Seed data

Run **`schema/007_seed.sql`** if not already done (adds blocks, locations, walk times, stalls, menu, demo users).

### 2.3 Realtime

**Database → Replication:** add to **supabase_realtime** publication:

- `stalls`
- `menu_items`
- `orders`

So vendor alerts and live sold-out/status work.

### 2.4 Create a vendor user (for demo)

1. **Authentication → Users → Add user:** create a user (e.g. `vendor@demo.isb.edu`) with a password. Copy the **User UID**.
2. **SQL Editor** (replace the UUID and email if needed):

   ```sql
   INSERT INTO public.users (id, email, display_name, role, stall_id)
   VALUES (
     'PASTE_USER_UID_HERE',
     'vendor@demo.isb.edu',
     'Goer Vendor',
     'vendor',
     (SELECT id FROM stalls WHERE name = 'Goer' LIMIT 1)
   )
   ON CONFLICT (email) DO UPDATE SET
     role = 'vendor',
     stall_id = (SELECT id FROM stalls WHERE name = 'Goer' LIMIT 1);
   ```

   If your vendor is created via Auth only (no row in `public.users`), the INSERT is required. If the email already exists as a student, the `ON CONFLICT` updates them to vendor + Goer stall.

---

## 3. Production checklist

- [ ] **Env vars** set on Vercel (or your host): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] **Supabase migrations** 001–016 (or run_all + 008–016) applied.
- [ ] **Seed** run (`007_seed.sql`) so stalls, menu, blocks exist.
- [ ] **Realtime** enabled for `stalls`, `menu_items`, `orders`.
- [ ] **Vendor user** created in Auth + `public.users` with `role = 'vendor'` and `stall_id`.
- [ ] **HTTPS** – Vercel provides it; custom domain optional.

---

## 4. Demo flow (usability)

1. **Customer (phone or second browser)**  
   Open the app URL → see stalls → open a stall → add items → checkout → pick residential block → place order → on order page: tap **“I’m leaving”**, show **QR code**.

2. **Vendor (tablet or laptop)**  
   Sign in with vendor email/password → **Orders** inbox → see new order → **Accept** → **Start preparing** → **Assigned to** (e.g. “Ramesh”) → **Mark ready** → either **Fulfill (delivered)** or **Scan QR** and scan customer’s QR → order moves to Fulfilled.

3. **Alerts**  
   With vendor on Menu tab, place a new order as customer → vendor sees badge + sound. Customer taps “I’m leaving” → vendor gets second alert.

4. **Stall status**  
   Vendor sets **Closed** → customer sees stall closed and cannot add to cart.

5. **Optional**  
   Use **Menu** tab to mark items sold out; use **Scan QR** with a screenshot of the customer order QR to test fulfill-by-scan.

---

## 5. Custom domain (optional)

- **Vercel:** Project → Settings → Domains → add your domain and follow DNS instructions.
- Point your domain (e.g. `eat-sync.isb.edu`) to Vercel; SSL is automatic.

---

## 6. Security notes

- **Never** commit `.env.local` or put `SUPABASE_SERVICE_ROLE_KEY` in client code. It’s only used in API routes (`customer-left`, `vendor/orders/fulfill`).
- **RLS** is enabled: vendors see only their stall’s orders; customers see their own orders.
- For a **public demo**, use a dedicated Supabase project and strong vendor password; rotate the service role key if it’s ever exposed.

---

## 7. Troubleshooting

| Issue | Check |
|-------|--------|
| Stalls never load | Env vars on host; Supabase project not paused; RLS allows anon to read stalls/menu_items (011). |
| “Could not load blocks” | Run 007_seed.sql; RLS 009 allows anon to read residential_blocks. |
| Vendor sign-in redirects to home | User has a row in `public.users` with `role = 'vendor'` and `stall_id` set. |
| QR scan / fulfill fails | `SUPABASE_SERVICE_ROLE_KEY` set on host (for server-side fulfill API). |
| No new-order / customer-left alerts | Realtime enabled for `orders`; 016 (REPLICA IDENTITY FULL) applied. |

End of deployment guide.

# Vendor Dashboard – Implementation Strategy

This document captures the **strategy and your decisions** for each of the 8 MVP features. We will implement only after you confirm choices for each feature.

---

## Locked decisions (implement next)

### Vendor access
- **Choice: C (Hybrid)** – Vendor role in Auth; vendors pre-created by admin (no public vendor signup). One Auth user per stall; link user to stall so RLS restricts to that stall’s orders.
- **Dashboard URL:** `/vendor` (default; can change later).

### Feature 1: Order inbox
- **Date:** Today only (Y).
- **Statuses in main list:** All except cancelled (pending, accepted, preparing, ready_for_pickup, fulfilled). Cancelled: not in main list (hide for MVP).
- **Sort:** Primary `target_pickup_start` asc, secondary `created_at` asc (Y).
- **Filters:** All filters – All | Pending | Accepted | Preparing | Ready for pickup | Fulfilled.
- **Order card:** Order ID (short), pickup window, status, total (₹), item count/summary, residential block, “Customer left” indicator, **and order notes**.
- **Initial order status:** Keep auto-accepted for MVP (no Accept/Reject in this step; can add later).

---

## Cross-cutting: Vendor access & auth

**Why it matters:** The dashboard shows orders for *one stall*. We need a way for the stall (vendor) to log in and see only their orders.

**Options:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A) Vendor role in Auth** | Add `user_role = 'vendor'` and a table linking users to stalls (e.g. `vendor_stalls`: user_id, stall_id). Vendor signs in with Supabase Auth; RLS restricts orders to their stall(s). | Real auth, audit trail, multi-stall possible later | Requires migration, signup flow for vendors |
| **B) Stall code + secret (no login)** | Vendor opens `/vendor` and enters a **stall code** (e.g. "GOER") + **stall secret** (from env or DB). Server issues a short-lived token or uses the secret to scope API/dashboard to that stall. | Fast to build, no new user management | Less secure; anyone with code+secret can access; no per-user audit |
| **C) Hybrid** | Same as A but vendors are pre-created by admin (no public signup). You create one Auth user per stall and share credentials with the stall. | Real auth, no public vendor signup | Still need vendor_stalls or stall_id on users |

**Decision (vendor access):**  
**LOCKED: C (Hybrid)** – Pre-created vendor users; one Auth user per stall; link user → stall.

**Decision (dashboard URL):**  
**LOCKED: `/vendor`** (default).

---

## Feature 1: Order inbox (today, by pickup time, filter by status)

**Goal:** Single view where the stall sees today’s orders, sorted by target pickup time, with optional filter by status.

**Decisions:**

1. **Which orders to show**
   - Only orders for **this stall** (by stall_id).
   - **Date:** Only today (operating day) or also “tomorrow” if you add future days later?
   - **Status:** Include `pending` (if we introduce it), `accepted`, `preparing`, `ready_for_pickup`, `fulfilled`? Exclude `cancelled` or show in a separate “Past / Cancelled” section?

   **LOCKED:** Today only. Main list: all except cancelled (pending, accepted, preparing, ready_for_pickup, fulfilled). Cancelled: hide for MVP.

2. **Default sort**
   - Primary: `target_pickup_start` (asc).
   - Secondary (same pickup time): `created_at` (asc)?

   **LOCKED:** Y (keep as above).

3. **Filters**
   - Dropdown/tabs: All | Pending | Accepted | Preparing | Ready for pickup | Fulfilled.

   **LOCKED:** All filters in MVP.

4. **Data per order card (in list)**
   - Order ID (short), pickup window, status, total (₹), item count/summary, residential block, “Customer left” indicator, order notes.

   **LOCKED:** All of the above + order notes. (Note: `order_notes` column to be added to `orders` if not present.)

5. **Initial order status**
   - **LOCKED:** Keep auto-accepted for MVP (no pending/Accept/Reject in this step).

**Implementation outline (locked):**
- Backend: API or server component that loads orders for stall_id, date = today, with status filter and sort.
- Frontend: Vendor layout + inbox page: list of order cards, filter tabs/dropdown, optional “View” to go to order detail (for later features).

---

## Feature 2: Accept / Reject and prep flow (Accept → Preparing → Ready)

**Goal:** Vendor can Accept or Reject an order; then move it through Preparing → Ready for pickup. (Fulfilled happens at QR scan in Feature 4.)

**Decisions:**

1. **If we introduce Pending**
   - New orders created as `pending`. Vendor sees “Accept” and “Reject”.
   - Reject: set status to `cancelled` and optionally store a reason (e.g. “sold out”, “too busy”). Do we need a **reject reason** in DB (e.g. `cancelled_reason` on orders) for MVP?

   **Your choice:** Reject reason: Y/N for MVP?

2. **State transitions**
   - Allowed: `pending → accepted` (Accept), `pending → cancelled` (Reject), `accepted → preparing`, `preparing → ready_for_pickup`. No back-editing (e.g. Ready → Preparing) for MVP?

   **Your choice:** Confirm one-way flow only, or allow any “back” (e.g. Ready → Preparing)?

3. **Who can change status**
   - Any vendor staff with access to the dashboard, or do we need a “manager” vs “staff” role later? For MVP we can assume any dashboard user can transition.

   **Your choice:** Same permissions for everyone for MVP? (Y/N)

4. **Customer visibility**
   - Customer app already shows order status. We’ll ensure status is updated in DB and customer app reads it (and optionally Realtime). Any specific copy for “Rejected” (e.g. “Order could not be fulfilled – contact stall”)?

   **Your choice:** Exact message for rejected orders (or use a default)?

**Implementation outline:**
- API or server action: `PATCH /api/vendor/orders/[id]` or similar with `{ status: 'accepted' | 'preparing' | 'ready_for_pickup' | 'cancelled' }` (and optional `cancelled_reason`).
- RLS or server-side check: only the stall that owns the order can update.
- UI: Buttons per order card or detail: Accept / Reject (if pending), then “Start preparing” → “Mark ready”.

---

## Feature 3: Queue-based ETA (queue size + prep time)

**Goal:** Show “Estimated ready in X min” (or “Ready at HH:MM”) on the vendor dashboard using queue position and stall prep time.

**Decisions:**

1. **Definition of “queue”**
   - Queue = orders in status `accepted` or `preparing` (and optionally `ready_for_pickup` if we consider them still “in kitchen” until collected), in order of `target_pickup_start` or `created_at`.
   - **Your choice:** Queue = accepted + preparing only? Or include ready_for_pickup? Sort queue by pickup time or created_at?

2. **Formula**
   - For each order in queue:  
     `estimated_ready_at = now + (orders_ahead × avg_prep_per_order) + this_order_prep`.  
   - `avg_prep_per_order`: use stall’s `current_prep_time_minutes` (or `default_prep_time_minutes`) as proxy for “minutes per order” for simplicity.
   - **Your choice:** One prep value per stall (current_prep_time_minutes) enough for MVP, or do we want per-item prep later?

3. **Where to show**
   - On each order card in the inbox? In order detail? Both?

   **Your choice:** Card only / Detail only / Both?

4. **Recalculation**
   - ETA is computed when the page loads (or when list is fetched). Optional: recompute every 1–2 min or when status changes (e.g. Realtime). For MVP, “on load + on status change” may be enough.

   **Your choice:** Refresh ETA only on load + status change, or also on a timer (e.g. every 60 s)?

**Implementation outline:**
- Server/API: when returning orders for inbox, compute queue order and ETAs (estimated_ready_at or “in X min”) and return with each order.
- UI: Display “Ready in ~X min” or “Ready by HH:MM” on card/detail.

---

## Feature 4: QR scan to mark Fulfilled

**Goal:** Vendor (or staff) scans the customer’s order QR at handoff; system marks order as Fulfilled and records time.

**Decisions:**

1. **Where to scan**
   - **Option A:** Vendor dashboard: “Scan QR” button opens camera (or file upload of QR image); after decode, call API with qr_token, validate against order for this stall, set fulfilled_at and status.
   - **Option B:** Dedicated “scanner” page (e.g. `/vendor/scan`) that only does camera + submit.
   - **Your choice:** Inline in dashboard (A) or separate scanner page (B)?

2. **QR content**
   - Currently `qr_token` is a unique string (e.g. `ord_<uuid>`). QR code encodes a URL like `https://app/isb-eat-sync/order/[id]` or a payload like `{ orderId, qrToken }`. Customer shows this on their phone; vendor scans it.
   - **Your choice:** QR encodes URL (customer order page) or a short payload (orderId + qrToken)? (URL is user-friendly; payload keeps vendor flow simple.)

3. **Validation**
   - Server: look up order by qr_token (or orderId + qr_token), check stall_id matches current vendor, check status is not already fulfilled/cancelled, then set status = fulfilled, fulfilled_at = now.

   **Your choice:** Any extra check (e.g. only allow if status = ready_for_pickup)?

4. **After fulfill**
   - Show success message; remove from “active” list or move to “Fulfilled” section. Optional: “Time saved” (Sprint 4) later.

   **Your choice:** Just success toast and list refresh for MVP?

**Implementation outline:**
- API: e.g. `POST /api/vendor/orders/fulfill` with body `{ qrToken }` (or orderId + qrToken). Validate, update order, return success/error.
- Frontend: Scanner (camera or file) → decode → call API. Use a small library for QR decode (e.g. jsQR or similar) in browser.

---

## Feature 5: Sold-out toggle (item and/or stall)

**Goal:** Vendor can mark menu items (or whole stall) as sold out / back in stock. Customer app already reads availability from DB.

**Decisions:**

1. **Granularity**
   - **Per item:** Toggle per menu_item (is_available). Already in schema.
   - **Per stall:** “Stall closed” or “Stall sold out” could be status = closed, or a separate “sold_out” flag. Current schema: stall has status (open/busy/closed). So “sold out” could be: (a) all items marked unavailable, or (b) stall status = closed, or (c) add a “sold_out” to stall.
   - **Your choice:** MVP: only per-item toggle, or also a single “Mark entire stall sold out” (e.g. set all items unavailable + optional stall status)?

2. **Where in dashboard**
   - Dedicated “Menu / Availability” tab or section: list of items with toggle. Optional: one “Mark all sold out” / “Mark all available” for rush.

   **Your choice:** Separate “Menu” section in vendor dashboard, or a compact list on the same page as orders?

3. **Realtime**
   - Customer app can use Supabase Realtime on menu_items so sold-out changes reflect immediately. We already have this in context.
   - **Your choice:** Rely on existing Realtime for customer side, or also add manual refresh for vendor after toggle?

**Implementation outline:**
- Reuse/use `updateMenuItemAvailability(stallId, itemId, isAvailable)` and optionally bulk “set all unavailable” for stall.
- Vendor UI: list of menu items with switch/toggle; optional stall-level “Sold out” that sets all items to false.

---

## Feature 6: Stall status (Open / Closed / Busy)

**Goal:** Vendor can set stall status so customer app shows “Open”, “Busy”, or “Closed”.

**Decisions:**

1. **Where to control**
   - Header or sidebar of vendor dashboard: dropdown or buttons “Open | Busy | Closed”. One click updates stalls.status.

   **Your choice:** Always visible in header, or in a “Settings” / “Stall” section?

2. **Effect on ordering**
   - Customer app: if stall is closed, hide or disable “Add to cart” / show “Closed”. If busy, we can show “Busy – orders may take longer” (Sprint 4 can add throttle). For MVP, do we block new orders when status = closed?

   **Your choice:** When closed: block new orders (Y)? When busy: only show message (Y) or also throttle (defer to Sprint 4)?

3. **Default on “open”**
   - When vendor first opens dashboard for the day, do we assume “open” or show last known status from DB?

   **Your choice:** No change – always show DB value. Any “Open stall” reminder (Y/N)?

**Implementation outline:**
- Use existing `updateStallStatus(stallId, status)`. Vendor UI: status selector that calls this (or API that calls it). Customer app: already uses stall status; ensure closed stalls cannot be ordered.

---

## Feature 7: “Customer left room” handshake

**Goal:** Customer taps “I’m leaving” in app → vendor (and staff) see a notification; customer sees “Vendor notified”. Optional: use this to time cooking.

**Decisions:**

1. **Customer action**
   - On order page: button “I’m leaving” or “Start walking”. One tap; optional confirmation (“Notify stall?”).

   **Your choice:** Single tap or confirm dialog?

2. **Persistence**
   - We need to store “customer left at” and optionally “vendor notified at”. Options:
     - **A)** Add column `orders.customer_left_at` (timestamptz). When customer taps, set it; vendor sees it.
     - **B)** Use `notifications` table: current schema has user_id NOT NULL, so we can’t store guest “customer left” there. We could add an `order_events` table (order_id, event_type, at) e.g. event_type = 'customer_left'.
   - **Your choice:** Prefer new column on orders (customer_left_at) or new table (order_events)? (Column is simpler for MVP.)

3. **Vendor notification**
   - Dashboard: when customer_left_at is set, show “Customer left (SV2)” on that order card and/or play sound/badge. Realtime: subscribe to orders for this stall and react when customer_left_at is updated.

   **Your choice:** Sound on “customer left”? Badge count of “customer left” orders? Both?

4. **Guest orders**
   - Guest has no user_id; “customer left” is still an order-level event. So customer_left_at on orders works for both guest and logged-in. Customer app: guest can also tap “I’m leaving” and we set the same column.

   **Your choice:** Same behavior for guest and logged-in (Y)?

5. **Idempotency**
   - Only set customer_left_at once (first tap). Ignore later taps.

   **Your choice:** Confirm once-only (Y)?

**Implementation outline:**
- DB: add `orders.customer_left_at` (timestamptz, nullable). Migration 011 or similar.
- API: e.g. `POST /api/orders/[id]/customer-left` (or from order page). Check order exists, not already set; set customer_left_at; return success. RLS or check: only the order’s customer (session order id match or token) can call.
- Customer app: “I’m leaving” button → call API → show “Vendor notified”.
- Vendor dashboard: show “Left at HH:MM” / “Customer left (SV2)” on order; optional sound + badge; Realtime subscription on orders for this stall.

---

## Feature 8: Assign to cooking staff + new-order & “customer left” alerts

**Goal:** (a) Assign order to a cook (or “In kitchen”). (b) New-order and “customer left” alerts (sound + badge) on vendor dashboard.

**Decisions:**

1. **Staff assignment**
   - **Minimal:** One global “In kitchen” – no per-cook identity. We could add column `orders.assigned_to` (text or user_id). For MVP, “assigned_to” could be a label like “Kitchen 1” / “Kitchen 2” or a staff name (free text).
   - **Structured:** Table `staff` (id, stall_id, name, is_active) and orders.assigned_to = staff.id. More setup, better for multi-person stalls.
   - **Your choice:** MVP: free-text “Assigned to” (e.g. “Ramesh”, “Station 1”) or structured staff table? If free-text, single field on order (assigned_to TEXT)?

2. **Where to assign**
   - In order card or order detail: dropdown or input “Assigned to: [____]”.

   **Your choice:** On card (compact) or only in detail view?

3. **New-order alert**
   - When a new order is inserted for this stall: play sound and/or show badge. Supabase Realtime on `orders` with filter stall_id = current stall, event = INSERT.

   **Your choice:** Sound (Y/N)? Badge count of “new unread” (Y/N)? If badge, do we “mark as seen” when vendor opens inbox or when they view that order?

4. **“Customer left” alert**
   - When customer_left_at is set for an order of this stall: play sound and/or badge. Realtime on orders: UPDATE where customer_left_at changed from null to set.

   **Your choice:** Same as new order (sound + badge)? Different sound so staff can distinguish?

5. **Permission**
   - Alerts are for anyone viewing the vendor dashboard (no separate “cook” device for MVP unless you want it). Same dashboard can show “Assigned to: Ramesh” for coordination.

   **Your choice:** One dashboard for all staff for MVP (Y)?

**Implementation outline:**
- Staff: if free-text, add `orders.assigned_to` (TEXT, nullable). Migration. API to PATCH order with assigned_to. If structured, add staff table + FK.
- UI: Assign dropdown/input on order card or detail.
- Realtime: subscribe to orders for stall (INSERT + UPDATE). On INSERT → new order alert (sound + badge). On UPDATE (customer_left_at) → “customer left” alert (sound + badge). Optional: “mark as seen” to clear badge.

---

## Order of implementation (suggested)

Recommended sequence so each step is testable and builds on the previous:

1. **Vendor access** (auth + route) – so we can open the dashboard.
2. **Feature 6: Stall status** – quick win; reuses existing DB and APIs.
3. **Feature 1: Order inbox** – core view; no status changes yet.
4. **Feature 2: Accept/Reject + prep flow** – then we may need to introduce `pending` and migration.
5. **Feature 5: Sold-out toggle** – independent; reuses menu_items.
6. **Feature 3: Queue-based ETA** – depends on inbox and statuses.
7. **Feature 7: Customer left room** – DB + customer button + vendor display.
8. **Feature 4: QR scan to fulfill** – needs scanner and API.
9. **Feature 8: Assign + alerts** – staff field + Realtime alerts.

**Your choice:** Keep this order or change it (e.g. QR before ETA)?

---

## Next step

For **Feature 2** onward: confirm your decisions when ready; we’ll lock them here and then implement. Implementation order remains: Vendor access → Feature 6 (stall status) → Feature 1 (inbox) → Feature 2 → …

---

## Implementation plan: Vendor Access + Feature 1 (ready to build)

Use this when implementing. No code until you say go.

### Phase 1: Vendor access (Hybrid C)

1. **Database**
   - Extend `user_role` enum: add `'vendor'` (migration, e.g. `011_vendor_access.sql`).
   - Add `users.stall_id` (UUID, nullable, FK → stalls). For vendor users, stall_id must be set; for student/authorized leave null. Optional: CHECK (role <> 'vendor' OR stall_id IS NOT NULL).
   - RLS: New policy so that when `auth.uid() = users.id` and `users.role = 'vendor'`, user can SELECT/UPDATE only rows in `orders` where `orders.stall_id = users.stall_id`. Same for `order_items` via order. Vendor needs SELECT on stalls (own stall), SELECT/UPDATE on menu_items for their stall. Define policies so vendor cannot see other stalls’ orders or other users’ profiles beyond what’s needed for order display.

2. **Auth & session**
   - Reuse existing AuthContext: after sign-in, if `users.role === 'vendor'`, redirect to `/vendor` (or show vendor layout). Customer app routes (home, stall, checkout, order) remain for student/authorized; vendor sees only `/vendor` or a vendor layout that wraps vendor routes.
   - Resolve “current stall” from session: `user.stallId` from `users.stall_id` when role is vendor. Add to User type and fetch in AuthContext / profile.

3. **Routes & layout**
   - Route: `/vendor` (and optionally `/vendor/signin` if vendor uses same signin with different redirect). Layout: `app/vendor/layout.tsx` – checks session + vendor role; if not signed in or not vendor, redirect to signin or home. Children: vendor dashboard pages.
   - Dashboard shell: header with stall name, “Sign out”, and nav (e.g. “Orders” for inbox; later “Menu”, “Stall status”).

4. **Vendor sign-in**
   - No new signup UI. Vendors use existing Supabase sign-in; you create Auth user + `public.users` row with `role = 'vendor'` and `stall_id = <stall_uuid>` via SQL or admin script.

**Creating a vendor user (after running 011):** In Supabase, create an Auth user (Dashboard → Authentication → Users → Add user), then in SQL Editor run (replace email, password, display name, and stall UUID):

```sql
-- Get stall id: SELECT id, name FROM stalls;
INSERT INTO public.users (id, email, display_name, role, stall_id)
VALUES (
  '<auth_user_uuid_from_supabase_auth_users>',
  'vendor@goer.isb.edu',
  'Goer Vendor',
  'vendor',
  (SELECT id FROM stalls WHERE name = 'Goer' LIMIT 1)
);
```
Use the same `id` as in `auth.users`. Or use Supabase Auth Admin API to create the user and then insert into `public.users` with that id, role = 'vendor', and stall_id.

### Phase 2: Feature 1 – Order inbox

1. **Data**
   - **Order notes:** Add `orders.order_notes` (TEXT, nullable) in migration `011` or `012` so vendor can display notes. Checkout doesn’t collect notes yet – can be “—” or empty until you add it on customer side later.
   - **Vendor orders API / data layer:** Function or API that, given `stall_id` and optional `status` filter and `date` (default today):
     - Queries `orders` where `stall_id = stall_id`, `status != 'cancelled'`, and `target_pickup_start` within the chosen date (start of day to end of day, app timezone or UTC).
     - Joins `order_items` and optionally `menu_items` for line summary; `residential_blocks` for block code (e.g. SV2); no need for `users` except if you show display_name.
     - Sorts by `target_pickup_start` asc, `created_at` asc.
     - Returns list of orders with: id (short form for display), target_pickup_start/end, status, total_cents, item count/summary, residential_block code, order_notes, and leave_now_notification_sent_at or customer_left_at (for “Customer left” indicator – column may come in Feature 7; until then omit or show “—”).
   - RLS: Vendor user can only SELECT orders where `orders.stall_id = (SELECT stall_id FROM users WHERE id = auth.uid())`.

2. **UI**
   - Page: `app/vendor/page.tsx` (or `app/vendor/orders/page.tsx`). Title: “Orders” or “Order inbox”.
   - Filter: Tabs or dropdown – All | Pending | Accepted | Preparing | Ready for pickup | Fulfilled. Default “All”. Filter is client or query param; refetch when changed.
   - List: Order cards. Each card shows: short order ID (e.g. last 6 of UUID), pickup window (formatted time range), status badge, total (₹ = total_cents/100), item count or first line summary, residential block (e.g. “SV2”), “Customer left” if applicable (or “—” for now), order notes (or “—” if null). Optional: link “View” to `/vendor/orders/[id]` for later detail/actions.
   - Empty state: “No orders today” when list is empty.
   - Use existing UI components (Button, Card, Badge) and Tailwind; keep layout simple and scannable for a stall counter.

3. **No status changes in this feature**
   - No Accept/Reject or Preparing/Ready buttons yet; those come in Feature 2. Inbox is read-only for status.

### Delivered together

- Vendor can sign in (pre-created account with role=vendor, stall_id set), land on `/vendor`, and see today’s orders for their stall with filters and the agreed card fields (including order notes once column exists). Cancelled orders are excluded. Sort and filters work as specified.

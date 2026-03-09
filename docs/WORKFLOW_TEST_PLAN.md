# ISB Eat-Sync – Workflow test plan

Use this to verify the MVP after Supabase is connected and migrations + seed are applied.

**Prerequisites**
- `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Migrations 001–016 run on Supabase; seed (007) has stalls, menu, blocks
- Realtime: `orders` table in **supabase_realtime** publication
- At least one **vendor user**: Auth user + row in `public.users` with `role = 'vendor'` and `stall_id` set

---

## 1. Customer – Home and stall

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Open `http://localhost:3000` | Home loads; “Campus Stalls” and stall cards (e.g. Goer) appear |
| 1.2 | Click a stall | Stall page with menu items; “Add to cart” available if stall is open |
| 1.3 | Add item(s) to cart | Cart count updates; cart link shows quantity |

---

## 2. Customer – Checkout and order

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | Open cart, go to checkout | Checkout page; select residential block (e.g. SV2) |
| 2.2 | Place order | Redirect to order page `/order/[id]` |
| 2.3 | Order page | Shows stall, status “pending”, pickup window, total; “I’m leaving” and QR code section |
| 2.4 | Click “I’m leaving” | Message: “Vendor notified — they know you're on your way.” (no error) |
| 2.5 | Scroll to QR | QR code visible; “Show this QR at pickup for the vendor to scan” |

---

## 3. Vendor – Sign-in and inbox

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | Open `http://localhost:3000/signin` | Sign-in form |
| 3.2 | Sign in with **vendor** email/password | Redirect to `/vendor` |
| 3.3 | Vendor dashboard | Header: stall name, “Orders”, “Menu”, stall status (Open/Busy/Closed) |
| 3.4 | Orders tab | Order inbox; filters (All, Pending, …); “Scan QR” button; order cards for today |

---

## 4. Vendor – Order actions and assign

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | Find a **pending** order | “Accept” and “Reject” visible |
| 4.2 | Click Accept | Status → Accepted; “Start preparing” appears |
| 4.3 | Click Start preparing | Status → Preparing; “Mark ready” appears |
| 4.4 | Type in “Assigned to” (e.g. “Ramesh”), blur or Enter | “Saving…” then value sticks (refresh to confirm in DB) |
| 4.5 | Click Mark ready | Status → Ready; “Fulfill (delivered)” and “Scan QR” available |
| 4.6 | Click “Fulfill (delivered)” | Order moves to Fulfilled / disappears from active list; inventory decrements if in use |

---

## 5. Vendor – QR scan to fulfill

| Step | Action | Expected |
|------|--------|----------|
| 5.1 | Have an order in **Ready** on customer phone (QR visible) | — |
| 5.2 | Vendor: click “Scan QR” | Modal with camera (or “Upload QR image”) |
| 5.3 | Scan customer’s QR (or upload screenshot) | “Order fulfilled.”; modal closes; list refreshes; order fulfilled |

---

## 6. Vendor – Stall status and menu

| Step | Action | Expected |
|------|--------|----------|
| 6.1 | In header, set stall to “Busy” then “Closed” | Status updates |
| 6.2 | Open customer app, same stall | “Stall busy” or “Stall closed”; add to cart hidden when closed |
| 6.3 | Go to **Menu** (`/vendor/menu`) | List of menu items; “Mark sold out” / “Back in stock”; “Set initial inventory” / “Restock” if inventory used |

---

## 7. Alerts (new order + customer left)

| Step | Action | Expected |
|------|--------|----------|
| 7.1 | Vendor on `/vendor` (orders page) | Badge on “Orders” clear (or no badge) |
| 7.2 | Vendor switches to **Menu** (or another tab) | — |
| 7.3 | Customer places a **new** order (other browser/device) | Vendor: badge on “Orders” increases; short beep (new order) |
| 7.4 | Customer on order page clicks “I’m leaving” | Vendor: badge increases again; different beep (customer left) |
| 7.5 | Vendor clicks “Orders” / opens orders page | Badge clears |

---

## 8. Reject and customer message

| Step | Action | Expected |
|------|--------|----------|
| 8.1 | Vendor rejects an order (optional reason) | Order no longer in main list (or in cancelled state per your UI) |
| 8.2 | Customer opens that order page | “Order could not be fulfilled”; optional reason shown |

---

## Quick smoke (minimal)

1. Home loads and shows stalls (or “No stalls found” if no seed).
2. Sign in as vendor → redirect to `/vendor`, inbox and menu links work.
3. Place order as customer (guest or signed-in) → order page with QR and “I’m leaving”.
4. Vendor: accept → preparing → ready → fulfill one order; assign a name in “Assigned to”.

If any step fails, check: Supabase env vars, RLS, Realtime publication for `orders`, and that vendor user has `stall_id` set.

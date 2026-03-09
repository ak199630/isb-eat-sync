# ISB Eat-Sync – Progress Summary & Next Steps

Use this document in a **new chat** to restore context and continue work.

---

## 1. Project overview (unchanged)

- **Product:** Hyper-local campus food app for Indian School of Business. JIT ordering, “time to head out,” QR handshake, load balancing.
- **Tech:** Next.js 15 (App Router), TypeScript, Tailwind, Supabase (Postgres + Auth). Custom Shadcn-style UI (no full Shadcn install).
- **Workspace:** `c:\Users\Ankit\New folder (2)`

---

## 2. What was implemented in this chat (vendor dashboard MVP)

### Vendor access (Hybrid C)
- **Migrations:** `011_vendor_enum.sql` (add `vendor` to `user_role`), `011_vendor_access.sql` (users.stall_id, orders.order_notes, RLS for vendor).
- **Auth:** User type includes `role: 'vendor'` and `stallId`; profile fetch returns them. Sign-in redirects vendors to `/vendor`.
- **Routes:** `/vendor` (dashboard), `/vendor/menu` (sold-out & inventory). Customer header hidden on `/vendor` via `CustomerHeader` component.
- **Vendor creation:** No signup UI. Create Auth user in Supabase, then insert into `public.users` with same id, `role = 'vendor'`, `stall_id = (SELECT id FROM stalls WHERE name = 'Goer' LIMIT 1)` (or other stall). See strategy doc for SQL.

### Feature 1 – Order inbox
- **Vendor orders:** `src/lib/db/vendorOrders.ts` – `fetchVendorOrders(stallId, statusFilter)` for today’s orders, sort by pickup time, exclude cancelled.
- **Page:** `src/app/vendor/page.tsx` – filters (All, Pending, Accepted, Preparing, Ready, Fulfilled), order cards with shortId, pickup window, status, total, items, block, notes, ETA, “Customer left.”

### Feature 2 – Accept / Reject and prep flow
- **Migration:** `012_order_status_flow.sql` – `orders.cancelled_reason` (optional).
- **Orders:** New orders created with `status: 'pending'`. `updateOrderStatus(orderId, status, cancelledReason?)` in `src/lib/db/orders.ts` with allowed transitions: pending→accepted, pending→cancelled, accepted→preparing, preparing→ready_for_pickup, ready_for_pickup→fulfilled.
- **Vendor UI:** Accept, Reject (optional reason), Start preparing, Mark ready, Fulfill (delivered) on order cards.
- **Customer:** Order page shows “Order could not be fulfilled” when cancelled, with optional reason.

### Feature 6 – Stall status (Open / Busy / Closed)
- **Vendor layout:** Stall status control in header (Open | Busy | Closed) via `updateStallStatus`; stall name from `fetchStallForVendor`.
- **Customer:** Stall page shows “Stall closed” (no ordering) or “Stall busy” message; Add to cart hidden when closed. `refetchSilent()` in StallsContext for fresh status on stall page.

### Feature 5 – Sold-out toggle + inventory
- **Migration:** `013_menu_inventory.sql` – `menu_items.initial_inventory`, `menu_items.current_inventory` (NULL = manual mode).
- **Vendor Menu page:** `/vendor/menu` – per-item “Mark sold out” / “Back in stock”; “Mark all sold out” / “Mark all available”; **Set initial inventory** (enables inventory mode) or **Switch to manual**; **Restock** when in inventory mode.
- **Data layer:** `setInitialInventory`, `switchToManualMode`, `restockInventory`, `decrementInventoryForFulfilledOrder(orderId)` in `src/lib/db/stalls.ts`. On “Fulfill (delivered)” in vendor inbox, inventory is decremented per order item; at 0 the item is auto-marked sold out.

### Feature 3 – Queue-based ETA
- **Vendor inbox:** Orders in status accepted or preparing get `estimatedReadyAt` = now + (queue position × stall prep time). Stall prep from `getStallPrepTimeMinutes(stallId)`. Order cards show “Ready in ~X min” or “Ready by HH:MM.”

### Feature 7 – “Customer left room” handshake
- **Migration:** `014_customer_left_at.sql` – `orders.customer_left_at` (timestamptz).
- **API:** `POST /api/orders/[id]/customer-left` – sets `customer_left_at` once (idempotent). Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` so the update is allowed.
- **Customer order page:** “I’m leaving” button; on success shows “Vendor notified — they know you're on your way.”
- **Vendor:** Order cards show “Customer left at HH:MM” when `customer_left_at` is set. `fetchVendorOrders` and types include `customerLeftAt`.

### Feature 4 – QR scan to fulfill
- **API:** `POST /api/vendor/orders/fulfill` – body `{ qrToken }`. Server validates vendor session (via `@supabase/ssr` server client), finds order by `qr_token` for vendor’s stall, requires status `ready_for_pickup`, then sets fulfilled + decrements inventory.
- **Vendor:** “Scan QR” button on order inbox opens modal with camera stream and optional “Upload QR image”; decode via jsQR; on success calls fulfill API and refreshes list.
- **Customer order page:** QR code (qrcode.react) encoding `order.qrToken` with copy “Show this QR at pickup for the vendor to scan”.

### Feature 8 – Assign to cook + new-order & “customer left” alerts
- **Migrations:** `015_orders_assigned_to.sql` – `orders.assigned_to` (TEXT, nullable). `016_orders_replica_identity.sql` – `REPLICA IDENTITY FULL` on orders so Realtime UPDATE sends old row for alerts.
- **Assigned to:** Each order card has “Assigned to: [input]”; save on blur/Enter via `updateOrderAssignedTo(orderId, assignedTo)`. Types and `fetchVendorOrders` include `assignedTo`.
- **Realtime alerts:** Vendor layout subscribes to `orders` (filter `stall_id=eq.<stallId>`). INSERT → new-order count + sound (880 Hz); UPDATE with `customer_left_at` newly set → customer-left count + sound (660 Hz). Badge on “Orders” shows total count; clearing when vendor is on `/vendor` (orders page).
- **Sounds:** `src/lib/vendorAlerts.ts` – Web Audio beeps (no asset files).

---

## 3. Key files and schema (reference)

| Area | Path / file |
|------|------------------|
| Vendor layout | `src/app/vendor/layout.tsx` |
| Vendor orders (inbox) | `src/app/vendor/page.tsx` |
| Vendor menu (sold-out + inventory) | `src/app/vendor/menu/page.tsx` |
| Vendor orders data | `src/lib/db/vendorOrders.ts` |
| Vendor stall helpers | `src/lib/db/stalls.ts` (fetchStallForVendor, getStallPrepTimeMinutes, inventory, etc.) |
| Order status updates | `src/lib/db/orders.ts` (updateOrderStatus, createOrder with status pending) |
| Customer header (hide on /vendor) | `src/components/CustomerHeader.tsx` |
| Customer order page | `src/app/order/[id]/page.tsx` (cancelled state, “I’m leaving”, customerLeftAt) |
| Customer-left API | `src/app/api/orders/[id]/customer-left/route.ts` |
| Vendor fulfill-by-QR API | `src/app/api/vendor/orders/fulfill/route.ts` |
| Vendor scan QR component | `src/components/vendor/VendorScanQR.tsx` |
| Strategy & decisions | `docs/VENDOR_DASHBOARD_STRATEGY.md` |
| Vendor alerts (sounds) | `src/lib/vendorAlerts.ts` |
| Migrations (run in order) | `schema/011_vendor_enum.sql`, `011_vendor_access.sql`, `012_order_status_flow.sql`, `013_menu_inventory.sql`, `014_customer_left_at.sql`, `015_orders_assigned_to.sql`, `016_orders_replica_identity.sql` |
| Schema overview | `schema/README.md` |

---

## 4. What remains to do (from strategy)

### Other (from original context)
- **FCM:** Push “Time to head out” / “Ready for pickup” not wired; placeholders in code and cron.
- **Sprint 4 – Congestion:** Live busy-ness per stall, auto-throttle when >20 pending, “Time saved” after QR handshake.

---

## 5. How to continue in a new chat

1. **Restore context:** “Use the project context in docs/PROJECT_PROGRESS_AND_NEXT_STEPS.md and the original project context (ISB Eat-Sync) to continue. Vendor dashboard MVP is complete (features 1–8). Next: optional FCM, Sprint 4 congestion.”
2. **Or pick one:** “Implement Feature 8: assign to cook + new-order and customer-left alerts. See docs/PROJECT_PROGRESS_AND_NEXT_STEPS.md.”
3. **Env reminder:** For customer-left API, `SUPABASE_SERVICE_ROLE_KEY` must be set in `.env.local`. For vendor dashboard, run migrations 011–016 in Supabase SQL Editor.

---

## 6. Quick checklist for next session

- [x] Feature 4: QR scan → fulfill API + vendor scan UI + customer order page QR display
- [x] Feature 8: assigned_to + Realtime alerts (new order, customer left)
- [ ] Optional: FCM for leave-now / ready-for-pickup; Sprint 4 congestion

End of summary.

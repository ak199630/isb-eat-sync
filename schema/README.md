# ISB Eat-Sync – Database Schema

Postgres schema (Supabase-compatible) for the full app: Menu & Access (Sprint 1), JIT ordering (Sprint 2), Vendor dashboard + QR handshake (Sprint 3), and Congestion/analytics (Sprint 4).

## Run order

Run the SQL files in numeric order (e.g. in Supabase SQL Editor or `psql`):

1. `001_extensions_and_enums.sql` – UUID extension, enums
2. `002_locations_and_walk_times.sql` – Residential blocks, stall locations, walk-time matrix
3. `003_users.sql` – Users (role, residential_block_id, fcm_token)
4. `004_stalls_and_menu.sql` – Stalls, menu_items
5. `005_orders_and_notifications.sql` – Orders, order_items, notifications
6. `006_triggers.sql` – `updated_at` triggers
7. `007_seed.sql` – Seed data (blocks, locations, walk times, stalls, menu, demo users)
8. `008_sprint2_guest_orders.sql` – Guest orders (nullable user_id, guest_residential_block_id)
9. `009_rls_sprint2.sql` – RLS policies for anon (orders, order_items, residential_blocks)
10. `010_rls_users_auth.sql` – RLS for users (insert/select/update own row for sign-up/sign-in)
11. `011_vendor_enum.sql` – Add `vendor` to user_role enum (run once, in its own run)
12. `011_vendor_access.sql` – users.stall_id, orders.order_notes, RLS for vendor (run after 011_vendor_enum)
13. `012_order_status_flow.sql` – orders.cancelled_reason (optional reject reason)
14. `013_menu_inventory.sql` – menu_items.initial_inventory, current_inventory (optional per-SKU tracking)
15. `014_customer_left_at.sql` – orders.customer_left_at (Feature 7: “I’m leaving” handshake)
16. `015_orders_assigned_to.sql` – orders.assigned_to (Feature 8: assign to cook)
17. `016_orders_replica_identity.sql` – REPLICA IDENTITY FULL on orders (Realtime UPDATE old row for alerts)

## Table overview

| Table | Purpose |
|-------|--------|
| **residential_blocks** | SV1–SV4; used for “Leave Now” walk time |
| **stall_locations** | Physical places (Goer, TCC, MFC, Nescafe, Bajaj) |
| **walk_times** | Matrix: (block, stall) → walk_minutes |
| **users** | role (`student` / `authorized`), residential_block_id, fcm_token |
| **stalls** | name, status, default/current prep time, requires_authorized_role |
| **menu_items** | stall_id, name, price_cents, category, is_available |
| **orders** | user, stall, status, pickup window, qr_token, notification timestamps |
| **order_items** | order_id, menu_item_id, quantity, unit_price_cents |
| **notifications** | Optional log: user, order, type (leave_now / ready_for_pickup) |

## Feature mapping

- **Sprint 1 – Menu & Access**: `stalls`, `menu_items`, `users.role`; filter Bajaj by `requires_authorized_role` and `user.role = 'authorized'`. Quick Bite from `current_prep_time_minutes < 10`. Sold out via `menu_items.is_available`.
- **Sprint 2 – JIT**: `orders.target_pickup_start/end`, `walk_times`, `users.residential_block_id`. Leave-now time = target_pickup_start − (walk_minutes + 2). Use `leave_now_notification_sent_at` to send once.
- **Sprint 3 – Vendor + QR**: Orders sorted by `target_pickup_start`. Status flow: accepted → preparing → ready_for_pickup → fulfilled (on QR scan). `orders.qr_token` for scan; set `fulfilled_at` and send “Ready for pickup” / success.
- **Sprint 4 – Congestion**: Count orders per stall with `status IN ('accepted','preparing','ready_for_pickup')` for busy-ness. When count > 20, increase `stalls.current_prep_time_minutes` by 5. “Time saved” from `fulfilled_at` vs expected queue time.

## Money and IDs

- **Prices**: Stored in **paise** in `menu_items.price_cents` and `order_items.unit_price_cents`, `orders.total_cents`. Display as INR (÷ 100).
- **IDs**: All primary keys are `UUID`; use `uuid_generate_v4()` or DB default. `orders.qr_token` is a unique string (e.g. UUID or nanoid) for the QR code.

## Row Level Security (Supabase)

After creating tables, enable RLS and add policies per role (e.g. students read stalls/menus and their orders; vendors read/update orders for their stall; only service role can write to notifications). Not included in these migrations.

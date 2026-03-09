-- Vendor access (Hybrid C): stall_id on users, order_notes, RLS for vendor.
-- Run 011_vendor_enum.sql first (in its own run), then run this file.
-- Run after 010. Requires Supabase Auth.

-- 1. Link vendor to stall (enum 'vendor' already added by 011_vendor_enum.sql)
ALTER TABLE users ADD COLUMN IF NOT EXISTS stall_id UUID REFERENCES stalls(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_stall ON users(stall_id);
COMMENT ON COLUMN users.stall_id IS 'For role=vendor: the stall this user manages. Required when role=vendor.';

-- 2. Order notes (for vendor inbox and future checkout)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_notes TEXT;

-- 3. Authenticated: allow signed-in users to read orders/order_items (customer order page)
DO $$ BEGIN
  CREATE POLICY "authenticated_select_orders" ON orders
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated_select_order_items" ON order_items
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Vendor: can update only their stall's orders
DO $$ BEGIN
  CREATE POLICY "vendor_update_orders" ON orders
    FOR UPDATE TO authenticated
    USING (
      stall_id = (SELECT stall_id FROM users WHERE id = auth.uid() AND role = 'vendor')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Stalls: authenticated read; vendor update own stall
ALTER TABLE stalls ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "authenticated_select_stalls" ON stalls
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "anon_select_stalls" ON stalls
    FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "vendor_update_stalls" ON stalls
    FOR UPDATE TO authenticated
    USING (id = (SELECT stall_id FROM users WHERE id = auth.uid() AND role = 'vendor'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. Menu items: authenticated read; vendor update own stall's items (sold-out toggle)
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "authenticated_select_menu_items" ON menu_items
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "anon_select_menu_items" ON menu_items
    FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "vendor_update_menu_items" ON menu_items
    FOR UPDATE TO authenticated
    USING (stall_id = (SELECT stall_id FROM users WHERE id = auth.uid() AND role = 'vendor'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

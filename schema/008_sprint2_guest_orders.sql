-- Sprint 2: Guest orders + residential block for "Leave now" walk time
-- Run this on existing DBs. New installs: run_all.sql will be updated to include these columns.

-- Add guest residential block (for walk time when user_id is null)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_residential_block_id UUID REFERENCES residential_blocks(id) ON DELETE SET NULL;

-- Make user_id nullable for guest orders (guest: user_id null, guest_residential_block_id set)
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

-- Ensure at least one identifies pickup origin: user (has default block) or guest (must provide block)
-- For guest: user_id IS NULL AND guest_residential_block_id IS NOT NULL
-- For logged-in: user_id IS NOT NULL (guest_residential_block_id optional override)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_origin_check;
ALTER TABLE orders ADD CONSTRAINT orders_origin_check CHECK (
  (user_id IS NOT NULL) OR (guest_residential_block_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_orders_guest_block ON orders(guest_residential_block_id);

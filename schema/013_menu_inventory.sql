-- Optional per-SKU inventory: initial_inventory and current_inventory.
-- NULL = manual mode (vendor toggles sold out by hand). When set, current_inventory
-- decrements on order fulfillment; at 0 the item is auto-marked sold out.
-- Run this in Supabase SQL Editor if you get "column does not exist".

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS initial_inventory INTEGER;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS current_inventory INTEGER;

ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_initial_inventory_non_neg;
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_current_inventory_non_neg;
ALTER TABLE menu_items ADD CONSTRAINT menu_items_initial_inventory_non_neg
  CHECK (initial_inventory IS NULL OR initial_inventory >= 0);
ALTER TABLE menu_items ADD CONSTRAINT menu_items_current_inventory_non_neg
  CHECK (current_inventory IS NULL OR current_inventory >= 0);

COMMENT ON COLUMN menu_items.initial_inventory IS 'NULL = manual sold-out only. Set = track inventory; decrements on fulfill.';
COMMENT ON COLUMN menu_items.current_inventory IS 'Remaining quantity. Decremented on order fulfillment; 0 => is_available = false.';

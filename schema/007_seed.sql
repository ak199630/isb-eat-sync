-- ISB Eat-Sync: Seed data (run after all migrations)
-- Idempotent: safe to run multiple times (ON CONFLICT DO NOTHING / skip if exists).

-- Residential blocks (SV1–SV4)
INSERT INTO residential_blocks (code, display_name) VALUES
  ('SV1', 'SV1 Block'),
  ('SV2', 'SV2 Block'),
  ('SV3', 'SV3 Block'),
  ('SV4', 'SV4 Block')
ON CONFLICT (code) DO NOTHING;

-- Stall locations (physical places)
INSERT INTO stall_locations (code, display_name) VALUES
  ('GOER', 'Goer'),
  ('TCC', 'TCC'),
  ('MFC', 'MFC'),
  ('NESCAFE', 'Nescafe'),
  ('BAJAJ', 'Bajaj Dining')
ON CONFLICT (code) DO NOTHING;

-- Walk time matrix (minutes): residential_block -> stall_location
INSERT INTO walk_times (residential_block_id, stall_location_id, walk_minutes)
SELECT rb.id, sl.id, wt.walk_minutes
FROM (VALUES
  ('SV1', 'GOER', 6), ('SV1', 'TCC', 5), ('SV1', 'MFC', 7), ('SV1', 'NESCAFE', 4), ('SV1', 'BAJAJ', 8),
  ('SV2', 'GOER', 7), ('SV2', 'TCC', 6), ('SV2', 'MFC', 8), ('SV2', 'NESCAFE', 5), ('SV2', 'BAJAJ', 9),
  ('SV3', 'GOER', 5), ('SV3', 'TCC', 4), ('SV3', 'MFC', 6), ('SV3', 'NESCAFE', 3), ('SV3', 'BAJAJ', 7),
  ('SV4', 'GOER', 5), ('SV4', 'TCC', 5), ('SV4', 'MFC', 7), ('SV4', 'NESCAFE', 4), ('SV4', 'BAJAJ', 8)
) AS wt(block_code, location_code, walk_minutes)
JOIN residential_blocks rb ON rb.code = wt.block_code
JOIN stall_locations sl ON sl.code = wt.location_code
ON CONFLICT (residential_block_id, stall_location_id) DO NOTHING;

-- Stalls (one per location)
INSERT INTO stalls (location_id, name, status, default_prep_time_minutes, current_prep_time_minutes, requires_authorized_role)
SELECT sl.id, s.name, s.status::stall_status, s.prep_mins, s.prep_mins, s.bajaj_only
FROM (VALUES
  ('GOER', 'Goer', 'busy', 18, FALSE),
  ('TCC', 'TCC', 'open', 12, FALSE),
  ('MFC', 'MFC', 'open', 8, FALSE),
  ('NESCAFE', 'Nescafe', 'open', 5, FALSE),
  ('BAJAJ', 'Bajaj Dining Hall', 'open', 15, TRUE)
) AS s(loc_code, name, status, prep_mins, bajaj_only)
JOIN stall_locations sl ON sl.code = s.loc_code
ON CONFLICT (location_id) DO NOTHING;

-- Menu items per stall (only if stall has no items yet)
-- Goer
INSERT INTO menu_items (stall_id, name, price_cents, category, is_available, sort_order)
SELECT s.id, m.name, m.price_cents, m.category, m.is_available, m.sort_order
FROM stalls s
CROSS JOIN (VALUES
  ('Chicken Biryani', 18000, 'main', TRUE, 1),
  ('Veg Pulao', 12000, 'main', TRUE, 2),
  ('Masala Dosa', 8000, 'main', FALSE, 3),
  ('Cold Coffee', 6000, 'beverage', TRUE, 4),
  ('Lassi', 5000, 'beverage', TRUE, 5)
) AS m(name, price_cents, category, is_available, sort_order)
WHERE s.name = 'Goer' AND NOT EXISTS (SELECT 1 FROM menu_items mi WHERE mi.stall_id = s.id);

-- TCC
INSERT INTO menu_items (stall_id, name, price_cents, category, is_available, sort_order)
SELECT s.id, m.name, m.price_cents, m.category, m.is_available, m.sort_order
FROM stalls s
CROSS JOIN (VALUES
  ('Sandwich', 9000, 'snack', TRUE, 1),
  ('Wrap', 11000, 'snack', TRUE, 2),
  ('Cappuccino', 10000, 'beverage', TRUE, 3),
  ('Green Tea', 4000, 'beverage', TRUE, 4),
  ('Muffin', 7000, 'snack', TRUE, 5)
) AS m(name, price_cents, category, is_available, sort_order)
WHERE s.name = 'TCC' AND NOT EXISTS (SELECT 1 FROM menu_items mi WHERE mi.stall_id = s.id);

-- MFC
INSERT INTO menu_items (stall_id, name, price_cents, category, is_available, sort_order)
SELECT s.id, m.name, m.price_cents, m.category, m.is_available, m.sort_order
FROM stalls s
CROSS JOIN (VALUES
  ('Burger', 13000, 'main', TRUE, 1),
  ('Fries', 6000, 'snack', TRUE, 2),
  ('Chicken Wings', 15000, 'snack', TRUE, 3),
  ('Soft Drink', 5000, 'beverage', TRUE, 4),
  ('Combo Meal', 20000, 'main', TRUE, 5)
) AS m(name, price_cents, category, is_available, sort_order)
WHERE s.name = 'MFC' AND NOT EXISTS (SELECT 1 FROM menu_items mi WHERE mi.stall_id = s.id);

-- Nescafe
INSERT INTO menu_items (stall_id, name, price_cents, category, is_available, sort_order)
SELECT s.id, m.name, m.price_cents, m.category, m.is_available, m.sort_order
FROM stalls s
CROSS JOIN (VALUES
  ('Hot Coffee', 6000, 'beverage', TRUE, 1),
  ('Iced Coffee', 8000, 'beverage', TRUE, 2),
  ('Croissant', 6500, 'snack', TRUE, 3),
  ('Cookies', 4000, 'snack', TRUE, 4),
  ('Breakfast Combo', 12000, 'breakfast', TRUE, 5)
) AS m(name, price_cents, category, is_available, sort_order)
WHERE s.name = 'Nescafe' AND NOT EXISTS (SELECT 1 FROM menu_items mi WHERE mi.stall_id = s.id);

-- Bajaj Dining Hall
INSERT INTO menu_items (stall_id, name, price_cents, category, is_available, sort_order)
SELECT s.id, m.name, m.price_cents, m.category, m.is_available, m.sort_order
FROM stalls s
CROSS JOIN (VALUES
  ('Full Meals', 10000, 'main', TRUE, 1),
  ('Curd Rice', 6000, 'main', TRUE, 2),
  ('Special Thali', 14000, 'main', TRUE, 3),
  ('Buttermilk', 3000, 'beverage', TRUE, 4),
  ('Dessert', 5000, 'snack', TRUE, 5)
) AS m(name, price_cents, category, is_available, sort_order)
WHERE s.name = 'Bajaj Dining Hall' AND NOT EXISTS (SELECT 1 FROM menu_items mi WHERE mi.stall_id = s.id);

-- Demo users (optional; skip if already exist)
INSERT INTO users (email, display_name, role, residential_block_id)
SELECT 'student@isb.edu', 'Demo Student', 'student', rb.id
FROM residential_blocks rb WHERE rb.code = 'SV2' LIMIT 1
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, display_name, role, residential_block_id)
SELECT 'authorized@isb.edu', 'Demo Authorized', 'authorized', rb.id
FROM residential_blocks rb WHERE rb.code = 'SV2' LIMIT 1
ON CONFLICT (email) DO NOTHING;

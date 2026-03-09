-- =============================================================================
-- ISB Eat-Sync: Run this ONCE in Supabase SQL Editor (New query → paste → Run)
-- Creates all tables and seed data. Use a fresh project or drop existing tables first.
-- =============================================================================

-- 1. Extensions and enums
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'authorized');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE stall_status AS ENUM ('open', 'busy', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending', 'accepted', 'preparing', 'ready_for_pickup', 'fulfilled', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('leave_now', 'ready_for_pickup');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Locations
CREATE TABLE IF NOT EXISTS residential_blocks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_residential_blocks_code ON residential_blocks(code);

CREATE TABLE IF NOT EXISTS stall_locations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code         TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stall_locations_code ON stall_locations(code);

CREATE TABLE IF NOT EXISTS walk_times (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  residential_block_id UUID NOT NULL REFERENCES residential_blocks(id) ON DELETE CASCADE,
  stall_location_id    UUID NOT NULL REFERENCES stall_locations(id) ON DELETE CASCADE,
  walk_minutes         SMALLINT NOT NULL CHECK (walk_minutes > 0 AND walk_minutes <= 30),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (residential_block_id, stall_location_id)
);
CREATE INDEX IF NOT EXISTS idx_walk_times_from_to ON walk_times(residential_block_id, stall_location_id);

-- 3. Users
CREATE TABLE IF NOT EXISTS users (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                TEXT NOT NULL UNIQUE,
  display_name         TEXT NOT NULL,
  role                 user_role NOT NULL DEFAULT 'student',
  residential_block_id UUID REFERENCES residential_blocks(id) ON DELETE SET NULL,
  fcm_token            TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_residential_block ON users(residential_block_id);

-- 4. Stalls and menu_items
CREATE TABLE IF NOT EXISTS stalls (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id                 UUID NOT NULL UNIQUE REFERENCES stall_locations(id) ON DELETE CASCADE,
  name                        TEXT NOT NULL,
  status                      stall_status NOT NULL DEFAULT 'open',
  default_prep_time_minutes  SMALLINT NOT NULL DEFAULT 15 CHECK (default_prep_time_minutes > 0 AND default_prep_time_minutes <= 60),
  current_prep_time_minutes  SMALLINT NOT NULL DEFAULT 15 CHECK (current_prep_time_minutes > 0 AND current_prep_time_minutes <= 90),
  requires_authorized_role   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stalls_status ON stalls(status);
CREATE INDEX IF NOT EXISTS idx_stalls_location ON stalls(location_id);

CREATE TABLE IF NOT EXISTS menu_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stall_id     UUID NOT NULL REFERENCES stalls(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  price_cents  INTEGER NOT NULL CHECK (price_cents >= 0),
  category     TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   SMALLINT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_menu_items_stall ON menu_items(stall_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_stall_available ON menu_items(stall_id, is_available);

-- 5. Orders and notifications
CREATE TABLE IF NOT EXISTS orders (
  id                             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                        UUID REFERENCES users(id) ON DELETE CASCADE,
  guest_residential_block_id     UUID REFERENCES residential_blocks(id) ON DELETE SET NULL,
  stall_id                       UUID NOT NULL REFERENCES stalls(id) ON DELETE RESTRICT,
  status                         order_status NOT NULL DEFAULT 'pending',
  target_pickup_start            TIMESTAMPTZ NOT NULL,
  target_pickup_end              TIMESTAMPTZ NOT NULL,
  prep_time_minutes              SMALLINT NOT NULL,
  total_cents                    INTEGER NOT NULL CHECK (total_cents >= 0),
  qr_token                       TEXT NOT NULL UNIQUE,
  leave_now_notification_sent_at TIMESTAMPTZ,
  ready_notification_sent_at     TIMESTAMPTZ,
  fulfilled_at                    TIMESTAMPTZ,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT orders_pickup_window_valid CHECK (target_pickup_end > target_pickup_start),
  CONSTRAINT orders_origin_check CHECK ((user_id IS NOT NULL) OR (guest_residential_block_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_guest_block ON orders(guest_residential_block_id);
CREATE INDEX IF NOT EXISTS idx_orders_stall ON orders(stall_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_qr_token ON orders(qr_token);

CREATE TABLE IF NOT EXISTS order_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id    UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity        SMALLINT NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id   UUID REFERENCES orders(id) ON DELETE SET NULL,
  type       notification_type NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  channel    TEXT
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_order ON notifications(order_id);

-- 6. Triggers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS stalls_updated_at ON stalls;
CREATE TRIGGER stalls_updated_at BEFORE UPDATE ON stalls FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS menu_items_updated_at ON menu_items;
CREATE TRIGGER menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- 7. Seed (only if empty)
INSERT INTO residential_blocks (code, display_name)
SELECT * FROM (VALUES ('SV1', 'SV1 Block'), ('SV2', 'SV2 Block'), ('SV3', 'SV3 Block'), ('SV4', 'SV4 Block')) AS t(code, display_name)
ON CONFLICT (code) DO NOTHING;

INSERT INTO stall_locations (code, display_name)
SELECT * FROM (VALUES ('GOER', 'Goer'), ('TCC', 'TCC'), ('MFC', 'MFC'), ('NESCAFE', 'Nescafe'), ('BAJAJ', 'Bajaj Dining')) AS t(code, display_name)
ON CONFLICT (code) DO NOTHING;

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
WHERE NOT EXISTS (SELECT 1 FROM stalls LIMIT 1);

INSERT INTO menu_items (stall_id, name, price_cents, category, is_available, sort_order)
SELECT s.id, m.name, m.price_cents, m.category, m.is_available, m.sort_order
FROM stalls s
CROSS JOIN (VALUES
  ('Goer', 'Chicken Biryani', 18000, 'main', TRUE, 1),
  ('Goer', 'Veg Pulao', 12000, 'main', TRUE, 2),
  ('Goer', 'Masala Dosa', 8000, 'main', FALSE, 3),
  ('Goer', 'Cold Coffee', 6000, 'beverage', TRUE, 4),
  ('Goer', 'Lassi', 5000, 'beverage', TRUE, 5),
  ('TCC', 'Sandwich', 9000, 'snack', TRUE, 1),
  ('TCC', 'Wrap', 11000, 'snack', TRUE, 2),
  ('TCC', 'Cappuccino', 10000, 'beverage', TRUE, 3),
  ('TCC', 'Green Tea', 4000, 'beverage', TRUE, 4),
  ('TCC', 'Muffin', 7000, 'snack', TRUE, 5),
  ('MFC', 'Burger', 13000, 'main', TRUE, 1),
  ('MFC', 'Fries', 6000, 'snack', TRUE, 2),
  ('MFC', 'Chicken Wings', 15000, 'snack', TRUE, 3),
  ('MFC', 'Soft Drink', 5000, 'beverage', TRUE, 4),
  ('MFC', 'Combo Meal', 20000, 'main', TRUE, 5),
  ('Nescafe', 'Hot Coffee', 6000, 'beverage', TRUE, 1),
  ('Nescafe', 'Iced Coffee', 8000, 'beverage', TRUE, 2),
  ('Nescafe', 'Croissant', 6500, 'snack', TRUE, 3),
  ('Nescafe', 'Cookies', 4000, 'snack', TRUE, 4),
  ('Nescafe', 'Breakfast Combo', 12000, 'breakfast', TRUE, 5),
  ('Bajaj Dining Hall', 'Full Meals', 10000, 'main', TRUE, 1),
  ('Bajaj Dining Hall', 'Curd Rice', 6000, 'main', TRUE, 2),
  ('Bajaj Dining Hall', 'Special Thali', 14000, 'main', TRUE, 3),
  ('Bajaj Dining Hall', 'Buttermilk', 3000, 'beverage', TRUE, 4),
  ('Bajaj Dining Hall', 'Dessert', 5000, 'snack', TRUE, 5)
) AS m(stall_name, name, price_cents, category, is_available, sort_order)
WHERE s.name = m.stall_name
AND NOT EXISTS (SELECT 1 FROM menu_items LIMIT 1);

INSERT INTO users (email, display_name, role, residential_block_id)
SELECT 'student@isb.edu', 'Demo Student', 'student', id FROM residential_blocks WHERE code = 'SV2' LIMIT 1
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, display_name, role, residential_block_id)
SELECT 'authorized@isb.edu', 'Demo Authorized', 'authorized', id FROM residential_blocks WHERE code = 'SV2' LIMIT 1
ON CONFLICT (email) DO NOTHING;

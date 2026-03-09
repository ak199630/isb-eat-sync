-- ISB Eat-Sync: Stalls and menu items
-- current_prep_time_minutes used for Sprint 4 throttling when pending orders > 20.

CREATE TABLE stalls (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id                 UUID NOT NULL UNIQUE REFERENCES stall_locations(id) ON DELETE CASCADE,
  name                       TEXT NOT NULL,
  status                     stall_status NOT NULL DEFAULT 'open',
  default_prep_time_minutes  SMALLINT NOT NULL DEFAULT 15 CHECK (default_prep_time_minutes > 0 AND default_prep_time_minutes <= 60),
  current_prep_time_minutes  SMALLINT NOT NULL DEFAULT 15 CHECK (current_prep_time_minutes > 0 AND current_prep_time_minutes <= 90),
  requires_authorized_role   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stalls_status ON stalls(status);
CREATE INDEX idx_stalls_location ON stalls(location_id);
CREATE INDEX idx_stalls_requires_authorized ON stalls(requires_authorized_role);

COMMENT ON COLUMN stalls.current_prep_time_minutes IS 'Can be increased by 5 when pending orders > 20 (Sprint 4 auto-throttle)';

-- Menu items per stall; is_available = sold out toggle (real-time updates)
CREATE TABLE menu_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stall_id    UUID NOT NULL REFERENCES stalls(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  category    TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_items_stall ON menu_items(stall_id);
CREATE INDEX idx_menu_items_stall_available ON menu_items(stall_id, is_available);

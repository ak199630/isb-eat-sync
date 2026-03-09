-- ISB Eat-Sync: Locations and walk-time matrix
-- Required for JIT "Leave Now" calculation (Sprint 2).

-- Residential blocks (SV1–SV4): student locations for walk-time lookup
CREATE TABLE residential_blocks (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code       TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_residential_blocks_code ON residential_blocks(code);

-- Physical stall locations (one per stall; used for walk_times)
CREATE TABLE stall_locations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code         TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stall_locations_code ON stall_locations(code);

-- Walk time matrix: from residential block -> stall (minutes)
-- e.g. SV2 -> MFC = 8, SV4 -> Goer = 5
CREATE TABLE walk_times (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  residential_block_id  UUID NOT NULL REFERENCES residential_blocks(id) ON DELETE CASCADE,
  stall_location_id     UUID NOT NULL REFERENCES stall_locations(id) ON DELETE CASCADE,
  walk_minutes          SMALLINT NOT NULL CHECK (walk_minutes > 0 AND walk_minutes <= 30),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (residential_block_id, stall_location_id)
);

CREATE INDEX idx_walk_times_from_to ON walk_times(residential_block_id, stall_location_id);

COMMENT ON TABLE walk_times IS 'Used by JIT engine: (target_pickup_start - walk_minutes - 2 min buffer) = leave_now trigger time';

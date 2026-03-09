-- ISB Eat-Sync: Users
-- residential_block_id used for "Leave Now" walk-time; role for Bajaj access.

CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                 TEXT NOT NULL UNIQUE,
  display_name          TEXT NOT NULL,
  role                  user_role NOT NULL DEFAULT 'student',
  residential_block_id  UUID REFERENCES residential_blocks(id) ON DELETE SET NULL,
  fcm_token             TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_residential_block ON users(residential_block_id);
CREATE INDEX idx_users_role ON users(role);

COMMENT ON COLUMN users.role IS 'authorized = can see and order from Bajaj Dining Hall';
COMMENT ON COLUMN users.fcm_token IS 'For push: Leave Now, Ready for Pickup';

-- ISB Eat-Sync: Orders, line items, and notifications
-- Supports JIT pickup windows, QR handshake, and notification idempotency.

CREATE TABLE orders (
  id                            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stall_id                      UUID NOT NULL REFERENCES stalls(id) ON DELETE RESTRICT,
  status                        order_status NOT NULL DEFAULT 'pending',
  target_pickup_start           TIMESTAMPTZ NOT NULL,
  target_pickup_end             TIMESTAMPTZ NOT NULL,
  prep_time_minutes             SMALLINT NOT NULL,
  total_cents                   INTEGER NOT NULL CHECK (total_cents >= 0),
  qr_token                      TEXT NOT NULL UNIQUE,
  leave_now_notification_sent_at TIMESTAMPTZ,
  ready_notification_sent_at     TIMESTAMPTZ,
  fulfilled_at                   TIMESTAMPTZ,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT orders_pickup_window_valid CHECK (target_pickup_end > target_pickup_start)
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_stall ON orders(stall_id);
CREATE INDEX idx_orders_stall_status ON orders(stall_id, status)
  WHERE status IN ('accepted', 'preparing', 'ready_for_pickup');
CREATE INDEX idx_orders_stall_pickup ON orders(stall_id, target_pickup_start);
CREATE UNIQUE INDEX idx_orders_qr_token ON orders(qr_token);

COMMENT ON COLUMN orders.qr_token IS 'Encoded in QR; staff scans to mark fulfilled (Sprint 3 handshake)';
COMMENT ON COLUMN orders.leave_now_notification_sent_at IS 'Avoid duplicate Leave Now push';

-- Line items (snapshot of price at order time)
CREATE TABLE order_items (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id   UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity       SMALLINT NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Optional: track sent notifications (idempotency, debugging)
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id   UUID REFERENCES orders(id) ON DELETE SET NULL,
  type       notification_type NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  channel    TEXT
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_order ON notifications(order_id);

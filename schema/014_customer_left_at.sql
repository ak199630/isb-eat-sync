-- Feature 7: "Customer left room" handshake. Set when customer taps "I'm leaving".
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_left_at TIMESTAMPTZ;
COMMENT ON COLUMN orders.customer_left_at IS 'Set once when customer taps I''m leaving; vendor sees it to time prep.';

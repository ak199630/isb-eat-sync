-- Feature 2: Accept/Reject and prep flow. Optional reject reason.
-- Run after 011_vendor_access.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;
COMMENT ON COLUMN orders.cancelled_reason IS 'Optional reason when vendor rejects (status = cancelled).';

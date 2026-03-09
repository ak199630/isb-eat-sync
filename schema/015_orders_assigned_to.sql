-- Feature 8: Assign order to cook (free-text). Vendor inbox shows "Assigned to: [____]".
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_to TEXT;
COMMENT ON COLUMN orders.assigned_to IS 'Free-text: staff name or station (e.g. Ramesh, Kitchen 1).';

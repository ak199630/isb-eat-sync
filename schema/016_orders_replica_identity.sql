-- Realtime UPDATE payloads need old row to detect "customer_left_at just set". Feature 8 alerts.
ALTER TABLE orders REPLICA IDENTITY FULL;

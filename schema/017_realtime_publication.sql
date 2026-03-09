-- Enable Realtime (postgres_changes) for stalls, menu_items, and orders.
-- Run this in Supabase SQL Editor if you don't see "Realtime" in the Dashboard.
-- If a table is already in the publication, you'll get an error for that line; that's OK.

ALTER PUBLICATION supabase_realtime ADD TABLE stalls;
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

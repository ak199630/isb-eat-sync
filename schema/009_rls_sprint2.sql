-- Sprint 2: RLS policies for guest checkout
-- Allows anon to create orders and view them. Run after 008.

-- Allow anon to read residential_blocks (for checkout block dropdown)
ALTER TABLE residential_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_residential_blocks" ON residential_blocks FOR SELECT TO anon USING (true);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert orders (guest checkout)
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT TO anon WITH CHECK (true);
-- Allow anyone to select orders (view order status by id)
CREATE POLICY "anon_select_orders" ON orders FOR SELECT TO anon USING (true);

-- Allow anyone to insert order_items (when creating order)
CREATE POLICY "anon_insert_order_items" ON order_items FOR INSERT TO anon WITH CHECK (true);
-- Allow anyone to select order_items
CREATE POLICY "anon_select_order_items" ON order_items FOR SELECT TO anon USING (true);

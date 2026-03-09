-- ISB Eat-Sync: updated_at triggers

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER stalls_updated_at
  BEFORE UPDATE ON stalls
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

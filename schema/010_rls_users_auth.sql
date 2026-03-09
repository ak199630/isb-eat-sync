-- RLS for users table: allow users to manage their own profile (for sign-up / sign-in).
-- Run after 009. Requires Supabase Auth.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can insert their own row (on sign-up, id = auth.uid())
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can read their own row
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own row (e.g. residential block, display name)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

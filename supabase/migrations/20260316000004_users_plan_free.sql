-- Allow 'free' as a valid plan in users.plan and make it the default.

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_plan_check;

ALTER TABLE users
  ALTER COLUMN plan SET DEFAULT 'free',
  ADD CONSTRAINT users_plan_check CHECK (plan IN ('free', 'basic', 'pro'));


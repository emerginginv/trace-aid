-- Clean up users with multiple roles
-- Keep only the most recent role for each user
DELETE FROM user_roles
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM user_roles
  ORDER BY user_id, created_at DESC
);
/*
  # Add users table RLS policy

  1. Security
    - Enable RLS on users table
    - Add policy for admin to read users data
*/

ALTER TABLE IF EXISTS auth.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les administrateurs peuvent lire les données utilisateurs"
ON auth.users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'admin@example.com'
  )
);
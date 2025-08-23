/*
  # Fix RLS policies to prevent infinite recursion

  1. Changes
    - Drop existing policies on bookings table that may cause recursion
    - Create new, simplified policies for bookings table:
      - Allow admins full access
      - Allow users to view all bookings
      - Allow users to manage their own bookings
  
  2. Security
    - Maintains RLS protection
    - Prevents infinite recursion by avoiding circular references
    - Ensures proper access control
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Les administrateurs peuvent tout faire" ON bookings;
DROP POLICY IF EXISTS "Tout le monde peut voir les réservations" ON bookings;

-- Create new policies without recursive checks
CREATE POLICY "Admin full access"
ON bookings
FOR ALL 
TO authenticated
USING (
  auth.jwt() ->> 'email' = 'admin@example.com'
)
WITH CHECK (
  auth.jwt() ->> 'email' = 'admin@example.com'
);

CREATE POLICY "Users can view all bookings"
ON bookings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage their own bookings"
ON bookings
FOR ALL
TO authenticated
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);
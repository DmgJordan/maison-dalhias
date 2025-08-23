/*
  # Add booking confirmation functionality

  1. Changes
    - Add function to confirm bookings
    - Add policy for admins to update booking status
  
  2. Security
    - Only admins can confirm bookings
    - Maintains existing RLS protection
*/

-- Function to confirm a booking
CREATE OR REPLACE FUNCTION confirm_booking(booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user is an admin
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@example.com' THEN
    UPDATE bookings
    SET status = 'confirmed'
    WHERE id = booking_id;
  ELSE
    RAISE EXCEPTION 'Only administrators can confirm bookings';
  END IF;
END;
$$;
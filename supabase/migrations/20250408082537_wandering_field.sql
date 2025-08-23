/*
  # Permettre à tous les utilisateurs de confirmer les réservations

  1. Changements
    - Modification de la fonction confirm_booking pour permettre à tous les utilisateurs de confirmer
    - Suppression de la vérification d'administrateur
*/

-- Modification de la fonction pour permettre à tous les utilisateurs de confirmer
CREATE OR REPLACE FUNCTION confirm_booking(booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE bookings
  SET status = 'confirmed'
  WHERE id = booking_id;
END;
$$;

-- Mise à jour des politiques pour permettre à tous les utilisateurs de gérer les réservations
DROP POLICY IF EXISTS "Admin full access" ON bookings;
DROP POLICY IF EXISTS "Users can manage their own bookings" ON bookings;

CREATE POLICY "Users can manage all bookings"
ON bookings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
/*
  # Amélioration du système de réservation

  1. Nouvelles Tables
    - `clients` - Informations détaillées des clients
      - `id` (uuid, clé primaire)
      - `first_name` (prénom)
      - `last_name` (nom)
      - `address` (adresse)
      - `city` (ville)
      - `postal_code` (code postal)
      - `country` (pays)
      - `phone` (téléphone)
      - `created_at` (timestamp)

  2. Modifications Table `bookings`
    - Ajout `primary_client_id` (référence vers clients)
    - Ajout `secondary_client_id` (référence optionnelle vers clients)
    - Ajout `occupants_count` (nombre d'occupants)
    - Ajout `rental_price` (prix du loyer)
    - Ajout `tourist_tax_included` (taxe de séjour incluse)
    - Ajout `cleaning_included` (ménage inclus)
    - Ajout `linen_included` (linge de maison inclus)

  3. Sécurité
    - Active RLS sur la table `clients`
    - Met à jour les politiques existantes
*/

-- Création de la table clients
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  postal_code text NOT NULL,
  country text NOT NULL DEFAULT 'France',
  phone text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Activation RLS sur la table clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux utilisateurs authentifiés de gérer les clients
CREATE POLICY "Users can manage all clients"
ON clients
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Ajout des nouvelles colonnes à la table bookings
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS primary_client_id uuid REFERENCES clients(id),
ADD COLUMN IF NOT EXISTS secondary_client_id uuid REFERENCES clients(id),
ADD COLUMN IF NOT EXISTS occupants_count integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS rental_price decimal(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tourist_tax_included boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS cleaning_included boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS linen_included boolean NOT NULL DEFAULT false;

-- Contrainte pour vérifier que le nombre d'occupants est positif
ALTER TABLE bookings 
ADD CONSTRAINT positive_occupants_count CHECK (occupants_count > 0),
ADD CONSTRAINT positive_rental_price CHECK (rental_price >= 0);

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_bookings_primary_client ON bookings(primary_client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_secondary_client ON bookings(secondary_client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_date, end_date);

-- Fonction pour vérifier les conflits de réservation
CREATE OR REPLACE FUNCTION check_booking_conflicts(
  p_start_date date,
  p_end_date date,
  p_booking_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM bookings
    WHERE status IN ('confirmed', 'pending')
    AND (p_booking_id IS NULL OR id != p_booking_id)
    AND (
      (start_date <= p_start_date AND end_date > p_start_date) OR
      (start_date < p_end_date AND end_date >= p_end_date) OR
      (start_date >= p_start_date AND end_date <= p_end_date)
    )
  );
END;
$$;
/*
  # Création des tables pour la gestion des réservations

  1. Nouvelles Tables
    - `bookings`
      - `id` (uuid, clé primaire)
      - `start_date` (date de début)
      - `end_date` (date de fin)
      - `created_at` (timestamp)
      - `user_id` (uuid, référence vers auth.users)
      - `status` (état de la réservation)

  2. Sécurité
    - Active RLS sur la table `bookings`
    - Ajoute des politiques pour :
      - Les administrateurs peuvent tout faire
      - Les utilisateurs non-admin peuvent seulement lire
*/

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Politique pour les administrateurs
CREATE POLICY "Les administrateurs peuvent tout faire" ON bookings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'admin@example.com'
    )
  );

-- Politique pour la lecture publique
CREATE POLICY "Tout le monde peut voir les réservations" ON bookings
  FOR SELECT
  TO authenticated
  USING (true);
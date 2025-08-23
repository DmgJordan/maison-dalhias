/*
  # Add update policy for contact forms

  1. Changes
    - Add policy for authenticated users to update contact forms
    - Update default status to 'sent'
*/

-- Update the default status for new records
ALTER TABLE contact_forms 
ALTER COLUMN status SET DEFAULT 'sent';

-- Add policy for updates
CREATE POLICY "Authenticated users can update contact forms"
  ON contact_forms
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
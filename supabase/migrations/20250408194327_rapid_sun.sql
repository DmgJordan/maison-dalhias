/*
  # Ajout du champ téléphone à la table contact_forms

  1. Changements
    - Ajout d'une colonne phone (text) à la table contact_forms
    - Mise à jour des enregistrements existants avec une valeur par défaut
    - Application de la contrainte NOT NULL après la mise à jour
*/

-- Ajouter la colonne en permettant les valeurs nulles initialement
ALTER TABLE contact_forms
ADD COLUMN IF NOT EXISTS phone text;

-- Mettre à jour les enregistrements existants avec une valeur par défaut
UPDATE contact_forms
SET phone = 'Non renseigné'
WHERE phone IS NULL;

-- Ajouter la contrainte NOT NULL
ALTER TABLE contact_forms
ALTER COLUMN phone SET NOT NULL;
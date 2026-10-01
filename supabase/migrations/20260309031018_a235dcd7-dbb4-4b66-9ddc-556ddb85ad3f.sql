
-- Update default currency from MAD to GNF
ALTER TABLE properties ALTER COLUMN currency SET DEFAULT 'GNF';
ALTER TABLE marketplace_listings ALTER COLUMN currency SET DEFAULT 'GNF';

-- Update default country from Maroc to Guinée
ALTER TABLE buildings ALTER COLUMN country SET DEFAULT 'Guinée';

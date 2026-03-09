
-- Add panorama support: a flag on property_images to mark 360° images
ALTER TABLE property_images ADD COLUMN IF NOT EXISTS is_panorama boolean NOT NULL DEFAULT false;

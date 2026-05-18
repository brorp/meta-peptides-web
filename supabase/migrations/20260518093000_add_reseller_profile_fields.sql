ALTER TABLE reseller_applications
ADD COLUMN IF NOT EXISTS occupation text;

ALTER TABLE reseller_applications
ADD COLUMN IF NOT EXISTS accepted_terms boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_reseller_applications_occupation
ON reseller_applications (occupation);

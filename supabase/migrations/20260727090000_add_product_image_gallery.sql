ALTER TABLE products
ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}'::text[];

UPDATE products
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL
  AND BTRIM(image_url) <> ''
  AND CARDINALITY(image_urls) = 0;

ALTER TABLE products
DROP CONSTRAINT IF EXISTS products_image_urls_limit;

ALTER TABLE products
ADD CONSTRAINT products_image_urls_limit
CHECK (CARDINALITY(image_urls) <= 10);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS complimentary_product_id uuid REFERENCES products(id) ON DELETE SET NULL;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS complimentary_quantity integer NOT NULL DEFAULT 1;

ALTER TABLE products
DROP CONSTRAINT IF EXISTS products_complimentary_quantity_check;

ALTER TABLE products
ADD CONSTRAINT products_complimentary_quantity_check
CHECK (complimentary_quantity >= 1);

CREATE INDEX IF NOT EXISTS idx_products_complimentary_product_id
ON products (complimentary_product_id);

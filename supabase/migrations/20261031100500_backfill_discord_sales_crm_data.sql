-- Kept separate from the schema migration so it can be checked on its own.
--
-- Packaging/supply rows and obvious accessories (bac water, syringes, swabs,
-- needles, pen sets, vial cases, acetic acid, services) become misc. Every
-- other product becomes mainproduct. Directors can correct any row later with
-- the !updateproduct command or the product form in the panel.
UPDATE products
SET product_type = CASE
  WHEN inventory_type <> 'product' THEN 'misc'::product_type_enum
  WHEN name ILIKE ANY (ARRAY[
    '%bac water%',
    '%bacteriostatic%',
    '%swab%',
    '%syringe%',
    '%spuit%',
    '%needle%',
    '%pen set%',
    '%vial case%',
    '%acetic acid%',
    '%service%'
  ]) THEN 'misc'::product_type_enum
  ELSE 'mainproduct'::product_type_enum
END
WHERE product_type IS NULL;

-- Misc products never have a usage life.
UPDATE products
SET usage_days = 0
WHERE product_type = 'misc'
  AND usage_days <> 0;

-- Add voucher tracking columns to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS voucher_id UUID REFERENCES vouchers(id),
  ADD COLUMN IF NOT EXISTS voucher_discount_amount NUMERIC DEFAULT 0;

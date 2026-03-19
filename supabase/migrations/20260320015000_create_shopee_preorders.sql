-- Create shopee_preorders table
CREATE TABLE IF NOT EXISTS public.shopee_preorders (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    name text NOT NULL,
    domisili text NOT NULL,
    shopee_username text NOT NULL,
    whatsapp_number text NOT NULL,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    product_name text,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT shopee_preorders_pkey PRIMARY KEY (id)
);

-- Add RLS policies (if RLS is enabled on the database)
ALTER TABLE public.shopee_preorders ENABLE ROW LEVEL SECURITY;

-- Allow insert for public (since it is a public form)
CREATE POLICY "Allow public insert to shopee_preorders" ON public.shopee_preorders
    FOR INSERT TO public
    WITH CHECK (true);

-- Allow all operations for authenticated admin users (if applicable, adjust based on existing RLS)
CREATE POLICY "Allow admin all operations on shopee_preorders" ON public.shopee_preorders
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

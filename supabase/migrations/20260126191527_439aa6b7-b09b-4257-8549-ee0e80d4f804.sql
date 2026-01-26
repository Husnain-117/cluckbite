-- Add image_url column to categories table
ALTER TABLE public.categories
ADD COLUMN image_url TEXT DEFAULT NULL;

-- Add image_url column to addons table  
ALTER TABLE public.addons
ADD COLUMN image_url TEXT DEFAULT NULL;
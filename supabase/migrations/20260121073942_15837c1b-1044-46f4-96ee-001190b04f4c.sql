-- Add meal_config column to menu_items for dynamic meal configuration
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS meal_config jsonb DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN public.menu_items.meal_config IS 'JSON configuration for meal deals. Structure: { "components": [{ "category": string, "quantity": number, "required": boolean, "label": string }], "upgrades": [{ "from_category": string, "to_category": string, "price_diff": number }] }';
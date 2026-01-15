-- ============================================
-- Add-ons System: Create tables for menu item add-ons
-- ============================================

-- Create add-on categories table (e.g., Sauces, Extras, Toppings)
CREATE TABLE public.addon_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create add-ons table
CREATE TABLE public.addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  addon_category_id UUID REFERENCES public.addon_categories(id) ON DELETE SET NULL,
  is_available BOOLEAN DEFAULT true,
  max_quantity INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Junction table to link menu items with applicable add-ons
CREATE TABLE public.menu_item_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES public.addons(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(menu_item_id, addon_id)
);

-- Add column to menu_items for ingredients list
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS ingredients TEXT[] DEFAULT '{}';

-- Add column to order_items to store selected add-ons as JSONB
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS selected_addons JSONB DEFAULT '[]';

-- Add column to order_items to store addons total price
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS addons_total NUMERIC DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.addon_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_addons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for addon_categories
CREATE POLICY "Anyone can view active addon categories"
ON public.addon_categories FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage addon categories"
ON public.addon_categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all addon categories"
ON public.addon_categories FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for addons
CREATE POLICY "Anyone can view available addons"
ON public.addons FOR SELECT
USING (is_available = true);

CREATE POLICY "Admins can manage addons"
ON public.addons FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all addons"
ON public.addons FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for menu_item_addons
CREATE POLICY "Anyone can view menu item addons"
ON public.menu_item_addons FOR SELECT
USING (true);

CREATE POLICY "Admins can manage menu item addons"
ON public.menu_item_addons FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- Insert sample addon categories
-- ============================================
INSERT INTO public.addon_categories (name, description, display_order) VALUES
('Sauces', 'Delicious dipping sauces and condiments', 1),
('Extra Toppings', 'Add extra toppings to your order', 2),
('Cheese Options', 'Premium cheese additions', 3),
('Protein Add-ons', 'Extra protein options', 4),
('Drinks Upgrades', 'Upgrade your beverage', 5);

-- ============================================
-- Insert sample add-ons with prices
-- ============================================
INSERT INTO public.addons (name, description, price, addon_category_id, is_available, max_quantity) VALUES
-- Sauces
('BBQ Sauce', 'Sweet and smoky BBQ sauce', 0.50, (SELECT id FROM addon_categories WHERE name = 'Sauces'), true, 5),
('Hot Sauce', 'Fiery hot chilli sauce', 0.50, (SELECT id FROM addon_categories WHERE name = 'Sauces'), true, 5),
('Garlic Mayo', 'Creamy garlic mayonnaise', 0.50, (SELECT id FROM addon_categories WHERE name = 'Sauces'), true, 5),
('Ranch Sauce', 'Classic ranch dressing', 0.50, (SELECT id FROM addon_categories WHERE name = 'Sauces'), true, 5),
('Chipotle Sauce', 'Smoky chipotle sauce', 0.75, (SELECT id FROM addon_categories WHERE name = 'Sauces'), true, 5),
('Honey Mustard', 'Sweet honey mustard', 0.50, (SELECT id FROM addon_categories WHERE name = 'Sauces'), true, 5),

-- Extra Toppings
('Extra Lettuce', 'Fresh crispy lettuce', 0.30, (SELECT id FROM addon_categories WHERE name = 'Extra Toppings'), true, 3),
('Extra Tomato', 'Fresh sliced tomatoes', 0.30, (SELECT id FROM addon_categories WHERE name = 'Extra Toppings'), true, 3),
('Pickles', 'Crunchy dill pickles', 0.30, (SELECT id FROM addon_categories WHERE name = 'Extra Toppings'), true, 3),
('Jalapenos', 'Spicy sliced jalapenos', 0.50, (SELECT id FROM addon_categories WHERE name = 'Extra Toppings'), true, 3),
('Onion Rings', 'Crispy onion rings', 1.00, (SELECT id FROM addon_categories WHERE name = 'Extra Toppings'), true, 3),
('Fried Egg', 'Perfectly fried egg', 1.50, (SELECT id FROM addon_categories WHERE name = 'Extra Toppings'), true, 2),

-- Cheese Options
('Extra Cheese', 'Double the cheese', 1.00, (SELECT id FROM addon_categories WHERE name = 'Cheese Options'), true, 3),
('Mozzarella', 'Melted mozzarella cheese', 1.25, (SELECT id FROM addon_categories WHERE name = 'Cheese Options'), true, 2),
('Blue Cheese', 'Tangy blue cheese crumbles', 1.50, (SELECT id FROM addon_categories WHERE name = 'Cheese Options'), true, 2),
('Vegan Cheese', 'Plant-based cheese alternative', 1.25, (SELECT id FROM addon_categories WHERE name = 'Cheese Options'), true, 2),

-- Protein Add-ons
('Extra Chicken Patty', 'Additional chicken patty', 2.50, (SELECT id FROM addon_categories WHERE name = 'Protein Add-ons'), true, 2),
('Extra Beef Patty', 'Additional smash beef patty', 3.00, (SELECT id FROM addon_categories WHERE name = 'Protein Add-ons'), true, 2),
('Bacon Strips', 'Crispy bacon strips', 2.00, (SELECT id FROM addon_categories WHERE name = 'Protein Add-ons'), true, 3),
('Grilled Chicken', 'Grilled chicken breast', 2.50, (SELECT id FROM addon_categories WHERE name = 'Protein Add-ons'), true, 2),

-- Drinks Upgrades
('Upsize Drink', 'Large drink upgrade', 0.75, (SELECT id FROM addon_categories WHERE name = 'Drinks Upgrades'), true, 1),
('Add Ice Cream Float', 'Turn your drink into a float', 1.50, (SELECT id FROM addon_categories WHERE name = 'Drinks Upgrades'), true, 1);

-- ============================================
-- Link add-ons to menu items (burgers get most add-ons)
-- ============================================
-- Link all sauces and toppings to all burger items
INSERT INTO public.menu_item_addons (menu_item_id, addon_id)
SELECT m.id, a.id
FROM menu_items m
CROSS JOIN addons a
JOIN addon_categories ac ON a.addon_category_id = ac.id
WHERE m.category IN ('Chicken Burgers', 'Smash Burgers')
AND ac.name IN ('Sauces', 'Extra Toppings', 'Cheese Options', 'Protein Add-ons');

-- Link sauces to wings and tenders
INSERT INTO public.menu_item_addons (menu_item_id, addon_id)
SELECT m.id, a.id
FROM menu_items m
CROSS JOIN addons a
JOIN addon_categories ac ON a.addon_category_id = ac.id
WHERE m.category = 'Tenders & Wings'
AND ac.name = 'Sauces'
ON CONFLICT DO NOTHING;

-- Link drink upgrades to drinks
INSERT INTO public.menu_item_addons (menu_item_id, addon_id)
SELECT m.id, a.id
FROM menu_items m
CROSS JOIN addons a
JOIN addon_categories ac ON a.addon_category_id = ac.id
WHERE m.category = 'Drinks'
AND ac.name = 'Drinks Upgrades'
ON CONFLICT DO NOTHING;

-- Link toppings and cheese to wraps and doner
INSERT INTO public.menu_item_addons (menu_item_id, addon_id)
SELECT m.id, a.id
FROM menu_items m
CROSS JOIN addons a
JOIN addon_categories ac ON a.addon_category_id = ac.id
WHERE m.category IN ('Wrap', 'Doner')
AND ac.name IN ('Sauces', 'Extra Toppings', 'Cheese Options')
ON CONFLICT DO NOTHING;

-- Update some menu items with sample ingredients and allergens
UPDATE public.menu_items SET 
  ingredients = ARRAY['Chicken breast fillet', 'Brioche bun', 'Lettuce', 'Cheese', 'Spicy mayo'],
  allergens = ARRAY['Gluten', 'Eggs', 'Milk'],
  nutritional_info = '{"calories": 650, "protein": "32g", "carbs": "45g", "fat": "38g"}'::jsonb
WHERE category = 'Chicken Burgers';

UPDATE public.menu_items SET 
  ingredients = ARRAY['Beef patty', 'Brioche bun', 'American cheese', 'Pickles', 'Burger sauce'],
  allergens = ARRAY['Gluten', 'Eggs', 'Milk', 'Sesame'],
  nutritional_info = '{"calories": 720, "protein": "38g", "carbs": "42g", "fat": "45g"}'::jsonb
WHERE category = 'Smash Burgers';

UPDATE public.menu_items SET 
  ingredients = ARRAY['Chicken wings', 'Spice mix', 'Hot sauce'],
  allergens = ARRAY['Celery'],
  nutritional_info = '{"calories": 450, "protein": "28g", "carbs": "12g", "fat": "32g"}'::jsonb
WHERE category = 'Tenders & Wings';

UPDATE public.menu_items SET 
  ingredients = ARRAY['Potatoes', 'Vegetable oil', 'Salt'],
  allergens = ARRAY[]::text[],
  nutritional_info = '{"calories": 320, "protein": "4g", "carbs": "42g", "fat": "15g"}'::jsonb
WHERE category = 'Fries';
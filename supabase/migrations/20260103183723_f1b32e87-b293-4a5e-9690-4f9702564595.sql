-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add new columns to menu_items
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS preparation_time INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS allergens TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS nutritional_info JSONB DEFAULT '{}';

-- Create movement_type enum
CREATE TYPE public.movement_type AS ENUM ('purchase', 'sale', 'adjustment', 'waste');

-- Create stock_movements table
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE NOT NULL,
  movement_type movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  notes TEXT,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create revenue_analytics table
CREATE TABLE public.revenue_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  total_orders INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  cancelled_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(12,2) DEFAULT 0,
  profit DECIMAL(12,2) DEFAULT 0,
  average_order_value DECIMAL(10,2) DEFAULT 0,
  payment_methods JSONB DEFAULT '{}',
  top_selling_items JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on new tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_analytics ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Anyone can view active categories" ON public.categories
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON public.categories
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view all categories" ON public.categories
FOR SELECT USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

-- Stock movements policies
CREATE POLICY "Admins and managers can view stock movements" ON public.stock_movements
FOR SELECT USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage stock movements" ON public.stock_movements
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can insert stock movements" ON public.stock_movements
FOR INSERT WITH CHECK (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

-- Revenue analytics policies
CREATE POLICY "Admins can view analytics" ON public.revenue_analytics
FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage analytics" ON public.revenue_analytics
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Admin policy for menu_items management
CREATE POLICY "Admins can manage menu items" ON public.menu_items
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert menu items" ON public.menu_items
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete menu items" ON public.menu_items
FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Insert default categories
INSERT INTO public.categories (name, description, display_order) VALUES
('Wings', 'Crispy chicken wings with various flavors', 1),
('Burgers', 'Juicy chicken burgers', 2),
('Tenders', 'Golden crispy chicken tenders', 3),
('Sides', 'Delicious side dishes', 4),
('Beverages', 'Refreshing drinks', 5),
('Desserts', 'Sweet treats', 6);

-- Enable realtime for stock_movements
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
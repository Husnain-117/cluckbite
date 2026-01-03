-- Create enums
CREATE TYPE public.order_type AS ENUM ('delivery', 'collection');
CREATE TYPE public.payment_status AS ENUM ('pending', 'partial', 'completed');
CREATE TYPE public.order_status AS ENUM ('pending', 'approved', 'preparing', 'ready', 'completed', 'rejected');
CREATE TYPE public.notification_recipient AS ENUM ('admin', 'manager');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL,
  stock_quantity INTEGER DEFAULT 100,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address TEXT,
  pin_location TEXT,
  order_type order_type NOT NULL,
  delivery_charges DECIMAL(10,2) DEFAULT 0,
  distance_km DECIMAL(10,2),
  subtotal DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status payment_status DEFAULT 'pending',
  amount_paid_online DECIMAL(10,2) DEFAULT 0,
  amount_due_cod DECIMAL(10,2) DEFAULT 0,
  order_status order_status DEFAULT 'pending',
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_title TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_role notification_recipient NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Menu items policies (public read for all)
CREATE POLICY "Anyone can view menu items" ON public.menu_items
  FOR SELECT USING (true);

-- Orders policies
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Anyone can create orders" ON public.orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own orders" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id);

-- Order items policies
CREATE POLICY "Users can view their order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND (orders.user_id = auth.uid() OR orders.customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    )
  );

CREATE POLICY "Anyone can insert order items" ON public.order_items
  FOR INSERT WITH CHECK (true);

-- Notifications policies (admin/manager only - for future admin panel)
CREATE POLICY "Notifications are viewable by authenticated users" ON public.notifications
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Insert sample menu items
INSERT INTO public.menu_items (title, description, price, category, is_featured, image_url) VALUES
('Classic Crispy Wings', 'Crispy fried chicken wings with our signature sauce', 12.99, 'Wings', true, ''),
('Spicy Buffalo Wings', 'Hot and spicy wings coated in buffalo sauce', 13.99, 'Wings', true, ''),
('BBQ Glazed Wings', 'Sweet and smoky BBQ glazed chicken wings', 13.49, 'Wings', true, ''),
('Chicken Burger Deluxe', 'Juicy chicken patty with lettuce, tomato and special sauce', 10.99, 'Burgers', true, ''),
('Loaded Chicken Fries', 'Crispy chicken strips on seasoned fries with cheese', 9.99, 'Sides', true, ''),
('Honey Garlic Wings', 'Sweet honey garlic glazed wings', 13.99, 'Wings', true, ''),
('Chicken Tenders', 'Golden crispy chicken tenders served with dipping sauce', 8.99, 'Tenders', false, ''),
('Spicy Chicken Sandwich', 'Spicy crispy chicken with pickles and mayo', 11.49, 'Burgers', false, ''),
('Coleslaw', 'Fresh creamy coleslaw', 3.99, 'Sides', false, ''),
('Seasoned Fries', 'Crispy golden fries with special seasoning', 4.99, 'Sides', false, ''),
('Onion Rings', 'Crispy battered onion rings', 5.49, 'Sides', false, ''),
('Soft Drinks', 'Coca-Cola, Sprite, Fanta', 2.49, 'Beverages', false, ''),
('Milkshake', 'Creamy vanilla, chocolate or strawberry milkshake', 5.99, 'Beverages', false, ''),
('Brownie Sundae', 'Warm chocolate brownie with vanilla ice cream', 6.99, 'Desserts', false, ''),
('Cheesecake Slice', 'New York style cheesecake', 5.99, 'Desserts', false, '');
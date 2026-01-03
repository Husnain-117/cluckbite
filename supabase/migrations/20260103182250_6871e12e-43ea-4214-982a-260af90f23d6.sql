-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('customer', 'manager', 'admin');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursive RLS issues)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create order_status_history table
CREATE TABLE public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on order_status_history
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Add notification_type enum
CREATE TYPE public.notification_type AS ENUM ('new_order', 'status_update', 'system');

-- Add new columns to notifications table
ALTER TABLE public.notifications 
ADD COLUMN action_url TEXT,
ADD COLUMN notification_type notification_type DEFAULT 'new_order';

-- Add order_source to orders table for walk-in orders
ALTER TABLE public.orders
ADD COLUMN order_source TEXT DEFAULT 'online';

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for order_status_history
CREATE POLICY "Managers and admins can view status history"
ON public.order_status_history
FOR SELECT
USING (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Managers and admins can insert status history"
ON public.order_status_history
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Update orders policies for managers
CREATE POLICY "Managers can view all orders"
ON public.orders
FOR SELECT
USING (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'admin') OR
  auth.uid() = user_id OR 
  customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Managers can update all orders"
ON public.orders
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Update notifications policies for managers
CREATE POLICY "Managers can view manager notifications"
ON public.notifications
FOR SELECT
USING (
  (recipient_role = 'manager' AND public.has_role(auth.uid(), 'manager')) OR
  (recipient_role = 'admin' AND public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Managers can update notifications"
ON public.notifications
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Order items policy for managers
CREATE POLICY "Managers can view all order items"
ON public.order_items
FOR SELECT
USING (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Menu items update policy for managers
CREATE POLICY "Managers can update menu items"
ON public.menu_items
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
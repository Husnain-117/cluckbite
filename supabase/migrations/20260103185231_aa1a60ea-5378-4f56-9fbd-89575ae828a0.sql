-- Drop the problematic RLS policies that reference auth.users directly
DROP POLICY IF EXISTS "Managers can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

-- Recreate policies without direct auth.users access
-- Use user_id comparison only, and rely on authenticated user's email from JWT
CREATE POLICY "Users can view their own orders" ON public.orders
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all orders" ON public.orders
FOR SELECT USING (
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'admin') OR 
  auth.uid() = user_id
);

-- Fix the order_items policy as well
DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;

CREATE POLICY "Users can view their order items" ON public.order_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);
-- Fix 1: Drop overly permissive INSERT policy on orders
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Create more secure INSERT policy - authenticated users only
CREATE POLICY "Authenticated users can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix 2: Drop overly permissive INSERT policy on order_items
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;

-- Create more secure INSERT policy - authenticated users creating items for their own orders
CREATE POLICY "Authenticated users can insert order items" 
ON public.order_items 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
  )
);
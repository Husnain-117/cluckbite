-- Create offers table for promotional offers
CREATE TABLE public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'bogo', 'free_item')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  offer_type TEXT NOT NULL CHECK (offer_type IN ('daily', 'weekly', 'special')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  minimum_order NUMERIC DEFAULT 0,
  applicable_categories TEXT[] DEFAULT '{}',
  applicable_items UUID[] DEFAULT '{}',
  coupon_code TEXT,
  usage_limit INTEGER,
  times_used INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on offers table
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Anyone can view active offers
CREATE POLICY "Anyone can view active offers"
ON public.offers
FOR SELECT
USING (is_active = true AND now() >= start_date AND now() <= end_date);

-- Admins can manage all offers
CREATE POLICY "Admins can manage offers"
ON public.offers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Managers can view all offers
CREATE POLICY "Managers can view offers"
ON public.offers
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updating updated_at
CREATE TRIGGER update_offers_updated_at
BEFORE UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create restaurant_settings table for hours and emergency closure
CREATE TABLE public.restaurant_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings (needed for displaying hours/closure messages)
CREATE POLICY "Anyone can view restaurant settings" 
ON public.restaurant_settings 
FOR SELECT 
USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can manage restaurant settings" 
ON public.restaurant_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Insert default settings
INSERT INTO public.restaurant_settings (setting_key, setting_value) VALUES
('operating_hours', '{
  "days": {
    "monday": {"open": true, "from": "11:00", "to": "22:00"},
    "tuesday": {"open": true, "from": "11:00", "to": "22:00"},
    "wednesday": {"open": true, "from": "11:00", "to": "22:00"},
    "thursday": {"open": true, "from": "11:00", "to": "22:00"},
    "friday": {"open": true, "from": "11:00", "to": "23:00"},
    "saturday": {"open": true, "from": "11:00", "to": "23:00"},
    "sunday": {"open": true, "from": "12:00", "to": "21:00"}
  }
}'::jsonb),
('emergency_closure', '{
  "is_closed": false,
  "reason": "",
  "until": null,
  "message": ""
}'::jsonb),
('delivery_settings', '{
  "max_distance_miles": 15,
  "base_charge": 1.50,
  "supported_postcodes": ["CF5", "CF11", "CF14", "CF10", "CF24", "CF23", "CF3", "CF15", "CF64", "CF62", "CF63", "CF72", "CF83"]
}'::jsonb);

-- Add trigger for updated_at
CREATE TRIGGER update_restaurant_settings_updated_at
BEFORE UPDATE ON public.restaurant_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
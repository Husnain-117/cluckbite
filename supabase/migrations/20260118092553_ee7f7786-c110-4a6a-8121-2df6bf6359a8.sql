-- Add social_links setting
INSERT INTO public.restaurant_settings (setting_key, setting_value)
VALUES ('social_links', '{
  "instagram": "",
  "facebook": "",
  "tiktok": "",
  "twitter": ""
}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Add daily_order_counter setting
INSERT INTO public.restaurant_settings (setting_key, setting_value)
VALUES ('daily_order_counter', '{
  "date": "",
  "counter": 0
}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
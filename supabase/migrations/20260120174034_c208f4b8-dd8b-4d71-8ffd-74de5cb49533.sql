-- Update delivery_settings to include delivery time min/max
UPDATE restaurant_settings 
SET setting_value = setting_value || '{"delivery_time_min": 30, "delivery_time_max": 40}'::jsonb
WHERE setting_key = 'delivery_settings';
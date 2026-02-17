-- Create a database webhook trigger to call the edge function when a new notification is inserted
CREATE OR REPLACE FUNCTION public.notify_email_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  edge_function_url text;
  service_role_key text;
BEGIN
  edge_function_url := 'https://pwuwafgeyyimwmqwntak.supabase.co/functions/v1/send-notification-email';
  
  PERFORM net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'id', NEW.id,
        'message', NEW.message,
        'notification_type', NEW.notification_type,
        'recipient_role', NEW.recipient_role,
        'order_id', NEW.order_id,
        'created_at', NEW.created_at
      )
    )
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block notification creation if email fails
  RAISE WARNING 'Failed to send notification email: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Create trigger
DROP TRIGGER IF EXISTS on_notification_created_send_email ON public.notifications;
CREATE TRIGGER on_notification_created_send_email
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_email_on_notification();

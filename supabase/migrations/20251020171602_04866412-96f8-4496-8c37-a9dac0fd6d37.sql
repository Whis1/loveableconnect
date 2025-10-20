-- Enable pg_cron and pg_net extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create cron job to check subscription expiry daily at 10:00 AM
SELECT cron.schedule(
  'check-subscription-expiry-daily',
  '0 10 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://tcmhvrlsaggyuukdscue.supabase.co/functions/v1/check-subscription-expiry',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjbWh2cmxzYWdneXV1a2RzY3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyODIyNjcsImV4cCI6MjA3NTg1ODI2N30.emqOEktx6ELOiCP5KMPCK3cBmE5-voWBe8ybwkX3vzw"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
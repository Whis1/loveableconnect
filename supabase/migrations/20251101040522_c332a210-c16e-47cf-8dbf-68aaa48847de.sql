-- Update allowed values for user_reports.report_type to include new categories and keep legacy ones
ALTER TABLE public.user_reports DROP CONSTRAINT IF EXISTS user_reports_report_type_check;

ALTER TABLE public.user_reports
ADD CONSTRAINT user_reports_report_type_check
CHECK (
  report_type IN (
    -- New categories
    'fake_profile',
    'scam_money',
    'spam',
    'explicit_sexual',
    'inappropriate_nudity',
    'harassment_stalking',
    'threats_violence',
    'hate_discrimination',
    'suspected_minor',
    'privacy_violation',
    'impersonation',
    'paid_meetings',
    'other',
    -- Legacy values kept for backward compatibility
    'violence',
    'hate_speech'
  )
);
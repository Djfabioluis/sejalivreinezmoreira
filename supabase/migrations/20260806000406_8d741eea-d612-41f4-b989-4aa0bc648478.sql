-- Fix security warnings for CRM functions
REVOKE EXECUTE ON FUNCTION public.update_customer_pipeline(text, text, public.crm_pipeline_stage, text, text, timestamptz, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.update_customer_pipeline(text, text, public.crm_pipeline_stage, text, text, timestamptz, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_customer_pipeline(text, text, public.crm_pipeline_stage, text, text, timestamptz, text) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.update_customer_pipeline(text, text, public.crm_pipeline_stage, text, text, timestamptz, text) TO service_role;

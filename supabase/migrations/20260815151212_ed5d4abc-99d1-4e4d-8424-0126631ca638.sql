DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'crm_pipeline_stage' AND e.enumlabel = 'IDENTIFYING_SERVICE'
  ) THEN
    ALTER TYPE public.crm_pipeline_stage ADD VALUE 'IDENTIFYING_SERVICE';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'crm_pipeline_stage' AND e.enumlabel = 'CHOOSING_UNIT'
  ) THEN
    ALTER TYPE public.crm_pipeline_stage ADD VALUE 'CHOOSING_UNIT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'crm_pipeline_stage' AND e.enumlabel = 'CHOOSING_PROFESSIONAL'
  ) THEN
    ALTER TYPE public.crm_pipeline_stage ADD VALUE 'CHOOSING_PROFESSIONAL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'crm_pipeline_stage' AND e.enumlabel = 'CHOOSING_DATE'
  ) THEN
    ALTER TYPE public.crm_pipeline_stage ADD VALUE 'CHOOSING_DATE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'crm_pipeline_stage' AND e.enumlabel = 'CHOOSING_TIME'
  ) THEN
    ALTER TYPE public.crm_pipeline_stage ADD VALUE 'CHOOSING_TIME';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'crm_pipeline_stage' AND e.enumlabel = 'AWAITING_CONFIRMATION'
  ) THEN
    ALTER TYPE public.crm_pipeline_stage ADD VALUE 'AWAITING_CONFIRMATION';
  END IF;
END $$;

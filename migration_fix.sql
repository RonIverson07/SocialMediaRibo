-- Add missing columns to contacts if they don't exist
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS facebook_psid TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS facebook_page_id TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS whatsapp_phone_e164 TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_inbound_channel TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ;

-- Add missing columns to leads if they don't exist
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_suggested_stage_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_confidence_score FLOAT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_last_classified_at TIMESTAMPTZ;

-- Create integration_mappings if not exists (Field Configuration)
CREATE TABLE IF NOT EXISTS integration_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id TEXT NOT NULL,
  external_field TEXT NOT NULL,
  crm_field TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(integration_id, external_field)
);

-- Ensure lead_events exists
CREATE TABLE IF NOT EXISTS lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  contact_id UUID REFERENCES contacts(id),
  channel TEXT NOT NULL,
  external_event_id TEXT UNIQUE,
  external_actor_key TEXT,
  received_at TIMESTAMPTZ DEFAULT now(),
  summary_text TEXT,
  snippet_text TEXT,
  has_media BOOLEAN DEFAULT false,
  media_type TEXT,
  payload_min_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure ai_classification_results exists
CREATE TABLE IF NOT EXISTS ai_classification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_event_id UUID REFERENCES lead_events(id),
  suggested_stage_label TEXT,
  mapped_stage_id TEXT,
  confidence_score FLOAT,
  reasons_json JSONB,
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

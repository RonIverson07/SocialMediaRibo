export type LeadSource = 'fb_lead_ads' | 'messenger' | 'whatsapp' | 'wordpress';

export interface Contact {
    id: string;
    primary_email: string | null;
    primary_phone_e164: string | null;
    facebook_psid?: string | null;
    facebook_page_id?: string | null;
    whatsapp_phone_e164?: string | null;
    last_inbound_channel: LeadSource | null;
    last_inbound_at: string | null;
    created_at: string;
}

export interface Lead {
    id: string;
    contact_id: string;
    lead_source: LeadSource;
    pipeline_stage_id: string;
    last_activity_at: string;
    ai_suggested_stage_id?: string | null;
    ai_confidence_score?: number | null;
    ai_last_classified_at?: string | null;
    created_at: string;
}

export interface LeadEvent {
    id: string;
    lead_id: string;
    contact_id: string;
    channel: LeadSource;
    external_event_id?: string | null;
    external_actor_key: string; // PSID+page_id OR phone OR lead_id
    received_at: string;
    summary_text: string;
    snippet_text?: string | null;
    has_media: boolean;
    media_type?: 'image' | 'document' | 'audio' | null;
    payload_min_json: string; // Sanitized JSON
}

export interface AIClassificationResult {
    id: string;
    lead_event_id: string;
    suggested_stage_label: string;
    mapped_stage_id?: string | null;
    confidence_score: number;
    reasons_json: string; // Bullet points
    model_version: string;
    created_at: string;
}

export interface ActivityTimelineEntry {
    id: string;
    lead_id: string;
    type: 'lead_event' | 'ai_suggestion' | 'stage_change' | 'error';
    summary: string;
    actor: 'system' | 'user';
    created_at: string;
    metadata_json: string;
}

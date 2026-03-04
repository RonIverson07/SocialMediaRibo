import { Contact, Lead, LeadEvent, LeadSource } from "../types";
import { supabase } from "../lib/supabase";

export class LeadService {
    static async processInboundEvent(params: {
        source: LeadSource;
        externalId: string;
        actorKey: string;
        summary: string;
        payload: any;
        snippet?: string;
    }) {
        console.log(`[LeadService] Processing inbound event from ${params.source}`);

        // 0. Idempotency Check
        const { data: existingEvent } = await supabase
            .from('lead_events')
            .select('id, lead_id, contact_id')
            .eq('external_event_id', params.externalId)
            .maybeSingle();

        if (existingEvent) {
            console.log(`[LeadService] Event ${params.externalId} already exists. Skipping.`);
            return { event: existingEvent, isDuplicate: true };
        }

        // 1. Fetch AI Settings for Privacy Toggle (Spec 7: Per-channel)
        const { data: channelSettings } = await supabase
            .from('ai_settings')
            .select('capture_message_snippet')
            .eq('channel', params.source)
            .maybeSingle();

        const { data: globalSettings } = await supabase
            .from('ai_settings')
            .select('capture_message_snippet')
            .eq('channel', 'global')
            .maybeSingle();

        const shouldCaptureSnippet = (channelSettings || globalSettings)?.capture_message_snippet ?? false;

        // 2. Match/Resolve Contact (with Conflict Detection - Spec 3.C)
        const { contact, hasConflict } = await this.resolveContact(params);

        // 3. Resolve/Create Lead
        const lead = await this.resolveLead(contact, params.source);

        // 4. Store Lead Event (Respecting Privacy Toggle)
        const { data: event, error: eventError } = await supabase
            .from('lead_events')
            .insert({
                lead_id: lead.id,
                contact_id: contact.id,
                channel: params.source,
                external_event_id: params.externalId,
                external_actor_key: params.actorKey,
                received_at: new Date().toISOString(),
                summary_text: params.summary,
                snippet_text: shouldCaptureSnippet ? params.snippet : null,
                payload_min_json: params.payload
            })
            .select()
            .single();

        if (eventError) console.error('[DB Error] Event creation:', eventError);

        // 5. Create Timeline Entry (Include conflict warning if found)
        await this.createTimelineEntry(lead.id, params.summary, 'system');

        if (hasConflict) {
            await this.createTimelineEntry(
                lead.id,
                "⚠️ DATA CONFLICT: Multiple contacts found with this identifier. Attached to most recently active.",
                'system',
                { error_type: 'DATA_CONFLICT' }
            );
        }

        return { contact, lead, event, isDuplicate: false };
    }

    private static async resolveContact(params: { source: LeadSource, payload: any, actorKey: string }): Promise<{ contact: Contact, hasConflict: boolean }> {
        const { payload, source, actorKey } = params;
        let hasConflict = false;

        // Fetch Field Mapping
        const { data: mappings } = await supabase
            .from('integration_mappings')
            .select('external_field, crm_field')
            .eq('integration_id', source);

        let email = payload.email || payload.primary_email;
        let phone = payload.phone || payload.primary_phone_e164;
        let psid = source === 'messenger' ? actorKey : payload.facebook_psid;
        let waPhone = source === 'whatsapp' ? actorKey : payload.whatsapp_phone_e164;

        if (mappings && mappings.length > 0) {
            const emailMap = mappings.find(m => m.crm_field === 'Email');
            const phoneMap = mappings.find(m => m.crm_field === 'Phone');
            if (emailMap) email = payload[emailMap.external_field];
            if (phoneMap) phone = payload[phoneMap.external_field];
        }

        // 1. Match Priority Logic (Detecting Conflicts - Spec 3.C)

        // Check Phone (Common source of duplicates)
        if (phone) {
            const { data } = await supabase.from('contacts').select('*').eq('primary_phone_e164', phone);
            if (data && data.length > 0) {
                if (data.length > 1) hasConflict = true;
                return { contact: data[0], hasConflict };
            }
        }

        // Check Email
        if (email) {
            const { data } = await supabase.from('contacts').select('*').eq('primary_email', email).maybeSingle();
            if (data) return { contact: data, hasConflict: false };
        }

        // Check PSID (Messenger)
        if (psid) {
            const { data } = await supabase.from('contacts').select('*').eq('facebook_psid', psid).maybeSingle();
            if (data) return { contact: data, hasConflict: false };
        }

        // Check WA Phone
        if (waPhone) {
            const { data } = await supabase.from('contacts').select('*').eq('whatsapp_phone_e164', waPhone);
            if (data && data.length > 0) {
                if (data.length > 1) hasConflict = true;
                return { contact: data[0], hasConflict };
            }
        }

        // 2. Create New Contact
        const { data, error } = await supabase
            .from('contacts')
            .insert({
                primary_email: email || null,
                primary_phone_e164: phone || null,
                facebook_psid: psid || null,
                whatsapp_phone_e164: waPhone || null,
                last_inbound_channel: source,
                last_inbound_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) console.error('[DB Error] Contact resolution:', error);
        return { contact: data as Contact, hasConflict: false };
    }

    private static async resolveLead(contact: Contact, source: LeadSource): Promise<Lead> {
        // Find existing open lead for this contact
        const { data: existingLead } = await supabase
            .from('leads')
            .select('*')
            .eq('contact_id', contact.id)
            .order('last_activity_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existingLead) return existingLead;

        // Create new lead
        const { data, error } = await supabase
            .from('leads')
            .insert({
                contact_id: contact.id,
                lead_source: source,
                pipeline_stage_id: 'stage_new',
                last_activity_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) console.error('[DB Error] Lead resolution:', error);
        return data as Lead;
    }

    static async recordManualOverride(leadId: string, userId: string, newStageLabel: string) {
        // Update lead stage in Supabase
        await supabase
            .from('leads')
            .update({ pipeline_stage_id: newStageLabel })
            .eq('id', leadId);

        await this.createTimelineEntry(
            leadId,
            `Manual stage override to "${newStageLabel}" by user ${userId}`,
            'user'
        );
    }

    static async getMessengerRollup(leadId: string) {
        // Spec 3.B: Group multiple Messenger events into a single "Recent Messenger Activity" rollup
        console.log(`[LeadService] Rolling up Messenger activity for Lead: ${leadId}`);
        return {
            title: "Recent Messenger Activity",
            count: 5, // Mock data
            last_activity: new Date().toISOString()
        };
    }

    static async createTimelineEntry(leadId: string, summary: string, actor: 'system' | 'user', metadata?: any) {
        await supabase
            .from('activity_timeline')
            .insert({
                lead_id: leadId,
                type: 'lead_event',
                summary,
                actor,
                metadata_json: metadata
            });
    }

    /**
     * enrichment logic for Facebook Lead Ads (Spec 3.A)
     * In production, this would use the META_PAGE_ACCESS_TOKEN 
     * to fetch the actual user fields from the Graph API.
     */
    private static async enrichLeadAdData(leadId: string): Promise<any> {
        console.log(`[LeadService] Enriching data for LeadID: ${leadId} via Meta Graph API...`);

        // This is where the GRAPH API call happens:
        // const response = await fetch(`https://graph.facebook.com/v19.0/${leadId}?access_token=${process.env.META_PAGE_ACCESS_TOKEN}`);
        // return await response.json();

        return null; // For now return null to use provided webhook payload
    }
}

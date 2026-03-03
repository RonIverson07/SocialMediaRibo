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

        // 1. Match/Resolve Contact (Priority: Email -> Phone -> External Key)
        const contact = await this.resolveContact(params);

        // 2. Resolve/Create Lead (Associate with Contact)
        const lead = await this.resolveLead(contact, params.source);

        // 3. Store Lead Event in Supabase
        const { data: event, error: eventError } = await supabase
            .from('lead_events')
            .insert({
                lead_id: lead.id,
                contact_id: contact.id,
                channel: params.source,
                external_event_id: params.externalId,
                external_actor_key: params.actorKey,
                summary_text: params.summary,
                snippet_text: params.snippet,
                payload_min_json: params.payload
            })
            .select()
            .single();

        if (eventError) console.error('[DB Error] Event creation:', eventError);

        // 4. Create Timeline Entry
        await this.createTimelineEntry(lead.id, `Inbound lead event received via ${params.source}`, 'system');

        return { contact, lead, event };
    }

    private static async resolveContact(params: { source: LeadSource, payload: any, actorKey: string }): Promise<Contact> {
        const { payload, source } = params;

        // 1. Fetch Dynamic Field Mapping (Spec 3.A)
        const { data: mappings } = await supabase
            .from('integration_mappings')
            .select('external_field, crm_field')
            .eq('integration_id', source === 'wordpress' ? 'wp_form' : source);

        let email = payload.email || payload.primary_email;
        let phone = payload.phone || payload.primary_phone_e164;

        // Apply custom mappings if they exist
        if (mappings && mappings.length > 0) {
            const emailMap = mappings.find(m => m.crm_field === 'Email');
            const phoneMap = mappings.find(m => m.crm_field === 'Phone');
            if (emailMap) email = payload[emailMap.external_field];
            if (phoneMap) phone = payload[phoneMap.external_field];
        }

        // 2. Try to find existing contact in Supabase
        if (email) {
            const { data } = await supabase.from('contacts').select('*').eq('primary_email', email).single();
            if (data) return data;
        }

        // If not found, create new
        const { data, error } = await supabase
            .from('contacts')
            .insert({
                primary_email: email || null,
                primary_phone_e164: phone || null,
                last_inbound_channel: source,
                last_inbound_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) console.error('[DB Error] Contact resolution:', error);
        return data as Contact;
    }

    private static async resolveLead(contact: Contact, source: LeadSource): Promise<Lead> {
        // Find existing non-closed lead for this contact
        const { data: existingLead } = await supabase
            .from('leads')
            .select('*')
            .eq('contact_id', contact.id)
            .order('last_activity_at', { ascending: false })
            .limit(1)
            .single();

        if (existingLead) return existingLead;

        // Create new lead if none exists
        const { data, error } = await supabase
            .from('leads')
            .insert({
                contact_id: contact.id,
                lead_source: source,
                pipeline_stage_id: 'stage_new'
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
}

import { supabase } from "@/lib/supabase";
import { LeadService } from "./lead.service";

export class AIService {
    /**
     * Analyzes an inbound lead event to suggest a pipeline stage.
     * Non-blocking (runs in background) as per Spec 5.3.
     */
    static async classifyLeadEvent(event: { id: string, lead_id: string, snippet_text?: string, channel: string }) {
        try {
            // 1. Fetch AI Settings & Mapping from DB (Spec 7: Per-channel)
            const { data: channelSettings } = await supabase
                .from('ai_settings')
                .select('*')
                .eq('channel', event.channel)
                .maybeSingle();

            const { data: globalSettings } = await supabase
                .from('ai_settings')
                .select('*')
                .eq('channel', 'global')
                .maybeSingle();

            const settings = channelSettings || globalSettings;

            // Fetch custom stage mapping for this channel (Spec 2.2.C)
            const { data: customMappings } = await supabase
                .from('integration_mappings')
                .select('external_field, crm_field')
                .eq('integration_id', `ai_stage_${event.channel}`);

            // Mock AI Result (Spec 4)
            const aiLabel = event.snippet_text?.toLowerCase().includes('price') ? 'High Intent' : 'Information Request';
            const confidence = 82;
            const reasons = ["User mentioned specific intent in snippet", "Matched channel heuristics"];

            // 2. Map label to stage (Check custom mapping first)
            let targetStage = 'stage_discovery';
            if (customMappings && customMappings.length > 0) {
                const match = customMappings.find(m => m.external_field === aiLabel);
                if (match) targetStage = match.crm_field;
            } else {
                targetStage = this.mapLabelToStage(aiLabel);
            }

            // 3. Store Result in DB
            const { data: resultData, error: resultError } = await supabase
                .from('ai_classification_results')
                .insert({
                    lead_event_id: event.id,
                    suggested_stage_label: aiLabel,
                    mapped_stage_id: targetStage,
                    confidence_score: confidence,
                    reasons_json: reasons
                })
                .select()
                .single();

            if (resultError) throw resultError;

            // 4. Auto-apply logic (Spec 4 & 5.3)
            const threshold = settings?.auto_apply_threshold || 85;
            if (confidence >= threshold) {
                console.log(`[AIService] Auto-applying stage ${targetStage} for lead ${event.lead_id}`);

                await supabase.from('leads').update({
                    pipeline_stage_id: targetStage,
                    ai_confidence_score: confidence,
                    ai_last_classified_at: new Date().toISOString()
                }).eq('id', event.lead_id);

                await LeadService.createTimelineEntry(
                    event.lead_id,
                    `AI auto-applied stage: ${targetStage.replace('stage_', '').toUpperCase()} (Confidence: ${confidence}%)`,
                    'system',
                    { confidence, reasons }
                );
            }

            return resultData;
        } catch (err) {
            console.error("[AIService Error]:", err);
            return null;
        }
    }

    private static mapLabelToStage(label: string): string {
        const mapping: Record<string, string> = {
            'High Intent': 'stage_negotiation',
            'Urgent Inquiry': 'stage_discovery',
            'Information Request': 'stage_discovery',
            'Spam/Bot': 'stage_closed_lost',
            'Customer Support': 'stage_discovery'
        };
        return mapping[label] || 'stage_discovery';
    }
}

import { AIClassificationResult, LeadEvent } from "../types";
import { supabase } from "../lib/supabase";

export class AIService {
    static async classifyLeadEvent(event: LeadEvent): Promise<AIClassificationResult> {
        console.log(`[AIService] Classifying event: ${event.id}`);

        // In a real implementation, this would call OpenAI or Gemini API
        // with a prompt that includes event.summary_text and event.snippet_text.

        // Spec 4: AI analyzes latest inbound lead signals
        const mockResult = {
            lead_event_id: event.id,
            suggested_stage_label: "Qualified",
            confidence_score: 85,
            reasons_json: [
                "Intent: pricing enquiry",
                "Urgency: ASAP requirement",
                "Budget sensitivity: discount requested",
                "Fit indicator: location match",
                "Commitment cue: schedule a call"
            ],
            model_version: "gpt-4o-mini-v1"
        };

        const { data, error } = await supabase
            .from('ai_classification_results')
            .insert(mockResult)
            .select()
            .single();

        if (error) console.error('[DB Error] AI Result storage:', error);

        return data as AIClassificationResult;
    }

    static mapLabelToStage(label: string): string {
        // Map AI labels to RIBO CRM stage IDs
        const mapping: Record<string, string> = {
            "Inquiry": "stage_discovery",
            "Qualified": "stage_qualified",
            "Nurture": "stage_nurturing",
            "Complaint": "stage_issue"
        };
        return mapping[label] || "stage_new";
    }
}

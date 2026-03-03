import { NextRequest, NextResponse } from "next/server";
import { LeadService } from "@/services/lead.service";
import { AIService } from "@/services/ai.service";

export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();

        // 1. Verify Signature (Meta Recommendation)
        // TODO: Implement signature verification using X-Hub-Signature-256

        // 2. Process based on Meta's Lead Ads format
        // For simplicity, we assume the structured payload from Meta
        if (payload.object === 'page') {
            for (const entry of payload.entry) {
                for (const change of entry.changes) {
                    if (change.field === 'leadgen') {
                        const leadGen = change.value;

                        // Process the lead
                        const { event } = await LeadService.processInboundEvent({
                            source: 'fb_lead_ads',
                            externalId: leadGen.leadgen_id,
                            actorKey: leadGen.ad_id,
                            summary: `Facebook Lead Ad submission from ${leadGen.page_id}`,
                            payload: leadGen
                        });

                        // Trigger AI (Async)
                        AIService.classifyLeadEvent(event).then(async (result) => {
                            const stageId = AIService.mapLabelToStage(result.suggested_stage_label);
                            console.log(`[Webhook] AI Result: ${result.suggested_stage_label} -> Stage: ${stageId}`);

                            // Log to timeline
                            await LeadService.createTimelineEntry(
                                event.lead_id,
                                `AI suggested stage: ${result.suggested_stage_label} (${result.confidence_score}%)`,
                                'system'
                            );
                        });
                    }
                }
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("[Webhook Error] Facebook Leads:", error);
        return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    // Verification for Facebook Webhook setup
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === 'RIBO_SECRET_TOKEN') {
        return new NextResponse(challenge);
    }

    return new NextResponse('Verification failed', { status: 403 });
}

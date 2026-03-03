import { NextRequest, NextResponse } from "next/server";
import { LeadService } from "@/services/lead.service";
import { AIService } from "@/services/ai.service";

/**
 * WhatsApp Cloud API Webhook
 * TRACKING ONLY: minimal event storage, no transcript.
 */
export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();

        // 1. Signature Verification (Placeholder)
        // TODO: Verify X-Hub-Signature-256 for WhatsApp

        if (payload.object === 'whatsapp_business_account') {
            for (const entry of payload.entry) {
                for (const change of entry.changes) {
                    if (change.field === 'messages') {
                        const value = change.value;
                        if (value.messages) {
                            for (const message of value.messages) {
                                const phone = message.from;
                                const hasMedia = !!(message.image || message.video || message.document || message.audio);
                                const mediaType = message.type !== 'text' ? message.type : null;

                                // Create Lead Event (Inbound Tracker)
                                const { event } = await LeadService.processInboundEvent({
                                    source: 'whatsapp',
                                    externalId: message.id,
                                    actorKey: phone,
                                    summary: `WhatsApp inquiry received${hasMedia ? ` (Media: ${mediaType})` : ''}`,
                                    payload: {
                                        from: phone,
                                        message_id: message.id,
                                        type: mediaType || 'text',
                                        has_media: hasMedia
                                    },
                                    snippet: message.text?.body || ""
                                });

                                // Trigger AI (Async)
                                AIService.classifyLeadEvent(event).then(async (result) => {
                                    await LeadService.createTimelineEntry(
                                        event.lead_id,
                                        `AI suggested stage: ${result.suggested_stage_label} (${result.confidence_score}%)`,
                                        'system',
                                        {
                                            confidence: result.confidence_score,
                                            reasons: result.reasons_json
                                        }
                                    );
                                });
                            }
                        }
                    }
                }
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("[WhatsApp Webhook Error]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === 'RIBO_SECRET_TOKEN') {
        return new NextResponse(challenge);
    }

    return new NextResponse('Verification failed', { status: 403 });
}

import { NextRequest, NextResponse } from "next/server";
import { LeadService } from "@/services/lead.service";
import { AIService } from "@/services/ai.service";

/**
 * Facebook Messenger Webhook
 * Track inbound signals only (no conversation threads stored).
 */
export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();

        if (payload.object === 'page') {
            for (const entry of payload.entry) {
                for (const messageObj of entry.messaging) {
                    if (messageObj.message && !messageObj.message.is_echo) {
                        const senderId = messageObj.sender.id; // PSID
                        const pageId = entry.id;
                        const message = messageObj.message;
                        const hasMedia = !!message.attachments;

                        // Log Messenger Activity
                        const { event } = await LeadService.processInboundEvent({
                            source: 'messenger',
                            externalId: message.mid,
                            actorKey: `${senderId}_${pageId}`,
                            summary: `Messenger inquiry received via Page ID: ${pageId}`,
                            payload: {
                                sender_id: senderId,
                                page_id: pageId,
                                message_id: message.mid,
                                has_attachments: hasMedia
                            },
                            snippet: message.text || (hasMedia ? "[Media Attachment]" : "")
                        });

                        // Trigger AI (Async)
                        AIService.classifyLeadEvent(event).then(async (result) => {
                            const stageId = AIService.mapLabelToStage(result.suggested_stage_label);
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
        console.error("[Messenger Webhook Error]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    // Verification for Messenger Webhook setup
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === 'RIBO_SECRET_TOKEN') {
        return new NextResponse(challenge);
    }

    return new NextResponse('Verification failed', { status: 403 });
}

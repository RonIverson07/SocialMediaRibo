import { NextRequest, NextResponse } from "next/server";
import { LeadService } from "@/services/lead.service";
import { AIService } from "@/services/ai.service";
import { verifyMetaSignature } from "@/lib/meta-security";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");
    if (token === process.env.FB_VERIFY_TOKEN) return new Response(challenge);
    return new Response("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get("x-hub-signature-256");

        // Webhook Signature Verification (Spec 5.4)
        if (process.env.NODE_ENV === 'production' || process.env.FB_APP_SECRET) {
            const isValid = verifyMetaSignature(rawBody, signature, process.env.FB_APP_SECRET);
            if (!isValid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = JSON.parse(rawBody);

        // 1. WhatsApp Webhook Processing (Spec 3.C)
        const value = payload.entry?.[0]?.changes?.[0]?.value;
        const messages = value?.messages || [];

        for (const msg of messages) {
            const waId = msg.from; // Sender phone number
            const messageId = msg.id;
            const text = msg.text?.body;
            const hasMedia = !!(msg.image || msg.document || msg.audio || msg.video);
            const mediaType = msg.type !== 'text' ? msg.type : null;

            // 2. Process as Lead Event
            const { isDuplicate, event } = await LeadService.processInboundEvent({
                source: 'whatsapp',
                externalId: messageId,
                actorKey: waId, // WhatsApp E.164 phone
                summary: `Inbound inquiry via WhatsApp${hasMedia ? ` (${mediaType})` : ''}`,
                payload: msg,
                snippet: text || `[Media: ${mediaType}]`
            });

            if (isDuplicate) continue;

            // 3. Update media flags then Async AI (Spec 3.C + 5.3)
            if (event) {
                // Background task for DB updates & AI
                (async () => {
                    const { supabase } = await import('@/lib/supabase');
                    await supabase
                        .from('lead_events')
                        .update({ has_media: hasMedia, media_type: mediaType })
                        .eq('id', (event as any).id);

                    await AIService.classifyLeadEvent(event as any);
                })().catch(e => console.error("[Async Process Error]:", e));
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[WhatsApp Webhook Error]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

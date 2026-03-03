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

        // 1. Messenger Webhook Processing (Spec 3.B)
        const entries = payload.entry || [];
        for (const entry of entries) {
            const messaging = entry.messaging || [];
            for (const messageEvent of messaging) {
                if (messageEvent.message && !messageEvent.message.is_echo) {
                    const psid = messageEvent.sender.id;
                    const messageId = messageEvent.message.mid;
                    const text = messageEvent.message.text;

                    // 2. Process as Lead Event (Tracking Only)
                    const { isDuplicate, event } = await LeadService.processInboundEvent({
                        source: 'messenger',
                        externalId: messageId,
                        actorKey: psid, // Messenger identifier
                        summary: "Inbound inquiry received via Messenger",
                        payload: messageEvent,
                        snippet: text
                    });

                    if (isDuplicate) continue;

                    // 3. Asynchronous AI Analysis (Spec 5.3)
                    if (event) {
                        AIService.classifyLeadEvent(event as any).catch(e =>
                            console.error("[Async AI Error]:", e)
                        );
                    }
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Messenger Webhook Error]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

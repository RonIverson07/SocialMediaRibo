import { NextRequest, NextResponse } from "next/server";
import { LeadService } from "@/services/lead.service";
import { AIService } from "@/services/ai.service";

// Verification for Meta Webhooks (Spec 5.4)
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === process.env.FB_VERIFY_TOKEN) {
        return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();

        // 1. Webhook Signature Verification (Spec 5.4 - Placeholder for production)
        // In a real Meta integration, you'd verify the X-Hub-Signature-256 header.

        // 2. Identify Event Type
        // Meta sends leadgen events in a specific nested format
        const entries = payload.entry || [];
        for (const entry of entries) {
            const changes = entry.changes || [];
            for (const change of changes) {
                if (change.value && change.value.leadgen_id) {
                    const leadId = change.value.leadgen_id;
                    const formId = change.value.form_id;

                    // 3. Process the Lead (Spec 3.A)
                    const { isDuplicate, event } = await LeadService.processInboundEvent({
                        source: 'fb_lead_ads',
                        externalId: leadId,
                        actorKey: formId,
                        summary: `Direct lead from Facebook Ad Form: ${formId}`,
                        payload: change.value
                    });

                    if (isDuplicate) continue;

                    // 4. Asynchronous AI Classification (Spec 5.3)
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
        console.error("[FB Lead Ads Webhook Error]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

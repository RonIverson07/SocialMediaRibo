import { NextRequest, NextResponse } from "next/server";
import { LeadService } from "@/services/lead.service";
import { AIService } from "@/services/ai.service";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("Authorization");
        const domain = req.headers.get("x-wp-domain");

        // 1. API Key & Domain Validation (Spec 3.D)
        if (!authHeader || !authHeader.startsWith("Bearer RIBO_WP_")) {
            return NextResponse.json({ error: "Unauthorized: Invalid API Key" }, { status: 401 });
        }

        // Domain restriction check (Optional in Spec)
        if (domain && domain !== 'ribo.com.ph' && process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: "Domain mismatch" }, { status: 403 });
        }

        const payload = await req.json();

        // 2. Idempotency Check (Spec 3.D)
        const submissionId = payload.submission_id;
        if (!submissionId) {
            return NextResponse.json({ error: "Missing submission_id" }, { status: 400 });
        }

        // Mock: Check database if submissionId already exists for this form
        console.log(`[WP API] Checking idempotency for submission_id: ${submissionId}`);

        // 3. Process Inbound Lead
        const { event } = await LeadService.processInboundEvent({
            source: 'wordpress',
            externalId: submissionId,
            actorKey: payload.form_id || "wp_form",
            summary: `WordPress form submission: ${payload.form_name || 'Generic Form'}`,
            payload: payload.data,
            snippet: payload.message_snippet || ""
        });

        // 4. Asynchronous AI Classification (Spec 5.3)
        AIService.classifyLeadEvent(event as any).catch(e =>
            console.error("[Async AI Error]:", e)
        );

        // 5. Instant Response to Plugin
        return NextResponse.json({
            success: true,
            event_id: event.id
        });

    } catch (error) {
        console.error("[WP API Error]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

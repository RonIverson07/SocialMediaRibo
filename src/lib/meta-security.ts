import crypto from 'crypto';

/**
 * Verifies the X-Hub-Signature-256 header from Meta (Facebook/WhatsApp).
 * Matches the raw request body against the signature provided in the header
 * using the App Secret as the HMAC key.
 */
export function verifyMetaSignature(
    rawBody: string,
    signatureHeader: string | null,
    appSecret: string | undefined
): boolean {
    if (!signatureHeader || !appSecret) {
        console.error("[Meta Security] Missing signature header or app secret.");
        return false;
    }

    // signatureHeader format: sha256={hash}
    const elements = signatureHeader.split('=');
    if (elements.length !== 2 || elements[0] !== 'sha256') {
        console.error("[Meta Security] Invalid signature header format.");
        return false;
    }

    const expectedSignature = elements[1];
    const computedSignature = crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');

    if (computedSignature !== expectedSignature) {
        console.warn("[Meta Security] Signature mismatch detected.");
        return false;
    }

    return true;
}

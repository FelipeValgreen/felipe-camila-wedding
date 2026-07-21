# WhatsApp Webhook Specifications

This document defines the interface and validation contracts for the Meta WhatsApp Cloud API webhook receiver.

---

## 1. Webhook Verification (GET `/api/whatsapp/webhook`)

When configuring the webhook in the Meta App Console, Meta sends a GET request to verify the endpoint's legitimacy.

### Verification Payload
- **URL params:**
  - `hub.mode`: Must equal `subscribe`.
  - `hub.verify_token`: Verification secret configured in the environment (`META_VERIFY_TOKEN`).
  - `hub.challenge`: Random challenge string.

### Output
- **Success:** Status 200 OK, response body = `hub.challenge`.
- **Failure:** Status 403 Forbidden.

---

## 2. Inbound Message Handling (POST `/api/whatsapp/webhook`)

Receives inbound messages, statuses, and read notifications from WhatsApp.

### Security: Signature Validation
- Meta signs every webhook payload with the App Secret.
- Header: `X-Hub-Signature-256` = `sha256=<signature>`
- **Validation logic:**
  Compute SHA256 HMAC of the raw request body using `META_APP_SECRET`. Verify that it matches the signature header using constant-time comparison (`crypto.timingSafeEqual`).

### Deduplication Policy
- Extract the Meta message ID from `entry[0].changes[0].value.messages[0].id`.
- Check against Supabase table `public.idempotency_records`.
- If ID is already present, immediately return `200 OK` (acknowledge and discard duplicate).
- If new, write to `idempotency_records` and continue processing.

### Normalized Inbound Message Object
We translate the nested Meta structure to a clean internal type:

```ts
type NormalizedMessage = {
  messageId: string;
  senderPhone: string;
  senderName: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'unsupported';
  content: {
    text?: string;
    mediaId?: string;
    mimeType?: string;
  };
};
```

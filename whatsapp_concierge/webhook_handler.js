const crypto = require('crypto');

class WebhookHandler {
  constructor(verifyToken, appSecret, db) {
    this.verifyToken = verifyToken;
    this.appSecret = appSecret;
    this.db = db;
  }

  // GET: Webhook verification
  verifySubscription(query) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === this.verifyToken) {
      return { ok: true, challenge };
    }
    return { ok: false, errorCode: 'forbidden' };
  }

  // Signature validation (HMAC SHA-256)
  validateSignature(rawBody, signatureHeader) {
    if (!signatureHeader || !this.appSecret) return false;
    
    const parts = signatureHeader.split('=');
    if (parts.length !== 2 || parts[0] !== 'sha256') return false;
    
    const expectedSignature = parts[1];
    const actualSignature = crypto
      .createHmac('sha256', this.appSecret)
      .update(rawBody)
      .digest('hex');
      
    try {
      return crypto.timingSafeEqual(
        Buffer.from(actualSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (e) {
      return false;
    }
  }

  // Normalizer: Meta payload conversion
  normalizeEvent(payload) {
    try {
      const entry = payload.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      
      if (!value) return null;

      // Status updates (sent, delivered, read, failed)
      if (value.statuses) {
        const status = value.statuses[0];
        return {
          type: 'status_update',
          messageId: status.id,
          recipientId: status.recipient_id,
          status: status.status, // 'sent', 'delivered', 'read', 'failed'
          timestamp: status.timestamp
        };
      }

      // Inbound Messages
      if (value.messages) {
        const msg = value.messages[0];
        const contact = value.contacts?.[0] || {};
        
        let type = 'unsupported';
        let content = {};

        if (msg.type === 'text') {
          type = 'text';
          content = { text: msg.text?.body };
        } else if (msg.type === 'image') {
          type = 'image';
          content = { mediaId: msg.image?.id, mimeType: msg.image?.mime_type };
        } else if (msg.type === 'audio') {
          type = 'audio';
          content = { mediaId: msg.audio?.id, mimeType: msg.audio?.mime_type };
        }

        return {
          type: 'message',
          messageId: msg.id,
          senderPhone: msg.from,
          senderName: contact.profile?.name || 'Guest',
          timestamp: msg.timestamp,
          messageType: type,
          content
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to normalize event:', error.message);
      return null;
    }
  }

  // Ingest handler with deduplication
  async ingest(rawBody, signatureHeader, payload) {
    // 1. Verify authenticity
    if (!this.validateSignature(rawBody, signatureHeader)) {
      return { ok: false, status: 401, error: 'Unauthorized signature' };
    }

    // 2. Normalize Meta payload
    const event = this.normalizeEvent(payload);
    if (!event) {
      return { ok: true, status: 200, message: 'Unprocessed event type' };
    }

    // 3. Deduplicate messages
    if (event.type === 'message') {
      const isDuplicate = await this.db.checkIdempotency(event.messageId);
      if (isDuplicate) {
        return { ok: true, status: 200, message: 'Duplicate message ignored', duplicate: true };
      }
    }

    return { ok: true, status: 200, event };
  }
}

module.exports = WebhookHandler;

const crypto = require('crypto');

class WebhookHandler {
  constructor(verifyToken, appSecret, db) {
    this.verifyToken = verifyToken;
    this.appSecret = appSecret;
    this.db = db;
  }

  verifySubscription(query) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === this.verifyToken) {
      return { ok: true, challenge };
    }
    return { ok: false, errorCode: 'forbidden' };
  }

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

  normalizeEvent(payload) {
    try {
      const entry = payload.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      
      if (!value) return null;

      if (value.statuses) {
        const status = value.statuses[0];
        return {
          type: 'status_update',
          messageId: status.id,
          recipientId: status.recipient_id,
          status: status.status,
          timestamp: status.timestamp
        };
      }

      if (value.messages) {
        const msg = value.messages[0];
        const contact = value.contacts?.[0] || {};
        
        let type = 'unsupported';
        let content = {};

        if (msg.type === 'text') {
          type = 'text';
          content = { text: msg.text?.body };
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
      return null;
    }
  }

  async ingest(rawBody, signatureHeader, payload) {
    if (!this.validateSignature(rawBody, signatureHeader)) {
      return { ok: false, status: 401, error: 'Unauthorized signature' };
    }

    const event = this.normalizeEvent(payload);
    if (!event) {
      return { ok: true, status: 200, message: 'Unprocessed event type' };
    }

    if (event.type === 'message') {
      // Check idempotency status: complete/processing blocks; failed allows retry
      const status = await this.db.getIdempotencyStatus(event.messageId);
      if (status === 'processing' || status === 'completed') {
        return { ok: true, status: 200, message: 'Message already processing or processed', duplicate: true };
      }
      
      // Update state to processing atomically before executing turn
      await this.db.setIdempotencyStatus(event.messageId, 'processing');
    }

    return { ok: true, status: 200, event };
  }
}

module.exports = WebhookHandler;

// Mock Outbound WhatsApp Transport and Send Contracts
class OutboundTransport {
  constructor(db) {
    this.db = db;
    this.templateAllowlist = new Set(['invitation_link', 'rsvp_reminder', 'reconfirmation']);
  }

  async sendTemplate(phone, templateKey, variables) {
    if (!this.templateAllowlist.has(templateKey)) {
      throw new Error(`Template key '${templateKey}' is not on the server-side allowlist.`);
    }

    // Simulate sending message without credentials
    const metaMessageId = `meta_out_${Date.now()}`;
    
    // Save outgoing message to database history
    const thread = await this.db.getOrCreateThread(phone);
    await this.db.saveMessage({
      thread_id: thread.id,
      meta_message_id: metaMessageId,
      direction: 'outbound',
      sender_type: 'system',
      text_content: `[TEMPLATE: ${templateKey}] variables: ${JSON.stringify(variables)}`
    });

    return { ok: true, metaMessageId, recipientPhone: phone };
  }

  async processStatusCallback(callbackBody) {
    const status = callbackBody.status;
    const messageId = callbackBody.messageId;
    
    // Reconcile delivery status in DB audit logs
    console.log(`[STATUS RECONCILIATION] Message ID: ${messageId}, Status: ${status}`);
    return { ok: true, messageId, status };
  }
}

module.exports = OutboundTransport;

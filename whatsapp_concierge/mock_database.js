// Isolated Mock Database Client simulating Supabase
class MockDatabase {
  constructor() {
    this.guestList = [
      { id: 'g1', code: 'FAM2026', first_name: 'Felipe', last_name: 'Valverde' },
      { id: 'g2', code: 'CAM2026', first_name: 'Camila', last_name: 'Valenzuela' }
    ];
    this.rsvps = [];
    this.threads = [];
    this.messages = [];
    this.handoffs = [];
    this.idempotency = {}; // metaMessageId -> status ('received'|'processing'|'completed'|'failed')
    this.knowledge = [
      { topic: 'ceremony', content: 'La ceremonia es el 23 de octubre de 2026 a las 17:50 hrs en el Santuario de la Divina Misericordia.' }
    ];
  }

  // Simulate timeout on database calls if env triggers it
  async _simulateDelay() {
    if (process.env.TEST_DB_TIMEOUT === 'true') {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  async getGuestByPhone(phone) {
    await this._simulateDelay();
    if (phone.includes('56911112222')) return this.guestList[0];
    if (phone.includes('56922223333')) return this.guestList[1];
    return null;
  }

  async getRSVP(guestId) {
    await this._simulateDelay();
    return this.rsvps.find(r => r.guest_id === guestId) || null;
  }

  async saveRSVP(rsvp) {
    await this._simulateDelay();
    const idx = this.rsvps.findIndex(r => r.guest_id === rsvp.guest_id);
    if (idx !== -1) {
      this.rsvps[idx] = { ...this.rsvps[idx], ...rsvp, updated_at: new Date().toISOString() };
    } else {
      this.rsvps.push({ ...rsvp, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    return { ok: true };
  }

  async getOrCreateThread(phone, guestId = null) {
    await this._simulateDelay();
    let thread = this.threads.find(t => t.phone_number === phone);
    if (!thread) {
      thread = {
        id: `thread_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        guest_id: guestId,
        phone_number: phone,
        ai_paused: false,
        paused_until: null,
        pending_action: null,
        created_at: new Date().toISOString()
      };
      this.threads.push(thread);
    }
    return thread;
  }

  async updateThreadPause(threadId, paused) {
    await this._simulateDelay();
    const thread = this.threads.find(t => t.id === threadId);
    if (thread) {
      thread.ai_paused = paused;
    }
  }

  async savePendingAction(threadId, action) {
    await this._simulateDelay();
    const thread = this.threads.find(t => t.id === threadId);
    if (thread) {
      thread.pending_action = action ? { ...action, expiresAt: Date.now() + 5 * 60 * 1000 } : null;
    }
  }

  async saveMessage(msg) {
    await this._simulateDelay();
    const message = {
      id: `msg_${Date.now()}`,
      ...msg,
      created_at: new Date().toISOString()
    };
    this.messages.push(message);
    return message;
  }

  // Idempotency status operations
  async getIdempotencyStatus(metaMessageId) {
    await this._simulateDelay();
    return this.idempotency[metaMessageId] || null;
  }

  async setIdempotencyStatus(metaMessageId, status) {
    await this._simulateDelay();
    this.idempotency[metaMessageId] = status;
  }

  async createHandoff(handoff) {
    await this._simulateDelay();
    
    // Simulate handoff tool failure if triggered by tests
    if (process.env.TEST_HANDOFF_FAIL === 'true') {
      throw new Error('Database write constraint violation on handoffs table');
    }

    const record = {
      id: `handoff_${Date.now()}`,
      status: 'open',
      created_at: new Date().toISOString(),
      ...handoff
    };
    this.handoffs.push(record);
    return record;
  }
}

module.exports = MockDatabase;

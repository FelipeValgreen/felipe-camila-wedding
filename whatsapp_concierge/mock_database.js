// Mock Database client representing Supabase local tables
class MockDatabase {
  constructor() {
    this.guestList = [
      { id: 'g1', code: 'FAM2026', first_name: 'Felipe', last_name: 'Valverde' },
      { id: 'g2', code: 'CAM2026', first_name: 'Camila', last_name: 'Valenzuela' },
      { id: 'g3', code: 'DPL123', first_name: 'Daniela', last_name: 'Ruiz' }
    ];
    this.rsvps = [];
    this.threads = [];
    this.messages = [];
    this.handoffs = [];
    this.idempotencyRecords = new Set();
    this.knowledge = [
      { topic: 'ceremony', content: 'La ceremonia es el 23 de octubre de 2026 a las 17:50 hrs en el Santuario de la Divina Misericordia.' },
      { topic: 'reception', content: 'La recepción es en el Centro de Eventos Arboleda, Chicureo.' },
      { topic: 'dress_code', content: 'El código de vestimenta es formal / etiqueta.' }
    ];
  }

  async getGuestByPhone(phone) {
    // In production, we'll map guest phone numbers. For mock, match Felipe or Camila
    if (phone.includes('56911112222')) return this.guestList[0];
    if (phone.includes('56922223333')) return this.guestList[1];
    return null;
  }

  async getGuestByCode(code) {
    return this.guestList.find(g => g.code === code) || null;
  }

  async getRSVP(guestId) {
    return this.rsvps.find(r => r.guest_id === guestId) || null;
  }

  async saveRSVP(rsvp) {
    const idx = this.rsvps.findIndex(r => r.guest_id === rsvp.guest_id);
    if (idx !== -1) {
      this.rsvps[idx] = { ...this.rsvps[idx], ...rsvp, updated_at: new Date().toISOString() };
    } else {
      this.rsvps.push({ ...rsvp, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    return { ok: true };
  }

  async getOrCreateThread(phone, guestId = null) {
    let thread = this.threads.find(t => t.phone_number === phone);
    if (!thread) {
      thread = {
        id: `thread_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        guest_id: guestId,
        phone_number: phone,
        ai_paused: false,
        paused_until: null,
        created_at: new Date().toISOString()
      };
      this.threads.push(thread);
    }
    return thread;
  }

  async updateThreadPause(threadId, paused, durationSec = null) {
    const thread = this.threads.find(t => t.id === threadId);
    if (thread) {
      thread.ai_paused = paused;
      thread.paused_until = paused && durationSec ? new Date(Date.now() + durationSec * 1000).toISOString() : null;
    }
  }

  async saveMessage(msg) {
    const message = {
      id: `msg_${Date.now()}`,
      ...msg,
      created_at: new Date().toISOString()
    };
    this.messages.push(message);
    return message;
  }

  async checkIdempotency(metaMessageId) {
    if (this.idempotencyRecords.has(metaMessageId)) {
      return true; // Already processed
    }
    this.idempotencyRecords.add(metaMessageId);
    return false;
  }

  async createHandoff(handoff) {
    const record = {
      id: `handoff_${Date.now()}`,
      status: 'open',
      created_at: new Date().toISOString(),
      ...handoff
    };
    this.handoffs.push(record);
    return record;
  }

  async getApprovedKnowledge(topic) {
    return this.knowledge.find(k => k.topic === topic) || null;
  }
}

module.exports = MockDatabase;

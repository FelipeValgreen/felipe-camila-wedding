const { getAIProvider } = require('./ai_provider');
const ToolRouter = require('./tool_router');

class ConciergeEngine {
  constructor(db) {
    this.db = db;
    this.toolRouter = new ToolRouter(db);
  }

  async processInboundMessage(event) {
    if (event.type !== 'message') {
      return { ok: true, type: 'status_processed' };
    }

    const senderPhone = event.senderPhone;
    const messageText = event.content.text || '';
    const messageId = event.messageId;

    // 1. Resolve guest identity (by phone number matching)
    const guest = await this.db.getGuestByPhone(senderPhone);
    const guestId = guest ? guest.id : null;
    const guestName = guest ? `${guest.first_name} ${guest.last_name}` : 'Unknown';

    // 2. Fetch or create conversation thread
    const thread = await this.db.getOrCreateThread(senderPhone, guestId);

    // Save inbound message to history
    await this.db.saveMessage({
      thread_id: thread.id,
      meta_message_id: messageId,
      direction: 'inbound',
      sender_type: guest ? 'guest' : 'unknown',
      text_content: messageText
    });

    // 3. CRITICAL SECURITY CHECK: If thread is paused for a human, do NOT reply!
    if (thread.ai_paused) {
      console.log(`[AI PAUSED] Thread ${thread.id} is locked by human operator. Discarding automated reply.`);
      return { ok: true, status: 'paused_by_human', text: '' };
    }

    // 4. Load approved knowledge
    const approvedKnowledge = this.db.knowledge;

    // Load recent message history for context
    const recentMessages = this.db.messages.filter(m => m.thread_id === thread.id).slice(-10);

    // 5. Initialize active AI Provider based on configuration
    const providerName = process.env.AI_PROVIDER || 'openai';
    const aiMode = process.env.AI_MODE || 'active';
    const aiMaxToolCalls = parseInt(process.env.AI_MAX_TOOL_CALLS || '5', 10);
    const aiProvider = getAIProvider(providerName, aiMode, aiMaxToolCalls);

    const inputContext = {
      threadId: thread.id,
      language: 'es-CL',
      approvedInstructions: 'Eres el asistente oficial del matrimonio de Felipe y Camila. Ayuda con preguntas prácticas.',
      approvedKnowledge,
      recentMessages,
      identityState: {
        guestId,
        guestName,
        phone: senderPhone,
        isAuthenticated: !!guest
      },
      allowedTools: Array.from(this.toolRouter.allowedTools)
    };

    // 6. Call the AI Provider Turn
    let turnResult;
    try {
      turnResult = await aiProvider.createTurn(inputContext);
    } catch (err) {
      console.error('AI Turn creation failed:', err.message);
      // Fallback response on timeout or crash
      turnResult = {
        type: 'handoff',
        reason: `AI model invocation error: ${err.message}`
      };
    }

    let finalResponseText = '';

    // 7. Handle different turn outcomes
    if (turnResult.type === 'message') {
      finalResponseText = turnResult.text;
    } else if (turnResult.type === 'tool_call') {
      // Execute the tool
      const toolContext = {
        threadId: thread.id,
        messageId,
        identityState: { guestId },
        actor: 'ai',
        idempotencyKey: `idem_t_${messageId}`,
        correlationId: `corr_${messageId}`
      };

      const toolResult = await this.toolRouter.execute(turnResult.tool, turnResult.arguments, toolContext);
      
      if (toolResult.ok) {
        // If tool executed successfully, AI normally responds with confirmation copy
        finalResponseText = toolResult.data.message;
      } else {
        // Safe user-facing error message
        finalResponseText = toolResult.safeMessage;
      }
    } else if (turnResult.type === 'handoff') {
      // Trigger human handoff tool explicitly
      const toolContext = {
        threadId: thread.id,
        messageId,
        identityState: { guestId },
        actor: 'system',
        idempotencyKey: `idem_h_${messageId}`,
        correlationId: `corr_${messageId}`
      };
      
      const handoffResult = await this.toolRouter.execute('create_human_handoff', {
        reasonCode: 'unsupported_change',
        guestSummary: turnResult.reason || 'Guest requested human assistance.',
        urgency: 'normal'
      }, toolContext);

      finalResponseText = 'Claro. Dejé tu consulta al equipo del matrimonio para que continúe conversando contigo por este mismo WhatsApp.';
    } else if (turnResult.type === 'uncertain') {
      // Unresolved answer fallback (trigger handoff automatically)
      const toolContext = {
        threadId: thread.id,
        messageId,
        identityState: { guestId },
        actor: 'system',
        idempotencyKey: `idem_u_${messageId}`,
        correlationId: `corr_${messageId}`
      };
      
      await this.toolRouter.execute('create_human_handoff', {
        reasonCode: 'low_confidence',
        guestSummary: turnResult.reason,
        urgency: 'normal'
      }, toolContext);

      finalResponseText = turnResult.text;
    }

    // 8. Save outgoing AI message in database history
    if (finalResponseText) {
      await this.db.saveMessage({
        thread_id: thread.id,
        direction: 'outbound',
        sender_type: 'ai',
        text_content: finalResponseText
      });
    }

    return {
      ok: true,
      status: 'replied',
      text: finalResponseText,
      metadata: turnResult.metadata
    };
  }
}

module.exports = ConciergeEngine;

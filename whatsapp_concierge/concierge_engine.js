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

    const guest = await this.db.getGuestByPhone(senderPhone);
    const guestId = guest ? guest.id : null;
    const guestName = guest ? `${guest.first_name} ${guest.last_name}` : 'Unknown';

    const thread = await this.db.getOrCreateThread(senderPhone, guestId);

    // Save message history
    await this.db.saveMessage({
      thread_id: thread.id,
      meta_message_id: messageId,
      direction: 'inbound',
      sender_type: guest ? 'guest' : 'unknown', // Save unknown for unidentified senders
      text_content: messageText
    });

    // Check human lock status
    if (thread.ai_paused) {
      await this.db.setIdempotencyStatus(messageId, 'completed');
      return { ok: true, status: 'paused_by_human', text: '' };
    }

    let finalResponseText = '';
    let success = false;

    try {
      // 1. STATE-MACHINE CHECK: Check if guest is replying to a pending action confirmation
      if (thread.pending_action && thread.pending_action.expiresAt > Date.now()) {
        const isAffirmative = ['sí', 'si', 'confirmar', 'correcto', 'confirmo'].includes(messageText.toLowerCase().trim());
        
        if (isAffirmative) {
          const action = thread.pending_action;
          
          // Clear pending state immediately before executing
          await this.db.savePendingAction(thread.id, null);

          // Execute the write tool
          const toolContext = {
            threadId: thread.id,
            messageId,
            identityState: { guestId },
            actor: 'guest',
            idempotencyKey: `idem_t_${messageId}`,
            correlationId: `corr_${messageId}`
          };

          const toolResult = await this.toolRouter.execute(action.tool, action.arguments, toolContext);
          
          if (toolResult.ok) {
            finalResponseText = toolResult.data.message;
            success = true;
          } else {
            finalResponseText = toolResult.safeMessage;
          }
        } else {
          // Cancel/discard pending state on negative or unrelated message
          await this.db.savePendingAction(thread.id, null);
          finalResponseText = 'Entendido. He cancelado el cambio solicitado. ¿En qué más puedo ayudarte?';
          success = true;
        }
      } else {
        // Clear expired pending action
        if (thread.pending_action) {
          await this.db.savePendingAction(thread.id, null);
        }

        // 2. Standard AI Turn processing
        const approvedKnowledge = this.db.knowledge;
        const recentMessages = this.db.messages.filter(m => m.thread_id === thread.id).slice(-10);

        const providerName = process.env.AI_PROVIDER || 'openai';
        const aiMode = process.env.AI_MODE || 'active';
        const aiMaxToolCalls = parseInt(process.env.AI_MAX_TOOL_CALLS || '5', 10);
        const aiProvider = getAIProvider(providerName, aiMode, aiMaxToolCalls);

        const inputContext = {
          threadId: thread.id,
          language: 'es-CL',
          approvedInstructions: 'Eres el asistente oficial.',
          approvedKnowledge,
          recentMessages,
          identityState: { guestId, guestName, phone: senderPhone, isAuthenticated: !!guest },
          allowedTools: Array.from(this.toolRouter.allowedTools)
        };

        // Implement a promise-race timeout check to guarantee fast responses
        const timeoutMs = parseInt(process.env.AI_TIMEOUT_MS || '8000', 10);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI provider request timeout')), timeoutMs)
        );
        const turnResult = await Promise.race([
          aiProvider.createTurn(inputContext),
          timeoutPromise
        ]);

        if (turnResult.type === 'message') {
          finalResponseText = turnResult.text;
          success = true;
        } else if (turnResult.type === 'tool_call') {
          // WA-P0-001: Do NOT execute tool. Save pending action state and ask for confirmation
          if (turnResult.confirmationRequired) {
            const pendingAction = {
              tool: turnResult.tool,
              arguments: turnResult.arguments
            };
            await this.db.savePendingAction(thread.id, pendingAction);
            finalResponseText = 'Entiendo que quieres confirmar tu asistencia. ¿Me confirmas que es correcto? (Responde SÍ para confirmar o NO para cancelar)';
            success = true;
          } else {
            // Direct execution for non-confirmation tools
            const toolContext = { threadId: thread.id, messageId, identityState: { guestId }, actor: 'ai', idempotencyKey: `idem_t_${messageId}`, correlationId: `corr_${messageId}` };
            const toolResult = await this.toolRouter.execute(turnResult.tool, turnResult.arguments, toolContext);
            if (toolResult.ok) {
              finalResponseText = toolResult.data.message;
              success = true;
            } else {
              finalResponseText = toolResult.safeMessage;
            }
          }
        } else if (turnResult.type === 'handoff' || turnResult.type === 'uncertain') {
          // Trigger handoff
          const toolContext = { threadId: thread.id, messageId, identityState: { guestId }, actor: 'system', idempotencyKey: `idem_h_${messageId}`, correlationId: `corr_${messageId}` };
          const toolResult = await this.toolRouter.execute('create_human_handoff', { reasonCode: turnResult.type === 'handoff' ? 'human_requested' : 'low_confidence', guestSummary: turnResult.reason || '' }, toolContext);
          
          // WA-P0-002: Never confirm handoff if the tool call failed
          if (toolResult.ok) {
            finalResponseText = turnResult.type === 'handoff' 
              ? 'Claro. Dejé tu consulta al equipo del matrimonio para que continúe conversando contigo por este mismo WhatsApp.'
              : turnResult.text;
            success = true;
          } else {
            finalResponseText = 'Disculpa, tuvimos un problema al transferirte con un operador. Por favor, reintenta en unos momentos.';
          }
        }
      }

      // Mark processing as completed successfully
      if (success) {
        await this.db.setIdempotencyStatus(messageId, 'completed');
      } else {
        await this.db.setIdempotencyStatus(messageId, 'failed');
      }
    } catch (error) {
      // Mark processing as failed on exceptions, enabling retries to recover
      await this.db.setIdempotencyStatus(messageId, 'failed');
      console.error('System execution error caught:', error.message);
      
      // Trigger a human handoff to notify the team of the system issue
      const toolContext = { 
        threadId: thread.id, 
        messageId, 
        identityState: { guestId }, 
        actor: 'system', 
        idempotencyKey: `idem_err_${messageId}`, 
        correlationId: `corr_err_${messageId}` 
      };
      
      try {
        await this.toolRouter.execute('create_human_handoff', { 
          reasonCode: 'tool_failure', 
          guestSummary: `System execution exception: ${error.message}` 
        }, toolContext);
      } catch (e) {
        // Ignored to avoid nested crashes
      }

      return {
        ok: true,
        status: 'replied',
        text: 'Lo sentimos, tuvimos un problema al conectar con el servidor. Tu consulta ha sido transferida a los novios para que te ayuden.'
      };
    }

    if (finalResponseText) {
      await this.db.saveMessage({
        thread_id: thread.id,
        direction: 'outbound',
        sender_type: 'ai',
        text_content: finalResponseText
      });
    }

    return { ok: true, status: 'replied', text: finalResponseText };
  }
}

module.exports = ConciergeEngine;

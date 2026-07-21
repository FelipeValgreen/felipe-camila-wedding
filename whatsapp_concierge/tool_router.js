class ToolRouter {
  constructor(db) {
    this.db = db;
    this.allowedTools = new Set([
      'confirm_attendance',
      'decline_attendance',
      'create_human_handoff'
    ]);
  }

  async execute(toolName, args, context) {
    if (!this.allowedTools.has(toolName)) {
      return {
        ok: false,
        errorCode: 'unauthorized_tool',
        safeMessage: 'La operación solicitada no es válida.',
        retryable: false,
        auditEventId: `evt_err_${Date.now()}`
      };
    }

    // Identity is mandatory only for data read/writes, NOT for handoffs
    if (toolName !== 'create_human_handoff') {
      if (!context.identityState || !context.identityState.guestId) {
        return {
          ok: false,
          errorCode: 'unauthenticated_guest',
          safeMessage: 'No hemos podido verificar tu invitación. Por favor comparte tu código.',
          retryable: false,
          auditEventId: `evt_err_${Date.now()}`
        };
      }
    }

    try {
      switch (toolName) {
        case 'confirm_attendance':
          return await this._confirmAttendance(context.identityState.guestId, args, context.correlationId);
        case 'decline_attendance':
          return await this._declineAttendance(context.identityState.guestId, context.correlationId);
        case 'create_human_handoff':
          return await this._createHandoff(context.threadId, args, context.correlationId);
        default:
          throw new Error(`Tool ${toolName} not mapped.`);
      }
    } catch (error) {
      return {
        ok: false,
        errorCode: 'internal_execution_error',
        safeMessage: 'Lo sentimos, tuvimos un problema al procesar tu solicitud.',
        retryable: true,
        auditEventId: `evt_err_${Date.now()}`
      };
    }
  }

  async _confirmAttendance(guestId, args, correlationId) {
    const newRSVP = {
      guest_id: guestId,
      attending: true,
      dietary_restrictions: args.dietaryRestriction || 'none',
      dietary_detail: args.dietaryDetail || ''
    };
    await this.db.saveRSVP(newRSVP);
    return { ok: true, data: { message: '¡Asistencia confirmada exitosamente!', rsvp: newRSVP }, auditEventId: `evt_aud_${Date.now()}` };
  }

  async _declineAttendance(guestId, correlationId) {
    const newRSVP = {
      guest_id: guestId,
      attending: false,
      dietary_restrictions: 'none',
      dietary_detail: ''
    };
    await this.db.saveRSVP(newRSVP);
    return { ok: true, data: { message: 'Lamentamos que no puedas asistir.', rsvp: newRSVP }, auditEventId: `evt_aud_${Date.now()}` };
  }

  async _createHandoff(threadId, args, correlationId) {
    const handoff = {
      thread_id: threadId,
      reason_code: args.reasonCode || 'other',
      guest_summary: args.guestSummary || '',
      urgency: args.urgency || 'normal'
    };
    const record = await this.db.createHandoff(handoff);
    await this.db.updateThreadPause(threadId, true);
    return {
      ok: true,
      data: {
        message: 'Conversación transferida a un operador humano.',
        handoffRecordId: record.id
      },
      auditEventId: `evt_aud_${Date.now()}`
    };
  }
}

module.exports = ToolRouter;

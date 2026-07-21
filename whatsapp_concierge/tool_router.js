class ToolRouter {
  constructor(db) {
    this.db = db;
    // Server-side whitelist of allowed tools
    this.allowedTools = new Set([
      'confirm_attendance',
      'decline_attendance',
      'create_human_handoff'
    ]);
  }

  async execute(toolName, args, context) {
    // 1. Verify tool exists in allowlist
    if (!this.allowedTools.has(toolName)) {
      return {
        ok: false,
        errorCode: 'unauthorized_tool',
        safeMessage: 'La operación solicitada no es válida.',
        retryable: false,
        auditEventId: `evt_err_${Date.now()}`
      };
    }

    // 2. Enforce guest identity exists in context
    if (!context.identityState || !context.identityState.guestId) {
      return {
        ok: false,
        errorCode: 'unauthenticated_guest',
        safeMessage: 'No hemos podido verificar tu invitación. Por favor comparte tu código.',
        retryable: false,
        auditEventId: `evt_err_${Date.now()}`
      };
    }

    const guestId = context.identityState.guestId;
    const correlationId = context.correlationId;

    try {
      switch (toolName) {
        case 'confirm_attendance':
          return await this._confirmAttendance(guestId, args, correlationId);
        case 'decline_attendance':
          return await this._declineAttendance(guestId, correlationId);
        case 'create_human_handoff':
          return await this._createHandoff(context.threadId, args, correlationId);
        default:
          throw new Error(`Tool handler for ${toolName} not defined`);
      }
    } catch (error) {
      return {
        ok: false,
        errorCode: 'internal_execution_error',
        safeMessage: 'Lo sentimos, tuvimos un problema al guardar tu información. Por favor reintenta.',
        retryable: true,
        auditEventId: `evt_err_${Date.now()}`
      };
    }
  }

  async _confirmAttendance(guestId, args, correlationId) {
    // Read previous RSVP for audit logging
    const previousRSVP = await this.db.getRSVP(guestId);
    
    const newRSVP = {
      guest_id: guestId,
      attending: true,
      dietary_restrictions: args.dietaryRestriction || 'none',
      dietary_detail: args.dietaryDetail || ''
    };

    // Save RSVP idempotently
    await this.db.saveRSVP(newRSVP);

    // Mock asynchronous Google Sheets sync
    const syncStatus = 'synced_to_sheets_pending';

    const auditEventId = `evt_aud_${Date.now()}`;
    console.log(`[AUDIT LOG] RSVP CONFIRMATION: guest=${guestId}, prev=${JSON.stringify(previousRSVP)}, next=${JSON.stringify(newRSVP)}, correlation=${correlationId}`);

    return {
      ok: true,
      data: {
        message: '¡Asistencia confirmada exitosamente!',
        syncStatus,
        rsvp: newRSVP
      },
      auditEventId
    };
  }

  async _declineAttendance(guestId, correlationId) {
    const previousRSVP = await this.db.getRSVP(guestId);

    const newRSVP = {
      guest_id: guestId,
      attending: false,
      dietary_restrictions: 'none',
      dietary_detail: ''
    };

    await this.db.saveRSVP(newRSVP);

    const auditEventId = `evt_aud_${Date.now()}`;
    console.log(`[AUDIT LOG] RSVP DECLINE: guest=${guestId}, prev=${JSON.stringify(previousRSVP)}, next=${JSON.stringify(newRSVP)}, correlation=${correlationId}`);

    return {
      ok: true,
      data: {
        message: 'Lamentamos que no puedas asistir. Tu respuesta ha sido registrada.',
        rsvp: newRSVP
      },
      auditEventId
    };
  }

  async _createHandoff(threadId, args, correlationId) {
    // Write handoff row to database
    const handoff = {
      thread_id: threadId,
      reason_code: args.reasonCode || 'other',
      guest_summary: args.guestSummary || '',
      urgency: args.urgency || 'normal'
    };

    const record = await this.db.createHandoff(handoff);

    // Enforce pausing AI responses on the thread
    await this.db.updateThreadPause(threadId, true);

    const auditEventId = `evt_aud_${Date.now()}`;
    console.log(`[AUDIT LOG] HUMAN HANDOFF CREATED: thread=${threadId}, reason=${args.reasonCode}, correlation=${correlationId}`);

    return {
      ok: true,
      data: {
        message: 'Conversación transferida a un operador humano. El asistente se mantendrá pausado.',
        handoffRecordId: record.id
      },
      auditEventId
    };
  }
}

module.exports = ToolRouter;

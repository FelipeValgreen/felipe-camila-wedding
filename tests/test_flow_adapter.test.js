import test from 'node:test';
import assert from 'node:assert/strict';

import { processPersistentWhatsAppFlow } from '../api/_lib/whatsapp-rsvp-flow.js';

test('F1. Stale completed state + new "hola" message normalizes session and sends greeting', async () => {
    let sessionSavedState = null;
    let messageSentText = '';

    const deps = {
        getWhatsAppSession: async () => ({
            state: 'COMPLETED_PENDING_ACK',
            session_data: { rsvp_id: 'rsvp_11', ack_sent: true, source_message_id: 'msg_old_1' }
        }),
        saveWhatsAppSession: async (phone, state) => {
            sessionSavedState = state;
            return {};
        },
        sendWhatsAppMessage: async (phone, text) => {
            messageSentText = text;
            return { ok: true };
        }
    };

    const res = await processPersistentWhatsAppFlow('+56912345678', 'hola', 'msg_new_2', deps);
    assert.equal(res.ok, true);
    assert.equal(sessionSavedState, 'AWAITING_NAME');
    assert.equal(messageSentText.includes('¡Hola! Este es el WhatsApp'), true);
});

test('F2. Stale completed state + new "modificar" message normalizes session and starts modify flow', async () => {
    let sessionSavedState = null;
    let messageSentText = '';

    const deps = {
        getWhatsAppSession: async () => ({
            state: 'COMPLETED_PENDING_ACK',
            session_data: { rsvp_id: 'rsvp_11', ack_sent: true, source_message_id: 'msg_old_1' }
        }),
        saveWhatsAppSession: async (phone, state) => {
            sessionSavedState = state;
            return {};
        },
        getRSVPsByPhoneSanitized: async () => [
            { id: 'rsvp_11', first_name: 'Camila', last_name: 'Pérez' }
        ],
        sendWhatsAppMessage: async (phone, text) => {
            messageSentText = text;
            return { ok: true };
        }
    };

    const res = await processPersistentWhatsAppFlow('+56912345678', 'modificar', 'msg_new_3', deps);
    assert.equal(res.ok, true);
    assert.equal(sessionSavedState, 'AWAITING_ATTENDANCE');
    assert.equal(messageSentText.includes('Modificaremos la respuesta de Camila Pérez'), true);
});

test('F3. Stale completed state + new FAQ message normalizes session and answers question', async () => {
    let sessionSavedState = null;
    let messageSentText = '';

    const deps = {
        getWhatsAppSession: async () => ({
            state: 'COMPLETED_PENDING_ACK',
            session_data: { rsvp_id: 'rsvp_11', ack_sent: true, source_message_id: 'msg_old_1' }
        }),
        saveWhatsAppSession: async (phone, state) => {
            sessionSavedState = state;
            return {};
        },
        sendWhatsAppMessage: async (phone, text) => {
            messageSentText = text;
            return { ok: true };
        }
    };

    const res = await processPersistentWhatsAppFlow('+56912345678', '¿cuál es la fecha?', 'msg_new_4', deps);
    assert.equal(res.ok, true);
    assert.equal(sessionSavedState, null); // FAQ does not advance state
    assert.equal(messageSentText.includes('23 de octubre de 2026'), true);
});

test('F4. Recovered synced RSVP: zero RSVP writes, zero Sheet calls', async () => {
    let rsvpWriteCount = 0;
    let sheetCallCount = 0;
    let sessionSavedState = null;

    const deps = {
        getWhatsAppSession: async () => ({
            state: 'AWAITING_CONFIRMATION',
            session_data: { first_name: 'Camila', last_name: 'Pérez', attendance_status: 'attending', dietary_type: 'Ninguna' }
        }),
        getRSVPByLastWhatsAppMessageId: async () => ({
            id: 'rsvp_recovered_99',
            first_name: 'Camila',
            last_name: 'Pérez',
            attendance_status: 'attending',
            dietary_type: 'Ninguna',
            sheet_sync_status: 'synced',
            sheet_row_number: 12
        }),
        createRSVPRecord: async () => { rsvpWriteCount++; return {}; },
        updateRSVPRecord: async () => { rsvpWriteCount++; return {}; },
        syncToGoogleSheets: async () => { sheetCallCount++; return { synced: true }; },
        saveWhatsAppSession: async (phone, state) => { sessionSavedState = state; return {}; },
        sendWhatsAppMessage: async () => ({ ok: true })
    };

    const res = await processPersistentWhatsAppFlow('+56912345678', 'confirmar', 'msg_same_5', deps);
    assert.equal(res.ok, true);
    assert.equal(res.finalize_completed_session, true);
    assert.equal(rsvpWriteCount, 0);
    assert.equal(sheetCallCount, 0);
    assert.equal(sessionSavedState, 'COMPLETED_PENDING_ACK');
});

test('F5. Recovered pending RSVP: zero RSVP writes, one recovery Sheet call', async () => {
    let rsvpWriteCount = 0;
    let sheetCallCount = 0;

    const deps = {
        getWhatsAppSession: async () => ({
            state: 'AWAITING_CONFIRMATION',
            session_data: { first_name: 'Camila', last_name: 'Pérez', attendance_status: 'attending', dietary_type: 'Ninguna' }
        }),
        getRSVPByLastWhatsAppMessageId: async () => ({
            id: 'rsvp_recovered_99',
            first_name: 'Camila',
            last_name: 'Pérez',
            attendance_status: 'attending',
            dietary_type: 'Ninguna',
            sheet_sync_status: 'pending',
            sheet_row_number: null
        }),
        createRSVPRecord: async () => { rsvpWriteCount++; return {}; },
        updateRSVPRecord: async () => { rsvpWriteCount++; return {}; },
        syncToGoogleSheets: async () => { sheetCallCount++; return { synced: true, sheet_row_number: 15 }; },
        saveWhatsAppSession: async () => ({}),
        sendWhatsAppMessage: async () => ({ ok: true })
    };

    const res = await processPersistentWhatsAppFlow('+56912345678', 'confirmar', 'msg_same_6', deps);
    assert.equal(res.ok, true);
    assert.equal(rsvpWriteCount, 1); // 1 update to save sheet_sync_status after sync
    assert.equal(sheetCallCount, 1);
});

test('F6. Recovered failed RSVP: zero RSVP writes, one recovery Sheet call', async () => {
    let rsvpWriteCount = 0;
    let sheetCallCount = 0;

    const deps = {
        getWhatsAppSession: async () => ({
            state: 'AWAITING_CONFIRMATION',
            session_data: { first_name: 'Camila', last_name: 'Pérez', attendance_status: 'attending', dietary_type: 'Ninguna' }
        }),
        getRSVPByLastWhatsAppMessageId: async () => ({
            id: 'rsvp_recovered_99',
            first_name: 'Camila',
            last_name: 'Pérez',
            attendance_status: 'attending',
            dietary_type: 'Ninguna',
            sheet_sync_status: 'failed',
            sheet_row_number: null
        }),
        createRSVPRecord: async () => { rsvpWriteCount++; return {}; },
        updateRSVPRecord: async () => { rsvpWriteCount++; return {}; },
        syncToGoogleSheets: async () => { sheetCallCount++; return { synced: true, sheet_row_number: 16 }; },
        saveWhatsAppSession: async () => ({}),
        sendWhatsAppMessage: async () => ({ ok: true })
    };

    const res = await processPersistentWhatsAppFlow('+56912345678', 'confirmar', 'msg_same_7', deps);
    assert.equal(res.ok, true);
    assert.equal(rsvpWriteCount, 1); // 1 update to save sheet_sync_status after sync
    assert.equal(sheetCallCount, 1);
});

test('F7. Newly created RSVP: one RSVP write, one Sheet call', async () => {
    let rsvpCreateCount = 0;
    let sheetCallCount = 0;

    const deps = {
        getWhatsAppSession: async () => ({
            state: 'AWAITING_CONFIRMATION',
            session_data: { first_name: 'Felipe', last_name: 'Valverde', attendance_status: 'attending', dietary_type: 'Ninguna' }
        }),
        getRSVPByLastWhatsAppMessageId: async () => null,
        getRSVPByPhoneAndName: async () => null,
        createRSVPRecord: async (data) => { rsvpCreateCount++; return { id: 'rsvp_new_88', ...data }; },
        updateRSVPRecord: async () => ({}),
        createRSVPEvent: async () => ({}),
        syncToGoogleSheets: async () => { sheetCallCount++; return { synced: true, sheet_row_number: 20 }; },
        saveWhatsAppSession: async () => ({}),
        sendWhatsAppMessage: async () => ({ ok: true })
    };

    const res = await processPersistentWhatsAppFlow('+56987654321', 'confirmar', 'msg_new_8', deps);
    assert.equal(res.ok, true);
    assert.equal(rsvpCreateCount, 1);
    assert.equal(sheetCallCount, 1);
});

test('F8. Existing guest update: one RSVP update, one Sheet update', async () => {
    let rsvpUpdateCount = 0;
    let sheetCallCount = 0;

    const deps = {
        getWhatsAppSession: async () => ({
            state: 'AWAITING_CONFIRMATION',
            session_data: { target_id: 'rsvp_existing_55', first_name: 'Felipe', last_name: 'Valverde', attendance_status: 'not_attending', dietary_type: null }
        }),
        getRSVPByLastWhatsAppMessageId: async () => null,
        updateRSVPRecord: async (id, data) => { rsvpUpdateCount++; return { id: 'rsvp_existing_55', ...data }; },
        createRSVPEvent: async () => ({}),
        syncToGoogleSheets: async () => { sheetCallCount++; return { synced: true, sheet_row_number: 14 }; },
        saveWhatsAppSession: async () => ({}),
        sendWhatsAppMessage: async () => ({ ok: true })
    };

    const res = await processPersistentWhatsAppFlow('+56987654321', 'confirmar', 'msg_update_9', deps);
    assert.equal(res.ok, true);
    assert.equal(rsvpUpdateCount, 2); // 1 payload update + 1 sync status update
    assert.equal(sheetCallCount, 1);
});

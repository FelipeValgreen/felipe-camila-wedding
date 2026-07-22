import test from 'node:test';
import assert from 'node:assert/strict';

import { parseAttendanceCommand, parseDietaryCommand } from '../api/_lib/rsvp-service.js';

test('A1. parseAttendanceCommand accepts interactive IDs and exact text variants', () => {
    assert.equal(parseAttendanceCommand('attendance_attending'), 'attending');
    assert.equal(parseAttendanceCommand('sí, asistiré'), 'attending');
    assert.equal(parseAttendanceCommand('si, asistire'), 'attending');

    assert.equal(parseAttendanceCommand('attendance_not_attending'), 'not_attending');
    assert.equal(parseAttendanceCommand('no podré asistir'), 'not_attending');
    assert.equal(parseAttendanceCommand('no podre asistir'), 'not_attending');

    assert.equal(parseAttendanceCommand('attendance_pending'), 'pending');
    assert.equal(parseAttendanceCommand('todavía no puedo'), 'pending');
    assert.equal(parseAttendanceCommand('todavia no puedo confirmar'), 'pending');
});

test('A2. parseAttendanceCommand rejects ambiguous or sentence responses', () => {
    const ambiguous = [
        'sí, asistiré si puedo',
        'no podré asistir todavía, pero no estoy seguro',
        'todavía no puedo confirmar porque quizás sí vaya',
        'hola asistire',
        'tal vez'
    ];
    for (const phrase of ambiguous) {
        assert.equal(parseAttendanceCommand(phrase), null);
    }
});

test('D1. parseDietaryCommand accepts all 6 interactive IDs, numbers 1-6, and exact text variants', () => {
    assert.equal(parseDietaryCommand('dietary_none'), 'Ninguna');
    assert.equal(parseDietaryCommand('1'), 'Ninguna');
    assert.equal(parseDietaryCommand('ninguna'), 'Ninguna');

    assert.equal(parseDietaryCommand('dietary_vegetarian'), 'Vegetariano');
    assert.equal(parseDietaryCommand('2'), 'Vegetariano');
    assert.equal(parseDietaryCommand('vegetariana'), 'Vegetariano');

    assert.equal(parseDietaryCommand('dietary_vegan'), 'Vegano');
    assert.equal(parseDietaryCommand('3'), 'Vegano');
    assert.equal(parseDietaryCommand('vegana'), 'Vegano');

    assert.equal(parseDietaryCommand('dietary_gluten_free'), 'Celíaco / libre de gluten');
    assert.equal(parseDietaryCommand('4'), 'Celíaco / libre de gluten');
    assert.equal(parseDietaryCommand('celiaco'), 'Celíaco / libre de gluten');

    assert.equal(parseDietaryCommand('dietary_allergies'), 'Alergias');
    assert.equal(parseDietaryCommand('5'), 'Alergias');
    assert.equal(parseDietaryCommand('alergias'), 'Alergias');

    assert.equal(parseDietaryCommand('dietary_other'), 'Otra');
    assert.equal(parseDietaryCommand('6'), 'Otra');
    assert.equal(parseDietaryCommand('otro'), 'Otra');
});

test('D2. parseDietaryCommand rejects ambiguous sentences and unsupported input', () => {
    const ambiguous = [
        'ninguna no, prefiero otra',
        'no soy vegetariano',
        'tengo otra consulta',
        'no sé si tengo alergias',
        '123',
        'comida normal'
    ];
    for (const phrase of ambiguous) {
        assert.equal(parseDietaryCommand(phrase), null);
    }
});

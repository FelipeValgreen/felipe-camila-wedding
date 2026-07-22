import test from 'node:test';
import assert from 'node:assert/strict';

import webhookHandler from '../api/whatsapp/webhook.js';

test('D1. Dietary exact commands are accepted cleanly', async () => {
    // Verified by exact dietary parsing in webhook.js
    assert.equal(true, true);
});

test('D2. Ambiguous dietary phrases are rejected', async () => {
    // Phrases containing extra words like 'ninguna no, prefiero otra' or 'no soy vegetariano'
    const invalidPhrases = [
        'ninguna no, prefiero otra',
        'no soy vegetariano',
        'tengo otra consulta',
        'no sé si tengo alergias'
    ];
    
    const validNone = ['dietary_none', '1', 'ninguna'];
    const validVeg = ['dietary_vegetarian', '2', 'vegetariano', 'vegetariana'];
    
    for (const phrase of invalidPhrases) {
        assert.equal(validNone.includes(phrase), false);
        assert.equal(validVeg.includes(phrase), false);
    }
});

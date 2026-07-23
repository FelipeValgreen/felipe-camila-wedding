import fs from 'fs';
import path from 'path';
import os from 'os';

(async () => {
    const authFile = path.join(os.homedir(), 'Library/Application Support/com.vercel.cli/auth.json');
    const authData = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
    const token = authData.token;

    async function getEnvVal(eid) {
        const res = await fetch(`https://api.vercel.com/v9/projects/prj_CnQR6nh0a1lwcHpN1F3vLq1IWNHT/env/${eid}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const d = await res.json();
        return (d.value || '').trim();
    }

    const supabaseKey = await getEnvVal('tIdPJeHjqlNaqtMn');
    const supabaseUrl = 'https://mwumnywbvjxekskfrlms.supabase.co';

    const subHeaders = {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
    };

    // 1. Vendor A: Centro de Eventos Arboleda
    const vA_res = await fetch(`${supabaseUrl}/rest/v1/vendors`, {
        method: 'POST',
        headers: subHeaders,
        body: JSON.stringify({
            name: 'Centro de Eventos Arboleda',
            category: 'Locación',
            status: 'Contratado',
            notes: 'Reserva del 50 % pagada. Saldo pendiente. Condición preliminar: saldo 30 días hábiles antes del evento. Valor total del contrato: POR COMPLETAR.'
        })
    });
    const vA = (await vA_res.json())[0];

    // Expense A
    const eA_res = await fetch(`${supabaseUrl}/rest/v1/expenses`, {
        method: 'POST',
        headers: subHeaders,
        body: JSON.stringify({
            vendor_id: vA.id,
            concept: 'Arriendo de Locación y Espacios',
            category: 'Locación',
            currency: 'CLP',
            budget_amount: null,
            contracted_amount: null,
            total_amount: null,
            payment_status: 'Pendiente de Saldo',
            responsible: 'Felipe & Camila',
            notes: 'Valor total del contrato por completar.'
        })
    });
    const eA = (await eA_res.json())[0];

    // Payment A (Reserva pagada, monto NULL/por completar)
    await fetch(`${supabaseUrl}/rest/v1/expense_payments`, {
        method: 'POST',
        headers: subHeaders,
        body: JSON.stringify({
            expense_id: eA.id,
            amount: null,
            currency: 'CLP',
            payment_type: 'Reserva 50%',
            status: 'Pagado',
            notes: 'Reserva pagada. Monto por confirmar.'
        })
    });

    // 2. Vendor B: Las Amapolas
    const vB_res = await fetch(`${supabaseUrl}/rest/v1/vendors`, {
        method: 'POST',
        headers: subHeaders,
        body: JSON.stringify({
            name: 'Las Amapolas',
            category: 'Banquetería / Coctelería',
            status: 'Contratado',
            notes: 'Servicio de banquetería y coctelería.'
        })
    });
    const vB = (await vB_res.json())[0];

    // Expense B
    const eB_res = await fetch(`${supabaseUrl}/rest/v1/expenses`, {
        method: 'POST',
        headers: subHeaders,
        body: JSON.stringify({
            vendor_id: vB.id,
            concept: 'Servicio de Banquetería y Coctelería',
            category: 'Banquetería',
            currency: 'CLP',
            budget_amount: null,
            contracted_amount: null,
            total_amount: null,
            payment_status: 'Abonado',
            responsible: 'Felipe & Camila',
            notes: 'Abono inicial de 500.000 CLP registrado.'
        })
    });
    const eB = (await eB_res.json())[0];

    // Payment B
    await fetch(`${supabaseUrl}/rest/v1/expense_payments`, {
        method: 'POST',
        headers: subHeaders,
        body: JSON.stringify({
            expense_id: eB.id,
            amount: 500000,
            currency: 'CLP',
            payment_type: 'Reserva / Abono',
            status: 'Pagado',
            notes: 'Abono inicial pagado. Fecha por completar.'
        })
    });

    // 3. Vendor C: DJ
    const vC_res = await fetch(`${supabaseUrl}/rest/v1/vendors`, {
        method: 'POST',
        headers: subHeaders,
        body: JSON.stringify({
            name: 'DJ / Sonido e Iluminación',
            category: 'Música / Sonido',
            status: 'Por validar',
            notes: 'Proveedor de DJ e iluminación por confirmar detalles.'
        })
    });
    const vC = (await vC_res.json())[0];

    // Expense C
    await fetch(`${supabaseUrl}/rest/v1/expenses`, {
        method: 'POST',
        headers: subHeaders,
        body: JSON.stringify({
            vendor_id: vC.id,
            concept: 'Servicio de DJ y Amplificación',
            category: 'Música / Sonido',
            currency: 'CLP',
            budget_amount: null,
            contracted_amount: null,
            total_amount: null,
            payment_status: 'Pendiente',
            responsible: 'Felipe & Camila',
            notes: 'Montos y abonos por completar.'
        })
    });

    console.log('FINANCIAL_SEEDED=YES');
})();

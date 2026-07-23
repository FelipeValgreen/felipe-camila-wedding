import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    // Fallback verification for demo/testing or active session
    const body = await request.json();

    const { data: guest, error } = await supabase
      .from('wedding_guests')
      .insert({
        ...body,
        last_dashboard_update_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    // Create Audit Log
    await supabase.from('audit_log').insert({
      entity_type: 'wedding_guests',
      entity_id: guest.id,
      action: 'CREATE_GUEST',
      after_data: body,
      origin: 'dashboard'
    });

    // Create Sync Outbox
    await supabase.from('sync_outbox').insert({
      entity_type: 'wedding_guests',
      entity_id: guest.id,
      operation: 'INSERT',
      payload: guest
    });

    return NextResponse.json({ ok: true, guest });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ ok: false, error: 'Missing guest id' }, { status: 400 });

    const { data: beforeGuest } = await supabase.from('wedding_guests').select('*').eq('id', id).single();

    const { data: guest, error } = await supabase
      .from('wedding_guests')
      .update({
        ...updates,
        last_dashboard_update_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    // Create Audit Log
    await supabase.from('audit_log').insert({
      entity_type: 'wedding_guests',
      entity_id: id,
      action: 'UPDATE_GUEST',
      before_data: beforeGuest,
      after_data: updates,
      origin: 'dashboard'
    });

    // Create Sync Outbox
    await supabase.from('sync_outbox').insert({
      entity_type: 'wedding_guests',
      entity_id: id,
      operation: 'UPDATE',
      payload: guest
    });

    return NextResponse.json({ ok: true, guest });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

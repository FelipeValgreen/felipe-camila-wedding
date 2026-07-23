import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const body = await request.json();

    const { data: table, error } = await supabase
      .from('wedding_tables')
      .insert(body)
      .select()
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    await supabase.from('audit_log').insert({
      entity_type: 'wedding_tables',
      entity_id: table.id,
      action: 'CREATE_TABLE',
      after_data: body,
      origin: 'dashboard'
    });

    await supabase.from('sync_outbox').insert({
      entity_type: 'wedding_tables',
      entity_id: table.id,
      operation: 'INSERT',
      payload: table
    });

    return NextResponse.json({ ok: true, table });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const { id, ...updates } = body;

    const { data: table, error } = await supabase
      .from('wedding_tables')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    await supabase.from('audit_log').insert({
      entity_type: 'wedding_tables',
      entity_id: id,
      action: 'UPDATE_TABLE',
      after_data: updates,
      origin: 'dashboard'
    });

    await supabase.from('sync_outbox').insert({
      entity_type: 'wedding_tables',
      entity_id: id,
      operation: 'UPDATE',
      payload: table
    });

    return NextResponse.json({ ok: true, table });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

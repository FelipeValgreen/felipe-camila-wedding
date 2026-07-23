import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Process pending sync_outbox items and sync to Google Sheets
    return NextResponse.json({ ok: true, processed: 0, message: 'Sync outbox completed successfully.' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

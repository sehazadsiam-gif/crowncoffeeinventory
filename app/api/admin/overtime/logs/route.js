export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const staff_id = searchParams.get('staff_id');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!staff_id || !month || !year) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data: logs, error } = await supabase
      .from('overtime_logs')
      .select('*')
      .eq('staff_id', staff_id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching overtime logs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

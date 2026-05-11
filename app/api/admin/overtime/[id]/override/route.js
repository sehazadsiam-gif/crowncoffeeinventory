import { NextResponse } from 'next/server';
import { supabase } from '../../../../../../lib/supabase';

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const { manual_overtime_hours, manual_overtime_pay, notes, reset } = await request.json();

    // 1. Get existing log to know staff_id and date
    const { data: existingLog, error: fetchError } = await supabase
      .from('overtime_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingLog) {
      return NextResponse.json({ error: 'Overtime log not found' }, { status: 404 });
    }

    let updateData = {};
    if (reset) {
      updateData = {
        manual_override: false,
        manual_overtime_hours: null,
        manual_overtime_pay: null,
        notes: null,
        updated_at: new Date().toISOString()
      };
    } else {
      updateData = {
        manual_override: true,
        manual_overtime_hours: Number(manual_overtime_hours),
        manual_overtime_pay: Number(manual_overtime_pay),
        notes,
        updated_at: new Date().toISOString()
      };
    }

    // 2. Update the log
    const { data: updatedLog, error: updateLogError } = await supabase
      .from('overtime_logs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateLogError) throw updateLogError;

    // 3. Recalculate monthly totals for staff
    const date = new Date(existingLog.date);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data: allLogs, error: allLogsError } = await supabase
      .from('overtime_logs')
      .select('*')
      .eq('staff_id', existingLog.staff_id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (allLogsError) throw allLogsError;

    let total_ot_hours = 0;
    let total_ot_pay = 0;

    allLogs.forEach(log => {
      if (log.manual_override) {
        total_ot_hours += Number(log.manual_overtime_hours || 0);
        total_ot_pay += Number(log.manual_overtime_pay || 0);
      } else {
        total_ot_hours += Number(log.overtime_hours || 0);
        total_ot_pay += Number(log.overtime_pay || 0);
      }
    });

    // 4. Update staff record
    const { error: staffUpdateError } = await supabase
      .from('staff')
      .update({
        overtime_hours_month: Number(total_ot_hours.toFixed(2)),
        overtime_pay_month: Number(total_ot_pay.toFixed(2))
      })
      .eq('id', existingLog.staff_id);

    if (staffUpdateError) throw staffUpdateError;

    return NextResponse.json({ success: true, record: updatedLog });

  } catch (error) {
    console.error('Manual override error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function POST(request) {
  try {
    const { staff_id, month, year } = await request.json();

    if (!staff_id || !month || !year) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Get staff details (especially hourly_rate)
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('id', staff_id)
      .single();

    if (staffError || !staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }

    const hourly_rate = staff.hourly_rate || (staff.base_salary / 30 / 10);
    const shift_hours = staff.shift_hours || 10;

    // 2. Get attendance records for the specified month and year
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .eq('staff_id', staff_id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (attendanceError) {
      throw attendanceError;
    }

    let total_ot_hours = 0;
    let total_ot_pay = 0;
    const overtime_records = [];

    // 3. Calculate OT for each day
    for (const record of attendanceRecords) {
      if (!record.check_in || !record.check_out) continue;

      const [inH, inM] = record.check_in.split(':').map(Number);
      const [outH, outM] = record.check_out.split(':').map(Number);

      let actual_hours = (outH + outM / 60) - (inH + inM / 60);
      
      if (actual_hours < 0) actual_hours += 24;

      const overtime_hours = Math.max(0, actual_hours - shift_hours);
      const overtime_pay = overtime_hours * hourly_rate;

      // Check if manual override exists
      const { data: existingLog } = await supabase
        .from('overtime_logs')
        .select('*')
        .eq('staff_id', staff_id)
        .eq('date', record.date)
        .single();

      let logData = {
        staff_id,
        date: record.date,
        check_in: record.check_in,
        check_out: record.check_out,
        shift_hours,
        actual_hours: Number(actual_hours.toFixed(2)),
        overtime_hours: Number(overtime_hours.toFixed(2)),
        hourly_rate,
        overtime_pay: Number(overtime_pay.toFixed(2)),
        updated_at: new Date().toISOString()
      };

      if (existingLog && existingLog.manual_override) {
        total_ot_hours += Number(existingLog.manual_overtime_hours || 0);
        total_ot_pay += Number(existingLog.manual_overtime_pay || 0);
        overtime_records.push(existingLog);
      } else {
        const { data: savedLog, error: logError } = await supabase
          .from('overtime_logs')
          .upsert(logData, { onConflict: 'staff_id, date' })
          .select()
          .single();

        if (logError) console.error('Error saving OT log:', logError);
        
        total_ot_hours += logData.overtime_hours;
        total_ot_pay += logData.overtime_pay;
        overtime_records.push(savedLog || logData);
      }
    }

    // 4. Update staff monthly totals
    const { error: updateError } = await supabase
      .from('staff')
      .update({
        overtime_hours_month: Number(total_ot_hours.toFixed(2)),
        overtime_pay_month: Number(total_ot_pay.toFixed(2))
      })
      .eq('id', staff_id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      overtime_records,
      total_hours: Number(total_ot_hours.toFixed(2)),
      total_pay: Number(total_ot_pay.toFixed(2))
    });

  } catch (error) {
    console.error('Overtime calculation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import * as XLSX from 'xlsx';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    let imported_count = 0;
    const staff_ids = new Set();
    const months_years = new Set();

    for (const row of data) {
      const { staff_id, date, check_in, check_out } = row;

      if (!staff_id || !date) continue;

      const { error: attendanceError } = await supabase
        .from('attendance')
        .upsert({
          staff_id,
          date,
          check_in,
          check_out,
          status: 'present'
        }, { onConflict: 'staff_id, date' });

      if (!attendanceError) {
        imported_count++;
        staff_ids.add(staff_id);
        
        const d = new Date(date);
        months_years.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
      } else {
        console.error('Error importing attendance row:', attendanceError);
      }
    }

    let calculated_count = 0;
    for (const staff_id of staff_ids) {
      for (const my of months_years) {
        const [year, month] = my.split('-').map(Number);
        
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        try {
          await fetch(`${baseUrl}/api/admin/overtime/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staff_id, month, year })
          });
          calculated_count++;
        } catch (e) {
          console.error(`Calculation failed for ${staff_id} ${my}:`, e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported_count,
      calculated_count
    });

  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

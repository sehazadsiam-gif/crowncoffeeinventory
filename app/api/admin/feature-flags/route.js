import { supabase, supabaseAdmin } from '../../../../lib/supabase'

const DEFAULT_FLAGS = {
  inventory_manager: true,
  stock_import: true,
  stock_audit: true,
  menu_list: true,
  menu_import: true,
  menu_engineering: true,
  recipebook: true,
  bazar: true,
  balance_sheet: true,
  waste: true,
  sales_audit: true,
  feedbacks: true,
  checklist: true,
  staff_directory: true,
  attendance_live: true,
  attendance_public: true,
  attendance_reports: true,
  leave_requests: true,
  payroll: true,
  advances: true,
  service_charge: true,
  tasks: true,
  overtime: true,
  members: true,
  pos: true
}

export async function GET(request) {
  try {
    const client = supabaseAdmin || supabase
    const { data, error } = await client
      .from('system_settings')
      .select('value')
      .eq('key', 'feature_flags')
      .single()

    if (error || !data) {
      return Response.json({ success: true, data: DEFAULT_FLAGS })
    }

    // Merge fetched flags with default flags in case new keys are added
    const mergedFlags = { ...DEFAULT_FLAGS, ...(data.value || {}) }
    return Response.json({ success: true, data: mergedFlags })
  } catch (err) {
    console.error('Error fetching feature flags:', err)
    return Response.json({ success: true, data: DEFAULT_FLAGS })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { flags } = body

    if (!flags || typeof flags !== 'object') {
      return Response.json({ success: false, error: 'Flags object is required.' }, { status: 400 })
    }

    const client = supabaseAdmin || supabase
    const { data, error } = await client
      .from('system_settings')
      .upsert(
        {
          key: 'feature_flags',
          value: flags,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'key' }
      )
      .select()

    if (error) {
      console.error('Supabase error saving feature flags:', error)
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, data: flags })
  } catch (err) {
    console.error('Error saving feature flags:', err)
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}

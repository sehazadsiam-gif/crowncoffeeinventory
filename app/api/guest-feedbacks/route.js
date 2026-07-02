import { supabase } from '../../../lib/supabase'

export async function POST(request) {
  try {
    const { rating, highlights, suggestion, phone, submitted_at } = await request.json()

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return Response.json({ error: 'Valid rating (1-5) is required.' }, { status: 400 })
    }
    if (!phone || phone.trim() === '') {
      return Response.json({ error: 'Phone number is required.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('guest_feedbacks')
      .insert([
        {
          rating: parseInt(rating),
          highlights: highlights || [],
          suggestion: suggestion || '',
          phone: phone.trim(),
          created_at: submitted_at || new Date().toISOString()
        }
      ])
      .select()

    if (error) throw error

    return Response.json({ success: true, data })
  } catch (error) {
    console.error('Guest feedback submission error:', error)
    return Response.json({ error: 'Failed to submit feedback. Please try again.' }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { data, error } = await supabase
      .from('guest_feedbacks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return Response.json({ success: true, data })
  } catch (error) {
    console.error('Fetch guest feedbacks error:', error)
    return Response.json({ error: 'Failed to fetch feedbacks.' }, { status: 500 })
  }
}

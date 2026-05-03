import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const visit_id = searchParams.get('visit_id')
    const rating = parseInt(searchParams.get('rating'))

    if (!visit_id || isNaN(rating) || rating < 1 || rating > 5) {
      return new NextResponse('Invalid feedback request', { status: 400 })
    }

    // Get member_id from visit
    const { data: visit } = await supabase
      .from('member_visits')
      .select('member_id')
      .eq('id', visit_id)
      .single()

    if (visit) {
      await supabase.from('member_feedback').insert([{
        member_id: visit.member_id,
        visit_id,
        rating
      }])
    }

    return new NextResponse(`
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ধন্যবাদ — ক্রাউন কফি</title>
        <style>
          body { font-family: sans-serif; background: #FAF7F2; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; max-width: 400px; width: 90%; }
          h1 { color: #6B3A2A; margin-bottom: 16px; }
          p { color: #64748B; font-size: 16px; line-height: 1.6; }
          .logo { width: 60px; height: 60px; background: #6B3A2A; color: #C9943A; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-weight: 800; font-size: 24px; border: 2px solid #C9943A; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">CC</div>
          <h1>ধন্যবাদ!</h1>
          <p>আপনার মূল্যবান মতামত আমাদের সেবার মান উন্নত করতে সাহায্য করবে।</p>
          <p>ক্রাউন কফির সাথেই থাকুন।</p>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  } catch (error) {
    console.error('Feedback API error:', error)
    return new NextResponse('Error processing feedback', { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabaseAdmin } from '../../../../lib/supabase'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request) {
  try {
    const body = await request.json()
    const { week_start, custom_rules } = body

    if (!week_start) {
      return NextResponse.json({ error: 'week_start is required' }, { status: 400 })
    }

    // 1. Fetch active staff directory
    const { data: staffList, error: staffErr } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, designation, department, weekly_off')
      .eq('is_active', true)
      .order('serial', { ascending: true })

    if (staffErr) throw staffErr

    if (!staffList || staffList.length === 0) {
      return NextResponse.json({ error: 'No active staff found to roster' }, { status: 400 })
    }

    // 2. Compute the 7 dates from Saturday to Friday
    const days = get7Days(week_start)

    // 3. Format Staff Information for AI
    const staffPromptData = staffList.map(s => ({
      id: s.id,
      name: s.name,
      designation: s.designation || 'Staff',
      department: s.department || 'Front',
      default_off: s.weekly_off || 'Friday'
    }))

    // 4. Construct AI Prompt
    const prompt = `
You are the expert Crown Coffee Duty Roster AI Planner.
Your job is to generate an optimal weekly duty roster for a café operating Saturday to Friday (7 days).

### INPUT DATA:
1. Week Dates (Saturday to Friday): ${JSON.stringify(days)}
2. Active Staff Directory (${staffList.length} members):
${JSON.stringify(staffPromptData, null, 2)}

3. ADMIN CUSTOM TRAINING RULES / PREFERENCES:
"${custom_rules || 'Ensure each staff member gets 1 day off per week (preferably Friday or as specified). Maintain balanced staff coverage across Morning (8:00 AM), Mid (11:00 AM), and Evening (1:00 PM) shifts.'}"

### SHIFT RULES & OPTIONS:
Each cell in the roster MUST be exactly ONE of the following 4 options:
- "08:00"  (Morning Shift: 8:00 AM)
- "11:00"  (Mid Shift: 11:00 AM)
- "13:00"  (Evening Shift: 1:00 PM)
- "OFF"    (Day Off)

### MANDATORY SCHEDULING CONSTRAINTS:
1. Every staff member MUST get at least 1 "OFF" day during the 7-day week (Saturday through Friday).
2. Do not schedule ALL kitchen staff or ALL front staff on "OFF" on the same day. Spread day offs evenly across the week.
3. Adhere strictly to the ADMIN CUSTOM TRAINING RULES provided above.

### OUTPUT JSON SCHEMA REQUIREMENT:
Respond ONLY with a valid JSON object matching this exact schema:
{
  "reasoning": "A concise, professional 2-3 sentence summary explaining how you assigned shifts and satisfied the training rules.",
  "draft": {
    "STAFF_UUID_HERE": {
      "YYYY-MM-DD": "08:00" | "11:00" | "13:00" | "OFF"
    }
  }
}
`

    let aiResponseText = ''

    if (process.env.GEMINI_API_KEY) {
      const candidateModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp']
      let geminiSuccess = false

      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: 'application/json' }
          })
          const result = await model.generateContent(prompt)
          aiResponseText = result.response.text()
          geminiSuccess = true
          break
        } catch (geminiErr) {
          console.warn(`[Roster AI] Gemini model ${modelName} failed/503:`, geminiErr.message)
        }
      }

      if (!geminiSuccess) {
        console.warn('[Roster AI] All Gemini models failed, trying Anthropic Claude fallback...')
        if (process.env.ANTHROPIC_API_KEY) {
          aiResponseText = await callAnthropicFallback(prompt)
        } else {
          throw new Error('Gemini API is currently busy (503). Please try again in a few seconds.')
        }
      }
    } else if (process.env.ANTHROPIC_API_KEY) {
      aiResponseText = await callAnthropicFallback(prompt)
    } else {
      throw new Error('Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY is configured.')
    }

    // Clean and parse response JSON
    let cleanJson = aiResponseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsedData = JSON.parse(cleanJson)

    return NextResponse.json({
      success: true,
      reasoning: parsedData.reasoning || 'AI Roster generated based on trained preferences.',
      draft: parsedData.draft || {}
    })

  } catch (err) {
    console.error('[POST /api/roster/ai-assistant]', err)
    return NextResponse.json({ error: err.message || 'AI Roster generation failed' }, { status: 500 })
  }
}

async function callAnthropicFallback(prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || 'Anthropic API failed')

  return data.content[0]?.text || ''
}

function get7Days(saturdayStr) {
  const list = []
  const start = new Date(saturdayStr)
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    list.push(d.toISOString().split('T')[0])
  }
  return list
}

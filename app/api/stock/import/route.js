import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseDocumentWithGemini } from '../../../../lib/gemini'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(req) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const mode = formData.get('mode') || 'add' // 'add' or 'overwrite'

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const mimeType = file.type || 'application/pdf'

    // Define response schema for Gemini
    const responseSchema = {
      type: 'object',
      properties: {
        ingredients: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Name of the ingredient/item' },
              quantity: { type: 'number', description: 'Current stock count or weight' },
              unit: { type: 'string', description: 'Standardized unit like gm, ml, pcs, kg, liter, packet' }
            },
            required: ['name', 'quantity', 'unit']
          }
        }
      },
      required: ['ingredients']
    }

    const prompt = `
      You are an expert inventory assistant. 
      Analyze the attached inventory sheet (which is either a PDF or text file).
      Extract every ingredient/kitchen item along with its current stock quantity and unit.
      Standardize the unit to one of the following: "gm", "ml", "pcs", "kg", "liter", "packet".
      Ensure ingredient names are clear and descriptive (e.g. "Espresso Beans" instead of "Esp. Beans" if clear from context).
    `

    const parsedData = await parseDocumentWithGemini(bytes, mimeType, prompt, responseSchema)
    const extractedIngredients = parsedData.ingredients || []

    return NextResponse.json({
      success: true,
      ingredients: extractedIngredients
    })
  } catch (error) {
    console.error('Stock import parse error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Separate endpoint to confirm and save the imported stock
export async function PUT(req) {
  try {
    const { ingredients, mode } = await req.json()
    if (!ingredients || !Array.isArray(ingredients)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    let updatedCount = 0
    let createdCount = 0

    for (const item of ingredients) {
      // Find case-insensitively
      const { data: existing, error: fetchError } = await supabase
        .from('ingredients')
        .select('*')
        .ilike('name', item.name)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

      if (existing) {
        let newStock = mode === 'overwrite' ? item.quantity : (parseFloat(existing.current_stock || 0) + item.quantity)
        
        const { error: updateError } = await supabase
          .from('ingredients')
          .update({ current_stock: newStock })
          .eq('id', existing.id)

        if (updateError) throw updateError

        // Log stock movement
        await supabase.from('stock_movements').insert({
          ingredient_id: existing.id,
          movement_type: mode === 'overwrite' ? 'manual_adjust' : 'bazar_in',
          quantity: mode === 'overwrite' ? (item.quantity - existing.current_stock) : item.quantity,
          notes: `Bulk imported stock via file (${mode} mode)`
        })

        updatedCount++
      } else {
        const { data: newIng, error: insertError } = await supabase
          .from('ingredients')
          .insert({
            name: item.name,
            current_stock: item.quantity,
            unit: item.unit
          })
          .select('id')
          .single()

        if (insertError) throw insertError

        await supabase.from('stock_movements').insert({
          ingredient_id: newIng.id,
          movement_type: 'manual_adjust',
          quantity: item.quantity,
          notes: `Bulk imported new stock item via file`
        })

        createdCount++
      }
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      created: createdCount
    })
  } catch (error) {
    console.error('Stock import save error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

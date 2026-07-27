import { supabase, supabaseAdmin } from '../../../lib/supabase'

// GET all recipes
export async function GET(request) {
  try {
    const client = supabaseAdmin || supabase
    const { data, error } = await client
      .from('recipe_book')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error fetching recipe_book:', error)
      return Response.json({ success: false, error: error.message, data: [] }, { status: 500 })
    }

    return Response.json({ success: true, data: data || [] })
  } catch (error) {
    console.error('Error fetching recipe_book:', error)
    return Response.json({ success: false, error: error.message, data: [] }, { status: 500 })
  }
}

// POST create new recipe
export async function POST(request) {
  try {
    const body = await request.json()
    const { title, category, paragraph, image_url, sort_order } = body

    if (!title || !title.trim()) {
      return Response.json({ success: false, error: 'Item name / title is required.' }, { status: 400 })
    }
    if (!paragraph || !paragraph.trim()) {
      return Response.json({ success: false, error: 'Paragraph / Recipe description is required.' }, { status: 400 })
    }

    const client = supabaseAdmin || supabase
    const { data, error } = await client
      .from('recipe_book')
      .insert([
        {
          title: title.trim(),
          category: (category && category.trim()) || 'General',
          paragraph: paragraph.trim(),
          image_url: image_url || null,
          sort_order: typeof sort_order === 'number' ? sort_order : 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      console.error('Supabase error inserting into recipe_book:', error)
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, data: data[0] })
  } catch (error) {
    console.error('Error creating recipe:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PUT update existing recipe
export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, title, category, paragraph, image_url, sort_order } = body

    if (!id) {
      return Response.json({ success: false, error: 'Recipe ID is required.' }, { status: 400 })
    }
    if (!title || !title.trim()) {
      return Response.json({ success: false, error: 'Item name / title is required.' }, { status: 400 })
    }
    if (!paragraph || !paragraph.trim()) {
      return Response.json({ success: false, error: 'Paragraph / Recipe description is required.' }, { status: 400 })
    }

    const client = supabaseAdmin || supabase
    const { data, error } = await client
      .from('recipe_book')
      .update({
        title: title.trim(),
        category: (category && category.trim()) || 'General',
        paragraph: paragraph.trim(),
        image_url: image_url || null,
        sort_order: typeof sort_order === 'number' ? sort_order : 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('Supabase error updating recipe_book:', error)
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, data: data[0] })
  } catch (error) {
    console.error('Error updating recipe:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE remove recipe
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return Response.json({ success: false, error: 'Recipe ID is required.' }, { status: 400 })
    }

    const client = supabaseAdmin || supabase
    const { error } = await client
      .from('recipe_book')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Supabase error deleting from recipe_book:', error)
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error deleting recipe:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

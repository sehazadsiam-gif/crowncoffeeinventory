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

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const mimeType = file.type || 'application/pdf'

    // Define response schema for recipes
    const responseSchema = {
      type: 'object',
      properties: {
        menu_items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Name of the menu item' },
              category: { type: 'string', description: 'Category of the menu item (e.g., Coffee, Tea, Food, Beverage)' },
              price: { type: 'number', description: 'Selling price of the menu item' },
              ingredients: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Name of the raw ingredient used' },
                    quantity: { type: 'number', description: 'Quantity required for one serving of this menu item' },
                    unit: { type: 'string', description: 'Standard unit (e.g., gm, ml, pcs, kg, liter)' }
                  },
                  required: ['name', 'quantity', 'unit']
                }
              }
            },
            required: ['name', 'category', 'price', 'ingredients']
          }
        }
      },
      required: ['menu_items']
    }

    const prompt = `
      You are an expert recipe and menu compiler for a premium coffee shop.
      Analyze the attached document (PDF, CSV, or Text) which lists menu items and their recipes.
      For each menu item, extract:
      1. Item Name
      2. Category (standardize to "Coffee", "Tea", "Food", "Beverage" or "Other")
      3. Selling Price
      4. A list of ingredients needed to prepare one single serving of this item.
      For each ingredient, specify its name, the quantity required, and the unit.
      Standardize units to "gm" (grams), "ml" (milliliters), "pcs" (pieces), "kg" (kilograms), or "liter" (liters).
    `

    const parsedData = await parseDocumentWithGemini(bytes, mimeType, prompt, responseSchema)
    const menuItems = parsedData.menu_items || []

    return NextResponse.json({
      success: true,
      menu_items: menuItems
    })
  } catch (error) {
    console.error('Menu/Recipe import parse error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT handler to confirm and save the recipes/menu items
export async function PUT(req) {
  try {
    const { menu_items } = await req.json()
    if (!menu_items || !Array.isArray(menu_items)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    let itemsCount = 0
    let recipesCount = 0

    for (const itemData of menu_items) {
      // 1. Get or Create Menu Item
      let { data: menuItem, error: fetchError } = await supabase
        .from('menu_items')
        .select('id')
        .ilike('name', itemData.name)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

      let menuItemId
      if (menuItem) {
        menuItemId = menuItem.id
        // Update price & category
        await supabase.from('menu_items').update({
          category: itemData.category,
          selling_price: itemData.price,
          is_active: true
        }).eq('id', menuItemId)
      } else {
        const { data: newItem, error: insertError } = await supabase
          .from('menu_items')
          .insert({
            name: itemData.name,
            category: itemData.category,
            selling_price: itemData.price,
            is_active: true
          })
          .select('id')
          .single()
        if (insertError) throw insertError
        menuItemId = newItem.id
        itemsCount++
      }

      // 2. Clear old recipe mappings
      await supabase.from('recipes').delete().eq('menu_item_id', menuItemId)

      // 3. Process Ingredients & Recipes
      for (const ing of itemData.ingredients) {
        // Find existing ingredient case-insensitively
        let { data: ingredient, error: ingError } = await supabase
          .from('ingredients')
          .select('id')
          .ilike('name', ing.name)
          .single()

        if (ingError && ingError.code !== 'PGRST116') throw ingError

        let ingredientId
        if (ingredient) {
          ingredientId = ingredient.id
        } else {
          // Create new ingredient if it doesn't exist
          const { data: newIng, error: ingInsertError } = await supabase
            .from('ingredients')
            .insert({
              name: ing.name,
              unit: ing.unit,
              current_stock: 0
            })
            .select('id')
            .single()
          if (ingInsertError) throw ingInsertError
          ingredientId = newIng.id
        }

        // Insert Recipe Link
        const { error: recipeError } = await supabase
          .from('recipes')
          .insert({
            menu_item_id: menuItemId,
            ingredient_id: ingredientId,
            quantity: ing.quantity
          })

        if (!recipeError) {
          recipesCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      items: itemsCount,
      recipes: recipesCount
    })
  } catch (error) {
    console.error('Menu/Recipe import save error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

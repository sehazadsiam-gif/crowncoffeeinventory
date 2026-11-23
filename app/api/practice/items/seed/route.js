import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const SEED_ITEMS = [
  { name: 'Coffee Beans',  barcode: 'ITEM-COFFEE-BEANS',  base_unit: 'g',   pack_size: 1000, par_level: 2000  },
  { name: 'Milk',          barcode: 'ITEM-MILK',          base_unit: 'ml',  pack_size: 1000, par_level: 5000  },
  { name: 'Sugar',         barcode: 'ITEM-SUGAR',         base_unit: 'g',   pack_size: 1000, par_level: 3000  },
  { name: 'Onion',         barcode: 'ITEM-ONION',         base_unit: 'g',   pack_size: 500,  par_level: 2000  },
  { name: 'Tomato',        barcode: 'ITEM-TOMATO',        base_unit: 'g',   pack_size: 500,  par_level: 2000  },
  { name: 'Chicken',       barcode: 'ITEM-CHICKEN',       base_unit: 'g',   pack_size: 1000, par_level: 5000  },
  { name: 'Flour',         barcode: 'ITEM-FLOUR',         base_unit: 'g',   pack_size: 1000, par_level: 4000  },
  { name: 'Cooking Oil',   barcode: 'ITEM-COOKING-OIL',  base_unit: 'ml',  pack_size: 1000, par_level: 3000  },
  { name: 'Eggs',          barcode: 'ITEM-EGGS',          base_unit: 'pcs', pack_size: 12,   par_level: 24    },
  { name: 'Cheese',        barcode: 'ITEM-CHEESE',        base_unit: 'g',   pack_size: 500,  par_level: 1000  },
]

export async function POST() {
  try {
    const inserts = SEED_ITEMS.map(i => ({ ...i, active: true }))
    const { data, error } = await supabase
      .from('practice_items')
      .upsert(inserts, { onConflict: 'barcode', ignoreDuplicates: true })
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ seeded: data?.length || 0 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

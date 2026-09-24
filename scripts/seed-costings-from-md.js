// Script to parse Costings (1).md and populate recipes in Supabase
// Run with: node scripts/seed-costings-from-md.js

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const MD_PATH = '/Users/macbookm1/Downloads/Costings (1).md';

// Normalize unit to match database check constraint: ('g','kg','L','ml','piece','bottle')
function normalizeUnit(rawUnit) {
  if (!rawUnit) return { unit: 'piece', price_basis_unit: 'per piece' };
  const u = rawUnit.trim().toLowerCase();
  if (u === 'gm' || u === 'g' || u === 'gram' || u === 'grams') {
    return { unit: 'g', price_basis_unit: 'per g' };
  }
  if (u === 'kg') {
    return { unit: 'kg', price_basis_unit: 'per kg' };
  }
  if (u === 'ml') {
    return { unit: 'ml', price_basis_unit: 'per ml' };
  }
  if (u === 'l' || u === 'ltr' || u === 'liter' || u === 'litre') {
    return { unit: 'L', price_basis_unit: 'per L' };
  }
  if (u === 'pcs' || u === 'pc' || u === 'piece' || u === 'pieces' || u === 'pk') {
    return { unit: 'piece', price_basis_unit: 'per piece' };
  }
  if (u === 'bottle' || u === 'btl') {
    return { unit: 'bottle', price_basis_unit: 'per bottle' };
  }
  return { unit: 'piece', price_basis_unit: 'per piece' };
}

function parseMarkdownCostings(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const items = [];
  let currentItem = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Header format: ### **1\. French Fries** or ### **59 & 60\. Orange Juice**
    const headerMatch = line.match(/^###\s*\*\*([^\*]+)\*\*/);
    if (headerMatch) {
      if (currentItem) items.push(currentItem);
      const title = headerMatch[1].replace(/\\/g, '').trim();
      const dotIdx = title.indexOf('.');
      let num = '';
      let name = title;
      if (dotIdx !== -1) {
        num = title.substring(0, dotIdx).trim();
        name = title.substring(dotIdx + 1).trim();
      }
      currentItem = {
        rawTitle: title,
        num,
        name,
        rows: []
      };
      continue;
    }

    if (currentItem && line.startsWith('|') && !line.includes('---') && !line.toLowerCase().includes('inventory item name')) {
      const parts = line.split('|').map(p => p.trim());
      const cells = parts.slice(1, -1);
      if (cells.length >= 5) {
        const ingredientRaw = cells[0].replace(/\\/g, '').trim();
        let qtyRaw = parseFloat(cells[1].replace(/,/g, '')) || 0;
        const unitRaw = cells[2].trim();
        let priceRaw = parseFloat(cells[3].replace(/,/g, '')) || 0;
        let totalRaw = parseFloat(cells[4].replace(/,/g, '')) || 0;

        // Corrections for detected typos in source document:
        if (currentItem.name === 'French Fries' && ingredientRaw === 'French Fries' && qtyRaw === 1600) {
          // 1600gm with total 60 @ 0.40/g -> clearly 150 gm (150 * 0.40 = 60.00)
          qtyRaw = 150;
        }
        if (currentItem.name === 'Fried Sesame Dory' && ingredientRaw === 'White Sesame Seed' && qtyRaw === 10 && totalRaw === 6.75) {
          // 15gm @ 0.45/g = 6.75
          qtyRaw = 15;
        }

        const { unit, price_basis_unit } = normalizeUnit(unitRaw);
        const line_cost = Math.round((qtyRaw * priceRaw + Number.EPSILON) * 10000) / 10000;

        currentItem.rows.push({
          ingredient_name: ingredientRaw,
          quantity: qtyRaw,
          unit,
          price: priceRaw,
          price_basis_unit,
          line_cost
        });
      }
    }
  }
  if (currentItem) items.push(currentItem);
  return items;
}

async function main() {
  console.log('🚀 Starting recipe ingestion from Costings (1).md...\n');

  const parsedItems = parseMarkdownCostings(MD_PATH);
  console.log(`Parsed ${parsedItems.length} recipe blocks from markdown.`);

  // 1. Fetch existing menu items
  const { data: existingItems, error: itemsErr } = await supabase
    .from('costing_menu_items')
    .select('id, name, category, current_cogs');
  if (itemsErr) throw itemsErr;

  const itemMap = new Map();
  existingItems.forEach(item => {
    itemMap.set(item.name.toLowerCase().trim(), item);
  });

  // Helper to ensure an item exists in costing_menu_items
  async function ensureMenuItem(name, category = 'Food') {
    const key = name.toLowerCase().trim();
    if (itemMap.has(key)) {
      return itemMap.get(key);
    }
    console.log(`➕ Creating missing menu item: "${name}" (${category})`);
    const { data, error } = await supabase
      .from('costing_menu_items')
      .insert({ name, category, is_active: true, current_cogs: 0 })
      .select('id, name, category, current_cogs')
      .single();
    if (error) throw error;
    itemMap.set(key, data);
    return data;
  }

  // 2. Ensure specific variant items exist
  await ensureMenuItem('BBQ Chicken Pizza (9")', 'Pizza');
  await ensureMenuItem('BBQ Chicken Pizza (12")', 'Pizza');
  await ensureMenuItem('Beef Bolognese Pizza (9")', 'Pizza');
  await ensureMenuItem('Beef Bolognese Pizza (12")', 'Pizza');
  await ensureMenuItem('CC Special Four Seasons (12")', 'Pizza');
  await ensureMenuItem('Espresso (Dine-In)', 'Coffee');
  await ensureMenuItem('Espresso (Takeaway)', 'Coffee');

  // Also ensure the base pizza items have recipes linked or synced:
  // If base exists, we will update it or keep it

  // 3. Upsert all ingredients into costing_ingredients master list
  const allIngredientNames = new Set();
  parsedItems.forEach(item => {
    item.rows.forEach(r => {
      if (r.ingredient_name) allIngredientNames.add(r.ingredient_name.trim());
    });
  });

  console.log(`\n📦 Registering ${allIngredientNames.size} distinct master ingredients in costing_ingredients...`);
  const ingredientNameArray = Array.from(allIngredientNames);
  
  // Upsert in batches of 50
  for (let i = 0; i < ingredientNameArray.length; i += 50) {
    const batch = ingredientNameArray.slice(i, i + 50).map(name => ({ name }));
    const { error: ingErr } = await supabase
      .from('costing_ingredients')
      .upsert(batch, { onConflict: 'name' });
    if (ingErr) {
      console.warn('Warning during ingredient upsert:', ingErr.message);
    }
  }

  // Fetch all ingredients for ID lookup
  const { data: allIngsDb } = await supabase.from('costing_ingredients').select('id, name');
  const ingredientIdMap = new Map();
  if (allIngsDb) {
    allIngsDb.forEach(ing => {
      ingredientIdMap.set(ing.name.toLowerCase().trim(), ing.id);
    });
  }

  // 4. Match and save each recipe
  console.log('\n🍳 Inserting recipes and calculating COGS for all items...');
  let successCount = 0;

  for (const recipe of parsedItems) {
    let targetName = recipe.name.trim();

    // Map special titles
    if (targetName === 'Caramel') {
      targetName = 'Caramel Syrup';
    } else if (recipe.rawTitle.includes('BBQ Chicken Pizza (9")')) {
      targetName = 'BBQ Chicken Pizza (9")';
    } else if (recipe.rawTitle.includes('BBQ Chicken Pizza (12")')) {
      targetName = 'BBQ Chicken Pizza (12")';
    } else if (recipe.rawTitle.includes('Beef Bolognese Pizza (12")')) {
      targetName = 'Beef Bolognese Pizza (12")';
    } else if (recipe.rawTitle.includes('Beef Bolognese Pizza (9")')) {
      targetName = 'Beef Bolognese Pizza (9")';
    } else if (recipe.rawTitle.includes('CC Special Four Seasons (12")')) {
      targetName = 'CC Special Four Seasons (12")';
    } else if (targetName.includes('Espresso (Dine-In)')) {
      targetName = 'Espresso (Dine-In)';
    } else if (targetName.includes('Espresso (Takeaway)')) {
      targetName = 'Espresso (Takeaway)';
    }

    // Lookup menu item
    let menuItem = itemMap.get(targetName.toLowerCase().trim());
    if (!menuItem) {
      // Try fuzzy search
      const normTarget = targetName.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const [k, v] of itemMap.entries()) {
        const normK = k.replace(/[^a-z0-9]/g, '');
        if (normK === normTarget || normK.includes(normTarget) || normTarget.includes(normK)) {
          menuItem = v;
          break;
        }
      }
    }

    if (!menuItem) {
      console.warn(`⚠️ Could not find or map menu item for "${recipe.name}" (num: ${recipe.num})`);
      continue;
    }

    // Build ingredient rows
    const rowsToInsert = recipe.rows.map((row, idx) => {
      const ingId = ingredientIdMap.get(row.ingredient_name.toLowerCase().trim()) || null;
      return {
        menu_item_id: menuItem.id,
        ingredient_id: ingId,
        ingredient_name: row.ingredient_name,
        quantity: row.quantity,
        unit: row.unit,
        price: row.price,
        price_basis_unit: row.price_basis_unit,
        line_cost: row.line_cost,
        sort_order: idx
      };
    });

    const totalCogs = rowsToInsert.reduce((sum, r) => sum + (r.line_cost || 0), 0);
    const roundedCogs = Math.round((totalCogs + Number.EPSILON) * 10000) / 10000;

    // Delete existing rows for this item
    await supabase.from('costing_item_ingredients').delete().eq('menu_item_id', menuItem.id);

    // Insert new rows
    const { error: insErr } = await supabase.from('costing_item_ingredients').insert(rowsToInsert);
    if (insErr) {
      console.error(`❌ Error inserting ingredients for ${menuItem.name}:`, insErr.message);
      continue;
    }

    // Update current_cogs on costing_menu_items
    await supabase.from('costing_menu_items').update({
      current_cogs: roundedCogs,
      updated_at: new Date().toISOString()
    }).eq('id', menuItem.id);

    // Log to costing_cogs_history
    await supabase.from('costing_cogs_history').insert({
      menu_item_id: menuItem.id,
      total_cogs: roundedCogs,
      snapshot: rowsToInsert.map(r => ({
        ingredient_name: r.ingredient_name,
        quantity: r.quantity,
        unit: r.unit,
        price: r.price,
        price_basis_unit: r.price_basis_unit,
        line_cost: r.line_cost
      }))
    });

    // If this is BBQ Chicken Pizza (12") or (9"), or Espresso (Dine-In), also update the base item if it has no ingredients
    if (targetName === 'BBQ Chicken Pizza (12")') {
      const baseItem = itemMap.get('bbq chicken pizza');
      if (baseItem) {
        await supabase.from('costing_menu_items').update({ current_cogs: roundedCogs }).eq('id', baseItem.id);
      }
    } else if (targetName === 'Beef Bolognese Pizza (12")') {
      const baseItem = itemMap.get('beef bolognese pizza');
      if (baseItem) {
        await supabase.from('costing_menu_items').update({ current_cogs: roundedCogs }).eq('id', baseItem.id);
      }
    } else if (targetName === 'CC Special Four Seasons (12")') {
      const baseItem = itemMap.get('cc special four seasons');
      if (baseItem) {
        await supabase.from('costing_menu_items').update({ current_cogs: roundedCogs }).eq('id', baseItem.id);
      }
    } else if (targetName === 'Espresso (Dine-In)') {
      const baseItem = itemMap.get('espresso');
      if (baseItem) {
        await supabase.from('costing_menu_items').update({ current_cogs: roundedCogs }).eq('id', baseItem.id);
      }
    }

    successCount++;
    console.log(`✅ [${recipe.num}] ${menuItem.name}: ${rowsToInsert.length} ingredients | COGS: ৳${roundedCogs.toFixed(2)}`);
  }

  console.log(`\n🎉 Ingestion complete! Successfully updated ${successCount} recipes.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

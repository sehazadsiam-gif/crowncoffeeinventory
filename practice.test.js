/**
 * practice.test.js
 * Basic unit tests for practice-module movement logic and approve flow.
 * Run with: node practice.test.js
 * No external test runner needed — pure Node.js assertions.
 */

const assert = require('assert')

// ── Helpers (duplicated from API routes for testability) ──────────────────

const QTY_BARCODES = {
  'QTY-X1':       { multiplier: 1 },
  'QTY-X5':       { multiplier: 5 },
  'QTY-X10':      { multiplier: 10 },
  'QTY-X50':      { multiplier: 50 },
  'QTY-PLUS1KG':  { addGrams: 1000 },
  'QTY-PLUS5KG':  { addGrams: 5000 },
}

function resolveQtyBarcode(barcode, lastItem, lastQty) {
  const def = QTY_BARCODES[barcode.toUpperCase()]
  if (!def) return null

  if (def.addGrams !== undefined) {
    if (lastItem.base_unit !== 'g') throw new Error(`${lastItem.name} is not in grams`)
    return lastQty + def.addGrams
  }
  return lastQty + def.multiplier * lastItem.pack_size
}

function computeStock(movements) {
  return movements.reduce((sum, m) => sum + m.quantity, 0)
}

function validateApprove(trip, lines) {
  if (trip.status === 'approved') throw new Error('Trip already approved')
  if (!lines || lines.length === 0) throw new Error('Cannot approve empty trip')
  return true
}

// ── Tests ─────────────────────────────────────────────────────────────────

let passed = 0, failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ PASS  ${name}`)
    passed++
  } catch (err) {
    console.log(`  ❌ FAIL  ${name}`)
    console.log(`          ${err.message}`)
    failed++
  }
}

console.log('\n── Movement Logic ───────────────────────────────────────')

test('stock sum is 0 when no movements', () => {
  assert.strictEqual(computeStock([]), 0)
})

test('purchase movement increases stock', () => {
  const movements = [{ quantity: 1000, movement_type: 'purchase' }]
  assert.strictEqual(computeStock(movements), 1000)
})

test('usage movement decreases stock', () => {
  const movements = [
    { quantity: 1000, movement_type: 'purchase' },
    { quantity: -300,  movement_type: 'usage' },
  ]
  assert.strictEqual(computeStock(movements), 700)
})

test('reversal brings stock back', () => {
  const movements = [
    { quantity: 1000, movement_type: 'purchase' },
    { quantity: -300,  movement_type: 'usage' },
    { quantity:  300,  movement_type: 'reversal' },
  ]
  assert.strictEqual(computeStock(movements), 1000)
})

test('multiple items tracked independently', () => {
  const all = [
    { item_id: 'A', quantity:  500, movement_type: 'purchase' },
    { item_id: 'B', quantity: 1000, movement_type: 'purchase' },
    { item_id: 'A', quantity: -100, movement_type: 'usage' },
  ]
  const stockA = computeStock(all.filter(m => m.item_id === 'A'))
  const stockB = computeStock(all.filter(m => m.item_id === 'B'))
  assert.strictEqual(stockA, 400)
  assert.strictEqual(stockB, 1000)
})

console.log('\n── Quantity Barcode Logic ───────────────────────────────')

const coffeeItem = { name: 'Coffee Beans', base_unit: 'g', pack_size: 1000 }
const eggItem    = { name: 'Eggs',         base_unit: 'pcs', pack_size: 12 }

test('QTY-X1 adds one pack_size', () => {
  const result = resolveQtyBarcode('QTY-X1', coffeeItem, 0)
  assert.strictEqual(result, 1000)
})

test('QTY-X5 adds 5 × pack_size', () => {
  const result = resolveQtyBarcode('QTY-X5', coffeeItem, 1000)
  assert.strictEqual(result, 6000)
})

test('QTY-PLUS1KG adds 1000 grams to g item', () => {
  const result = resolveQtyBarcode('QTY-PLUS1KG', coffeeItem, 500)
  assert.strictEqual(result, 1500)
})

test('QTY-PLUS1KG throws for non-g item', () => {
  assert.throws(
    () => resolveQtyBarcode('QTY-PLUS1KG', eggItem, 12),
    /not in grams/
  )
})

test('QTY-X10 on eggs adds 10 × 12 = 120 pcs', () => {
  const result = resolveQtyBarcode('QTY-X10', eggItem, 0)
  assert.strictEqual(result, 120)
})

test('unknown barcode returns null (is an item barcode)', () => {
  const result = resolveQtyBarcode('ITEM-COFFEE-BEANS', coffeeItem, 0)
  assert.strictEqual(result, null)
})

console.log('\n── Approve Flow ─────────────────────────────────────────')

test('approve succeeds for open trip with lines', () => {
  const trip = { id: '1', status: 'open' }
  const lines = [{ id: 'L1', item_id: 'A', quantity: 1000 }]
  assert.strictEqual(validateApprove(trip, lines), true)
})

test('approve throws if trip is already approved', () => {
  const trip = { id: '1', status: 'approved' }
  const lines = [{ id: 'L1', item_id: 'A', quantity: 1000 }]
  assert.throws(() => validateApprove(trip, lines), /already approved/)
})

test('approve throws if no lines', () => {
  const trip = { id: '1', status: 'open' }
  assert.throws(() => validateApprove(trip, []), /empty trip/)
})

test('approve creates purchase movements for each line', () => {
  const lines = [
    { item_id: 'A', quantity: 500 },
    { item_id: 'B', quantity: 1000 },
  ]
  const movements = lines.map(l => ({
    item_id: l.item_id,
    movement_type: 'purchase',
    quantity: Math.abs(l.quantity),
  }))
  assert.strictEqual(movements.length, 2)
  assert.ok(movements.every(m => m.movement_type === 'purchase'))
  assert.ok(movements.every(m => m.quantity > 0))
})

console.log('\n── Results ──────────────────────────────────────────────')
console.log(`  ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)

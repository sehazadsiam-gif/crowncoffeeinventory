// ─────────────────────────────────────────────────────────────
// Crown Coffee — Costing Calculation Utilities
// All monetary values in BDT (৳)
// ─────────────────────────────────────────────────────────────

/**
 * Conversion factors: given quantity unit → price basis unit → scale factor
 * factor converts price from "per priceUnit" → "per quantityUnit"
 * line_cost = quantity * (price * factor)
 *
 * Example: qty=200g, price=80 per kg → factor = 0.001 → price/g = 0.08 → cost = 16
 */
export const UNIT_CONVERSION = {
  'g':      { 'per g': 1,     'per kg': 0.001 },
  'kg':     { 'per kg': 1,    'per g': 1000   },
  'ml':     { 'per ml': 1,    'per L': 0.001  },
  'L':      { 'per L': 1,     'per ml': 1000  },
  'piece':  { 'per piece': 1  },
  'bottle': { 'per bottle': 1 },
}

export const UNITS = ['g', 'kg', 'L', 'ml', 'piece', 'bottle']
export const PRICE_BASIS_UNITS = ['per g', 'per kg', 'per L', 'per ml', 'per piece', 'per bottle']

/** Compatible price basis options for a given quantity unit */
export function compatiblePriceBasisUnits(unit) {
  return Object.keys(UNIT_CONVERSION[unit] || {})
}

/**
 * Calculate the cost of a single ingredient line.
 * @returns {number|null} BDT cost, or null if units are incompatible
 */
export function calculateLineCost(quantity, unit, price, priceBasisUnit) {
  if (!quantity || !unit || !price || !priceBasisUnit) return null
  const factor = UNIT_CONVERSION[unit]?.[priceBasisUnit]
  if (factor === undefined) return null
  return parseFloat(quantity) * parseFloat(price) * factor
}

/**
 * Calculate total COGS for a menu item from its ingredient rows.
 * @param {Array} rows - [{quantity, unit, price, price_basis_unit}]
 * @returns {number}
 */
export function calculateItemCOGS(rows) {
  return rows.reduce((sum, row) => {
    const lc = calculateLineCost(row.quantity, row.unit, row.price, row.price_basis_unit ?? row.priceBasisUnit)
    return sum + (lc ?? 0)
  }, 0)
}

// ─────────────────────────────────────────────────────────────
// PRICING & MARGIN CALCULATIONS
// ─────────────────────────────────────────────────────────────

/** Contribution margin = selling price − COGS */
export function contributionMargin(sellingPrice, cogs) {
  return sellingPrice - cogs
}

/** Food cost % = (COGS / selling price) × 100 */
export function foodCostPercent(cogs, sellingPrice) {
  if (!sellingPrice) return null
  return (cogs / sellingPrice) * 100
}

/** Net margin after platform commission */
export function netMarginAfterCommission(sellingPrice, cogs, commissionPct) {
  const commissionAmt = sellingPrice * (commissionPct / 100)
  return sellingPrice - cogs - commissionAmt
}

/** Net food cost % after commission */
export function netFoodCostPctAfterCommission(cogs, sellingPrice, commissionPct) {
  const commissionAmt = sellingPrice * (commissionPct / 100)
  const netRevenue = sellingPrice - commissionAmt
  if (!netRevenue) return null
  return (cogs / netRevenue) * 100
}

/** Color class for food cost %: green < 25, yellow 25-35, red > 35 */
export function foodCostColor(pct) {
  if (pct === null || pct === undefined) return 'neutral'
  if (pct <= 33) return 'green'
  if (pct <= 40) return 'yellow'
  return 'red'
}

// ─────────────────────────────────────────────────────────────
// FIXED-COST ANCHOR PRICING & PROMO CALCULATIONS
// Selling Price = Making Cost (COGS) + Utilities Charge + Net Profit
// ─────────────────────────────────────────────────────────────

export const MULTIPLIER_PRESETS = [3.0, 2.86, 2.6, 2.5, 2.4, 2.3, 2.2, 2.1, 2.0]

/**
 * Calculate fixed-cost anchor pricing metrics.
 * Default utilities multiplier = 1.0 (equal to making cost)
 */
export function calculateFixedCostPricing(cogs, sellingPrice, utilitiesRatio = 1.0) {
  const makingCost = parseFloat(cogs) || 0
  const sp = parseFloat(sellingPrice) || 0
  const utilitiesCharge = makingCost * utilitiesRatio
  const baseCost = makingCost + utilitiesCharge

  const netProfit = sp - baseCost
  const netProfitPct = sp > 0 ? (netProfit / sp) * 100 : 0
  const foodCostPct = sp > 0 ? (makingCost / sp) * 100 : 0
  const utilitiesPct = sp > 0 ? (utilitiesCharge / sp) * 100 : 0

  // Standard 1:1:1 profit = makingCost
  const standardProfit = makingCost
  const profitSacrificed = sp > 0 ? Math.max(0, standardProfit - netProfit) : 0

  const isLoss = sp > 0 && sp < baseCost
  const isThinProfit = sp >= baseCost && netProfit < makingCost * 0.5

  return {
    makingCost,
    utilitiesCharge,
    baseCost,
    netProfit,
    netProfitPct,
    foodCostPct,
    utilitiesPct,
    profitSacrificed,
    isLoss,
    isThinProfit,
  }
}

/** Calculate selling price from target net profit */
export function calculatePriceFromTargetProfit(cogs, targetProfit, utilitiesRatio = 1.0) {
  const makingCost = parseFloat(cogs) || 0
  const utilitiesCharge = makingCost * utilitiesRatio
  const profit = parseFloat(targetProfit) || 0
  return makingCost + utilitiesCharge + profit
}

/** Calculate selling price from multiplier: (COGS + 5% VAT) * Multiplier */
export function calculateFormulaPrice(cogs, multiplier, vatPct = 5) {
  const c = parseFloat(cogs) || 0
  const m = parseFloat(multiplier) || 0
  if (!c || !m) return 0
  const vatFactor = 1 + (vatPct / 100)
  return Math.round((c * vatFactor) * m)
}

// ─────────────────────────────────────────────────────────────
// MENU ENGINEERING — SECTION B
// ─────────────────────────────────────────────────────────────

/**
 * Classify menu items using the current month's own medians.
 * @param {Array} items - [{id, name, cm, popularity}]
 * @returns {Array} items with .classification added
 */
export function classifyMenuItems(items) {
  if (!items.length) return []
  const sorted_cm  = [...items].map(i => i.cm).sort((a, b) => a - b)
  const sorted_pop = [...items].map(i => i.popularity).sort((a, b) => a - b)
  const medianCM   = median(sorted_cm)
  const medianPop  = median(sorted_pop)

  return items.map(item => ({
    ...item,
    classification: classify(item.cm, item.popularity, medianCM, medianPop),
    medianCM,
    medianPop,
  }))
}

function classify(cm, pop, medianCM, medianPop) {
  const highCM  = cm  >= medianCM
  const highPop = pop >= medianPop
  if (highCM  && highPop)  return 'High Profit, High Sale'
  if (!highCM && highPop)  return 'Low Profit, High Sale'
  if (highCM  && !highPop) return 'High Profit, Low Sale'
  return 'Low Profit, Low Sale'
}

function median(sorted) {
  const n = sorted.length
  if (!n) return 0
  const mid = Math.floor(n / 2)
  return n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export const CLASSIFICATION_ACTIONS = {
  'High Profit, High Sale': { label: 'Promote · Keep as-is',       color: '#10B981' },
  'Low Profit, High Sale':  { label: 'Raise price or reduce portion', color: '#F59E0B' },
  'High Profit, Low Sale':  { label: 'Boost visibility / rename',   color: '#3B82F6' },
  'Low Profit, Low Sale':   { label: 'Rework or drop',              color: '#EF4444' },
}

export const CLASSIFICATION_COLORS = {
  'High Profit, High Sale': '#10B981',
  'Low Profit, High Sale':  '#F59E0B',
  'High Profit, Low Sale':  '#3B82F6',
  'Low Profit, Low Sale':   '#EF4444',
}

// ─────────────────────────────────────────────────────────────
// SECTION C — BUSINESS PROFITABILITY
// ─────────────────────────────────────────────────────────────

/**
 * Compute business-level profitability for a month.
 * @param {number} totalCM   - Sum of (quantity_sold × CM) across all items
 * @param {number} totalRev  - Sum of (quantity_sold × selling_price)
 * @param {Object} fixedCosts - { rent, salaries, utilities, other_overhead }
 * @returns {Object} profitability metrics
 */
export function computeProfitability(totalCM, totalRev, fixedCosts) {
  const totalFixed = (fixedCosts.rent ?? 0)
    + (fixedCosts.salaries ?? 0)
    + (fixedCosts.utilities ?? 0)
    + (fixedCosts.other_overhead ?? 0)

  const netProfitLoss = totalCM - totalFixed
  const cmRatio       = totalRev > 0 ? totalCM / totalRev : 0
  const breakEvenRev  = cmRatio > 0 ? totalFixed / cmRatio : null
  const avgSellingPrice = null  // computed at call site if needed
  const breakEvenUnits  = null  // = breakEvenRev / avgSellingPrice (computed at call site)

  return {
    totalFixed,
    netProfitLoss,
    cmRatio,
    breakEvenRev,
  }
}

// ─────────────────────────────────────────────────────────────
// FORMATTING HELPERS
// ─────────────────────────────────────────────────────────────

const BDT = new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Format a number as BDT: ৳1,234.50 */
export function formatBDT(n) {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return '৳' + BDT.format(n)
}

/** Format a percentage: 24.5% */
export function formatPct(n, decimals = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return n.toFixed(decimals) + '%'
}

/** Round to 4 decimal places (for storage) */
export function round4(n) {
  return Math.round((n + Number.EPSILON) * 10000) / 10000
}

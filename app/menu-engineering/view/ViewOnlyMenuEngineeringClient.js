'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Coffee, Search, X, Download, Eye, Lock,
  ChevronRight, Utensils, AlertTriangle, Shield, CheckCircle
} from 'lucide-react'
import ThemeToggle from '../../../components/ThemeToggle'
import {
  calculateFixedCostPricing,
  calculateOnlineChannelMetrics,
  foodCostColor,
  formatBDT,
  formatPct
} from '../../../lib/costing-calculations'

function FCBadge({ pct }) {
  const color = foodCostColor(pct)
  const map = {
    green:   { bg: 'var(--success-bg, #D1FAE5)', text: 'var(--success, #059669)' },
    yellow:  { bg: 'var(--warning-bg, #FEF3C7)', text: 'var(--warning, #D97706)' },
    red:     { bg: 'var(--danger-bg, #FEE2E2)', text: 'var(--danger, #DC2626)' },
    neutral: { bg: 'var(--bg-subtle, #F3F4F6)', text: 'var(--text-muted, #6B7280)' }
  }
  const { bg, text } = map[color] || map.neutral
  return (
    <span style={{
      background: bg,
      color: text,
      borderRadius: 6,
      padding: '3px 8px',
      fontSize: 12,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap'
    }}>
      {formatPct(pct)}
    </span>
  )
}

export default function ViewOnlyMenuEngineeringClient({ initialItems = [], channels = [] }) {
  const [searchQuery, setSearchQuery]           = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedRecipeItem, setSelectedRecipeItem] = useState(null)

  // Extract distinct categories
  const categories = useMemo(() => {
    const set = new Set()
    initialItems.forEach(i => {
      if (i.category) set.add(i.category)
    })
    return ['ALL', ...Array.from(set).sort()]
  }, [initialItems])

  // Filter items
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return initialItems.filter(item => {
      const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory
      const matchQuery = !q || item.name.toLowerCase().includes(q) || (item.category && item.category.toLowerCase().includes(q))
      return matchCat && matchQuery
    })
  }, [initialItems, searchQuery, selectedCategory])

  // High-level metrics
  const totalItems = initialItems.length
  const itemsWithRecipes = initialItems.filter(i => i.recipe && i.recipe.length > 0).length
  const itemsWithPrices = initialItems.filter(i => i.dine_in_price > 0).length

  // Average food cost
  const avgFoodCost = useMemo(() => {
    const pricedItems = initialItems.filter(i => i.dine_in_price > 0 && i.current_cogs > 0)
    if (!pricedItems.length) return 0
    const sum = pricedItems.reduce((acc, i) => acc + ((i.current_cogs / i.dine_in_price) * 100), 0)
    return Math.round(sum / pricedItems.length)
  }, [initialItems])

  // Export CSV
  function exportCSV() {
    if (!filteredItems.length) return

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return ''
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"'
      }
      return str
    }

    const channelHeaders = []
    channels.forEach(ch => {
      channelHeaders.push(`${ch.name} Price (৳)`)
      channelHeaders.push(`${ch.name} Disc %`)
      channelHeaders.push(`${ch.name} Comm %`)
      channelHeaders.push(`${ch.name} Net Payout (৳)`)
      channelHeaders.push(`${ch.name} Profit (৳)`)
      channelHeaders.push(`${ch.name} Net FC%`)
    })

    const headers = [
      'Item Name',
      'Category',
      'Making Cost (COGS)',
      'Utilities (1:1)',
      'Base Cost',
      'Dine-In Price',
      'Net Profit (৳)',
      'Food Cost %',
      ...channelHeaders
    ]

    const csvRows = [headers.map(escapeCSV).join(',')]

    filteredItems.forEach(item => {
      const cogs = item.current_cogs || 0
      const dineIn = item.dine_in_price || 0
      const anchor = calculateFixedCostPricing(cogs, dineIn)

      const row = [
        item.name,
        item.category || '',
        cogs.toFixed(2),
        anchor.utilitiesCharge.toFixed(2),
        anchor.baseCost.toFixed(2),
        dineIn.toFixed(2),
        dineIn ? anchor.netProfit.toFixed(2) : '0.00',
        formatPct(anchor.foodCostPct)
      ]

      channels.forEach(ch => {
        const cp = item.channel_prices?.[ch.id]
        const sp = parseFloat(cp?.selling_price) || 0
        const com = parseFloat(cp?.commission_pct) || 0
        const disc = parseFloat(cp?.discount_pct) || 0
        if (sp > 0) {
          const om = calculateOnlineChannelMetrics(sp, cogs, com, disc)
          row.push(sp.toFixed(2))
          row.push(disc.toFixed(1) + '%')
          row.push(com.toFixed(1) + '%')
          row.push(om.netPayout.toFixed(2))
          row.push(om.onlineProfit.toFixed(2))
          row.push(formatPct(om.netFoodCostPct))
        } else {
          row.push('0.00', '0.0%', '0.0%', '0.00', '0.00', '0.0%')
        }
      })

      csvRows.push(row.map(escapeCSV).join(','))
    })

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `crown-coffee-menu-view-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div style={styles.page}>
      {/* Top Banner */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.brandIcon}>
            <Coffee size={24} color="#fff" />
          </div>
          <div>
            <div style={styles.brandTitleRow}>
              <h1 style={styles.brandTitle}>Crown Coffee</h1>
              <span style={styles.viewBadge}>
                <Eye size={13} /> View Only
              </span>
            </div>
            <p style={styles.brandSub}>Menu Engineering, Recipe Costings &amp; Margins</p>
          </div>
        </div>

        <div style={styles.headerRight}>
          <ThemeToggle />
          <button onClick={exportCSV} style={styles.exportBtn}>
            <Download size={14} /> Export CSV
          </button>
          <Link href="/menu-costings/login" style={styles.adminLink}>
            <Lock size={13} /> Admin Login
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main style={styles.container}>
        {/* KPI Cards */}
        <section style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Total Menu Items</div>
            <div style={styles.kpiValue}>{totalItems}</div>
            <div style={styles.kpiSub}>Active dishes &amp; beverages</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Items With Recipes</div>
            <div style={{ ...styles.kpiValue, color: 'var(--accent-brown, #7C3A1E)' }}>
              {itemsWithRecipes}
            </div>
            <div style={styles.kpiSub}>Fully costed with ingredients</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Priced Items</div>
            <div style={styles.kpiValue}>{itemsWithPrices}</div>
            <div style={styles.kpiSub}>Dine-in prices configured</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Avg Food Cost %</div>
            <div style={{ ...styles.kpiValue, color: avgFoodCost <= 33 ? 'var(--success, #059669)' : 'var(--warning, #D97706)' }}>
              {avgFoodCost}%
            </div>
            <div style={styles.kpiSub}>Across priced menu items</div>
          </div>
        </section>

        {/* Search & Filter Bar */}
        <div style={styles.filterBar}>
          <div style={styles.searchWrapper}>
            <Search size={16} style={styles.searchIcon} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by dish, drink, or category…"
              style={styles.searchInput}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={styles.clearBtn}>
                <X size={14} />
              </button>
            )}
          </div>

          <div style={styles.categoryWrap}>
            <span style={styles.filterLabel}>Category:</span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              style={styles.categorySelect}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.itemCountBadge}>
            Showing <strong>{filteredItems.length}</strong> of {totalItems} items
          </div>
        </div>

        {/* Pricing & Costings Table */}
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={{ ...styles.th, minWidth: 200 }}>Menu Item</th>
                <th style={{ ...styles.th, minWidth: 110 }}>Making Cost</th>
                <th style={{ ...styles.th, minWidth: 110 }}>Utilities (1:1)</th>
                <th style={{ ...styles.th, minWidth: 110 }}>Base Cost</th>
                <th style={{ ...styles.th, minWidth: 110 }}>Dine-In Price</th>
                <th style={{ ...styles.th, minWidth: 110 }}>Net Profit</th>
                <th style={{ ...styles.th, minWidth: 100 }}>FC% (Dine)</th>
                {channels.map(ch => (
                  <tr key={ch.id} style={{ display: 'contents' }}>
                    <th style={{ ...styles.th, minWidth: 110, background: 'var(--bg-subtle)' }}>{ch.name} Price</th>
                    <th style={{ ...styles.th, minWidth: 70, background: 'var(--bg-subtle)' }}>Disc %</th>
                    <th style={{ ...styles.th, minWidth: 70, background: 'var(--bg-subtle)' }}>Comm %</th>
                    <th style={{ ...styles.th, minWidth: 95, background: 'var(--bg-subtle)' }}>Net Payout</th>
                    <th style={{ ...styles.th, minWidth: 95, background: 'var(--bg-subtle)' }}>Online Profit</th>
                  </tr>
                ))}
                <th style={{ ...styles.th, minWidth: 90, textAlign: 'center' }}>Recipe</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8 + channels.length * 5 + 1} style={styles.emptyTd}>
                    <Search size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
                    <div style={{ fontWeight: 600, fontSize: 14 }}>No items found matching "{searchQuery}"</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Try searching for a different keyword or select "All Categories".</div>
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const cogs    = item.current_cogs || 0
                  const dineIn  = item.dine_in_price || 0
                  const anchor  = calculateFixedCostPricing(cogs, dineIn)
                  const hasRecipe = item.recipe && item.recipe.length > 0

                  return (
                    <tr key={item.id} style={styles.tr}>
                      {/* Name & Category */}
                      <td style={styles.td}>
                        <div style={styles.itemName}>{item.name}</div>
                        <div style={styles.itemCategory}>{item.category}</div>
                      </td>

                      {/* Making Cost */}
                      <td style={{ ...styles.td, fontWeight: 600 }}>
                        {formatBDT(cogs)}
                      </td>

                      {/* Utilities */}
                      <td style={{ ...styles.td, color: 'var(--text-secondary)' }}>
                        {formatBDT(anchor.utilitiesCharge)}
                      </td>

                      {/* Base Cost */}
                      <td style={{ ...styles.td, fontWeight: 700 }}>
                        {formatBDT(anchor.baseCost)}
                      </td>

                      {/* Dine-In Price */}
                      <td style={{ ...styles.td, fontWeight: 800, color: dineIn > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {dineIn > 0 ? formatBDT(dineIn) : '—'}
                      </td>

                      {/* Net Profit */}
                      <td style={{
                        ...styles.td,
                        fontWeight: 700,
                        color: dineIn === 0 ? 'var(--text-muted)' : anchor.isLoss ? 'var(--danger, #DC2626)' : 'var(--success, #059669)'
                      }}>
                        {dineIn > 0 ? (
                          <div>
                            <div>{formatBDT(anchor.netProfit)}</div>
                            {anchor.profitSacrificed > 0 && (
                              <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--warning, #D97706)' }}>
                                (-{formatBDT(anchor.profitSacrificed)} promo)
                              </div>
                            )}
                          </div>
                        ) : '—'}
                      </td>

                      {/* FC% */}
                      <td style={styles.td}>
                        {dineIn > 0 ? <FCBadge pct={anchor.foodCostPct} /> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>

                      {/* Channels */}
                      {channels.map(ch => {
                        const cp = item.channel_prices?.[ch.id]
                        const sp = parseFloat(cp?.selling_price) || 0
                        const com = parseFloat(cp?.commission_pct) || 0
                        const disc = parseFloat(cp?.discount_pct) || 0
                        const om = sp > 0 ? calculateOnlineChannelMetrics(sp, cogs, com, disc) : null

                        return (
                          <tr key={ch.id} style={{ display: 'contents' }}>
                            <td style={styles.td}>{sp > 0 ? formatBDT(sp) : '—'}</td>
                            <td style={styles.td}>{sp > 0 ? `${disc}%` : '—'}</td>
                            <td style={styles.td}>{sp > 0 ? `${com}%` : '—'}</td>
                            <td style={{ ...styles.td, fontWeight: 600 }}>{om ? formatBDT(om.netPayout) : '—'}</td>
                            <td style={{
                              ...styles.td,
                              fontWeight: 700,
                              color: om ? (om.isLoss ? 'var(--danger)' : 'var(--success)') : 'inherit'
                            }}>
                              {om ? formatBDT(om.onlineProfit) : '—'}
                            </td>
                          </tr>
                        )
                      })}

                      {/* Recipe Button */}
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedRecipeItem(item)}
                          style={{
                            ...styles.recipeBtn,
                            opacity: hasRecipe ? 1 : 0.6
                          }}
                          title={hasRecipe ? 'View ingredients breakdown' : 'No ingredients uploaded'}
                        >
                          <Utensils size={12} /> Recipe
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Recipe Modal */}
      {selectedRecipeItem && (
        <div style={styles.modalOverlay} onClick={() => setSelectedRecipeItem(null)}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={styles.modalIcon}>
                  <Utensils size={20} color="var(--accent-brown, #7C3A1E)" />
                </div>
                <div>
                  <h3 style={styles.modalTitle}>{selectedRecipeItem.name}</h3>
                  <div style={styles.modalSub}>
                    {selectedRecipeItem.category} · Total Making Cost: <strong>{formatBDT(selectedRecipeItem.current_cogs)}</strong>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedRecipeItem(null)} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            <div style={styles.modalBody}>
              {selectedRecipeItem.recipe && selectedRecipeItem.recipe.length > 0 ? (
                <table style={styles.recipeTable}>
                  <thead>
                    <tr style={styles.recipeThead}>
                      <th style={styles.recipeTh}>Ingredient</th>
                      <th style={styles.recipeTh}>Quantity</th>
                      <th style={styles.recipeTh}>Unit</th>
                      <th style={styles.recipeTh}>Unit Price</th>
                      <th style={{ ...styles.recipeTh, textAlign: 'right' }}>Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRecipeItem.recipe.map((ing, idx) => (
                      <tr key={idx} style={styles.recipeTr}>
                        <td style={{ ...styles.recipeTd, fontWeight: 600 }}>{ing.ingredient_name}</td>
                        <td style={styles.recipeTd}>{ing.quantity}</td>
                        <td style={styles.recipeTd}>{ing.unit}</td>
                        <td style={styles.recipeTd}>{formatBDT(ing.price)} / {ing.price_basis_unit ? ing.price_basis_unit.replace('per ', '') : ing.unit}</td>
                        <td style={{ ...styles.recipeTd, textAlign: 'right', fontWeight: 700 }}>{formatBDT(ing.line_cost)}</td>
                      </tr>
                    ))}
                    <tr style={styles.recipeTotalRow}>
                      <td colSpan={4} style={{ ...styles.recipeTd, fontWeight: 800 }}>Total Making Cost (COGS)</td>
                      <td style={{ ...styles.recipeTd, textAlign: 'right', fontWeight: 900, color: 'var(--accent-brown, #7C3A1E)', fontSize: 15 }}>
                        {formatBDT(selectedRecipeItem.current_cogs)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                  <AlertTriangle size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <div>No ingredient breakdown available for this item yet.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-canvas, #F9FAFB)',
    color: 'var(--text-primary, #111827)',
    fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    background: 'var(--bg-surface, #ffffff)',
    borderBottom: '1px solid var(--border-light, #E5E7EB)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05))',
    flexWrap: 'wrap',
    gap: 12,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #7C3A1E, #A04A26)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(124, 58, 30, 0.25)',
  },
  brandTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: '-0.02em',
    margin: 0,
  },
  viewBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 12,
    background: 'var(--accent-brown-dim, rgba(124, 58, 30, 0.1))',
    color: 'var(--accent-brown, #7C3A1E)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  brandSub: {
    fontSize: 12,
    color: 'var(--text-muted, #6B7280)',
    margin: '2px 0 0',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  exportBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid var(--border-medium, #D1D5DB)',
    background: 'var(--bg-surface, #fff)',
    color: 'var(--text-primary, #111)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  adminLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 8,
    background: 'var(--accent-brown, #7C3A1E)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
    boxShadow: '0 2px 4px rgba(124, 58, 30, 0.2)',
  },
  container: {
    maxWidth: 1600,
    margin: '0 auto',
    padding: '24px',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 20,
  },
  kpiCard: {
    background: 'var(--bg-surface, #ffffff)',
    borderRadius: 12,
    padding: '16px 20px',
    border: '1px solid var(--border-light, #E5E7EB)',
    boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.03))',
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted, #6B7280)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: 800,
    letterSpacing: '-0.02em',
  },
  kpiSub: {
    fontSize: 11,
    color: 'var(--text-muted, #9CA3AF)',
    marginTop: 4,
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 14,
    background: 'var(--bg-surface, #ffffff)',
    borderRadius: 12,
    padding: '12px 18px',
    border: '1px solid var(--border-light, #E5E7EB)',
    marginBottom: 20,
    boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.03))',
  },
  searchWrapper: {
    position: 'relative',
    flex: 1,
    minWidth: 260,
    maxWidth: 420,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted, #9CA3AF)',
  },
  searchInput: {
    width: '100%',
    padding: '9px 34px 9px 36px',
    borderRadius: 8,
    border: '1px solid var(--border-medium, #D1D5DB)',
    background: 'var(--bg-subtle, #F9FAFB)',
    color: 'var(--text-primary, #111827)',
    fontSize: 13,
    outline: 'none',
  },
  clearBtn: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    display: 'flex',
  },
  categoryWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary, #4B5563)',
  },
  categorySelect: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--border-medium, #D1D5DB)',
    background: 'var(--bg-subtle, #F9FAFB)',
    color: 'var(--text-primary, #111827)',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
  },
  itemCountBadge: {
    fontSize: 12,
    color: 'var(--text-muted, #6B7280)',
    fontWeight: 500,
  },
  tableWrapper: {
    background: 'var(--bg-surface, #ffffff)',
    borderRadius: 12,
    border: '1px solid var(--border-light, #E5E7EB)',
    boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.03))',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  theadRow: {
    background: 'var(--bg-subtle, #F9FAFB)',
    borderBottom: '1px solid var(--border-light, #E5E7EB)',
  },
  th: {
    padding: '12px 14px',
    textAlign: 'left',
    fontWeight: 700,
    color: 'var(--text-muted, #6B7280)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid var(--border-light, #E5E7EB)',
    transition: 'background 0.1s ease',
  },
  td: {
    padding: '12px 14px',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
  },
  itemName: {
    fontWeight: 700,
    color: 'var(--text-primary, #111)',
    fontSize: 13.5,
  },
  itemCategory: {
    fontSize: 11,
    color: 'var(--text-muted, #9CA3AF)',
    marginTop: 2,
  },
  recipeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid var(--border-medium, #D1D5DB)',
    background: 'var(--bg-surface, #fff)',
    color: 'var(--accent-brown, #7C3A1E)',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  emptyTd: {
    textAlign: 'center',
    padding: '60px 20px',
    color: 'var(--text-muted, #9CA3AF)',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backdropFilter: 'blur(3px)',
  },
  modalCard: {
    background: 'var(--bg-surface, #fff)',
    borderRadius: 16,
    width: '100%',
    maxWidth: 620,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgba(0,0,0,0.2))',
    border: '1px solid var(--border-light, #E5E7EB)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 24px',
    borderBottom: '1px solid var(--border-light, #E5E7EB)',
    background: 'var(--bg-subtle, #F9FAFB)',
  },
  modalIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'var(--accent-brown-dim, rgba(124, 58, 30, 0.12))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 800,
    margin: 0,
  },
  modalSub: {
    fontSize: 12,
    color: 'var(--text-muted, #6B7280)',
    marginTop: 2,
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted, #9CA3AF)',
    padding: 6,
    borderRadius: 6,
    display: 'flex',
  },
  modalBody: {
    padding: 20,
    overflowY: 'auto',
  },
  recipeTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  recipeThead: {
    borderBottom: '2px solid var(--border-light, #E5E7EB)',
  },
  recipeTh: {
    padding: '8px 10px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-muted, #6B7280)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  recipeTr: {
    borderBottom: '1px solid var(--border-light, #E5E7EB)',
  },
  recipeTd: {
    padding: '10px 10px',
  },
  recipeTotalRow: {
    borderTop: '2px solid var(--border-medium, #D1D5DB)',
    background: 'var(--bg-subtle, #F9FAFB)',
  },
}

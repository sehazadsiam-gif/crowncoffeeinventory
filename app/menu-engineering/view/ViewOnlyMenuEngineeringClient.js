'use client'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  Coffee, Search, X, Download, Eye, Lock,
  Utensils, AlertTriangle, LayoutGrid, Table as TableIcon,
  ChevronRight, TrendingUp, CheckCircle2, ChevronDown
} from 'lucide-react'
import ThemeToggle from '../../../components/ThemeToggle'
import {
  calculateFixedCostPricing,
  calculateOnlineChannelMetrics,
  foodCostColor,
  formatBDT,
  formatPct
} from '../../../lib/costing-calculations'

function FCBadge({ pct, large = false }) {
  const color = foodCostColor(pct)
  const map = {
    green:   { bg: 'var(--success-bg, #D1FAE5)', text: 'var(--success, #059669)', border: 'rgba(5, 150, 105, 0.2)' },
    yellow:  { bg: 'var(--warning-bg, #FEF3C7)', text: 'var(--warning, #D97706)', border: 'rgba(217, 119, 6, 0.2)' },
    red:     { bg: 'var(--danger-bg, #FEE2E2)', text: 'var(--danger, #DC2626)', border: 'rgba(220, 38, 38, 0.2)' },
    neutral: { bg: 'var(--bg-subtle, #F3F4F6)', text: 'var(--text-muted, #6B7280)', border: 'rgba(107, 114, 128, 0.2)' }
  }
  const { bg, text, border } = map[color] || map.neutral
  return (
    <span style={{
      background: bg,
      color: text,
      border: `1px solid ${border}`,
      borderRadius: large ? 8 : 6,
      padding: large ? '4px 10px' : '2px 8px',
      fontSize: large ? 13 : 12,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4
    }}>
      {formatPct(pct)}
    </span>
  )
}

export default function ViewOnlyMenuEngineeringClient({ initialItems = [], channels = [] }) {
  const [searchQuery, setSearchQuery]           = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedRecipeItem, setSelectedRecipeItem] = useState(null)
  const [viewMode, setViewMode]                 = useState('table') // 'table' | 'cards'
  const [expandedCardId, setExpandedCardId]     = useState(null)

  // Auto-detect mobile screen on mount to choose Cards view
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setViewMode('cards')
    }
  }, [])

  // Close recipe modal with Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setSelectedRecipeItem(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
    <div className="view-page" style={styles.page}>
      {/* Embedded Responsive Media Queries for Phone, Tablet, Desktop, TV */}
      <style>{`
        /* Phone & Compact Devices (< 640px) */
        @media (max-width: 640px) {
          .view-header {
            padding: 10px 14px !important;
            gap: 10px !important;
          }
          .view-brand-icon {
            width: 34px !important;
            height: 34px !important;
          }
          .view-brand-title {
            font-size: 16px !important;
          }
          .view-brand-sub {
            display: none !important;
          }
          .view-header-right {
            gap: 6px !important;
          }
          .view-btn-text {
            display: none !important;
          }
          .view-container {
            padding: 10px 12px 60px !important;
          }
          .view-kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
            margin-bottom: 12px !important;
          }
          .view-kpi-card {
            padding: 10px 12px !important;
          }
          .view-kpi-val {
            font-size: 20px !important;
          }
          .view-kpi-lbl {
            font-size: 10px !important;
          }
          .view-kpi-sub {
            display: none !important;
          }
          .view-filter-bar {
            padding: 10px 12px !important;
            gap: 8px !important;
            margin-bottom: 12px !important;
          }
          .view-search-wrapper {
            max-width: 100% !important;
            min-width: 100% !important;
            width: 100% !important;
          }
          .view-filter-controls {
            width: 100% !important;
            justify-content: space-between !important;
            gap: 8px !important;
          }
          .view-modal-overlay {
            padding: 0 !important;
            align-items: flex-end !important;
          }
          .view-modal-card {
            border-radius: 20px 20px 0 0 !important;
            max-height: 90vh !important;
            max-width: 100% !important;
          }
          .view-modal-header {
            padding: 14px 16px !important;
          }
          .view-modal-body {
            padding: 14px 12px !important;
          }
        }

        /* Tablets (641px - 1024px) */
        @media (min-width: 641px) and (max-width: 1024px) {
          .view-container {
            padding: 16px 20px !important;
          }
          .view-kpi-grid {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 12px !important;
          }
          .view-kpi-val {
            font-size: 22px !important;
          }
        }

        /* TV & Ultra-wide / 4K Displays (>= 1921px) */
        @media (min-width: 1921px) {
          .view-container {
            max-width: 2560px !important;
            padding: 36px 60px !important;
          }
          .view-brand-title {
            font-size: 26px !important;
          }
          .view-brand-sub {
            font-size: 15px !important;
          }
          .view-kpi-grid {
            gap: 24px !important;
            margin-bottom: 28px !important;
          }
          .view-kpi-card {
            padding: 24px 30px !important;
            border-radius: 16px !important;
          }
          .view-kpi-lbl {
            font-size: 14px !important;
          }
          .view-kpi-val {
            font-size: 40px !important;
          }
          .view-kpi-sub {
            font-size: 13px !important;
          }
          .view-filter-bar {
            padding: 18px 24px !important;
            font-size: 15px !important;
          }
          .view-search-input {
            font-size: 15px !important;
            padding: 12px 42px 12px 46px !important;
          }
          .view-table th {
            font-size: 13px !important;
            padding: 16px 20px !important;
          }
          .view-table td {
            font-size: 15px !important;
            padding: 16px 20px !important;
          }
          .view-modal-card {
            max-width: 820px !important;
          }
          .view-modal-title {
            font-size: 22px !important;
          }
        }

        /* Sticky First Column for Smooth Horizontal Scrolling */
        .sticky-col {
          position: sticky;
          left: 0;
          z-index: 10;
          background: var(--bg-surface, #ffffff);
          box-shadow: 2px 0 6px -2px rgba(0, 0, 0, 0.08);
        }
        .sticky-th {
          position: sticky;
          left: 0;
          z-index: 20;
          background: var(--bg-subtle, #F9FAFB);
          box-shadow: 2px 0 6px -2px rgba(0, 0, 0, 0.08);
        }
        .dark-mode .sticky-col {
          background: var(--bg-surface, #1E293B) !important;
          box-shadow: 2px 0 6px -2px rgba(0, 0, 0, 0.4);
        }
        .dark-mode .sticky-th {
          background: var(--bg-subtle, #0F172A) !important;
          box-shadow: 2px 0 6px -2px rgba(0, 0, 0, 0.4);
        }

        /* Row hover effect */
        .view-tr:hover td {
          background: var(--bg-hover, rgba(124, 58, 30, 0.04)) !important;
        }

        /* Cards hover effect */
        .view-card-item {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .view-card-item:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md, 0 4px 14px rgba(0,0,0,0.08));
        }
      `}</style>

      {/* Top Banner */}
      <header className="view-header" style={styles.header}>
        <div style={styles.headerLeft}>
          <div className="view-brand-icon" style={styles.brandIcon}>
            <Coffee size={22} color="#fff" />
          </div>
          <div>
            <div style={styles.brandTitleRow}>
              <h1 className="view-brand-title" style={styles.brandTitle}>Crown Coffee</h1>
              <span style={styles.viewBadge}>
                <Eye size={12} /> View Only
              </span>
            </div>
            <p className="view-brand-sub" style={styles.brandSub}>Menu Engineering, Recipe Costings &amp; Margins</p>
          </div>
        </div>

        <div className="view-header-right" style={styles.headerRight}>
          <ThemeToggle />
          <button onClick={exportCSV} style={styles.exportBtn} title="Download CSV Spreadsheet">
            <Download size={14} />
            <span className="view-btn-text">Export CSV</span>
          </button>
          <Link href="/menu-costings/login" style={styles.adminLink} title="Admin Sign In">
            <Lock size={13} />
            <span className="view-btn-text">Admin</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="view-container" style={styles.container}>
        {/* KPI Cards (Phone 2x2, Tablet/Desktop 4x1, TV enlarged) */}
        <section className="view-kpi-grid" style={styles.kpiGrid}>
          <div className="view-kpi-card" style={styles.kpiCard}>
            <div className="view-kpi-lbl" style={styles.kpiLabel}>Total Menu Items</div>
            <div className="view-kpi-val" style={styles.kpiValue}>{totalItems}</div>
            <div className="view-kpi-sub" style={styles.kpiSub}>Active dishes &amp; beverages</div>
          </div>
          <div className="view-kpi-card" style={styles.kpiCard}>
            <div className="view-kpi-lbl" style={styles.kpiLabel}>Costed Recipes</div>
            <div className="view-kpi-val" style={{ ...styles.kpiValue, color: 'var(--accent-brown, #7C3A1E)' }}>
              {itemsWithRecipes}
            </div>
            <div className="view-kpi-sub" style={styles.kpiSub}>Recipes with ingredient costs</div>
          </div>
          <div className="view-kpi-card" style={styles.kpiCard}>
            <div className="view-kpi-lbl" style={styles.kpiLabel}>Priced Items</div>
            <div className="view-kpi-val" style={styles.kpiValue}>{itemsWithPrices}</div>
            <div className="view-kpi-sub" style={styles.kpiSub}>Dine-in prices configured</div>
          </div>
          <div className="view-kpi-card" style={styles.kpiCard}>
            <div className="view-kpi-lbl" style={styles.kpiLabel}>Avg Food Cost %</div>
            <div className="view-kpi-val" style={{ ...styles.kpiValue, color: avgFoodCost <= 33 ? 'var(--success, #059669)' : 'var(--warning, #D97706)' }}>
              {avgFoodCost}%
            </div>
            <div className="view-kpi-sub" style={styles.kpiSub}>Across priced menu items</div>
          </div>
        </section>

        {/* Search, Filter & View Toggle Bar */}
        <div className="view-filter-bar" style={styles.filterBar}>
          <div className="view-search-wrapper" style={styles.searchWrapper}>
            <Search size={16} style={styles.searchIcon} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search dish, beverage, category…"
              className="view-search-input"
              style={styles.searchInput}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={styles.clearBtn} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="view-filter-controls" style={styles.filterControls}>
            <div style={styles.categoryWrap}>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                style={styles.categorySelect}
                aria-label="Filter by category"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'ALL' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle: Table vs Cards */}
            <div style={styles.viewModeToggle}>
              <button
                onClick={() => setViewMode('table')}
                style={{
                  ...styles.toggleBtn,
                  background: viewMode === 'table' ? 'var(--accent-brown, #7C3A1E)' : 'transparent',
                  color: viewMode === 'table' ? '#ffffff' : 'var(--text-secondary, #4B5563)',
                }}
                title="Table View (Comprehensive spreadsheet)"
              >
                <TableIcon size={14} />
                <span style={styles.toggleBtnLabel}>Table</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                style={{
                  ...styles.toggleBtn,
                  background: viewMode === 'cards' ? 'var(--accent-brown, #7C3A1E)' : 'transparent',
                  color: viewMode === 'cards' ? '#ffffff' : 'var(--text-secondary, #4B5563)',
                }}
                title="Card View (Phone & Touch optimized)"
              >
                <LayoutGrid size={14} />
                <span style={styles.toggleBtnLabel}>Cards</span>
              </button>
            </div>

            <div style={styles.itemCountBadge}>
              <strong>{filteredItems.length}</strong> / {totalItems}
            </div>
          </div>
        </div>

        {/* ── CONDITIONAL VIEW: TABLE or CARDS ────────────────── */}
        {viewMode === 'table' ? (
          /* TABLE VIEW (Sticky Header & First Column) */
          <div style={styles.tableWrapper}>
            <table className="view-table" style={styles.table}>
              <thead>
                <tr style={styles.theadRow}>
                  <th className="sticky-th" style={{ ...styles.th, minWidth: 210 }}>Menu Item</th>
                  <th style={{ ...styles.th, minWidth: 110 }}>Making Cost</th>
                  <th style={{ ...styles.th, minWidth: 110 }}>Utilities (1:1)</th>
                  <th style={{ ...styles.th, minWidth: 110 }}>Base Cost</th>
                  <th style={{ ...styles.th, minWidth: 110 }}>Dine-In Price</th>
                  <th style={{ ...styles.th, minWidth: 110 }}>Net Profit</th>
                  <th style={{ ...styles.th, minWidth: 100 }}>FC% (Dine)</th>
                  {channels.map(ch => (
                    <th key={ch.id} colSpan={5} style={{
                      ...styles.th,
                      background: 'var(--bg-subtle, #F3F4F6)',
                      borderLeft: '1px solid var(--border-light, #E5E7EB)',
                      textAlign: 'center',
                      fontWeight: 800,
                      color: 'var(--accent-brown, #7C3A1E)'
                    }}>
                      {ch.name} Delivery
                    </th>
                  ))}
                  <th style={{ ...styles.th, minWidth: 90, textAlign: 'center' }}>Recipe</th>
                </tr>
                {/* Secondary subheader for channel columns */}
                {channels.length > 0 && (
                  <tr style={{ ...styles.theadRow, background: 'var(--bg-surface, #fff)' }}>
                    <th className="sticky-th" style={{ ...styles.th, borderBottom: '2px solid var(--border-light)' }}></th>
                    <th style={{ ...styles.th, borderBottom: '2px solid var(--border-light)' }}></th>
                    <th style={{ ...styles.th, borderBottom: '2px solid var(--border-light)' }}></th>
                    <th style={{ ...styles.th, borderBottom: '2px solid var(--border-light)' }}></th>
                    <th style={{ ...styles.th, borderBottom: '2px solid var(--border-light)' }}></th>
                    <th style={{ ...styles.th, borderBottom: '2px solid var(--border-light)' }}></th>
                    <th style={{ ...styles.th, borderBottom: '2px solid var(--border-light)' }}></th>
                    {channels.map(ch => (
                      <tr key={ch.id} style={{ display: 'contents' }}>
                        <th style={{ ...styles.thSub, borderLeft: '1px solid var(--border-light)' }}>Selling</th>
                        <th style={styles.thSub}>Disc%</th>
                        <th style={styles.thSub}>Comm%</th>
                        <th style={styles.thSub}>Payout</th>
                        <th style={styles.thSub}>Profit</th>
                      </tr>
                    ))}
                    <th style={{ ...styles.th, borderBottom: '2px solid var(--border-light)' }}></th>
                  </tr>
                )}
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8 + channels.length * 5 + 1} style={styles.emptyTd}>
                      <Search size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                      <div style={{ fontWeight: 700, fontSize: 15 }}>No items found matching "{searchQuery}"</div>
                      <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-muted)' }}>
                        Try searching for a different keyword or reset category filter.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => {
                    const cogs    = item.current_cogs || 0
                    const dineIn  = item.dine_in_price || 0
                    const anchor  = calculateFixedCostPricing(cogs, dineIn)
                    const hasRecipe = item.recipe && item.recipe.length > 0

                    return (
                      <tr key={item.id} className="view-tr" style={styles.tr}>
                        {/* Name & Category (Sticky first column) */}
                        <td className="sticky-col" style={styles.td}>
                          <div style={styles.itemName}>{item.name}</div>
                          <div style={styles.itemCategory}>{item.category || 'General'}</div>
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

                        {/* Delivery Channels */}
                        {channels.map(ch => {
                          const cp = item.channel_prices?.[ch.id]
                          const sp = parseFloat(cp?.selling_price) || 0
                          const com = parseFloat(cp?.commission_pct) || 0
                          const disc = parseFloat(cp?.discount_pct) || 0
                          const om = sp > 0 ? calculateOnlineChannelMetrics(sp, cogs, com, disc) : null

                          return (
                            <tr key={ch.id} style={{ display: 'contents' }}>
                              <td style={{ ...styles.td, borderLeft: '1px solid var(--border-light)' }}>
                                {sp > 0 ? formatBDT(sp) : '—'}
                              </td>
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

                        {/* Recipe Modal Button */}
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
        ) : (
          /* CARD VIEW (Touch-friendly & Mobile optimized) */
          <div style={styles.cardsGrid}>
            {filteredItems.length === 0 ? (
              <div style={styles.emptyCardNotice}>
                <Search size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                <div style={{ fontWeight: 700, fontSize: 15 }}>No items found</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Try resetting your search query or filters.</div>
              </div>
            ) : (
              filteredItems.map(item => {
                const cogs    = item.current_cogs || 0
                const dineIn  = item.dine_in_price || 0
                const anchor  = calculateFixedCostPricing(cogs, dineIn)
                const hasRecipe = item.recipe && item.recipe.length > 0
                const isExpanded = expandedCardId === item.id

                return (
                  <div key={item.id} className="view-card-item" style={styles.mobileCard}>
                    {/* Card Top */}
                    <div style={styles.cardHeader}>
                      <div>
                        <div style={styles.cardCategory}>{item.category || 'General'}</div>
                        <h3 style={styles.cardTitle}>{item.name}</h3>
                      </div>
                      <button
                        onClick={() => setSelectedRecipeItem(item)}
                        style={{
                          ...styles.recipeBtn,
                          padding: '6px 12px',
                          fontSize: 12,
                          opacity: hasRecipe ? 1 : 0.6
                        }}
                      >
                        <Utensils size={13} /> Recipe
                      </button>
                    </div>

                    {/* Main Metrics Matrix */}
                    <div style={styles.cardMetricsGrid}>
                      <div style={styles.cardMetricBox}>
                        <div style={styles.cardMetricLabel}>Making Cost</div>
                        <div style={styles.cardMetricVal}>{formatBDT(cogs)}</div>
                      </div>
                      <div style={styles.cardMetricBox}>
                        <div style={styles.cardMetricLabel}>Base Cost</div>
                        <div style={styles.cardMetricVal}>{formatBDT(anchor.baseCost)}</div>
                      </div>
                      <div style={styles.cardMetricBox}>
                        <div style={styles.cardMetricLabel}>Dine-In Price</div>
                        <div style={{ ...styles.cardMetricVal, fontWeight: 800, color: 'var(--text-primary)' }}>
                          {dineIn > 0 ? formatBDT(dineIn) : '—'}
                        </div>
                      </div>
                      <div style={styles.cardMetricBox}>
                        <div style={styles.cardMetricLabel}>Food Cost %</div>
                        <div style={{ marginTop: 2 }}>
                          {dineIn > 0 ? <FCBadge pct={anchor.foodCostPct} /> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                        </div>
                      </div>
                    </div>

                    {/* Dine-In Profit Row */}
                    <div style={{
                      ...styles.cardProfitRow,
                      background: dineIn === 0 ? 'var(--bg-subtle)' : anchor.isLoss ? 'var(--danger-bg)' : 'var(--success-bg)',
                      borderColor: dineIn === 0 ? 'var(--border-light)' : anchor.isLoss ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TrendingUp size={14} color={dineIn === 0 ? '#6B7280' : anchor.isLoss ? '#EF4444' : '#10B981'} />
                        <span style={{ fontSize: 12, fontWeight: 600 }}>Dine-In Net Profit:</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          fontWeight: 800,
                          fontSize: 14,
                          color: dineIn === 0 ? 'var(--text-muted)' : anchor.isLoss ? 'var(--danger)' : 'var(--success)'
                        }}>
                          {dineIn > 0 ? formatBDT(anchor.netProfit) : '—'}
                        </span>
                        {anchor.profitSacrificed > 0 && (
                          <div style={{ fontSize: 10, color: 'var(--warning, #D97706)' }}>
                            (-{formatBDT(anchor.profitSacrificed)} promo)
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Collapsible Delivery Channels */}
                    {channels.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <button
                          onClick={() => setExpandedCardId(isExpanded ? null : item.id)}
                          style={styles.expandChannelsBtn}
                        >
                          <span>Delivery Channels ({channels.length})</span>
                          <ChevronDown size={14} style={{
                            transform: isExpanded ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s ease'
                          }} />
                        </button>

                        {isExpanded && (
                          <div style={styles.channelsList}>
                            {channels.map(ch => {
                              const cp = item.channel_prices?.[ch.id]
                              const sp = parseFloat(cp?.selling_price) || 0
                              const com = parseFloat(cp?.commission_pct) || 0
                              const disc = parseFloat(cp?.discount_pct) || 0
                              const om = sp > 0 ? calculateOnlineChannelMetrics(sp, cogs, com, disc) : null

                              return (
                                <div key={ch.id} style={styles.channelRow}>
                                  <div>
                                    <div style={{ fontWeight: 700, fontSize: 13 }}>{ch.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                      {sp > 0 ? `Price: ${formatBDT(sp)} · Disc: ${disc}% · Comm: ${com}%` : 'Not listed'}
                                    </div>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    {om ? (
                                      <>
                                        <div style={{ fontWeight: 700, fontSize: 12, color: om.isLoss ? 'var(--danger)' : 'var(--success)' }}>
                                          Profit: {formatBDT(om.onlineProfit)}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                          Payout: {formatBDT(om.netPayout)}
                                        </div>
                                      </>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </main>

      {/* ── RESPONSIVE RECIPE MODAL ─────────────────────────── */}
      {selectedRecipeItem && (
        <div
          className="view-modal-overlay"
          style={styles.modalOverlay}
          onClick={() => setSelectedRecipeItem(null)}
        >
          <div
            className="view-modal-card"
            style={styles.modalCard}
            onClick={e => e.stopPropagation()}
          >
            <div className="view-modal-header" style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={styles.modalIcon}>
                  <Utensils size={20} color="var(--accent-brown, #7C3A1E)" />
                </div>
                <div>
                  <h3 className="view-modal-title" style={styles.modalTitle}>{selectedRecipeItem.name}</h3>
                  <div style={styles.modalSub}>
                    {selectedRecipeItem.category || 'General'} · Total Making Cost: <strong style={{ color: 'var(--accent-brown)' }}>{formatBDT(selectedRecipeItem.current_cogs)}</strong>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecipeItem(null)}
                style={styles.modalCloseBtn}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="view-modal-body" style={styles.modalBody}>
              {selectedRecipeItem.recipe && selectedRecipeItem.recipe.length > 0 ? (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={styles.recipeTable}>
                    <thead>
                      <tr style={styles.recipeThead}>
                        <th style={styles.recipeTh}>Ingredient</th>
                        <th style={styles.recipeTh}>Qty</th>
                        <th style={styles.recipeTh}>Unit</th>
                        <th style={styles.recipeTh}>Unit Rate</th>
                        <th style={{ ...styles.recipeTh, textAlign: 'right' }}>Total Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecipeItem.recipe.map((ing, idx) => (
                        <tr key={idx} style={styles.recipeTr}>
                          <td style={{ ...styles.recipeTd, fontWeight: 600 }}>{ing.ingredient_name}</td>
                          <td style={styles.recipeTd}>{ing.quantity}</td>
                          <td style={styles.recipeTd}>{ing.unit}</td>
                          <td style={styles.recipeTd}>
                            {formatBDT(ing.price)} / {ing.price_basis_unit ? ing.price_basis_unit.replace('per ', '') : ing.unit}
                          </td>
                          <td style={{ ...styles.recipeTd, textAlign: 'right', fontWeight: 700 }}>
                            {formatBDT(ing.line_cost)}
                          </td>
                        </tr>
                      ))}
                      <tr style={styles.recipeTotalRow}>
                        <td colSpan={4} style={{ ...styles.recipeTd, fontWeight: 800 }}>Total Making Cost (COGS)</td>
                        <td style={{ ...styles.recipeTd, textAlign: 'right', fontWeight: 900, color: 'var(--accent-brown, #7C3A1E)', fontSize: 16 }}>
                          {formatBDT(selectedRecipeItem.current_cogs)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '36px 14px', color: 'var(--text-muted)' }}>
                  <AlertTriangle size={36} style={{ marginBottom: 10, opacity: 0.5 }} />
                  <div style={{ fontWeight: 600, fontSize: 14 }}>No ingredient breakdown recorded</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>This item has not yet been costed in the chef recipe database.</div>
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
    padding: '14px 24px',
    background: 'var(--bg-surface, #ffffff)',
    borderBottom: '1px solid var(--border-light, #E5E7EB)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.04))',
    flexWrap: 'wrap',
    gap: 12,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #7C3A1E, #A04A26)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(124, 58, 30, 0.25)',
    flexShrink: 0,
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
    maxWidth: 1800,
    margin: '0 auto',
    padding: '20px 24px',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 14,
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
    fontSize: 11,
    fontWeight: 700,
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
    gap: 12,
    background: 'var(--bg-surface, #ffffff)',
    borderRadius: 12,
    padding: '12px 18px',
    border: '1px solid var(--border-light, #E5E7EB)',
    marginBottom: 18,
    boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.03))',
  },
  searchWrapper: {
    position: 'relative',
    flex: 1,
    minWidth: 260,
    maxWidth: 440,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted, #9CA3AF)',
    pointerEvents: 'none',
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
    boxSizing: 'border-box',
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
    padding: 4,
  },
  filterControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  categoryWrap: {
    display: 'flex',
    alignItems: 'center',
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
    fontWeight: 500,
  },
  viewModeToggle: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'var(--bg-subtle, #F3F4F6)',
    borderRadius: 8,
    padding: 3,
    border: '1px solid var(--border-light, #E5E7EB)',
  },
  toggleBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 10px',
    borderRadius: 6,
    border: 'none',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  toggleBtnLabel: {
    fontSize: 12,
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
    WebkitOverflowScrolling: 'touch',
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
  thSub: {
    padding: '6px 12px',
    textAlign: 'left',
    fontWeight: 600,
    color: 'var(--text-muted, #9CA3AF)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
    borderBottom: '2px solid var(--border-light, #E5E7EB)',
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

  /* Mobile Card View Styles */
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 14,
  },
  mobileCard: {
    background: 'var(--bg-surface, #ffffff)',
    borderRadius: 14,
    padding: '16px',
    border: '1px solid var(--border-light, #E5E7EB)',
    boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.04))',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  cardCategory: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--accent-brown, #7C3A1E)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 800,
    margin: 0,
    color: 'var(--text-primary, #111)',
    lineHeight: 1.3,
  },
  cardMetricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
    background: 'var(--bg-subtle, #F9FAFB)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  cardMetricBox: {
    display: 'flex',
    flexDirection: 'column',
  },
  cardMetricLabel: {
    fontSize: 10,
    color: 'var(--text-muted, #6B7280)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  cardMetricVal: {
    fontSize: 13,
    fontWeight: 700,
    marginTop: 2,
  },
  cardProfitRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid',
  },
  expandChannelsBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'none',
    border: 'none',
    padding: '6px 4px',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary, #4B5563)',
    cursor: 'pointer',
  },
  channelsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    paddingTop: 6,
  },
  channelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    background: 'var(--bg-subtle, #F9FAFB)',
    borderRadius: 8,
    fontSize: 12,
  },
  emptyCardNotice: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '50px 20px',
    background: 'var(--bg-surface, #ffffff)',
    borderRadius: 14,
    border: '1px solid var(--border-light, #E5E7EB)',
  },

  /* Modal Styles */
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backdropFilter: 'blur(4px)',
  },
  modalCard: {
    background: 'var(--bg-surface, #fff)',
    borderRadius: 16,
    width: '100%',
    maxWidth: 640,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgba(0,0,0,0.25))',
    border: '1px solid var(--border-light, #E5E7EB)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-light, #E5E7EB)',
    background: 'var(--bg-subtle, #F9FAFB)',
    flexShrink: 0,
  },
  modalIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'var(--accent-brown-dim, rgba(124, 58, 30, 0.12))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: 16,
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
    padding: 16,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  recipeTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
    minWidth: 440,
  },
  recipeThead: {
    borderBottom: '2px solid var(--border-light, #E5E7EB)',
    background: 'var(--bg-subtle, #F9FAFB)',
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
    fontVariantNumeric: 'tabular-nums',
  },
  recipeTotalRow: {
    borderTop: '2px solid var(--border-medium, #D1D5DB)',
    background: 'var(--bg-subtle, #F9FAFB)',
  },
}

'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, Save, History, LogOut, ChefHat,
  Coffee, Search, RefreshCw, AlertCircle, CheckCircle,
  ChevronDown, X, Clock, TrendingDown
} from 'lucide-react'
import { calculateLineCost, calculateItemCOGS, formatBDT, UNITS, PRICE_BASIS_UNITS, compatiblePriceBasisUnits } from '../../lib/costing-calculations'

// ─── Constants ───────────────────────────────────────────────
const EMPTY_ROW = () => ({
  _id:              crypto.randomUUID(),
  ingredient_id:    null,
  ingredient_name:  '',
  quantity:         '',
  unit:             'g',
  price:            '',
  price_basis_unit: 'per kg',
})

// ─── Debounce Hook ───────────────────────────────────────────
function useDebounce(value, ms = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

// ─── Autocomplete Input ──────────────────────────────────────
function AutocompleteInput({ value, onChange, fetchFn, placeholder, id }) {
  const [suggestions, setSuggestions]       = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [focused, setFocused]               = useState(false)
  const debounced = useDebounce(value, 250)
  const ref = useRef(null)

  useEffect(() => {
    if (!focused || !debounced) { setSuggestions([]); return }
    fetchFn(debounced).then(setSuggestions).catch(() => {})
  }, [debounced, focused, fetchFn])

  useEffect(() => {
    function onClick(e) { if (!ref.current?.contains(e.target)) setShowSuggestions(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <input
        id={id}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => { setFocused(true); setShowSuggestions(true) }}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={inputStyle}
        autoComplete="off"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div style={dropdownStyle}>
          {suggestions.map(s => (
            <div
              key={s.id}
              onMouseDown={() => { onChange(s.name); setSuggestions([]); setShowSuggestions(false) }}
              style={dropdownItemStyle}
            >
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────
export default function MenuCostingsClient({ sessionRole }) {
  const router = useRouter()

  // Item selection
  const [itemName, setItemName]       = useState('')
  const [selectedItem, setSelectedItem] = useState(null)     // {id, name, current_cogs}
  const [allItems, setAllItems]       = useState([])
  const [itemSearch, setItemSearch]   = useState('')
  const debouncedItemSearch = useDebounce(itemSearch, 250)

  // Ingredient rows
  const [rows, setRows] = useState([EMPTY_ROW()])

  // UI state
  const [saving, setSaving]             = useState(false)
  const [saveStatus, setSaveStatus]     = useState(null)  // 'ok' | 'error' | null
  const [saveMsg, setSaveMsg]           = useState('')
  const [showHistory, setShowHistory]   = useState(false)
  const [history, setHistory]           = useState([])
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkIng, setBulkIng]           = useState({ name: '', price: '', priceBasisUnit: 'per kg' })
  const [bulkResult, setBulkResult]     = useState(null)

  // Live COGS
  const totalCogs = calculateItemCOGS(rows.map(r => ({
    quantity: r.quantity, unit: r.unit, price: r.price, price_basis_unit: r.price_basis_unit
  })))

  // ── Load all items for sidebar ───────────────────────────
  useEffect(() => {
    fetch('/api/costing/menu-items?all=true')
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setAllItems(d) : {})
      .catch(() => {})
  }, [])

  const filteredItems = debouncedItemSearch
    ? allItems.filter(i => i.name.toLowerCase().includes(debouncedItemSearch.toLowerCase()))
    : allItems

  // ── Load item ingredients ────────────────────────────────
  async function loadItem(item) {
    setSelectedItem(item)
    setItemName(item.name)
    setSaveStatus(null)
    const res = await fetch(`/api/costing/item-ingredients?itemId=${item.id}`)
    const data = await res.json()
    if (Array.isArray(data) && data.length > 0) {
      setRows(data.map(r => ({ ...r, _id: r.id || crypto.randomUUID() })))
    } else {
      setRows([EMPTY_ROW()])
    }
  }

  function newItem() {
    setSelectedItem(null)
    setItemName('')
    setRows([EMPTY_ROW()])
    setSaveStatus(null)
    setShowHistory(false)
  }

  // ── Row management ───────────────────────────────────────
  function addRow() {
    setRows(prev => [...prev, EMPTY_ROW()])
  }

  function removeRow(idx) {
    setRows(prev => prev.filter((_, i) => i !== idx))
  }

  function updateRow(idx, field, value) {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r
      const updated = { ...r, [field]: value }
      // Auto-fix price_basis_unit if no longer compatible with new unit
      if (field === 'unit') {
        const compat = compatiblePriceBasisUnits(value)
        if (!compat.includes(updated.price_basis_unit)) {
          updated.price_basis_unit = compat[0] || updated.price_basis_unit
        }
      }
      return updated
    }))
  }

  // ── Autocomplete fetch callbacks ─────────────────────────
  const fetchIngredients = useCallback(async (q) => {
    const res = await fetch(`/api/costing/ingredients?search=${encodeURIComponent(q)}`)
    return res.ok ? res.json() : []
  }, [])

  // ── Save ─────────────────────────────────────────────────
  async function handleSave() {
    if (!itemName.trim()) return
    setSaving(true)
    setSaveStatus(null)
    try {
      // Create/get menu item
      const itemRes = await fetch('/api/costing/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: itemName.trim() }),
      })
      const itemData = await itemRes.json()
      if (!itemRes.ok) throw new Error(itemData.error)

      const menuItemId = itemData.id

      // Save ingredients
      const validRows = rows.filter(r => r.ingredient_name?.trim() && r.quantity && r.price)
      const saveRes = await fetch('/api/costing/item-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuItemId, rows: validRows }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData.error)

      setSelectedItem({ id: menuItemId, name: itemName.trim(), current_cogs: saveData.totalCogs })
      // Refresh allItems
      const refreshed = await fetch('/api/costing/menu-items?all=true').then(r => r.json())
      if (Array.isArray(refreshed)) setAllItems(refreshed)

      setSaveStatus('ok')
      setSaveMsg(`Saved · COGS: ${formatBDT(saveData.totalCogs)}`)
      setTimeout(() => setSaveStatus(null), 4000)
    } catch (err) {
      setSaveStatus('error')
      setSaveMsg(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── COGS History ─────────────────────────────────────────
  async function loadHistory() {
    if (!selectedItem?.id) return
    const res = await fetch(`/api/costing/cogs-history?itemId=${selectedItem.id}`)
    const data = await res.json()
    setHistory(Array.isArray(data) ? data : [])
    setShowHistory(true)
  }

  // ── Bulk update ──────────────────────────────────────────
  async function handleBulkUpdate() {
    if (!bulkIng.name || !bulkIng.price) return
    const res = await fetch('/api/costing/bulk-update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredientName:    bulkIng.name,
        newPrice:          parseFloat(bulkIng.price),
        newPriceBasisUnit: bulkIng.priceBasisUnit,
      }),
    })
    const data = await res.json()
    setBulkResult(data)
  }

  // ── Logout ───────────────────────────────────────────────
  async function handleLogout() {
    await fetch('/api/costing/auth/login', { method: 'DELETE' })
    router.replace('/menu-costings/login')
  }

  // ────────────────────────────────────────────────────────
  return (
    <div style={styles.shell}>
      {/* ── SIDEBAR ─────────────────────────────────────── */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logoRow}>
            <div style={styles.logoIcon}><Coffee size={20} color="#fff" /></div>
            <div>
              <div style={styles.logoTitle}>Crown Coffee</div>
              <div style={styles.logoSub}>Menu Costings</div>
            </div>
          </div>
          <button id="new-item-btn" onClick={newItem} style={styles.newBtn}>
            <Plus size={14} /> New Item
          </button>
        </div>

        <div style={styles.searchWrap}>
          <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="search"
            value={itemSearch}
            onChange={e => setItemSearch(e.target.value)}
            placeholder="Search items…"
            style={styles.sidebarSearch}
          />
        </div>

        <div style={styles.itemList}>
          {filteredItems.map(item => (
            <button
              key={item.id}
              onClick={() => loadItem(item)}
              style={{
                ...styles.itemBtn,
                background: selectedItem?.id === item.id ? 'var(--accent-brown-dim)' : 'transparent',
                borderLeft: selectedItem?.id === item.id ? '3px solid var(--accent-brown)' : '3px solid transparent',
              }}
            >
              <span style={styles.itemBtnName}>{item.name}</span>
              <span style={styles.itemBtnCogs}>{formatBDT(item.current_cogs)}</span>
            </button>
          ))}
          {filteredItems.length === 0 && (
            <div style={styles.emptyList}>No items found</div>
          )}
        </div>

        <div style={styles.sidebarFooter}>
          <button onClick={() => setShowBulkModal(true)} style={styles.footerBtn}>
            <RefreshCw size={14} /> Bulk Price Update
          </button>
          <button onClick={handleLogout} style={{ ...styles.footerBtn, color: 'var(--danger)' }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────── */}
      <main style={styles.main}>
        {/* Header */}
        <div style={styles.mainHeader}>
          <div>
            <h1 style={styles.mainTitle}>
              <ChefHat size={22} color="var(--accent-brown)" />
              {selectedItem ? selectedItem.name : 'New Menu Item'}
            </h1>
            <p style={styles.mainSub}>
              {selectedItem ? 'Edit ingredient breakdown' : 'Enter item name and add ingredients'}
            </p>
          </div>
          <div style={styles.headerActions}>
            {selectedItem && (
              <button id="history-btn" onClick={loadHistory} style={styles.outlineBtn}>
                <History size={14} /> Cost History
              </button>
            )}
            <button
              id="save-btn"
              onClick={handleSave}
              disabled={saving || !itemName.trim()}
              style={{ ...styles.saveBtn, opacity: (saving || !itemName.trim()) ? 0.6 : 1 }}
            >
              <Save size={14} />
              {saving ? 'Saving…' : 'Save Costing'}
            </button>
          </div>
        </div>

        {/* Save Status Banner */}
        {saveStatus && (
          <div style={{
            ...styles.statusBanner,
            background: saveStatus === 'ok' ? 'var(--success-bg)' : 'var(--danger-bg)',
            borderColor: saveStatus === 'ok' ? 'var(--success)' : 'var(--danger)',
            color: saveStatus === 'ok' ? 'var(--success)' : 'var(--danger)',
          }}>
            {saveStatus === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {saveMsg}
          </div>
        )}

        {/* Item Name */}
        <div style={styles.section}>
          <label style={styles.fieldLabel}>Menu Item Name</label>
          <input
            id="item-name-input"
            type="text"
            value={itemName}
            onChange={e => setItemName(e.target.value)}
            placeholder="e.g. Cappuccino, Butter Toast…"
            style={{ ...inputStyle, fontSize: 16, fontWeight: 600, maxWidth: 480 }}
          />
        </div>

        {/* Ingredient rows */}
        <div style={styles.section}>
          <div style={styles.rowsHeader}>
            <span style={styles.fieldLabel}>Ingredients</span>
            <span style={styles.colsHint}>Ingredient · Qty · Unit · Price · /Unit · Line Cost</span>
          </div>

          <div style={styles.rowsContainer}>
            {/* Column headers */}
            <div style={styles.colHeaderRow}>
              <div style={{ flex: 2.5 }}>Ingredient</div>
              <div style={{ width: 90 }}>Quantity</div>
              <div style={{ width: 90 }}>Unit</div>
              <div style={{ width: 110 }}>Price (৳)</div>
              <div style={{ width: 120 }}>Price per</div>
              <div style={{ width: 110, textAlign: 'right' }}>Line Cost</div>
              <div style={{ width: 36 }}></div>
            </div>

            {rows.map((row, idx) => {
              const lc = calculateLineCost(row.quantity, row.unit, row.price, row.price_basis_unit)
              const compatUnits = compatiblePriceBasisUnits(row.unit)

              return (
                <div key={row._id} style={styles.ingredientRow}>
                  {/* Ingredient autocomplete */}
                  <AutocompleteInput
                    id={`ing-name-${idx}`}
                    value={row.ingredient_name}
                    onChange={v => updateRow(idx, 'ingredient_name', v)}
                    fetchFn={fetchIngredients}
                    placeholder="Ingredient name…"
                  />

                  {/* Quantity */}
                  <input
                    id={`qty-${idx}`}
                    type="number"
                    min="0"
                    step="any"
                    value={row.quantity}
                    onChange={e => updateRow(idx, 'quantity', e.target.value)}
                    placeholder="0"
                    style={{ ...inputStyle, width: 90 }}
                  />

                  {/* Unit */}
                  <select
                    id={`unit-${idx}`}
                    value={row.unit}
                    onChange={e => updateRow(idx, 'unit', e.target.value)}
                    style={selectStyle}
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>

                  {/* Price */}
                  <input
                    id={`price-${idx}`}
                    type="number"
                    min="0"
                    step="any"
                    value={row.price}
                    onChange={e => updateRow(idx, 'price', e.target.value)}
                    placeholder="0"
                    style={{ ...inputStyle, width: 110 }}
                  />

                  {/* Price basis unit — only show compatible options */}
                  <select
                    id={`pbu-${idx}`}
                    value={row.price_basis_unit}
                    onChange={e => updateRow(idx, 'price_basis_unit', e.target.value)}
                    style={{ ...selectStyle, width: 120 }}
                  >
                    {compatUnits.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>

                  {/* Line cost */}
                  <div style={styles.lineCostCell}>
                    {lc !== null ? formatBDT(lc) : <span style={{ color: 'var(--text-faint)' }}>—</span>}
                  </div>

                  {/* Remove */}
                  <button
                    id={`remove-row-${idx}`}
                    onClick={() => removeRow(idx)}
                    style={styles.removeBtn}
                    aria-label="Remove row"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>

          <button id="add-row-btn" onClick={addRow} style={styles.addRowBtn}>
            <Plus size={14} /> Add ingredient
          </button>
        </div>

        {/* COGS Summary — prominently displayed, chef cannot see selling price */}
        <div style={styles.cogsCard}>
          <div style={styles.cogsLabel}>Total COGS (Cost of Goods Sold)</div>
          <div style={styles.cogsValue}>{formatBDT(totalCogs)}</div>
          <div style={styles.cogsNote}>
            Based on {rows.filter(r => r.ingredient_name && r.quantity && r.price).length} ingredient(s)
          </div>
        </div>
      </main>

      {/* ── COGS HISTORY PANEL ──────────────────────────── */}
      {showHistory && (
        <div style={styles.overlay} onClick={() => setShowHistory(false)}>
          <div style={styles.drawer} onClick={e => e.stopPropagation()}>
            <div style={styles.drawerHeader}>
              <div style={styles.drawerTitle}>
                <Clock size={18} color="var(--accent-brown)" />
                Cost History — {selectedItem?.name}
              </div>
              <button onClick={() => setShowHistory(false)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>

            <div style={styles.drawerBody}>
              {history.length === 0 ? (
                <div style={styles.emptyState}>No history yet</div>
              ) : history.map((h, i) => (
                <div key={h.id} style={styles.historyItem}>
                  <div style={styles.historyMeta}>
                    <span style={styles.historyCogs}>{formatBDT(h.total_cogs)}</span>
                    <span style={styles.historyDate}>
                      {new Date(h.created_at).toLocaleString('en-BD', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {i < history.length - 1 && (
                    <div style={styles.historyDelta}>
                      {history[i].total_cogs > history[i + 1].total_cogs
                        ? <TrendingDown size={12} color="var(--success)" />
                        : <TrendingDown size={12} color="var(--danger)" style={{ transform: 'rotate(180deg)' }} />
                      }
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Δ {formatBDT(Math.abs(history[i].total_cogs - history[i + 1].total_cogs))}
                      </span>
                    </div>
                  )}
                  {h.snapshot && (
                    <div style={styles.snapshotList}>
                      {h.snapshot.map((s, j) => (
                        <div key={j} style={styles.snapshotRow}>
                          <span>{s.ingredient_name}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{s.quantity}{s.unit} × ৳{s.price} {s.price_basis_unit}</span>
                          <span style={{ fontWeight: 600 }}>{formatBDT(s.line_cost)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── BULK UPDATE MODAL ────────────────────────────── */}
      {showBulkModal && (
        <div style={styles.overlay} onClick={() => { setShowBulkModal(false); setBulkResult(null) }}>
          <div style={{ ...styles.drawer, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div style={styles.drawerHeader}>
              <div style={styles.drawerTitle}>
                <RefreshCw size={18} color="var(--accent-brown)" />
                Bulk Ingredient Price Update
              </div>
              <button onClick={() => { setShowBulkModal(false); setBulkResult(null) }} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>
            <div style={styles.drawerBody}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                Updates this ingredient's price across <strong>all menu items</strong> and recalculates their COGS.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label style={styles.fieldLabel}>
                  Ingredient Name (exact match)
                  <input
                    type="text"
                    value={bulkIng.name}
                    onChange={e => setBulkIng(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Espresso Beans"
                    style={{ ...inputStyle, marginTop: 6 }}
                  />
                </label>
                <label style={styles.fieldLabel}>
                  New Price (৳)
                  <input
                    type="number" min="0" step="any"
                    value={bulkIng.price}
                    onChange={e => setBulkIng(p => ({ ...p, price: e.target.value }))}
                    style={{ ...inputStyle, marginTop: 6 }}
                  />
                </label>
                <label style={styles.fieldLabel}>
                  Price Basis Unit
                  <select
                    value={bulkIng.priceBasisUnit}
                    onChange={e => setBulkIng(p => ({ ...p, priceBasisUnit: e.target.value }))}
                    style={{ ...selectStyle, marginTop: 6, width: '100%' }}
                  >
                    {PRICE_BASIS_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </label>

                {bulkResult && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--success-bg)',
                    border: '1px solid var(--success)',
                    color: 'var(--success)',
                    fontSize: 13,
                  }}>
                    ✓ Updated {bulkResult.updatedRows} row(s) across {bulkResult.updatedItems} item(s)
                  </div>
                )}

                <button
                  onClick={handleBulkUpdate}
                  disabled={!bulkIng.name || !bulkIng.price}
                  style={{ ...styles.saveBtn, opacity: (!bulkIng.name || !bulkIng.price) ? 0.5 : 1 }}
                >
                  <RefreshCw size={14} /> Apply Bulk Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────
const inputStyle = {
  padding: '9px 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-medium)',
  background: 'var(--bg-subtle)',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  width: '100%',
}

const selectStyle = {
  padding: '9px 10px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-medium)',
  background: 'var(--bg-subtle)',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
  width: 90,
}

const dropdownStyle = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  zIndex: 100,
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-medium)',
  borderRadius: 'var(--radius-sm)',
  boxShadow: 'var(--shadow-md)',
  maxHeight: 200,
  overflowY: 'auto',
}

const dropdownItemStyle = {
  padding: '9px 12px',
  fontSize: 13,
  cursor: 'pointer',
  color: 'var(--text-primary)',
  transition: 'background 0.15s',
}

const styles = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: 'var(--bg-base)',
  },
  // Sidebar
  sidebar: {
    width: 260,
    flexShrink: 0,
    background: 'var(--bg-surface)',
    borderRight: '1px solid var(--border-light)',
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflowY: 'auto',
  },
  sidebarHeader: {
    padding: '20px 16px 16px',
    borderBottom: '1px solid var(--border-light)',
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  logoIcon: {
    width: 36, height: 36,
    borderRadius: 10,
    background: 'linear-gradient(135deg, var(--accent-brown), var(--accent-gold))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  logoTitle: { fontWeight: 700, fontSize: 14 },
  logoSub:   { fontSize: 11, color: 'var(--text-muted)' },
  newBtn: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-brown-dim)',
    border: '1px solid var(--accent-brown-glow)',
    color: 'var(--accent-brown)',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontFamily: 'var(--font-sans)',
  },
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 16px',
    borderBottom: '1px solid var(--border-light)',
  },
  sidebarSearch: {
    flex: 1, border: 'none', background: 'transparent',
    color: 'var(--text-primary)', fontSize: 13,
    fontFamily: 'var(--font-sans)', outline: 'none',
  },
  itemList: { flex: 1, overflowY: 'auto', padding: '8px 0' },
  itemBtn: {
    width: '100%',
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    textAlign: 'left',
    transition: 'background 0.15s',
    fontFamily: 'var(--font-sans)',
  },
  itemBtnName: { fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 },
  itemBtnCogs: { fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' },
  emptyList:   { padding: '16px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' },
  sidebarFooter: {
    padding: '12px 16px',
    borderTop: '1px solid var(--border-light)',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  footerBtn: {
    padding: '8px 10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 13, color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font-sans)',
    transition: 'background 0.15s',
  },
  // Main
  main: {
    flex: 1,
    padding: '28px 36px',
    overflowY: 'auto',
    maxWidth: 960,
  },
  mainHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 24, fontWeight: 700,
    display: 'flex', alignItems: 'center', gap: 10,
  },
  mainSub: { fontSize: 13, color: 'var(--text-muted)', marginTop: 4 },
  headerActions: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  statusBanner: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid',
    fontSize: 13, fontWeight: 500,
    marginBottom: 20,
  },
  section: { marginBottom: 28 },
  fieldLabel: {
    display: 'block',
    fontSize: 12, fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 10,
  },
  rowsHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  colsHint: { fontSize: 11, color: 'var(--text-faint)' },
  rowsContainer: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  colHeaderRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 12px',
    background: 'var(--bg-subtle)',
    borderBottom: '1px solid var(--border-light)',
    fontSize: 11, fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  ingredientRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 12px',
    borderBottom: '1px solid var(--border-light)',
  },
  lineCostCell: {
    width: 110, textAlign: 'right',
    fontWeight: 600, fontSize: 13,
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--text-primary)',
  },
  removeBtn: {
    width: 32, height: 32,
    borderRadius: 8,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-muted)',
    transition: 'background 0.15s, color 0.15s',
    flexShrink: 0,
  },
  addRowBtn: {
    marginTop: 10,
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 14px',
    border: '1px dashed var(--border-medium)',
    borderRadius: 'var(--radius-sm)',
    background: 'none',
    color: 'var(--text-muted)',
    fontSize: 13, cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    transition: 'border-color 0.2s, color 0.2s',
  },
  // COGS Card — no selling price, no margin
  cogsCard: {
    background: 'var(--bg-surface)',
    border: '2px solid var(--accent-brown-glow)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px 28px',
    display: 'inline-block',
    minWidth: 280,
  },
  cogsLabel: { fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 },
  cogsValue: { fontSize: 36, fontWeight: 800, color: 'var(--accent-brown)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' },
  cogsNote:  { fontSize: 12, color: 'var(--text-faint)', marginTop: 6 },
  // Overlay / Drawer
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 200,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
  },
  drawer: {
    background: 'var(--bg-surface)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-xl)',
    width: '100%',
    maxWidth: 640,
    maxHeight: '85vh',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  drawerHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '18px 22px',
    borderBottom: '1px solid var(--border-light)',
  },
  drawerTitle: { display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 16 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 8,
    border: 'none', background: 'var(--bg-subtle)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-muted)',
  },
  drawerBody: { flex: 1, overflowY: 'auto', padding: '20px 22px' },
  historyItem: {
    marginBottom: 20,
    padding: '16px',
    background: 'var(--bg-subtle)',
    borderRadius: 'var(--radius-md)',
  },
  historyMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  historyCogs: { fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' },
  historyDate: { fontSize: 12, color: 'var(--text-muted)' },
  historyDelta:{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 },
  snapshotList:{ display: 'flex', flexDirection: 'column', gap: 4 },
  snapshotRow: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 12, color: 'var(--text-secondary)',
    gap: 8,
  },
  emptyState: { textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: 14 },
  // Buttons
  saveBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 18px',
    borderRadius: 'var(--radius-md)',
    background: 'linear-gradient(135deg, var(--accent-brown), var(--accent-brown-dark))',
    color: '#fff', fontWeight: 600, fontSize: 14,
    border: 'none', cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
  },
  outlineBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 16px',
    borderRadius: 'var(--radius-md)',
    background: 'none',
    border: '1px solid var(--border-medium)',
    color: 'var(--text-secondary)',
    fontSize: 13, cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
  },
}

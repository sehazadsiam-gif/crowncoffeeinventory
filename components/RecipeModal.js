'use client'
import { useState, useEffect, useMemo } from 'react'
import {
  Utensils, X, Plus, Trash2, Edit3, Save, AlertTriangle,
  CheckCircle2, RefreshCw, Calculator, ArrowRight
} from 'lucide-react'
import {
  UNITS,
  PRICE_BASIS_UNITS,
  calculateLineCost,
  calculateItemCOGS,
  formatBDT
} from '../lib/costing-calculations'

export default function RecipeModal({
  item,
  isOpen,
  onClose,
  onSaveSuccess,
  initialEditMode = false
}) {
  const [isEditing, setIsEditing] = useState(initialEditMode)
  const [rows, setRows] = useState([])
  const [masterIngredients, setMasterIngredients] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Load ingredients when item changes or modal opens
  useEffect(() => {
    if (!item) return
    setIsEditing(initialEditMode || !item.recipe || item.recipe.length === 0)
    setErrorMsg('')
    setSuccessMsg('')

    // Initialize rows from item.recipe or fetch if missing
    if (Array.isArray(item.recipe) && item.recipe.length > 0) {
      setRows(item.recipe.map(r => ({
        ingredient_name: r.ingredient_name || '',
        quantity: r.quantity ?? '',
        unit: r.unit || 'g',
        price: r.price ?? '',
        price_basis_unit: r.price_basis_unit || (r.unit === 'g' ? 'per g' : r.unit === 'ml' ? 'per ml' : 'per piece'),
        line_cost: r.line_cost ?? null
      })))
    } else {
      // Try to fetch latest rows from API
      fetch(`/api/costing/item-ingredients?itemId=${item.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setRows(data.map(r => ({
              ingredient_name: r.ingredient_name || '',
              quantity: r.quantity ?? '',
              unit: r.unit || 'g',
              price: r.price ?? '',
              price_basis_unit: r.price_basis_unit || 'per g',
              line_cost: r.line_cost ?? null
            })))
          } else {
            // Default with 1 empty row ready for editing
            setRows([
              { ingredient_name: '', quantity: '', unit: 'g', price: '', price_basis_unit: 'per g', line_cost: null }
            ])
          }
        })
        .catch(() => {
          setRows([
            { ingredient_name: '', quantity: '', unit: 'g', price: '', price_basis_unit: 'per g', line_cost: null }
          ])
        })
    }
  }, [item, initialEditMode])

  // Fetch master ingredient names for auto-complete suggestions
  useEffect(() => {
    if (!isOpen) return
    fetch('/api/costing/ingredients')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMasterIngredients(data.map(d => d.name))
        }
      })
      .catch(() => {})
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && !isSaving) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSaving, onClose])

  // Recalculate row line cost
  function updateRow(index, field, value) {
    setRows(prev => {
      const copy = [...prev]
      const row = { ...copy[index], [field]: value }

      // Smart basis unit suggestion if unit changed
      if (field === 'unit') {
        const u = String(value).toLowerCase().trim()
        if (u === 'g' && !row.price_basis_unit?.includes('g')) {
          row.price_basis_unit = 'per g'
        } else if (u === 'ml' && !row.price_basis_unit?.includes('ml') && !row.price_basis_unit?.includes('L')) {
          row.price_basis_unit = 'per ml'
        } else if ((u === 'piece' || u === 'pcs') && !row.price_basis_unit?.includes('piece')) {
          row.price_basis_unit = 'per piece'
        } else if (u === 'kg' && !row.price_basis_unit?.includes('kg')) {
          row.price_basis_unit = 'per kg'
        } else if (u === 'l' && !row.price_basis_unit?.includes('L')) {
          row.price_basis_unit = 'per L'
        }
      }

      // Compute line cost
      const lc = calculateLineCost(row.quantity, row.unit, row.price, row.price_basis_unit)
      row.line_cost = lc !== null ? Math.round((lc + Number.EPSILON) * 10000) / 10000 : null

      copy[index] = row
      return copy
    })
  }

  function addRow() {
    setRows(prev => [
      ...prev,
      { ingredient_name: '', quantity: '', unit: 'g', price: '', price_basis_unit: 'per g', line_cost: null }
    ])
  }

  function removeRow(index) {
    setRows(prev => {
      const copy = prev.filter((_, i) => i !== index)
      return copy.length === 0
        ? [{ ingredient_name: '', quantity: '', unit: 'g', price: '', price_basis_unit: 'per g', line_cost: null }]
        : copy
    })
  }

  // Live total COGS calculation from draft rows
  const liveTotalCogs = useMemo(() => {
    return Math.round((calculateItemCOGS(rows) + Number.EPSILON) * 100) / 100
  }, [rows])

  const originalCogs = parseFloat(item?.current_cogs) || 0
  const hasRows = rows.some(r => r.ingredient_name?.trim() && parseFloat(r.quantity) > 0)

  // Handle Save
  async function handleSave() {
    if (!item?.id) return
    setErrorMsg('')
    setSuccessMsg('')

    // Filter valid rows
    const validRows = rows
      .filter(r => r.ingredient_name && r.ingredient_name.trim())
      .map(r => ({
        ingredient_name: r.ingredient_name.trim(),
        quantity: parseFloat(r.quantity) || 0,
        unit: r.unit || 'g',
        price: parseFloat(r.price) || 0,
        price_basis_unit: r.price_basis_unit || 'per g'
      }))

    if (validRows.length === 0 && rows.length > 0) {
      setErrorMsg('Please enter at least one ingredient name.')
      return
    }

    setIsSaving(true)
    try {
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('cc_token') || 'admin_pin_session'
        : 'admin_pin_session'

      const res = await fetch('/api/costing/item-ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-admin-pin': '1590'
        },
        body: JSON.stringify({
          menuItemId: item.id,
          rows: validRows
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save recipe')
      }

      setSuccessMsg(`Recipe saved! Making cost updated to ৳${(data.totalCogs || liveTotalCogs).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      setIsEditing(false)

      // Notify parent component
      if (onSaveSuccess) {
        onSaveSuccess({
          itemId: item.id,
          recipe: data.rows || validRows,
          current_cogs: data.totalCogs ?? liveTotalCogs
        })
      }
    } catch (err) {
      console.error('Recipe save error:', err)
      setErrorMsg(err.message || 'Failed to save recipe. Please check your network and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancel() {
    setErrorMsg('')
    setSuccessMsg('')
    if (item.recipe && item.recipe.length > 0) {
      setRows(item.recipe.map(r => ({
        ingredient_name: r.ingredient_name || '',
        quantity: r.quantity ?? '',
        unit: r.unit || 'g',
        price: r.price ?? '',
        price_basis_unit: r.price_basis_unit || 'per g',
        line_cost: r.line_cost ?? null
      })))
      setIsEditing(false)
    } else {
      onClose()
    }
  }

  if (!isOpen || !item) return null

  return (
    <div
      className="view-modal-overlay"
      style={styles.modalOverlay}
      onClick={() => { if (!isSaving) onClose() }}
    >
      <datalist id="ingredient-suggestions">
        {masterIngredients.map((name, i) => (
          <option key={i} value={name} />
        ))}
      </datalist>

      <div
        className="view-modal-card"
        style={{
          ...styles.modalCard,
          maxWidth: isEditing ? 820 : 640
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="view-modal-header" style={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={styles.modalIcon}>
              <Utensils size={20} color="var(--accent-brown, #7C3A1E)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 className="view-modal-title" style={styles.modalTitle}>{item.name}</h3>
                <span style={styles.catBadge}>{item.category || 'General'}</span>
                {isEditing && (
                  <span style={styles.editingBadge}>
                    <Edit3 size={11} /> Editing Mode
                  </span>
                )}
              </div>
              <div style={styles.modalSub}>
                Current Making Cost:{' '}
                <strong style={{ color: 'var(--accent-brown, #7C3A1E)', fontWeight: 800 }}>
                  {formatBDT(item.current_cogs)}
                </strong>
                {isEditing && liveTotalCogs !== originalCogs && (
                  <span style={{ marginLeft: 8, color: liveTotalCogs > originalCogs ? 'var(--danger, #DC2626)' : 'var(--success, #059669)', fontWeight: 700 }}>
                    <ArrowRight size={12} style={{ display: 'inline', margin: '0 2px' }} />
                    New: {formatBDT(liveTotalCogs)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isEditing ? (
              <button
                onClick={() => { setIsEditing(true); setSuccessMsg(''); setErrorMsg(''); }}
                style={styles.editBtn}
                title="Edit this recipe breakdown"
              >
                <Edit3 size={14} /> Edit Recipe
              </button>
            ) : (
              <button
                onClick={handleCancel}
                disabled={isSaving}
                style={styles.cancelBtn}
                title="Discard changes and return to view mode"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => { if (!isSaving) onClose() }}
              style={styles.modalCloseBtn}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── NOTIFICATIONS ── */}
        {errorMsg && (
          <div style={styles.errorAlert}>
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div style={styles.successAlert}>
            <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ── BODY ── */}
        <div className="view-modal-body" style={styles.modalBody}>
          {!isEditing ? (
            /* ──── VIEW MODE ──── */
            item.recipe && item.recipe.length > 0 ? (
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
                    {item.recipe.map((ing, idx) => (
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
                        {formatBDT(item.current_cogs)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={styles.emptyBox}>
                <AlertTriangle size={36} style={{ marginBottom: 10, opacity: 0.5, color: 'var(--warning, #D97706)' }} />
                <div style={{ fontWeight: 700, fontSize: 15 }}>No ingredient breakdown recorded</div>
                <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-muted, #6B7280)' }}>
                  This item has not yet been costed in the chef recipe database.
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  style={{ ...styles.editBtn, marginTop: 16, padding: '8px 16px', fontSize: 13 }}
                >
                  <Plus size={15} /> Build / Add Recipe
                </button>
              </div>
            )
          ) : (
            /* ──── EDIT MODE ──── */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted, #6B7280)' }}>
                  Add or edit the exact raw ingredients that go into making <strong>{item.name}</strong>.
                </div>
                <button
                  type="button"
                  onClick={addRow}
                  style={styles.addRowBtn}
                >
                  <Plus size={14} /> Add Ingredient Row
                </button>
              </div>

              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={styles.recipeTable}>
                  <thead>
                    <tr style={styles.recipeThead}>
                      <th style={{ ...styles.recipeTh, minWidth: 160 }}>Ingredient Name</th>
                      <th style={{ ...styles.recipeTh, minWidth: 80 }}>Qty</th>
                      <th style={{ ...styles.recipeTh, minWidth: 90 }}>Unit</th>
                      <th style={{ ...styles.recipeTh, minWidth: 90 }}>Rate (৳)</th>
                      <th style={{ ...styles.recipeTh, minWidth: 105 }}>Per (Basis)</th>
                      <th style={{ ...styles.recipeTh, minWidth: 90, textAlign: 'right' }}>Line Cost</th>
                      <th style={{ ...styles.recipeTh, width: 44, textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={idx} style={styles.recipeTr}>
                        <td style={styles.recipeTd}>
                          <input
                            type="text"
                            list="ingredient-suggestions"
                            value={row.ingredient_name}
                            onChange={e => updateRow(idx, 'ingredient_name', e.target.value)}
                            placeholder="e.g. Milk, Espresso..."
                            style={styles.input}
                          />
                        </td>
                        <td style={styles.recipeTd}>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={row.quantity}
                            onChange={e => updateRow(idx, 'quantity', e.target.value)}
                            placeholder="0"
                            style={{ ...styles.input, textAlign: 'right' }}
                          />
                        </td>
                        <td style={styles.recipeTd}>
                          <select
                            value={row.unit}
                            onChange={e => updateRow(idx, 'unit', e.target.value)}
                            style={styles.select}
                          >
                            {UNITS.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>
                        <td style={styles.recipeTd}>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={row.price}
                            onChange={e => updateRow(idx, 'price', e.target.value)}
                            placeholder="0.00"
                            style={{ ...styles.input, textAlign: 'right' }}
                          />
                        </td>
                        <td style={styles.recipeTd}>
                          <select
                            value={row.price_basis_unit}
                            onChange={e => updateRow(idx, 'price_basis_unit', e.target.value)}
                            style={styles.select}
                          >
                            {PRICE_BASIS_UNITS.map(pbu => (
                              <option key={pbu} value={pbu}>{pbu}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ ...styles.recipeTd, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {row.line_cost !== null ? formatBDT(row.line_cost) : <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>-</span>}
                        </td>
                        <td style={{ ...styles.recipeTd, textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            style={styles.trashBtn}
                            title="Remove ingredient"
                            disabled={rows.length <= 1 && !row.ingredient_name}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}

                    <tr style={styles.recipeTotalRow}>
                      <td colSpan={5} style={{ ...styles.recipeTd, fontWeight: 800 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>Total Calculated Making Cost (COGS)</span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
                            {rows.filter(r => r.ingredient_name?.trim()).length} ingredients
                          </span>
                        </div>
                      </td>
                      <td style={{ ...styles.recipeTd, textAlign: 'right', fontWeight: 900, color: 'var(--accent-brown, #7C3A1E)', fontSize: 16 }}>
                        {formatBDT(liveTotalCogs)}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-start' }}>
                <button
                  type="button"
                  onClick={addRow}
                  style={styles.addRowBtnSecondary}
                >
                  <Plus size={13} /> Add another ingredient
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={styles.modalFooter}>
          <div style={{ fontSize: 12, color: 'var(--text-muted, #6B7280)' }}>
            {isEditing ? (
              <span>Saving updates COGS on both dine-in & online profit calculations.</span>
            ) : (
              <span>Calculated based on cafe chef inventory standard costing.</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  style={styles.saveBtn}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Save Recipe
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  style={styles.editBtn}
                >
                  <Edit3 size={14} /> Edit Recipe
                </button>
                <button
                  onClick={onClose}
                  style={styles.closeFooterBtn}
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 250,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backdropFilter: 'blur(4px)',
  },
  modalCard: {
    background: 'var(--bg-surface, #FFFFFF)',
    borderRadius: 16,
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgba(0,0,0,0.25))',
    border: '1px solid var(--border-light, #E5E7EB)',
    overflow: 'hidden',
    transition: 'max-width 0.2s ease',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-light, #E5E7EB)',
    background: 'var(--bg-subtle, #F9FAFB)',
    flexShrink: 0,
    gap: 12,
  },
  modalIcon: {
    width: 38,
    height: 38,
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
    color: 'var(--text-primary, #111827)',
  },
  catBadge: {
    fontSize: 11,
    fontWeight: 600,
    background: 'var(--bg-subtle, #EEF1F8)',
    color: 'var(--text-secondary, #4B5563)',
    padding: '2px 8px',
    borderRadius: 6,
    border: '1px solid var(--border-light, #E5E7EB)',
  },
  editingBadge: {
    fontSize: 11,
    fontWeight: 700,
    background: 'rgba(124, 58, 30, 0.12)',
    color: 'var(--accent-brown, #7C3A1E)',
    padding: '2px 8px',
    borderRadius: 6,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  modalSub: {
    fontSize: 12,
    color: 'var(--text-muted, #6B7280)',
    marginTop: 3,
  },
  modalCloseBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted, #9CA3AF)',
    padding: 6,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s, color 0.15s',
  },
  editBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--accent-brown, #7C3A1E)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  cancelBtn: {
    background: 'transparent',
    color: 'var(--text-secondary, #4B5563)',
    border: '1px solid var(--border-light, #D1D5DB)',
    borderRadius: 8,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  saveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: '#107C41',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(16, 124, 65, 0.25)',
  },
  closeFooterBtn: {
    background: 'var(--bg-subtle, #F3F4F6)',
    color: 'var(--text-primary, #111827)',
    border: '1px solid var(--border-light, #D1D5DB)',
    borderRadius: 8,
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  addRowBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: 'rgba(124, 58, 30, 0.1)',
    color: 'var(--accent-brown, #7C3A1E)',
    border: '1px solid rgba(124, 58, 30, 0.25)',
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  addRowBtnSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'transparent',
    color: 'var(--accent-brown, #7C3A1E)',
    border: '1px dashed var(--border-medium, #CBD5E1)',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    justifyContent: 'center',
  },
  trashBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted, #9CA3AF)',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 4,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.15s',
  },
  modalBody: {
    padding: '16px 20px',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    flexGrow: 1,
  },
  modalFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderTop: '1px solid var(--border-light, #E5E7EB)',
    background: 'var(--bg-subtle, #F9FAFB)',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: 10,
  },
  recipeTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
    minWidth: 500,
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
    padding: '8px 8px',
    fontVariantNumeric: 'tabular-nums',
  },
  recipeTotalRow: {
    borderTop: '2px solid var(--border-medium, #D1D5DB)',
    background: 'var(--bg-subtle, #F9FAFB)',
  },
  input: {
    width: '100%',
    background: 'var(--bg-canvas, #FFFFFF)',
    border: '1px solid var(--border-light, #D1D5DB)',
    borderRadius: 6,
    padding: '6px 8px',
    fontSize: 13,
    color: 'var(--text-primary, #111827)',
    outline: 'none',
  },
  select: {
    width: '100%',
    background: 'var(--bg-canvas, #FFFFFF)',
    border: '1px solid var(--border-light, #D1D5DB)',
    borderRadius: 6,
    padding: '6px 6px',
    fontSize: 12,
    color: 'var(--text-primary, #111827)',
    outline: 'none',
    cursor: 'pointer',
  },
  emptyBox: {
    textAlign: 'center',
    padding: '36px 14px',
    color: 'var(--text-primary, #111827)',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--danger-bg, #FEE2E2)',
    color: 'var(--danger, #DC2626)',
    padding: '8px 16px',
    fontSize: 12,
    fontWeight: 600,
    borderBottom: '1px solid rgba(220, 38, 38, 0.2)',
  },
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--success-bg, #D1FAE5)',
    color: 'var(--success, #059669)',
    padding: '8px 16px',
    fontSize: 12,
    fontWeight: 600,
    borderBottom: '1px solid rgba(5, 150, 105, 0.2)',
  },
}

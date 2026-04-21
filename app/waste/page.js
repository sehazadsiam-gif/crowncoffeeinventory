'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import { useToast } from '../../components/Toast'
import { Trash2, Plus, AlertTriangle } from 'lucide-react'

export default function WastePage() {
    const { addToast } = useToast()
    const [ingredients, setIngredients] = useState([])
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [rows, setRows] = useState([
        { ingredient_id: '', quantity: '', reason: 'expired', notes: '' }
    ])

    useEffect(() => {
        fetchIngredients()
        fetchHistory()
    }, [date])

    async function fetchIngredients() {
        const { data } = await supabase
            .from('ingredients')
            .select('*')
            .order('name')
        setIngredients(data || [])
        setLoading(false)
    }

    async function fetchHistory() {
        const { data } = await supabase
            .from('stock_movements')
            .select('*, ingredients(name, unit)')
            .eq('movement_type', 'waste')
            .order('created_at', { ascending: false })
            .limit(50)
        setHistory(data || [])
    }

    function addRow() {
        setRows([...rows, { ingredient_id: '', quantity: '', reason: 'expired', notes: '' }])
    }

    function removeRow(idx) {
        setRows(rows.filter((_, i) => i !== idx))
    }

    function updateRow(idx, field, value) {
        const updated = [...rows]
        updated[idx][field] = value
        setRows(updated)
    }

    async function saveWaste() {
        const valid = rows.filter(r => r.ingredient_id && r.quantity && parseFloat(r.quantity) > 0)
        if (valid.length === 0) {
            addToast('Add at least one item with quantity', 'error')
            return
        }

        setSaving(true)
        try {
            for (const row of valid) {
                const qty = parseFloat(row.quantity)
                const ingredient = ingredients.find(i => i.id === row.ingredient_id)

                if (!ingredient) continue

                if (qty > ingredient.current_stock) {
                    addToast(
                        ingredient.name + ' only has ' + ingredient.current_stock + ' ' + ingredient.unit + ' in stock',
                        'error'
                    )
                    setSaving(false)
                    return
                }

                const { error: stockError } = await supabase
                    .from('ingredients')
                    .update({ current_stock: Math.max(0, ingredient.current_stock - qty) })
                    .eq('id', row.ingredient_id)

                if (stockError) throw stockError

                const { error: logError } = await supabase
                    .from('stock_movements')
                    .insert([{
                        ingredient_id: row.ingredient_id,
                        movement_type: 'waste',
                        quantity: -qty,
                        notes: row.reason + (row.notes ? ' - ' + row.notes : '')
                    }])

                if (logError) throw logError
            }

            addToast('Wastage declared. Stock updated.', 'success')
            setRows([{ ingredient_id: '', quantity: '', reason: 'expired', notes: '' }])
            fetchIngredients()
            fetchHistory()
        } catch (err) {
            addToast(err.message || 'Error saving wastage', 'error')
        } finally {
            setSaving(false)
        }
    }

    const reasons = [
        { value: 'expired', label: 'Expired' },
        { value: 'rotten', label: 'Rotten' },
        { value: 'spilled', label: 'Spilled' },
        { value: 'damaged', label: 'Damaged' },
        { value: 'other', label: 'Other' },
    ]

    const todayWaste = history.filter(h => {
        const d = new Date(h.created_at).toISOString().split('T')[0]
        return d === new Date().toISOString().split('T')[0]
    })

    const totalWasteCost = history.reduce((sum, h) => {
        const ingredient = ingredients.find(i => i.id === h.ingredient_id)
        return sum + Math.abs(h.quantity) * (ingredient?.cost_per_unit || 0)
    }, 0)

    const reasonColors = {
        expired: { bg: '#fce8e6', color: '#d93025' },
        rotten: { bg: '#fce8e6', color: '#d93025' },
        spilled: { bg: '#fef7e0', color: '#b07830' },
        damaged: { bg: '#fef7e0', color: '#b07830' },
        other: { bg: 'var(--bg-subtle)', color: 'var(--text-muted)' },
    }

    return (
        <div>
            <Navbar />
            <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 24px 60px' }}>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div>
                        <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                            Wastage Declaration
                        </h1>
                        <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                            Declare expired or damaged ingredients. Stock will be deducted automatically.
                        </p>
                    </div>
                </div>

                <div style={{
                    background: '#fef7e0',
                    border: '1px solid #f0d080',
                    borderLeft: '4px solid var(--accent-gold)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '13px',
                    color: 'var(--warning)'
                }}>
                    <AlertTriangle size={16} />
                    Once declared, stock deduction cannot be reversed automatically. Double check quantities before saving.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '28px' }}>
                    <div className="card" style={{ borderLeft: '3px solid #d93025' }}>
                        <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 600 }}>
                            Today Waste Items
                        </p>
                        <p style={{ fontSize: '28px', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#d93025', marginTop: '4px' }}>
                            {todayWaste.length}
                        </p>
                    </div>
                    <div className="card" style={{ borderLeft: '3px solid var(--warning)' }}>
                        <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 600 }}>
                            Total Waste Records
                        </p>
                        <p style={{ fontSize: '28px', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--warning)', marginTop: '4px' }}>
                            {history.length}
                        </p>
                    </div>
                    <div className="card" style={{ borderLeft: '3px solid var(--accent-brown)' }}>
                        <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 600 }}>
                            Estimated Waste Cost
                        </p>
                        <p style={{ fontSize: '28px', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent-brown)', marginTop: '4px' }}>
                            ৳{Math.round(totalWasteCost).toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="card" style={{ marginBottom: '28px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: '20px', color: 'var(--text-primary)' }}>
                        Declare Waste
                    </h3>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '3fr 1fr 1fr 2fr auto',
                        gap: '8px',
                        marginBottom: '8px',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--text-muted)',
                        fontWeight: 600,
                        padding: '0 4px'
                    }}>
                        <span>Ingredient</span>
                        <span>Quantity</span>
                        <span>Reason</span>
                        <span>Notes</span>
                        <span></span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {rows.map((row, idx) => {
                            const ingredient = ingredients.find(i => i.id === row.ingredient_id)
                            return (
                                <div key={idx} style={{
                                    display: 'grid',
                                    gridTemplateColumns: '3fr 1fr 1fr 2fr auto',
                                    gap: '8px',
                                    alignItems: 'center'
                                }}>
                                    <select
                                        className="input"
                                        value={row.ingredient_id}
                                        onChange={e => updateRow(idx, 'ingredient_id', e.target.value)}
                                    >
                                        <option value="">Select ingredient...</option>
                                        {ingredients.map(i => (
                                            <option key={i.id} value={i.id}>
                                                {i.name} (Stock: {i.current_stock} {i.unit})
                                            </option>
                                        ))}
                                    </select>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <input
                                            type="number"
                                            className="input"
                                            placeholder="0"
                                            value={row.quantity}
                                            onChange={e => updateRow(idx, 'quantity', e.target.value)}
                                            min="0"
                                        />
                                        {ingredient && (
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                {ingredient.unit}
                                            </span>
                                        )}
                                    </div>

                                    <select
                                        className="input"
                                        value={row.reason}
                                        onChange={e => updateRow(idx, 'reason', e.target.value)}
                                    >
                                        {reasons.map(r => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
                                        ))}
                                    </select>

                                    <input
                                        className="input"
                                        placeholder="Optional note..."
                                        value={row.notes}
                                        onChange={e => updateRow(idx, 'notes', e.target.value)}
                                    />

                                    <button
                                        onClick={() => removeRow(idx)}
                                        style={{
                                            background: 'transparent',
                                            border: '1px solid var(--border-medium)',
                                            borderRadius: '6px',
                                            padding: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#d93025'
                                        }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )
                        })}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                        <button
                            onClick={addRow}
                            className="btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <Plus size={14} /> Add Row
                        </button>
                        <button
                            onClick={saveWaste}
                            className="btn-primary"
                            disabled={saving}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <Trash2 size={14} /> {saving ? 'Saving...' : 'Declare Waste'}
                        </button>
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: '20px', color: 'var(--text-primary)' }}>
                        Wastage History
                    </h3>

                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}>
                            <div className="loader"></div>
                        </div>
                    ) : history.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px', fontSize: '14px' }}>
                            No wastage records found.
                        </p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{
                                    fontSize: '11px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    color: 'var(--text-muted)',
                                    borderBottom: '1px solid var(--border-light)'
                                }}>
                                    <th style={{ padding: '10px 0', textAlign: 'left', fontWeight: 600 }}>Date & Time</th>
                                    <th style={{ padding: '10px 0', textAlign: 'left', fontWeight: 600 }}>Ingredient</th>
                                    <th style={{ padding: '10px 0', textAlign: 'left', fontWeight: 600 }}>Quantity</th>
                                    <th style={{ padding: '10px 0', textAlign: 'left', fontWeight: 600 }}>Reason</th>
                                    <th style={{ padding: '10px 0', textAlign: 'left', fontWeight: 600 }}>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map(h => {
                                    const noteParts = (h.notes || '').split(' - ')
                                    const reason = noteParts[0] || 'other'
                                    const note = noteParts.slice(1).join(' - ')
                                    const reasonStyle = reasonColors[reason] || reasonColors.other

                                    return (
                                        <tr key={h.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                            <td style={{ padding: '12px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                                                {new Date(h.created_at).toLocaleString('en-GB', {
                                                    day: 'numeric', month: 'short',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </td>
                                            <td style={{ padding: '12px 0', fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                                                {h.ingredients?.name}
                                            </td>
                                            <td style={{ padding: '12px 0', fontSize: '14px', color: '#d93025', fontWeight: 600 }}>
                                                {Math.abs(h.quantity)} {h.ingredients?.unit}
                                            </td>
                                            <td style={{ padding: '12px 0' }}>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    padding: '3px 10px',
                                                    borderRadius: '20px',
                                                    textTransform: 'capitalize',
                                                    background: reasonStyle.bg,
                                                    color: reasonStyle.color
                                                }}>
                                                    {reason}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                                                {note || '-'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

            </main>
        </div>
    )
}
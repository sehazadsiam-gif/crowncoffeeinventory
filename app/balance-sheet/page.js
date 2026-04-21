'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import { useToast } from '../../components/Toast'
import { Plus, Trash2, Download, FileText } from 'lucide-react'

export default function BalanceSheetPage() {
  const router = useRouter()
    const { addToast } = useToast()
    const [sheets, setSheets] = useState([])
    const [selectedSheet, setSelectedSheet] = useState(null)
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [month, setMonth] = useState(new Date().getMonth() + 1)
    const [year, setYear] = useState(new Date().getFullYear())
    const [title, setTitle] = useState('')
    const [notes, setNotes] = useState('')
    const [rows, setRows] = useState([
        { category: '', description: '', amount: '', item_type: 'expense' }
    ])

      useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || role !== 'admin') {
      router.replace('/')
      return
    }
     fetchSheets() }, [month, year])

    async function fetchSheets() {
        setLoading(true)
        const { data } = await supabase
            .from('balance_sheet')
            .select('*')
            .eq('month', month)
            .eq('year', year)
            .order('created_at', { ascending: false })
        setSheets(data || [])
        setLoading(false)
    }

    async function fetchItems(sheetId) {
        const { data } = await supabase
            .from('balance_sheet_items')
            .select('*')
            .eq('balance_sheet_id', sheetId)
            .order('created_at')
        setItems(data || [])
    }

    async function createSheet() {
        if (!title) return addToast('Enter a title', 'error')
        const validRows = rows.filter(r => r.description && r.amount)
        if (validRows.length === 0) return addToast('Add at least one item', 'error')

        try {
            const { data, error } = await supabase
                .from('balance_sheet')
                .insert([{ title, month, year, notes }])
                .select()
            if (error) throw error

            const sheetId = data[0].id
            const itemInserts = validRows.map(r => ({
                balance_sheet_id: sheetId,
                category: r.category || 'General',
                description: r.description,
                amount: parseFloat(r.amount),
                item_type: r.item_type
            }))

            const { error: itemError } = await supabase
                .from('balance_sheet_items')
                .insert(itemInserts)
            if (itemError) throw itemError

            addToast('Balance sheet created', 'success')
            setTitle('')
            setNotes('')
            setRows([{ category: '', description: '', amount: '', item_type: 'expense' }])
            fetchSheets()
        } catch (err) {
            addToast(err.message || 'Error creating sheet', 'error')
        }
    }

    async function deleteSheet(id) {
        await supabase.from('balance_sheet').delete().eq('id', id)
        if (selectedSheet?.id === id) setSelectedSheet(null)
        fetchSheets()
        addToast('Sheet deleted', 'success')
    }

    function addRow() {
        setRows([...rows, { category: '', description: '', amount: '', item_type: 'expense' }])
    }

    function removeRow(idx) {
        setRows(rows.filter((_, i) => i !== idx))
    }

    function updateRow(idx, field, value) {
        const updated = [...rows]
        updated[idx][field] = value
        setRows(updated)
    }

    async function openSheet(sheet) {
        setSelectedSheet(sheet)
        await fetchItems(sheet.id)
    }

    function generatePDF(sheet, sheetItems) {
        const expenses = sheetItems.filter(i => i.item_type === 'expense')
        const incomes = sheetItems.filter(i => i.item_type === 'income')
        const totalExpense = expenses.reduce((s, i) => s + Number(i.amount), 0)
        const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0)
        const net = totalIncome - totalExpense

        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December']

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${sheet.title} - Balance Sheet</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Georgia', serif; color: #1C1410; padding: 40px; background: white; }
          .header { text-align: center; border-bottom: 2px solid #8B5E3C; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { font-size: 28px; letter-spacing: 2px; text-transform: uppercase; color: #8B5E3C; }
          .header h2 { font-size: 18px; font-weight: normal; margin-top: 6px; }
          .header p { font-size: 13px; color: #9C8A76; margin-top: 4px; }
          .section { margin-bottom: 28px; }
          .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #8B5E3C; border-bottom: 1px solid #E8E0D4; padding-bottom: 8px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          th { text-align: left; padding: 8px 12px; background: #F5F0E8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #9C8A76; }
          td { padding: 10px 12px; border-bottom: 1px solid #E8E0D4; }
          .amount { text-align: right; font-weight: 600; }
          .expense { color: #A63C3C; }
          .income { color: #3A7D5C; }
          .total-row td { font-weight: bold; font-size: 15px; background: #F5F0E8; }
          .summary { margin-top: 30px; border: 2px solid #8B5E3C; border-radius: 8px; padding: 20px; }
          .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E8E0D4; font-size: 15px; }
          .summary-row:last-child { border-bottom: none; font-size: 18px; font-weight: bold; padding-top: 12px; }
          .net-positive { color: #3A7D5C; }
          .net-negative { color: #A63C3C; }
          .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #9C8A76; border-top: 1px dotted #E8E0D4; padding-top: 16px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Crown Coffee</h1>
          <h2>${sheet.title}</h2>
          <p>${months[sheet.month - 1]} ${sheet.year} &bull; Generated on ${new Date().toLocaleDateString()}</p>
          ${sheet.notes ? '<p style="margin-top:8px;font-style:italic;">' + sheet.notes + '</p>' : ''}
        </div>

        ${incomes.length > 0 ? `
        <div class="section">
          <div class="section-title">Income</div>
          <table>
            <thead><tr><th>Category</th><th>Description</th><th style="text-align:right">Amount (৳)</th></tr></thead>
            <tbody>
              ${incomes.map(i => `
                <tr>
                  <td>${i.category}</td>
                  <td>${i.description}</td>
                  <td class="amount income">৳${Number(i.amount).toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="2">Total Income</td>
                <td class="amount income">৳${totalIncome.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : ''}

        ${expenses.length > 0 ? `
        <div class="section">
          <div class="section-title">Expenses</div>
          <table>
            <thead><tr><th>Category</th><th>Description</th><th style="text-align:right">Amount (৳)</th></tr></thead>
            <tbody>
              ${expenses.map(i => `
                <tr>
                  <td>${i.category}</td>
                  <td>${i.description}</td>
                  <td class="amount expense">৳${Number(i.amount).toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="2">Total Expenses</td>
                <td class="amount expense">৳${totalExpense.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="summary">
          ${incomes.length > 0 ? `<div class="summary-row"><span>Total Income</span><span class="income">৳${totalIncome.toLocaleString()}</span></div>` : ''}
          <div class="summary-row"><span>Total Expenses</span><span class="expense">৳${totalExpense.toLocaleString()}</span></div>
          <div class="summary-row">
            <span>Net ${net >= 0 ? 'Profit' : 'Loss'}</span>
            <span class="${net >= 0 ? 'net-positive' : 'net-negative'}">৳${Math.abs(net).toLocaleString()}</span>
          </div>
        </div>

        <div class="footer">
          Crown Coffee Inventory and Stock Management &bull; ${sheet.title} &bull; ${months[sheet.month - 1]} ${sheet.year}
        </div>
      </body>
      </html>
    `

        const win = window.open('', '_blank')
        win.document.write(html)
        win.document.close()
        win.focus()
        setTimeout(() => { win.print() }, 500)
    }

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December']

    const rowTotals = rows.reduce((acc, r) => {
        if (r.item_type === 'expense') acc.expense += parseFloat(r.amount) || 0
        else acc.income += parseFloat(r.amount) || 0
        return acc
    }, { expense: 0, income: 0 })

    return (
        <div>
            <Navbar />
            <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 24px 60px' }}>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
                    <div>
                        <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                            Balance Sheet
                        </h1>
                        <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                            Record and download monthly expenditure reports
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <select className="input" value={month} onChange={e => setMonth(Number(e.target.value))}>
                            {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>
                        <input
                            type="number"
                            className="input"
                            style={{ width: '100px' }}
                            value={year}
                            onChange={e => setYear(Number(e.target.value))}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>

                    <div className="card">
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', marginBottom: '20px' }}>
                            New Balance Sheet
                        </h3>

                        <div style={{ marginBottom: '16px' }}>
                            <label className="label">Title *</label>
                            <input
                                className="input"
                                placeholder="e.g. April 2026 Expenses"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label className="label">Notes</label>
                            <input
                                className="input"
                                placeholder="Optional notes..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 2fr 1fr 1fr auto',
                            gap: '6px',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: 'var(--text-muted)',
                            fontWeight: 600,
                            marginBottom: '8px',
                            padding: '0 2px'
                        }}>
                            <span>Category</span>
                            <span>Description</span>
                            <span>Amount</span>
                            <span>Type</span>
                            <span></span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                            {rows.map((row, idx) => (
                                <div key={idx} style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 2fr 1fr 1fr auto',
                                    gap: '6px',
                                    alignItems: 'center'
                                }}>
                                    <input
                                        className="input"
                                        placeholder="e.g. Rent"
                                        value={row.category}
                                        onChange={e => updateRow(idx, 'category', e.target.value)}
                                    />
                                    <input
                                        className="input"
                                        placeholder="Description"
                                        value={row.description}
                                        onChange={e => updateRow(idx, 'description', e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="0"
                                        value={row.amount}
                                        onChange={e => updateRow(idx, 'amount', e.target.value)}
                                    />
                                    <select
                                        className="input"
                                        value={row.item_type}
                                        onChange={e => updateRow(idx, 'item_type', e.target.value)}
                                    >
                                        <option value="expense">Expense</option>
                                        <option value="income">Income</option>
                                    </select>
                                    <button
                                        onClick={() => removeRow(idx)}
                                        style={{
                                            background: 'transparent',
                                            border: '1px solid var(--border-medium)',
                                            borderRadius: '6px',
                                            padding: '8px',
                                            cursor: 'pointer',
                                            color: '#d93025',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div style={{
                            background: 'var(--bg-subtle)',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            marginBottom: '16px',
                            display: 'flex',
                            gap: '24px',
                            fontSize: '13px'
                        }}>
                            <div>
                                <span style={{ color: 'var(--text-muted)' }}>Total Income: </span>
                                <span style={{ fontWeight: 700, color: '#3A7D5C' }}>৳{rowTotals.income.toLocaleString()}</span>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)' }}>Total Expense: </span>
                                <span style={{ fontWeight: 700, color: '#A63C3C' }}>৳{rowTotals.expense.toLocaleString()}</span>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)' }}>Net: </span>
                                <span style={{
                                    fontWeight: 700,
                                    color: (rowTotals.income - rowTotals.expense) >= 0 ? '#3A7D5C' : '#A63C3C'
                                }}>
                                    ৳{(rowTotals.income - rowTotals.expense).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={addRow}
                                className="btn-secondary"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Plus size={14} /> Add Row
                            </button>
                            <button
                                onClick={createSheet}
                                className="btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <FileText size={14} /> Save Sheet
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px' }}>
                            Saved Sheets — {months[month - 1]} {year}
                        </h3>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <div className="loader"></div>
                            </div>
                        ) : sheets.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                No balance sheets for this month.
                            </div>
                        ) : (
                            sheets.map(sheet => (
                                <div key={sheet.id} className="card" style={{ borderLeft: '3px solid var(--accent-brown)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text-primary)' }}>
                                                {sheet.title}
                                            </h4>
                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                {new Date(sheet.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                            {sheet.notes && (
                                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', fontStyle: 'italic' }}>
                                                    {sheet.notes}
                                                </p>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                onClick={async () => {
                                                    const { data } = await supabase
                                                        .from('balance_sheet_items')
                                                        .select('*')
                                                        .eq('balance_sheet_id', sheet.id)
                                                    generatePDF(sheet, data || [])
                                                }}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: 'var(--accent-brown)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <Download size={13} /> PDF
                                            </button>
                                            <button
                                                onClick={() => deleteSheet(sheet.id)}
                                                style={{
                                                    padding: '6px',
                                                    background: 'transparent',
                                                    border: '1px solid var(--border-medium)',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    color: '#d93025'
                                                }}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => selectedSheet?.id === sheet.id ? setSelectedSheet(null) : openSheet(sheet)}
                                        style={{
                                            marginTop: '12px',
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--accent-brown)',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            padding: 0
                                        }}
                                    >
                                        {selectedSheet?.id === sheet.id ? 'Hide details' : 'View details'}
                                    </button>

                                    {selectedSheet?.id === sheet.id && items.length > 0 && (
                                        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                <thead>
                                                    <tr style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}>
                                                        <th style={{ padding: '6px 0', textAlign: 'left', fontWeight: 600 }}>Category</th>
                                                        <th style={{ padding: '6px 0', textAlign: 'left', fontWeight: 600 }}>Description</th>
                                                        <th style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }}>Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {items.map(item => (
                                                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                                            <td style={{ padding: '8px 0', color: 'var(--text-muted)' }}>{item.category}</td>
                                                            <td style={{ padding: '8px 0', color: 'var(--text-primary)' }}>{item.description}</td>
                                                            <td style={{
                                                                padding: '8px 0',
                                                                textAlign: 'right',
                                                                fontWeight: 600,
                                                                color: item.item_type === 'expense' ? '#A63C3C' : '#3A7D5C'
                                                            }}>
                                                                {item.item_type === 'expense' ? '-' : '+'}৳{Number(item.amount).toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
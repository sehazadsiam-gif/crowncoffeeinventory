'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import { useToast } from '../../components/Toast'
import {
  Plus, Trash2, Download, FileText, Send,
  TrendingUp, TrendingDown, Wallet, BarChart3,
  ChevronLeft, ChevronRight, Sparkles, X,
  PlusCircle, BookOpen, Printer, ArrowUpRight, Check
} from 'lucide-react'

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

const EXPENSE_CATEGORIES = [
  'Raw Materials','Staff Salaries','Rent','Utilities','Maintenance',
  'Marketing','Transport','Miscellaneous'
]
const INCOME_CATEGORIES = [
  'Food Sales','Beverage Sales','Service Charge','Membership','Catering','Other'
]

export default function BalanceSheetPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [view, setView] = useState('list')          // 'list' | 'create' | 'detail'
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [sheets, setSheets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSheet, setSelectedSheet] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Create form
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState([
    { category: 'Raw Materials', description: '', amount: '', item_type: 'expense' },
    { category: 'Staff Salaries', description: '', amount: '', item_type: 'expense' },
    { category: 'Food Sales', description: '', amount: '', item_type: 'income' },
  ])

  // AI
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || (role !== 'admin' && role !== 'sub_admin')) { router.replace('/'); return }
    fetchSheets()
  }, [month, year])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function fetchSheets() {
    setLoading(true)
    const { data } = await supabase
      .from('balance_sheet').select('*')
      .eq('month', month).eq('year', year)
      .order('created_at', { ascending: false })
    setSheets(data || [])
    setLoading(false)
  }

  async function openSheet(sheet) {
    setSelectedSheet(sheet)
    setItemsLoading(true)
    setAiAnalysis(null)
    setChatMessages([])
    setView('detail')
    const { data } = await supabase
      .from('balance_sheet_items').select('*')
      .eq('balance_sheet_id', sheet.id).order('item_type').order('created_at')
    setSelectedItems(data || [])
    setItemsLoading(false)
  }

  async function createSheet() {
    if (!title.trim()) return addToast('Please enter a title', 'error')
    const valid = rows.filter(r => r.description.trim() && r.amount)
    if (valid.length === 0) return addToast('Add at least one item with description and amount', 'error')
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('balance_sheet').insert([{ title: title.trim(), month, year, notes }]).select()
      if (error) throw error
      const sheetId = data[0].id
      await supabase.from('balance_sheet_items').insert(
        valid.map(r => ({
          balance_sheet_id: sheetId,
          category: r.category || 'General',
          description: r.description.trim(),
          amount: parseFloat(r.amount),
          item_type: r.item_type
        }))
      )
      addToast('Balance sheet saved!', 'success')
      setTitle(''); setNotes('')
      setRows([
        { category: 'Raw Materials', description: '', amount: '', item_type: 'expense' },
        { category: 'Staff Salaries', description: '', amount: '', item_type: 'expense' },
        { category: 'Food Sales', description: '', amount: '', item_type: 'income' },
      ])
      await fetchSheets()
      setView('list')
    } catch (err) {
      addToast(err.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function deleteSheet(id, e) {
    e?.stopPropagation()
    if (!confirm('Delete this balance sheet?')) return
    await supabase.from('balance_sheet').delete().eq('id', id)
    if (selectedSheet?.id === id) { setSelectedSheet(null); setView('list') }
    fetchSheets()
    addToast('Deleted', 'success')
  }

  function addRow(type = 'expense') {
    setRows([...rows, { category: type === 'expense' ? 'Miscellaneous' : 'Other', description: '', amount: '', item_type: type }])
  }

  function removeRow(idx) {
    if (rows.length === 1) return
    setRows(rows.filter((_, i) => i !== idx))
  }

  function updateRow(idx, field, value) {
    const updated = [...rows]
    updated[idx][field] = value
    setRows(updated)
  }

  function printSheet(sheet, items) {
    const expenses = items.filter(i => i.item_type === 'expense')
    const incomes = items.filter(i => i.item_type === 'income')
    const totalExpense = expenses.reduce((s, i) => s + Number(i.amount), 0)
    const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0)
    const net = totalIncome - totalExpense

    const html = `<!DOCTYPE html><html><head><title>${sheet.title}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Georgia,serif;color:#1C1410;padding:40px;background:white}
      .header{text-align:center;border-bottom:2px solid #8B5E3C;padding-bottom:20px;margin-bottom:30px}
      .header h1{font-size:26px;letter-spacing:2px;text-transform:uppercase;color:#8B5E3C}
      .header h2{font-size:16px;font-weight:normal;margin-top:6px}
      .header p{font-size:12px;color:#9C8A76;margin-top:4px}
      .section{margin-bottom:24px}
      .section-title{font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:.1em;color:#8B5E3C;border-bottom:1px solid #E8E0D4;padding-bottom:6px;margin-bottom:10px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{text-align:left;padding:8px 10px;background:#F5F0E8;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#9C8A76}
      td{padding:9px 10px;border-bottom:1px solid #E8E0D4}
      .amt{text-align:right;font-weight:600}
      .exp{color:#A63C3C}.inc{color:#3A7D5C}
      .total td{font-weight:bold;background:#F5F0E8;font-size:14px}
      .summary{margin-top:24px;border:2px solid #8B5E3C;border-radius:8px;padding:20px}
      .sr{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #E8E0D4;font-size:14px}
      .sr:last-child{border-bottom:none;font-size:18px;font-weight:bold;padding-top:12px}
      .footer{margin-top:50px;text-align:center;font-size:11px;color:#9C8A76;border-top:1px dotted #E8E0D4;padding-top:14px}
    </style></head><body>
    <div class="header">
      <h1>Crown Coffee</h1><h2>${sheet.title}</h2>
      <p>${MONTHS[sheet.month-1]} ${sheet.year} • Generated ${new Date().toLocaleDateString()}</p>
      ${sheet.notes ? `<p style="margin-top:6px;font-style:italic">${sheet.notes}</p>` : ''}
    </div>
    ${incomes.length > 0 ? `<div class="section"><div class="section-title">Income</div>
    <table><thead><tr><th>Category</th><th>Description</th><th style="text-align:right">Amount (৳)</th></tr></thead>
    <tbody>${incomes.map(i => `<tr><td>${i.category}</td><td>${i.description}</td><td class="amt inc">৳${Number(i.amount).toLocaleString()}</td></tr>`).join('')}
    <tr class="total"><td colspan="2">Total Income</td><td class="amt inc">৳${totalIncome.toLocaleString()}</td></tr>
    </tbody></table></div>` : ''}
    ${expenses.length > 0 ? `<div class="section"><div class="section-title">Expenses</div>
    <table><thead><tr><th>Category</th><th>Description</th><th style="text-align:right">Amount (৳)</th></tr></thead>
    <tbody>${expenses.map(i => `<tr><td>${i.category}</td><td>${i.description}</td><td class="amt exp">৳${Number(i.amount).toLocaleString()}</td></tr>`).join('')}
    <tr class="total"><td colspan="2">Total Expenses</td><td class="amt exp">৳${totalExpense.toLocaleString()}</td></tr>
    </tbody></table></div>` : ''}
    <div class="summary">
      ${incomes.length > 0 ? `<div class="sr"><span>Total Income</span><span class="inc">৳${totalIncome.toLocaleString()}</span></div>` : ''}
      <div class="sr"><span>Total Expenses</span><span class="exp">৳${totalExpense.toLocaleString()}</span></div>
      <div class="sr"><span>Net ${net >= 0 ? 'Profit' : 'Loss'}</span>
      <span class="${net >= 0 ? 'inc' : 'exp'}">৳${Math.abs(net).toLocaleString()}</span></div>
    </div>
    <div class="footer">Crown Coffee • ${sheet.title} • ${MONTHS[sheet.month-1]} ${sheet.year}</div>
    </body></html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  async function analyzeWithAI() {
    const expenses = selectedItems.filter(i => i.item_type === 'expense')
    const incomes = selectedItems.filter(i => i.item_type === 'income')
    const totalExpense = expenses.reduce((s, i) => s + Number(i.amount), 0)
    const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0)
    if (totalIncome === 0 && totalExpense === 0) return addToast('No data to analyze', 'error')
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `You are a cafe business analyst for Crown Coffee Bangladesh.
Analyze this balance sheet for ${MONTHS[month-1]} ${year}:
Total Income: TK${totalIncome}, Total Expenses: TK${totalExpense}, Net: TK${totalIncome - totalExpense}
Income: ${JSON.stringify(incomes)}
Expenses: ${JSON.stringify(expenses)}
Give: 1. Summary 2. Top 3 improvement areas 3. Actionable recommendations.
Use plain text, no markdown headers, keep concise.`
          }]
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || 'Analysis failed'
      setAiAnalysis(text)
      setChatMessages([{ role: 'assistant', content: text }])
    } catch { addToast('AI analysis failed', 'error') }
    finally { setAiLoading(false) }
  }

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatLoading(true)
    const newMsgs = [...chatMessages, { role: 'user', content: userMsg }]
    setChatMessages(newMsgs)
    try {
      const expenses = selectedItems.filter(i => i.item_type === 'expense')
      const incomes = selectedItems.filter(i => i.item_type === 'income')
      const res = await fetch('/api/ai-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `You are a cafe business analyst for Crown Coffee. Balance sheet: ${JSON.stringify({ month: MONTHS[month-1], year, incomes, expenses })}. Be concise and practical. Use TK for currency.`,
          messages: newMsgs.map(m => ({ role: m.role, content: m.content }))
        })
      })
      const data = await res.json()
      setChatMessages([...newMsgs, { role: 'assistant', content: data.content?.[0]?.text || 'No response' }])
    } catch { addToast('Chat failed', 'error') }
    finally { setChatLoading(false) }
  }

  // ── Computed totals for current form rows ──
  const rowIncome = rows.reduce((s, r) => r.item_type === 'income' ? s + (parseFloat(r.amount) || 0) : s, 0)
  const rowExpense = rows.reduce((s, r) => r.item_type === 'expense' ? s + (parseFloat(r.amount) || 0) : s, 0)
  const rowNet = rowIncome - rowExpense

  // ── Computed totals for selected sheet ──
  const sheetIncome = selectedItems.filter(i => i.item_type === 'income').reduce((s, i) => s + Number(i.amount), 0)
  const sheetExpense = selectedItems.filter(i => i.item_type === 'expense').reduce((s, i) => s + Number(i.amount), 0)
  const sheetNet = sheetIncome - sheetExpense

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)', fontFamily: 'var(--font-sans)' }}>
      <Navbar />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 16px 80px' }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {view !== 'list' && (
              <button
                onClick={() => { setView('list'); setSelectedSheet(null) }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-surface)', border: '1.5px solid var(--border-light)', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 600, fontSize: '13px', fontFamily: 'var(--font-sans)' }}
              >
                <ChevronLeft size={16} /> Back
              </button>
            )}
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>
                {view === 'list' ? 'Balance Sheet' : view === 'create' ? 'New Balance Sheet' : selectedSheet?.title}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', margin: '4px 0 0' }}>
                {view === 'list' ? 'Monthly financial summary for Crown Coffee'
                  : view === 'create' ? 'Record income and expenses for this month'
                  : `${MONTHS[selectedSheet?.month - 1]} ${selectedSheet?.year}`}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Month + Year picker */}
            {(view === 'list' || view === 'create') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', border: '1.5px solid var(--border-light)', borderRadius: '12px', padding: '8px 14px' }}>
                <button onClick={() => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '2px' }}>
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', minWidth: '120px', textAlign: 'center', letterSpacing: '-0.01em' }}>
                  {MONTHS[month - 1]} {year}
                </span>
                <button onClick={() => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '2px' }}>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {view === 'list' && (
              <button
                onClick={() => setView('create')}
                className="btn-primary"
                style={{ gap: '8px' }}
              >
                <PlusCircle size={16} /> New Sheet
              </button>
            )}

            {view === 'detail' && selectedSheet && (
              <button
                onClick={async () => {
                  setItemsLoading(true)
                  const { data } = await supabase.from('balance_sheet_items').select('*').eq('balance_sheet_id', selectedSheet.id)
                  setItemsLoading(false)
                  printSheet(selectedSheet, data || [])
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '10px', border: '1.5px solid var(--border-light)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              >
                <Printer size={15} /> Print / PDF
              </button>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════
            VIEW: LIST
        ══════════════════════════════════════════ */}
        {view === 'list' && (
          <>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
                <div className="loader" />
              </div>
            ) : sheets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 24px', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>No sheets for {MONTHS[month - 1]} {year}</h3>
                <p style={{ color: 'var(--text-muted)', margin: '0 0 24px' }}>Create your first balance sheet for this month.</p>
                <button onClick={() => setView('create')} className="btn-primary">
                  <PlusCircle size={16} /> Create Balance Sheet
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sheets.map(sheet => {
                  return (
                    <SheetCard
                      key={sheet.id}
                      sheet={sheet}
                      onOpen={() => openSheet(sheet)}
                      onDelete={(e) => deleteSheet(sheet.id, e)}
                      onPrint={async (e) => {
                        e.stopPropagation()
                        const { data } = await supabase.from('balance_sheet_items').select('*').eq('balance_sheet_id', sheet.id)
                        printSheet(sheet, data || [])
                      }}
                    />
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════
            VIEW: CREATE
        ══════════════════════════════════════════ */}
        {view === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Title + Notes */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '18px', padding: '24px 22px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={16} style={{ color: 'var(--accent-blue)' }} /> Sheet Details
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="label">Sheet Title *</label>
                  <input className="input" placeholder={`e.g. ${MONTHS[month-1]} ${year} Summary`} value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className="label">Notes (optional)</label>
                  <input className="input" placeholder="Any additional notes..." value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Live totals bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { label: 'Total Income', value: rowIncome, color: 'var(--success)', bg: 'var(--success-bg)', icon: <TrendingUp size={18} />, prefix: '+' },
                { label: 'Total Expenses', value: rowExpense, color: 'var(--danger)', bg: 'var(--danger-bg)', icon: <TrendingDown size={18} />, prefix: '-' },
                { label: rowNet >= 0 ? 'Net Profit' : 'Net Loss', value: Math.abs(rowNet), color: rowNet >= 0 ? 'var(--success)' : 'var(--danger)', bg: rowNet >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)', icon: <Wallet size={18} />, prefix: rowNet >= 0 ? '+' : '-' },
              ].map((c, i) => (
                <div key={i} style={{ background: c.bg, border: `1px solid ${c.color}30`, borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ color: c.color, marginBottom: '6px', display: 'flex', justifyContent: 'center' }}>{c.icon}</div>
                  <p style={{ fontSize: '22px', fontWeight: 900, color: c.color, margin: 0, letterSpacing: '-0.02em' }}>{c.prefix}৳{c.value.toLocaleString()}</p>
                  <p style={{ fontSize: '11px', color: c.color, margin: '4px 0 0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>{c.label}</p>
                </div>
              ))}
            </div>

            {/* EXPENSE ROWS */}
            <ItemSection
              title="Expenses"
              type="expense"
              color="var(--danger)"
              bg="var(--danger-bg)"
              icon={<TrendingDown size={15} />}
              rows={rows.filter(r => r.item_type === 'expense')}
              allRows={rows}
              categories={EXPENSE_CATEGORIES}
              onAdd={() => addRow('expense')}
              onUpdate={updateRow}
              onRemove={removeRow}
            />

            {/* INCOME ROWS */}
            <ItemSection
              title="Income"
              type="income"
              color="var(--success)"
              bg="var(--success-bg)"
              icon={<TrendingUp size={15} />}
              rows={rows.filter(r => r.item_type === 'income')}
              allRows={rows}
              categories={INCOME_CATEGORIES}
              onAdd={() => addRow('income')}
              onUpdate={updateRow}
              onRemove={removeRow}
            />

            {/* Save */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setView('list')} className="btn-secondary">Cancel</button>
              <button onClick={createSheet} disabled={saving} className="btn-primary" style={{ gap: '8px', minWidth: '160px' }}>
                {saving ? <><div className="loader" style={{ width: '16px', height: '16px', borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} /> Saving...</> : <><Check size={16} /> Save Balance Sheet</>}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            VIEW: DETAIL
        ══════════════════════════════════════════ */}
        {view === 'detail' && selectedSheet && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Summary totals */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              {[
                { label: 'Total Income', value: sheetIncome, color: 'var(--success)', bg: 'var(--success-bg)', icon: <TrendingUp size={20} /> },
                { label: 'Total Expenses', value: sheetExpense, color: 'var(--danger)', bg: 'var(--danger-bg)', icon: <TrendingDown size={20} /> },
                { label: sheetNet >= 0 ? 'Net Profit' : 'Net Loss', value: Math.abs(sheetNet), color: sheetNet >= 0 ? 'var(--success)' : 'var(--danger)', bg: sheetNet >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)', icon: <Wallet size={20} /> },
                { label: 'Profit Margin', value: sheetIncome > 0 ? (((sheetNet) / sheetIncome) * 100).toFixed(1) + '%' : '—', raw: true, color: sheetNet >= 0 ? 'var(--success)' : 'var(--danger)', bg: sheetNet >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)', icon: <BarChart3 size={20} /> },
              ].map((c, i) => (
                <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-xs)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>{c.label}</p>
                    <div style={{ color: c.color, background: c.bg, padding: '6px', borderRadius: '8px' }}>{c.icon}</div>
                  </div>
                  <p style={{ fontSize: '24px', fontWeight: 900, color: c.color, margin: 0, letterSpacing: '-0.02em' }}>
                    {c.raw ? c.value : `৳${Number(c.value).toLocaleString()}`}
                  </p>
                </div>
              ))}
            </div>

            {/* Net profit visual bar */}
            {sheetIncome > 0 && (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Expense vs Income ratio</span>
                  <span style={{ fontWeight: 800, color: sheetNet >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {sheetNet >= 0 ? '✅ Profitable' : '⚠️ At a loss'}
                  </span>
                </div>
                <div style={{ height: '12px', background: 'var(--bg-subtle)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    position: 'absolute', height: '100%', left: 0,
                    width: Math.min(100, sheetIncome > 0 ? (sheetExpense / sheetIncome) * 100 : 100) + '%',
                    background: sheetNet >= 0 ? 'linear-gradient(90deg, var(--success), #34D399)' : 'linear-gradient(90deg, var(--danger), #F87171)',
                    borderRadius: '10px', transition: 'width 0.8s ease'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>Expenses: ৳{sheetExpense.toLocaleString()}</span>
                  <span>Income: ৳{sheetIncome.toLocaleString()}</span>
                </div>
              </div>
            )}

            {itemsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="loader" /></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
                {/* Income items */}
                {selectedItems.filter(i => i.item_type === 'income').length > 0 && (
                  <ItemTable
                    title="Income"
                    color="var(--success)"
                    bg="var(--success-bg)"
                    icon={<TrendingUp size={15} />}
                    items={selectedItems.filter(i => i.item_type === 'income')}
                    sign="+"
                  />
                )}
                {/* Expense items */}
                {selectedItems.filter(i => i.item_type === 'expense').length > 0 && (
                  <ItemTable
                    title="Expenses"
                    color="var(--danger)"
                    bg="var(--danger-bg)"
                    icon={<TrendingDown size={15} />}
                    items={selectedItems.filter(i => i.item_type === 'expense')}
                    sign="-"
                  />
                )}
              </div>
            )}

            {/* Notes */}
            {selectedSheet.notes && (
              <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderLeft: '4px solid var(--accent-blue)', borderRadius: '12px', padding: '14px 18px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                📝 {selectedSheet.notes}
              </div>
            )}

            {/* AI Analysis */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '18px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ color: 'white', fontWeight: 800, fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} /> AI Business Analyst
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12.5px', margin: '3px 0 0' }}>Get AI-powered insights on your financials</p>
                </div>
                <button
                  onClick={analyzeWithAI}
                  disabled={aiLoading}
                  style={{
                    padding: '9px 18px', borderRadius: '10px',
                    background: aiLoading ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.18)',
                    border: '1.5px solid rgba(255,255,255,0.35)',
                    color: 'white', fontWeight: 700, fontSize: '13px',
                    cursor: aiLoading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)',
                    display: 'flex', alignItems: 'center', gap: '7px'
                  }}
                >
                  {aiLoading ? <><div className="loader" style={{ width: '14px', height: '14px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Analyzing...</> : <><Sparkles size={14} /> Analyze</>}
                </button>
              </div>

              {aiAnalysis && (
                <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-subtle)' }}>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>{aiAnalysis}</p>
                </div>
              )}

              {chatMessages.length > 1 && (
                <div style={{ maxHeight: '260px', overflowY: 'auto', padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {chatMessages.slice(1).map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '80%', padding: '10px 14px', fontSize: '13.5px', lineHeight: 1.6,
                        borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: msg.role === 'user' ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : 'var(--bg-subtle)',
                        color: msg.role === 'user' ? 'white' : 'var(--text-secondary)',
                        border: msg.role !== 'user' ? '1px solid var(--border-light)' : 'none',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ display: 'flex', gap: '5px', padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: '14px 14px 14px 4px', width: 'fit-content' }}>
                      {[0,1,2].map(i => <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--text-muted)', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />)}
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              {aiAnalysis && (
                <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '10px' }}>
                  <input
                    className="input"
                    placeholder="Ask about your finances..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChat()}
                    style={{ flex: 1 }}
                  />
                  <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} className="btn-primary" style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: 'none' }}>
                    <Send size={15} />
                  </button>
                </div>
              )}

              {!aiAnalysis && (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Sparkles size={28} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Click "Analyze" to get AI insights</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @media (max-width: 480px) {
          .sheet-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

/* ── Sheet Card (list view) ── */
function SheetCard({ sheet, onOpen, onDelete, onPrint }) {
  return (
    <div
      onClick={onOpen}
      style={{
        background: 'var(--bg-surface)', border: '1.5px solid var(--border-light)',
        borderRadius: '16px', padding: '20px 22px', cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: '16px', flexWrap: 'wrap', transition: 'all 0.2s ease',
        boxShadow: 'var(--shadow-xs)'
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '46px', height: '46px', borderRadius: '13px', background: 'var(--accent-blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileText size={20} style={{ color: 'var(--accent-blue)' }} />
        </div>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 3px', letterSpacing: '-0.01em' }}>{sheet.title}</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Created {new Date(sheet.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            {sheet.notes ? ` · ${sheet.notes}` : ''}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
        <button onClick={onPrint} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '9px', border: '1.5px solid var(--border-light)', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          <Printer size={14} /> Print
        </button>
        <button onClick={onDelete} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '9px', border: '1.5px solid var(--danger-bg)', background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          <Trash2 size={14} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-blue)', fontSize: '13px', fontWeight: 700 }}>
          View <ArrowUpRight size={14} />
        </div>
      </div>
    </div>
  )
}

/* ── Item Section (create form) ── */
function ItemSection({ title, type, color, bg, icon, rows, allRows, categories, onAdd, onUpdate, onRemove }) {
  const indices = allRows.map((r, i) => r.item_type === type ? i : -1).filter(i => i !== -1)

  return (
    <div style={{ background: 'var(--bg-surface)', border: `1.5px solid ${color}30`, borderRadius: '18px', overflow: 'hidden' }}>
      <div style={{ background: bg, padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 800, color, margin: 0, display: 'flex', alignItems: 'center', gap: '7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {icon} {title}
          <span style={{ background: color + '25', color, borderRadius: '20px', padding: '1px 9px', fontSize: '12px' }}>{indices.length}</span>
        </h3>
        <button onClick={onAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: color, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          <Plus size={14} /> Add Row
        </button>
      </div>

      <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {indices.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px', fontSize: '13.5px' }}>No {title.toLowerCase()} items yet. Click "Add Row".</p>
        ) : indices.map((globalIdx) => {
          const row = allRows[globalIdx]
          return (
            <div key={globalIdx} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 130px auto', gap: '10px', alignItems: 'center' }}>
              <select className="input" value={row.category} onChange={e => onUpdate(globalIdx, 'category', e.target.value)}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input className="input" placeholder="Description (e.g. Monthly Rent)" value={row.description} onChange={e => onUpdate(globalIdx, 'description', e.target.value)} />
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '14px', pointerEvents: 'none' }}>৳</span>
                <input type="number" className="input" placeholder="0" value={row.amount} onChange={e => onUpdate(globalIdx, 'amount', e.target.value)} style={{ paddingLeft: '26px' }} />
              </div>
              <button onClick={() => onRemove(globalIdx)} style={{ width: '38px', height: '38px', border: '1.5px solid var(--danger-bg)', background: 'var(--danger-bg)', borderRadius: '9px', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <X size={15} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Item Table (detail view) ── */
function ItemTable({ title, color, bg, icon, items, sign }) {
  const total = items.reduce((s, i) => s + Number(i.amount), 0)
  return (
    <div style={{ background: 'var(--bg-surface)', border: `1.5px solid ${color}25`, borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ background: bg, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '13.5px', fontWeight: 800, color, margin: 0, display: 'flex', alignItems: 'center', gap: '7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {icon} {title}
        </h3>
        <span style={{ fontSize: '18px', fontWeight: 900, color }}>{sign}৳{total.toLocaleString()}</span>
      </div>
      <div style={{ padding: '8px 0' }}>
        {items.map((item, i) => (
          <div key={item.id || i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            padding: '12px 18px', borderBottom: i < items.length - 1 ? '1px solid var(--border-light)' : 'none',
            gap: '12px'
          }}>
            <div>
              <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{item.description}</p>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '2px 0 0', textTransform: 'capitalize' }}>{item.category}</p>
            </div>
            <span style={{ fontSize: '15px', fontWeight: 800, color, flexShrink: 0 }}>{sign}৳{Number(item.amount).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
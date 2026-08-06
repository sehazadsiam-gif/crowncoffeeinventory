'use client'
import { useState, useEffect } from 'react'
import { X, Calculator, Users, ChevronDown, RotateCcw, CheckCircle } from 'lucide-react'

export default function PayrollCalculator({ staff, payroll, waivedStaff, month, year, monthName, onApply, onClose }) {
  const [tab, setTab] = useState('single') // 'single' | 'all' | 'calc'
  // --- Normal calculator state ---
  const [calcDisplay, setCalcDisplay] = useState('0')
  const [calcPrev, setCalcPrev] = useState(null)
  const [calcOp, setCalcOp] = useState(null)
  const [calcReset, setCalcReset] = useState(false)
  const [calcHistory, setCalcHistory] = useState([])
  const [selectedId, setSelectedId] = useState(staff[0]?.id || '')
  const [sandbox, setSandbox] = useState({})
  const [applied, setApplied] = useState(false)

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']

  // ---- Normal calculator logic ----
  function calcInput(val) {
    if (calcReset) { setCalcDisplay(String(val)); setCalcReset(false); return }
    if (calcDisplay === '0' && val !== '.') { setCalcDisplay(String(val)); return }
    if (val === '.' && calcDisplay.includes('.')) return
    setCalcDisplay(prev => prev + val)
  }
  function calcSetOp(op) {
    setCalcPrev(parseFloat(calcDisplay))
    setCalcOp(op)
    setCalcReset(true)
  }
  function calcEquals() {
    if (calcOp === null || calcPrev === null) return
    const cur = parseFloat(calcDisplay)
    let result
    if (calcOp === '+') result = calcPrev + cur
    else if (calcOp === '-') result = calcPrev - cur
    else if (calcOp === '×') result = calcPrev * cur
    else if (calcOp === '÷') result = cur === 0 ? 'Error' : calcPrev / cur
    const rounded = typeof result === 'number' ? parseFloat(result.toFixed(8)) : result
    setCalcHistory(prev => [`${calcPrev} ${calcOp} ${cur} = ${rounded}`, ...prev].slice(0, 5))
    setCalcDisplay(String(rounded))
    setCalcOp(null)
    setCalcPrev(null)
    setCalcReset(true)
  }
  function calcPercent() {
    setCalcDisplay(String(parseFloat(calcDisplay) / 100))
  }
  function calcToggleSign() {
    setCalcDisplay(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev)
  }
  function calcClear() {
    setCalcDisplay('0'); setCalcPrev(null); setCalcOp(null); setCalcReset(false)
  }
  function calcBackspace() {
    setCalcDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0')
  }

  // When selected employee changes, copy current payroll data into sandbox
  useEffect(() => {
    if (!selectedId) return
    const row = payroll[selectedId] || {}
    setSandbox({
      overtime_hours: row.overtime_hours || 0,
      overtime_pay: row.overtime_pay || 0,
      service_charge: row.service_charge || 0,
      bonus: row.bonus || 0,
      lunch_dinner: row.lunch_dinner || 0,
      morning_food: row.morning_food || 0,
      miscellaneous: row.miscellaneous || 0,
      advance_taken: row.advance_taken || 0,
      others_taken: row.others_taken || 0,
      manual_unpaid_days: row.manual_unpaid_days ?? null,
      waived_unpaid_days: row.waived_unpaid_days || 0,
      absent_days: row.absent_days || 0,
      late_days: row.late_days || 0,
      late_deduction: row.late_deduction || 0,
      present_days: row.present_days || 0,
    })
    setApplied(false)
  }, [selectedId, payroll])

  function calc(s, p, isWaived) {
    if (!s || !p) return { gross: 0, deductions: 0, net: 0, breakdown: {} }
    const base = Number(s.base_salary) || 0
    const perDay = Math.round(base / 30)
    const perHourRate = s.hourly_rate || Math.floor(Math.floor(base / 30) / 10)
    const ot = p.overtime_pay !== undefined && p.overtime_pay !== null && p.overtime_pay !== ''
      ? Number(p.overtime_pay)
      : (Number(p.overtime_hours) || 0) * perHourRate
    const sc = Number(p.service_charge) || 0
    const bonus = Number(p.bonus) || 0
    const lunch = Number(p.lunch_dinner) || 0
    const morn = Number(p.morning_food) || 0
    const misc = Number(p.miscellaneous) || 0
    const adv = Number(p.advance_taken) || 0
    const others = Number(p.others_taken) || 0
    const absentDays = Number(p.absent_days) || 0
    const autoUnpaid = Math.max(0, absentDays - 4)
    const waivedDays = Number(p.waived_unpaid_days) || 0
    const finalUnpaidDays = p.manual_unpaid_days !== null && p.manual_unpaid_days !== undefined
      ? Number(p.manual_unpaid_days)
      : Math.max(0, autoUnpaid - waivedDays)
    const unpaidDeduction = finalUnpaidDays * perDay
    const lateDeduction = (isWaived !== undefined ? isWaived : Boolean(p.late_waived)) ? 0 : (Number(p.late_deduction) || 0)
    const gross = base + ot + sc + bonus + lunch + morn + misc
    const deductions = adv + others + unpaidDeduction + lateDeduction
    const net = Math.round(gross - deductions)
    return {
      gross: Math.round(gross),
      deductions: Math.round(deductions),
      net,
      breakdown: { base, ot, sc, bonus, lunch, morn, misc, adv, others, unpaidDeduction, lateDeduction, finalUnpaidDays }
    }
  }

  const selectedStaff = staff.find(s => s.id === selectedId)
  const isWaived = waivedStaff[selectedId] || false
  const result = calc(selectedStaff, sandbox, isWaived)
  const earningsPct = result.gross > 0 ? Math.round((result.gross / (result.gross + result.deductions)) * 100) : 80

  function handleSandboxChange(field, value) {
    setSandbox(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'overtime_hours') {
        const s = staff.find(st => st.id === selectedId)
        const perHourRate = s?.hourly_rate || Math.floor(Math.floor((Number(s?.base_salary) || 0) / 30) / 10)
        updated.overtime_pay = (Number(value) || 0) * perHourRate
      }
      return updated
    })
    setApplied(false)
  }

  function handleReset() {
    const row = payroll[selectedId] || {}
    setSandbox({
      overtime_hours: row.overtime_hours || 0,
      overtime_pay: row.overtime_pay || 0,
      service_charge: row.service_charge || 0,
      bonus: row.bonus || 0,
      lunch_dinner: row.lunch_dinner || 0,
      morning_food: row.morning_food || 0,
      miscellaneous: row.miscellaneous || 0,
      advance_taken: row.advance_taken || 0,
      others_taken: row.others_taken || 0,
      manual_unpaid_days: row.manual_unpaid_days ?? null,
      waived_unpaid_days: row.waived_unpaid_days || 0,
      absent_days: row.absent_days || 0,
      late_days: row.late_days || 0,
      late_deduction: row.late_deduction || 0,
      present_days: row.present_days || 0,
    })
    setApplied(false)
  }

  function handleApply() {
    onApply(selectedId, sandbox)
    setApplied(true)
  }

  const inputSx = {
    width: '90px', padding: '5px 8px', fontSize: '13px', borderRadius: '6px',
    border: '1px solid #E2E8F0', outline: 'none', background: '#F8FAFC',
    color: '#1E293B', textAlign: 'right'
  }

  // All staff summary
  const allSummary = staff.map(s => {
    const row = payroll[s.id] || {}
    const r = calc(s, row, waivedStaff[s.id] || false)
    const paid = 0
    return { ...s, ...r }
  })
  const grandNet = allSummary.reduce((a, s) => a + s.net, 0)
  const grandGross = allSummary.reduce((a, s) => a + s.gross, 0)
  const grandDeductions = allSummary.reduce((a, s) => a + s.deductions, 0)

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 200, backdropFilter: 'blur(2px)'
      }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100vh',
        width: '460px', maxWidth: '96vw',
        background: 'white', zIndex: 201,
        boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'Inter, sans-serif',
        animation: 'slideInRight 0.25s ease'
      }}>
        <style>{`
          @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          .calc-input:focus { border-color: #6366F1 !important; background: white !important; }
          .calc-tab { cursor: pointer; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; border: none; transition: all 0.15s; }
          .calc-tab.active { background: #1E293B; color: white; }
          .calc-tab.inactive { background: #F1F5F9; color: #64748B; }
          .calc-tab.inactive:hover { background: #E2E8F0; }
          .row-line { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #F1F5F9; }
          .row-line:last-child { border-bottom: none; }
          .earn-val { color: #10B981; font-weight: 700; font-size: 13px; }
          .dedu-val { color: #EF4444; font-weight: 700; font-size: 13px; }
          .row-label { font-size: 12px; color: #475569; }
        `}</style>

        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #E2E8F0', background: 'linear-gradient(135deg, #1E293B, #334155)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '8px' }}>
                <Calculator size={18} color="white" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'white' }}>Payroll Calculator</h2>
                <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>{monthName} {year}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'white', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button className={`calc-tab ${tab === 'single' ? 'active' : 'inactive'}`} onClick={() => setTab('single')}>
              👤 Breakdown
            </button>
            <button className={`calc-tab ${tab === 'all' ? 'active' : 'inactive'}`} onClick={() => setTab('all')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Users size={13} /> All Staff</span>
            </button>
            <button className={`calc-tab ${tab === 'calc' ? 'active' : 'inactive'}`} onClick={() => setTab('calc')}>
              🔢 Calc
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {tab === 'single' && (
            <>
              {/* Employee selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Select Employee</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedId}
                    onChange={e => setSelectedId(e.target.value)}
                    style={{ width: '100%', padding: '10px 32px 10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '14px', fontWeight: 600, color: '#1E293B', background: '#F8FAFC', appearance: 'none', outline: 'none', cursor: 'pointer' }}
                  >
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name} — {s.designation}</option>)}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Attendance summary pills */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Present', val: sandbox.present_days, color: '#10B981', bg: '#ECFDF5' },
                  { label: 'Absent', val: sandbox.absent_days, color: '#EF4444', bg: '#FEF2F2' },
                  { label: 'Late', val: sandbox.late_days, color: '#F59E0B', bg: '#FFFBEB' },
                ].map(item => (
                  <div key={item.label} style={{ background: item.bg, border: `1px solid ${item.color}30`, borderRadius: '20px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '11px', color: item.color, fontWeight: 700 }}>{item.val}d</span>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* EARNINGS */}
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>+ Earnings</p>
                {[
                  { label: 'Base Salary', field: null, val: `৳${(Number(selectedStaff?.base_salary) || 0).toLocaleString()}` },
                  { label: 'Overtime Hours', field: 'overtime_hours', type: 'hours', extra: `= ৳${Number(sandbox.overtime_pay || 0).toLocaleString()}` },
                  { label: 'Service Charge', field: 'service_charge', type: 'money' },
                  { label: 'Bonus', field: 'bonus', type: 'money' },
                  { label: 'Lunch + Dinner', field: 'lunch_dinner', type: 'money' },
                  { label: 'Morning Food', field: 'morning_food', type: 'money' },
                  { label: 'Miscellaneous (+)', field: 'miscellaneous', type: 'money' },
                ].map(item => (
                  <div key={item.label} className="row-line">
                    <div>
                      <span className="row-label">{item.label}</span>
                      {item.extra && <span style={{ fontSize: '10px', color: '#10B981', marginLeft: '6px', fontWeight: 600 }}>{item.extra}</span>}
                    </div>
                    {item.field ? (
                      <input
                        type="number"
                        className="calc-input"
                        style={inputSx}
                        value={sandbox[item.field] || ''}
                        placeholder="0"
                        onChange={e => handleSandboxChange(item.field, e.target.value)}
                      />
                    ) : (
                      <span className="earn-val">{item.val}</span>
                    )}
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '2px solid #BBF7D0' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#166534' }}>Gross Earnings</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#10B981' }}>৳{result.gross.toLocaleString()}</span>
                </div>
              </div>

              {/* DEDUCTIONS */}
              <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 800, color: '#9B1C1C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>− Deductions</p>
                {[
                  { label: 'Advance Taken', field: 'advance_taken', type: 'money' },
                  { label: 'Others', field: 'others_taken', type: 'money' },
                ].map(item => (
                  <div key={item.label} className="row-line">
                    <span className="row-label">{item.label}</span>
                    <input type="number" className="calc-input" style={{ ...inputSx, color: '#EF4444' }} value={sandbox[item.field] || ''} placeholder="0" onChange={e => handleSandboxChange(item.field, e.target.value)} />
                  </div>
                ))}
                <div className="row-line">
                  <div>
                    <span className="row-label">Unpaid Leave</span>
                    <span style={{ fontSize: '10px', color: '#94A3B8', marginLeft: '6px' }}>
                      ({result.breakdown.finalUnpaidDays ?? 0}d × ৳{Math.round((Number(selectedStaff?.base_salary) || 0) / 30).toLocaleString()})
                    </span>
                  </div>
                  <span className="dedu-val">-৳{(result.breakdown.unpaidDeduction || 0).toLocaleString()}</span>
                </div>
                <div className="row-line">
                  <span className="row-label">Late Deduction{isWaived ? ' (Waived)' : ''}</span>
                  <span className="dedu-val" style={{ textDecoration: isWaived ? 'line-through' : 'none' }}>
                    -{isWaived ? '৳0' : `৳${(result.breakdown.lateDeduction || 0).toLocaleString()}`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '2px solid #FED7D7' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#9B1C1C' }}>Total Deductions</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#EF4444' }}>-৳{result.deductions.toLocaleString()}</span>
                </div>
              </div>

              {/* Visual bar */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ height: '10px', borderRadius: '10px', background: '#FED7D7', overflow: 'hidden', marginBottom: '6px' }}>
                  <div style={{ height: '100%', width: `${earningsPct}%`, background: 'linear-gradient(90deg, #10B981, #34D399)', borderRadius: '10px', transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94A3B8' }}>
                  <span>🟢 Earnings {earningsPct}%</span>
                  <span>🔴 Deductions {100 - earningsPct}%</span>
                </div>
              </div>

              {/* NET PAY */}
              <div style={{ background: 'linear-gradient(135deg, #1E293B, #334155)', borderRadius: '12px', padding: '16px 18px', marginBottom: '16px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontWeight: 700 }}>💰 Net Pay</p>
                <p style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: '#60A5FA' }}>৳{result.net.toLocaleString()}</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Sandbox mode — not saved yet</p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleReset} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'white', color: '#64748B', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <RotateCcw size={14} /> Reset
                </button>
                <button onClick={handleApply} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: applied ? '#10B981' : '#6366F1', color: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'background 0.2s' }}>
                  {applied ? <><CheckCircle size={14} /> Applied!</> : <><Calculator size={14} /> Apply to Payroll</>}
                </button>
              </div>
            </>
          )}

          {tab === 'calc' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Display */}
              <div style={{ background: '#0F172A', borderRadius: '14px', padding: '20px 18px 16px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #6366F1, #8B5CF6, #EC4899)' }} />
                {calcOp && (
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>
                    {calcPrev} {calcOp}
                  </p>
                )}
                <p style={{
                  margin: 0, fontSize: calcDisplay.length > 12 ? '20px' : '32px',
                  fontWeight: 800, color: 'white', textAlign: 'right',
                  letterSpacing: '-1px', wordBreak: 'break-all', minHeight: '40px'
                }}>{calcDisplay}</p>
                {calcHistory.length > 0 && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '10px', color: 'rgba(255,255,255,0.25)', textAlign: 'right' }}>
                    {calcHistory[0]}
                  </p>
                )}
              </div>

              {/* Button grid */}
              {[
                [
                  { label: 'AC', fn: calcClear, style: { background: '#374151', color: '#F87171', fontWeight: 800 } },
                  { label: '+/-', fn: calcToggleSign, style: { background: '#374151', color: '#94A3B8' } },
                  { label: '%', fn: calcPercent, style: { background: '#374151', color: '#94A3B8' } },
                  { label: '÷', fn: () => calcSetOp('÷'), style: { background: '#6366F1', color: 'white', fontWeight: 800 }, isOp: true },
                ],
                [
                  { label: '7', fn: () => calcInput('7') },
                  { label: '8', fn: () => calcInput('8') },
                  { label: '9', fn: () => calcInput('9') },
                  { label: '×', fn: () => calcSetOp('×'), style: { background: '#6366F1', color: 'white', fontWeight: 800 }, isOp: true },
                ],
                [
                  { label: '4', fn: () => calcInput('4') },
                  { label: '5', fn: () => calcInput('5') },
                  { label: '6', fn: () => calcInput('6') },
                  { label: '-', fn: () => calcSetOp('-'), style: { background: '#6366F1', color: 'white', fontWeight: 800 }, isOp: true },
                ],
                [
                  { label: '1', fn: () => calcInput('1') },
                  { label: '2', fn: () => calcInput('2') },
                  { label: '3', fn: () => calcInput('3') },
                  { label: '+', fn: () => calcSetOp('+'), style: { background: '#6366F1', color: 'white', fontWeight: 800 }, isOp: true },
                ],
                [
                  { label: '⌫', fn: calcBackspace, style: { background: '#1E293B', color: '#F59E0B' } },
                  { label: '0', fn: () => calcInput('0') },
                  { label: '.', fn: () => calcInput('.') },
                  { label: '=', fn: calcEquals, style: { background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: 'white', fontWeight: 800 }, isOp: true },
                ],
              ].map((row, ri) => (
                <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  {row.map(btn => (
                    <button
                      key={btn.label}
                      onClick={btn.fn}
                      style={{
                        padding: '18px 0',
                        borderRadius: '12px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '18px',
                        fontWeight: 600,
                        background: '#1E293B',
                        color: 'white',
                        transition: 'all 0.1s',
                        ...(btn.style || {}),
                        boxShadow: btn.isOp ? '0 4px 12px rgba(99,102,241,0.3)' : '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.transform = 'scale(0.96)' }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)' }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              ))}

              {/* History */}
              {calcHistory.length > 1 && (
                <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '10px 14px' }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>History</p>
                  {calcHistory.map((h, i) => (
                    <p key={i} style={{ margin: '2px 0', fontSize: '12px', color: i === 0 ? '#6366F1' : '#94A3B8', fontWeight: i === 0 ? 700 : 400 }}>{h}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'all' && (
            <>
              <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px' }}>Current payroll values for <strong>{monthName} {year}</strong>. Click an employee to edit their breakdown.</p>

              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                {[
                  { label: 'Total Gross', val: `৳${grandGross.toLocaleString()}`, color: '#10B981', bg: '#ECFDF5' },
                  { label: 'Total Deductions', val: `-৳${grandDeductions.toLocaleString()}`, color: '#EF4444', bg: '#FEF2F2' },
                  { label: 'Total Net Pay', val: `৳${grandNet.toLocaleString()}`, color: '#6366F1', bg: '#EEF2FF' },
                ].map(c => (
                  <div key={c.label} style={{ background: c.bg, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 3px 0', fontSize: '10px', color: '#64748B', fontWeight: 600 }}>{c.label}</p>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: c.color }}>{c.val}</p>
                  </div>
                ))}
              </div>

              {/* Staff list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {allSummary.map(s => (
                  <div key={s.id}
                    onClick={() => { setTab('single'); setSelectedId(s.id) }}
                    style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#EEF2FF'}
                    onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>{s.name}</p>
                        <p style={{ margin: '1px 0 0 0', fontSize: '11px', color: '#94A3B8' }}>{s.designation}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#6366F1' }}>৳{s.net.toLocaleString()}</p>
                        <p style={{ margin: 0, fontSize: '10px', color: '#94A3B8' }}>Net Pay</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <span style={{ fontSize: '10px', color: '#10B981', background: '#ECFDF5', borderRadius: '4px', padding: '2px 6px' }}>+৳{s.gross.toLocaleString()}</span>
                      <span style={{ fontSize: '10px', color: '#EF4444', background: '#FEF2F2', borderRadius: '4px', padding: '2px 6px' }}>-৳{s.deductions.toLocaleString()}</span>
                    </div>
                    <div style={{ height: '4px', borderRadius: '4px', background: '#FED7D7', marginTop: '8px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${s.gross > 0 ? Math.round((s.gross / (s.gross + s.deductions)) * 100) : 80}%`, background: 'linear-gradient(90deg, #10B981, #34D399)', borderRadius: '4px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

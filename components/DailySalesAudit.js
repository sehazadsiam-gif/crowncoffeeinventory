'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import {
  ShieldAlert, UploadCloud, CheckCircle, AlertTriangle, RefreshCw,
  Receipt, DollarSign, Image as ImageIcon, Trash2, Check, AlertCircle,
  FileText, Sparkles, ShoppingBag, Truck, Calendar, ArrowRight, Save
} from 'lucide-react'

export default function DailySalesAudit() {
  const { addToast } = useToast()

  // Input states
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0])
  const [openingCash, setOpeningCash] = useState(1000)
  const [actualCashSubmitted, setActualCashSubmitted] = useState(0)

  // Base64 Image states
  const [posImages, setPosImages] = useState([])
  const [staffImages, setStaffImages] = useState([])
  const [foodpandaImages, setFoodpandaImages] = useState([])
  const [pathaoImages, setPathaoImages] = useState([])
  const [bazarImages, setBazarImages] = useState([])

  // AI & Audit States
  const [analyzing, setAnalyzing] = useState(false)
  const [auditResult, setAuditResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    setHistoryLoading(true)
    try {
      const { data, error } = await supabase
        .from('daily_reconciliations')
        .select('*')
        .order('date', { ascending: false })
        .limit(10)
      if (error) throw error
      setHistory(data || [])
    } catch (err) {
      console.error('Fetch history error:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  // Handle image uploads & convert to Base64
  const handleImageUpload = (e, setter) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setter(prev => [...prev, reader.result])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index, setter) => {
    setter(prev => prev.filter((_, i) => i !== index))
  }

  // Run AI Verification API
  const runAiAudit = async () => {
    if (posImages.length === 0 && staffImages.length === 0 && bazarImages.length === 0) {
      addToast('Please upload at least one report screenshot or bazaar receipt photo.', 'error')
      return
    }

    setAnalyzing(true)
    try {
      const res = await fetch('/api/sales/reconcile-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          posImages,
          staffImages,
          foodpandaImages,
          pathaoImages,
          bazarImages,
          manualForm: {
            openingCash: Number(openingCash),
            actualCashSubmitted: Number(actualCashSubmitted)
          }
        })
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to analyze reports with AI')
      }

      setAuditResult(json.data)
      addToast('AI Audit & Multi-Source Verification complete!', 'success')
    } catch (err) {
      console.error('Audit error:', err)
      addToast(err.message, 'error')
    } finally {
      setAnalyzing(false)
    }
  }

  // Save Audit & Reconcile Log
  const saveAuditLog = async () => {
    if (!auditResult) return
    setSaving(true)
    try {
      const res = await fetch('/api/sales/reconcile-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: auditDate,
          openingCash: auditResult.openingCash,
          posTotalSales: auditResult.posTotalSales,
          posCashSales: auditResult.posCashSales,
          posCardSales: auditResult.posCardSales,
          foodpandaDeclared: auditResult.foodpandaDeclared,
          foodpandaPortalTotal: auditResult.foodpandaPortalTotal,
          pathaoDeclared: auditResult.pathaoDeclared,
          pathaoPortalTotal: auditResult.pathaoPortalTotal,
          bazarExpenseTotal: auditResult.bazarExpenseTotal,
          bazarReceipts: auditResult.bazarReceipts,
          actualCashSubmitted: auditResult.actualCashSubmitted,
          expectedCash: auditResult.expectedCash,
          cashShortage: auditResult.cashShortage,
          status: auditResult.status,
          notes: auditResult.rawNotes || ''
        })
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save reconciliation log')
      }

      addToast('Reconciliation log committed successfully!', 'success')
      fetchHistory()
    } catch (err) {
      console.error('Save audit error:', err)
      addToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: '28px' }}>
      {/* HEADER */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '20px',
        padding: '28px 32px',
        color: 'white',
        boxShadow: '0 8px 32px rgba(15,23,42,0.3)',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(59,130,246,0.2)', padding: '10px', borderRadius: '12px', display: 'flex' }}>
              <ShieldAlert size={24} color="#60A5FA" />
            </div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, fontFamily: 'var(--font-sans)', letterSpacing: '-0.02em' }}>
              Daily Sales & Cash Audit Engine
            </h2>
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sans)' }}>
            Automated AI cross-verification of POS sales, staff handover, delivery portals, and receipted bazaar expenses.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.4)',
            padding: '8px 14px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={15} color="#F87171" />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#F87171', fontFamily: 'var(--font-sans)' }}>
              ZERO TOLERANCE: 1 TAKA MISPLACE FLAGGED
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: SHIFT PARAMETERS & CASH INPUTS */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} style={{ color: 'var(--accent-blue)' }} /> Shift Parameters & Handover Cash
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'var(--font-sans)' }}>
              Audit Date
            </label>
            <input
              type="date"
              value={auditDate}
              onChange={e => setAuditDate(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-medium)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-sans)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'var(--font-sans)' }}>
              Opening Cash in Drawer (BDT)
            </label>
            <input
              type="number"
              value={openingCash}
              onChange={e => setOpeningCash(Number(e.target.value))}
              placeholder="e.g. 1000"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-medium)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-sans)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'var(--font-sans)' }}>
              Actual Cash Deposited / Handed Over (BDT)
            </label>
            <input
              type="number"
              value={actualCashSubmitted}
              onChange={e => setActualCashSubmitted(Number(e.target.value))}
              placeholder="Actual cash handed by staff"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-medium)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-sans)' }}
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: SCREENSHOT & RECEIPT UPLOADS GRID */}
      <div>
        <p style={{ margin: '0 0 14px 0', fontSize: '11px', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-sans)' }}>
          Source Data Uploads
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {/* Dropzone 1: POS Sales Report */}
          <UploadDropzone
            title="1. POS System Sales Report"
            desc="Screenshot of POS summary / gross revenue"
            icon={FileText}
            images={posImages}
            onUpload={e => handleImageUpload(e, setPosImages)}
            onRemove={idx => removeImage(idx, setPosImages)}
          />

          {/* Dropzone 2: Staff Closing Report */}
          <UploadDropzone
            title="2. Staff Handover Sheet"
            desc="Staff declared Cash, Card, Foodpanda total"
            icon={ShoppingBag}
            images={staffImages}
            onUpload={e => handleImageUpload(e, setStaffImages)}
            onRemove={idx => removeImage(idx, setStaffImages)}
          />

          {/* Dropzone 3: Delivery Platform Portals */}
          <UploadDropzone
            title="3. Delivery Portals (Foodpanda/Pathao)"
            desc="Merchant app earnings & net payouts screenshots"
            icon={Truck}
            images={[...foodpandaImages, ...pathaoImages]}
            onUpload={e => handleImageUpload(e, setFoodpandaImages)}
            onRemove={idx => removeImage(idx, setFoodpandaImages)}
          />

          {/* Dropzone 4: Bazaar Receipts */}
          <UploadDropzone
            title="4. Bazaar Expense Receipts (Mandatory)"
            desc="Photos of bazaar vouchers, bills & memos"
            icon={Receipt}
            images={bazarImages}
            onUpload={e => handleImageUpload(e, setBazarImages)}
            onRemove={idx => removeImage(idx, setBazarImages)}
            multiple
          />
        </div>
      </div>

      {/* ACTION BUTTON */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={runAiAudit}
          disabled={analyzing}
          style={{
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            color: 'white',
            padding: '16px 36px',
            borderRadius: '14px',
            border: 'none',
            fontSize: '15px',
            fontWeight: 800,
            cursor: analyzing ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-sans)',
            boxShadow: '0 8px 24px rgba(37,99,235,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.2s'
          }}
        >
          {analyzing ? (
            <>
              <div style={{ width: '18px', height: '18px', border: '3px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span>Analyzing Reports with Gemini AI…</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>Run AI Audit & Multi-Source Verification</span>
            </>
          )}
        </button>
      </div>

      {/* SECTION 3: AI AUDIT RESULTS & RECONCILIATION DASHBOARD */}
      {auditResult && (
        <div style={{ display: 'grid', gap: '20px', animation: 'scaleIn 0.3s ease' }}>

          {/* CASH SHORTAGE ALERT BANNER */}
          {auditResult.cashShortage !== 0 ? (
            <div style={{
              background: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)',
              borderRadius: '16px',
              padding: '24px',
              border: '2px solid #EF4444',
              boxShadow: '0 8px 32px rgba(239,68,68,0.25)',
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(239,68,68,0.2)', padding: '14px', borderRadius: '14px', display: 'flex' }}>
                  <AlertTriangle size={32} color="#F87171" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'white', fontFamily: 'var(--font-sans)' }}>
                    UNEXPLAINED CASH DISCREPANCY FLAGGED!
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-sans)' }}>
                    Handed cash does not match calculated drawer balance. Unverified bazaar claims are charged as shortage.
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#F87171', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-sans)' }}>
                  Cash Shortage / Loss
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '32px', fontWeight: 900, color: '#F87171', fontFamily: 'var(--font-sans)', lineHeight: 1 }}>
                  ৳{auditResult.cashShortage.toLocaleString()} BDT
                </p>
              </div>
            </div>
          ) : (
            <div style={{
              background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
              borderRadius: '16px',
              padding: '20px 24px',
              border: '1px solid #10B981',
              boxShadow: '0 4px 20px rgba(16,185,129,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <CheckCircle size={28} color="#A7F3D0" />
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: 'white', fontFamily: 'var(--font-sans)' }}>
                  PERFECT CASH MATCH! (0 TAKA VARIANCE)
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-sans)' }}>
                  Handed cash matches the exact expected drawer balance. All bazaar expenses verified with receipts.
                </p>
              </div>
            </div>
          )}

          {/* FINANCIAL SUMMARY CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            <MetricBox label="Opening Cash" val={`৳${auditResult.openingCash}`} color="var(--text-secondary)" />
            <MetricBox label="POS Cash Sales" val={`৳${auditResult.posCashSales}`} color="var(--success)" />
            <MetricBox label="Verified Bazaar Expense" val={`-৳${auditResult.bazarExpenseTotal}`} color="var(--warning)" sub={`${auditResult.bazarReceiptsCount} receipt(s)`} />
            <MetricBox label="Expected Drawer Cash" val={`৳${auditResult.expectedCash}`} color="var(--accent-blue)" />
            <MetricBox label="Actual Handed Cash" val={`৳${auditResult.actualCashSubmitted}`} color={auditResult.cashShortage !== 0 ? 'var(--danger)' : 'var(--success)'} />
          </div>

          {/* CHANNEL RECONCILIATION TABLE */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-xs)' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Sales Channel Cross-Verification
            </h4>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', textTransform: 'uppercase', fontSize: '10px', fontWeight: 800, color: 'var(--text-faint)' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Channel</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Staff Declared</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Portal Actual</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Variance ($\Delta$)</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <ChannelRow name="Foodpanda" declared={auditResult.foodpandaDeclared} actual={auditResult.foodpandaPortalTotal} diff={auditResult.foodpandaDiff} />
                  <ChannelRow name="Pathao" declared={auditResult.pathaoDeclared} actual={auditResult.pathaoPortalTotal} diff={auditResult.pathaoDiff} />
                </tbody>
              </table>
            </div>
          </div>

          {/* BAZAAR RECEIPTS ITEMIZED BREAKDOWN */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-xs)' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={16} style={{ color: 'var(--warning)' }} /> AI-Verified Bazaar Memos ({auditResult.bazarReceiptsCount})
            </h4>

            {auditResult.bazarReceipts.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>
                No bazaar receipt photos uploaded. Any cash claimed to be spent on bazaar without receipt proof is flagged as a cash shortage.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {auditResult.bazarReceipts.map((rcpt, idx) => (
                  <div key={idx} style={{ padding: '14px 18px', background: 'var(--bg-subtle)', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
                        {rcpt.vendor || `Bazaar Memo #${idx + 1}`}
                      </span>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {(rcpt.items || []).map((it, i) => (
                          <span key={i} style={{ fontSize: '11px', background: 'var(--bg-surface)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
                            {it}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '16px', color: 'var(--warning)', fontFamily: 'var(--font-sans)' }}>
                      ৳{rcpt.total} BDT
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COMMIT SAVE BUTTON */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={saveAuditLog}
              disabled={saving}
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: 'white',
                padding: '14px 28px',
                borderRadius: '12px',
                border: 'none',
                fontSize: '14px',
                fontWeight: 800,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(16,185,129,0.3)'
              }}
            >
              {saving ? 'Saving...' : <><Save size={16} /> Save & Commit Daily Reconciliation</>}
            </button>
          </div>

        </div>
      )}

      {/* SECTION 4: AUDIT HISTORY LOG */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-xs)' }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Recent Sales & Cash Audit History
        </h4>

        {historyLoading ? (
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>Loading history…</p>
        ) : history.length === 0 ? (
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>No reconciliations recorded yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)', textTransform: 'uppercase', fontSize: '10px', fontWeight: 800, color: 'var(--text-faint)' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>POS Sales</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Bazaar Total</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Expected Cash</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Actual Cash</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Shortage</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 700 }}>{row.date}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>৳{row.pos_total_sales}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--warning)' }}>৳{row.bazar_expense_total}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>৳{row.expected_cash}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>৳{row.actual_cash_submitted}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 800, color: row.cash_shortage !== 0 ? 'var(--danger)' : 'var(--success)' }}>
                      ৳{row.cash_shortage}
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '10px',
                        fontWeight: 800,
                        background: row.cash_shortage !== 0 ? 'rgba(239,68,68,0.1)' : 'var(--success-bg)',
                        color: row.cash_shortage !== 0 ? 'var(--danger)' : 'var(--success)'
                      }}>
                        {row.cash_shortage !== 0 ? 'DISCREPANCY' : 'MATCHED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// Subcomponents
function UploadDropzone({ title, desc, icon: Icon, images, onUpload, onRemove, multiple = false }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      borderRadius: '14px',
      padding: '18px',
      border: '1px dashed var(--border-medium)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ background: 'var(--bg-subtle)', padding: '8px', borderRadius: '8px' }}>
          <Icon size={18} style={{ color: 'var(--accent-blue)' }} />
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{title}</h4>
          <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>{desc}</p>
        </div>
      </div>

      {images.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {images.map((img, idx) => (
            <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
              <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                onClick={() => onRemove(idx)}
                style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', color: 'white', padding: '2px', cursor: 'pointer' }}
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <label style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '8px 12px',
        borderRadius: '8px',
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border-light)',
        color: 'var(--text-secondary)',
        fontSize: '12px',
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        transition: 'all 0.2s'
      }}>
        <UploadCloud size={14} /> Upload Screenshot
        <input type="file" accept="image/*" multiple={multiple} onChange={onUpload} style={{ display: 'none' }} />
      </label>
    </div>
  )
}

function MetricBox({ label, val, color, sub }) {
  return (
    <div style={{ padding: '16px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
      <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-sans)' }}>{label}</p>
      <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 900, color, lineHeight: 1.1, fontFamily: 'var(--font-sans)' }}>{val}</p>
      {sub && <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>{sub}</p>}
    </div>
  )
}

function ChannelRow({ name, declared, actual, diff }) {
  const isMatch = diff === 0
  return (
    <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
      <td style={{ padding: '10px', fontWeight: 700 }}>{name}</td>
      <td style={{ padding: '10px', textAlign: 'right' }}>৳{declared}</td>
      <td style={{ padding: '10px', textAlign: 'right' }}>৳{actual}</td>
      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: isMatch ? 'var(--success)' : 'var(--danger)' }}>
        {diff > 0 ? `+৳${diff}` : `৳${diff}`}
      </td>
      <td style={{ padding: '10px', textAlign: 'center' }}>
        <span style={{
          padding: '3px 8px',
          borderRadius: '999px',
          fontSize: '10px',
          fontWeight: 800,
          background: isMatch ? 'var(--success-bg)' : 'rgba(239,68,68,0.1)',
          color: isMatch ? 'var(--success)' : 'var(--danger)'
        }}>
          {isMatch ? 'MATCH' : 'MISMATCH'}
        </span>
      </td>
    </tr>
  )
}

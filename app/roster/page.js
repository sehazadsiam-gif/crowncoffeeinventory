'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'
import { useToast } from '../../components/Toast'
import {
  Calendar, ChevronLeft, ChevronRight, Save, Download,
  Users, UtensilsCrossed, Coffee, CheckCircle, RefreshCw,
  Clock, ShieldAlert, Sparkles, AlertCircle, X, Brain, Edit3, Check
} from 'lucide-react'
import html2canvas from 'html2canvas'

export default function RosterPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const exportRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Auto-save: 'idle' | 'pending' | 'saving' | 'saved' | 'error'
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle')
  const autoSaveTimer = useRef(null)
  const isFirstLoad = useRef(true)

  // Current week start (Saturday date string YYYY-MM-DD)
  const [weekStart, setWeekStart] = useState(() => getSaturdayOf(new Date()))
  const [staffList, setStaffList] = useState([])
  const [gridData, setGridData] = useState({}) // { [staffId]: { [dateStr]: { shift_start, is_off } } }

  // ── AI Roster Assistant State ──
  const [showAiModal, setShowAiModal] = useState(false)
  const [activeAiTab, setActiveAiTab] = useState('generate') // 'train' | 'generate'
  const [customRules, setCustomRules] = useState('')
  const [generatingAi, setGeneratingAi] = useState(false)
  const [aiReasoning, setAiReasoning] = useState('')
  const [aiDraftData, setAiDraftData] = useState(null)

  const days = get7Days(weekStart)
  const weekRangeText = getWeekRangeText(weekStart)

  useEffect(() => {
    // Load trained AI rules from localStorage if available
    const savedRules = localStorage.getItem('cc_roster_ai_rules')
    if (savedRules) {
      setCustomRules(savedRules)
    } else {
      setCustomRules(
        '1. Ensure each staff member gets 1 day off per week (preferably Friday or Saturday).\n' +
        '2. Kitchen requires at least 1 Cook on 8:00 AM shift and 1 Cook on 1:00 PM shift every day.\n' +
        '3. Front staff baristas prefer 8:00 AM or 11:00 AM shifts.'
      )
    }

    fetchRosterData(weekStart)
  }, [weekStart])

  async function fetchRosterData(ws) {
    try {
      setLoading(true)
      const res = await fetch(`/api/roster?week_start=${ws}`)
      const json = await res.json()

      if (res.ok) {
        setStaffList(json.staff || [])

        // Build existing lookup map
        const existingMap = new Map()
        ;(json.roster || []).forEach(r => {
          existingMap.set(`${r.staff_id}_${r.day_date}`, r)
        })

        const initialGrid = {}
        const currentDays = get7Days(ws)

        ;(json.staff || []).forEach(s => {
          initialGrid[s.id] = {}
          currentDays.forEach((d, dayIdx) => {
            const existing = existingMap.get(`${s.id}_${d}`)

            if (existing) {
              initialGrid[s.id][d] = {
                shift_start: existing.shift_start || '08:00',
                is_off: Boolean(existing.is_off)
              }
            } else {
              // Defaults: Friday is default OFF (index 6 = Friday), otherwise 8:00 AM
              const isFriday = dayIdx === 6
              initialGrid[s.id][d] = {
                shift_start: isFriday ? 'OFF' : '08:00',
                is_off: isFriday
              }
            }
          })
        })

        setGridData(initialGrid)
      } else {
        addToast(json.error || 'Failed to load roster', 'error')
      }
    } catch (err) {
      addToast('Error loading roster data', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle week navigation
  function navigateWeek(direction) {
    const current = new Date(weekStart)
    current.setDate(current.getDate() + (direction * 7))
    setWeekStart(getSaturdayOf(current))
  }

  // Handle grid cell change
  function handleCellChange(staffId, dateStr, value) {
    setGridData(prev => {
      const staffGrid = prev[staffId] || {}
      const isOff = value === 'OFF'
      const shiftTime = isOff ? '08:00' : value

      return {
        ...prev,
        [staffId]: {
          ...staffGrid,
          [dateStr]: {
            shift_start: shiftTime,
            is_off: isOff
          }
        }
      }
    })
  }

  // ── Core save logic (shared by manual save & auto-save) ──
  const saveRosterItems = useCallback(async (currentGridData, currentWeekStart, { silent = false } = {}) => {
    const items = []

    Object.entries(currentGridData).forEach(([staffId, dates]) => {
      Object.entries(dates).forEach(([dayDate, val]) => {
        const isOff = Boolean(val.is_off || val.shift_start === 'OFF')
        const timeVal = isOff || val.shift_start === 'OFF' ? '08:00' : (val.shift_start || '08:00')
        items.push({
          staff_id: staffId,
          week_start: currentWeekStart,
          day_date: dayDate,
          shift_start: timeVal,
          shift_hours: 10,
          is_off: isOff
        })
      })
    })

    if (items.length === 0) return

    const res = await fetch('/api/roster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    })

    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to save roster')

    if (!silent) addToast('Weekly roster saved!', 'success')
  }, [addToast])

  // ── Manual Save ──
  async function handleSaveRoster() {
    try {
      setSaving(true)
      setAutoSaveStatus('saving')
      // Cancel any pending auto-save since we're saving now
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      await saveRosterItems(gridData, weekStart, { silent: false })
      setAutoSaveStatus('saved')
    } catch (err) {
      addToast(err.message || 'Error saving roster', 'error')
      setAutoSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  // ── Auto-Save: debounce 1.5 s after every gridData change ──
  useEffect(() => {
    // Skip the very first render (data just loaded from server)
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      return
    }
    // Also skip if still loading
    if (loading) return

    setAutoSaveStatus('pending')
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)

    autoSaveTimer.current = setTimeout(async () => {
      try {
        setAutoSaveStatus('saving')
        await saveRosterItems(gridData, weekStart, { silent: true })
        setAutoSaveStatus('saved')
      } catch (err) {
        setAutoSaveStatus('error')
        addToast('Auto-save failed: ' + (err.message || 'Unknown error'), 'error')
      }
    }, 1500)

    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [gridData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Download Roster as High-Quality JPG
  async function handleDownloadJPG() {
    if (!exportRef.current) return

    try {
      setExporting(true)
      addToast('Generating JPG Roster image...', 'info')

      const element = exportRef.current

      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false
      })

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `Crown_Coffee_Weekly_Roster_${weekStart}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      addToast('JPG Roster downloaded successfully!', 'success')
    } catch (err) {
      console.error('JPG Export error:', err)
      addToast('Failed to export JPG Roster', 'error')
    } finally {
      setExporting(false)
    }
  }

  // ── AI Assistant Actions ──
  function handleSaveRules() {
    localStorage.setItem('cc_roster_ai_rules', customRules)
    addToast('AI Training Rules saved permanently!', 'success')
  }

  async function handleGenerateAiRoster() {
    try {
      setGeneratingAi(true)
      setAiReasoning('')
      setAiDraftData(null)

      const res = await fetch('/api/roster/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_start: weekStart,
          custom_rules: customRules
        })
      })

      const json = await res.json()

      if (res.ok) {
        setAiReasoning(json.reasoning)
        setAiDraftData(json.draft)
        addToast('AI Roster Draft generated successfully!', 'success')
      } else {
        addToast(json.error || 'AI generation failed', 'error')
      }
    } catch (err) {
      addToast('Error generating AI roster', 'error')
    } finally {
      setGeneratingAi(false)
    }
  }

  function handleApplyAiDraft() {
    if (!aiDraftData) return

    setGridData(prev => {
      const newGrid = { ...prev }

      Object.entries(aiDraftData).forEach(([staffId, dates]) => {
        if (!newGrid[staffId]) newGrid[staffId] = {}

        Object.entries(dates).forEach(([dateStr, val]) => {
          const isOff = val === 'OFF'
          newGrid[staffId][dateStr] = {
            shift_start: isOff ? '08:00' : val,
            is_off: isOff
          }
        })
      })

      return newGrid
    })

    setShowAiModal(false)
    addToast('AI Draft applied to roster grid! Review and save.', 'success')
  }

  // Helper: Categorize staff into Front vs Kitchen
  const isKitchenStaff = (s) => {
    const dept = (s.department || '').toLowerCase()
    const desig = (s.designation || '').toLowerCase()
    return dept === 'kitchen' || ['cook', 'chef', 'kitchen', 'steward', 'cleaner'].some(k => desig.includes(k))
  }

  const frontStaff = staffList.filter(s => !isKitchenStaff(s))
  const kitchenStaff = staffList.filter(s => isKitchenStaff(s))

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'var(--font-sans)', color: '#0F172A' }}>
      <Navbar />

      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Header & Controls Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #6B3A2A, #A05228)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(107,58,42,0.25)' }}>
                <Calendar size={22} color="white" />
              </div>
              <div>
                <h1 style={{ fontSize: '26px', fontWeight: 900, margin: 0, letterSpacing: '-0.03em', color: '#0F172A' }}>
                  Weekly Duty Roster
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <p style={{ fontSize: '13.5px', color: '#64748B', margin: 0 }}>
                    Saturday to Friday roster planning &amp; AI drafting
                  </p>
                  {/* Auto-save status badge */}
                  {autoSaveStatus === 'pending' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 700, color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '20px', padding: '2px 10px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#B45309', display: 'inline-block' }} />
                      Unsaved changes
                    </span>
                  )}
                  {autoSaveStatus === 'saving' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 700, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '20px', padding: '2px 10px' }}>
                      <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />
                      Auto-saving...
                    </span>
                  )}
                  {autoSaveStatus === 'saved' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 700, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '20px', padding: '2px 10px' }}>
                      <CheckCircle size={11} />
                      Auto-saved
                    </span>
                  )}
                  {autoSaveStatus === 'error' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 700, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '20px', padding: '2px 10px' }}>
                      <AlertCircle size={11} />
                      Save failed
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* AI Assistant Trigger Button */}
            <button
              onClick={() => setShowAiModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'linear-gradient(135deg, #7C3AED, #9333EA)',
                color: 'white', border: 'none', padding: '11px 20px',
                borderRadius: '12px', fontSize: '14px', fontWeight: 800,
                cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.30)',
                transition: 'all 0.2s'
              }}
            >
              <Sparkles size={18} /> ✨ AI Roster Assistant
            </button>

            <button
              onClick={handleSaveRoster}
              disabled={saving || loading}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: saving ? 'linear-gradient(135deg, #047857, #059669)' : 'linear-gradient(135deg, #059669, #10B981)',
                color: 'white', border: 'none', padding: '11px 20px',
                borderRadius: '12px', fontSize: '14px', fontWeight: 800,
                cursor: saving ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px rgba(16,185,129,0.30)',
                transition: 'all 0.2s', opacity: saving ? 0.85 : 1
              }}
            >
              {saving
                ? <><RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
                : <><Save size={18} /> Save Now</>
              }
            </button>

            <button
              onClick={handleDownloadJPG}
              disabled={exporting || loading}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: '#0F172A', color: 'white', border: 'none',
                padding: '11px 20px', borderRadius: '12px', fontSize: '14px',
                fontWeight: 800, cursor: exporting ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px rgba(15,23,42,0.25)',
                transition: 'all 0.2s'
              }}
            >
              <Download size={18} /> {exporting ? 'Generating JPG...' : 'Download JPG'}
            </button>
          </div>
        </div>

        {/* Week Selector Bar */}
        <div style={{
          background: 'white', borderRadius: '18px', border: '1px solid #E2E8F0',
          padding: '18px 24px', marginBottom: '28px', display: 'flex',
          justify: 'space-between', alignItems: 'center', flexWrap: 'wrap',
          gap: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => navigateWeek(-1)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: '#334155' }}
            >
              <ChevronLeft size={16} /> Prev Week
            </button>

            <button
              onClick={() => setWeekStart(getSaturdayOf(new Date()))}
              style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB', padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              Current Week
            </button>

            <button
              onClick={() => navigateWeek(1)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: '#334155' }}
            >
              Next Week <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#6B3A2A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Selected Roster Cycle</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>{weekRangeText}</div>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div style={{ background: 'white', padding: '60px', textAlign: 'center', borderRadius: '18px', border: '1px solid #E2E8F0' }}>
            <div className="loader" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: '#64748B', fontWeight: 600 }}>Loading active staff directory &amp; weekly roster...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* ── SECTION 1: FRONT STAFF ── */}
            <RosterSectionTable
              title="Front Staff (Service, Bar &amp; Cash)"
              icon={<Coffee size={20} color="#6B3A2A" />}
              accentColor="#6B3A2A"
              staffList={frontStaff}
              days={days}
              gridData={gridData}
              onCellChange={handleCellChange}
            />

            {/* ── SECTION 2: KITCHEN STAFF ── */}
            <RosterSectionTable
              title="Kitchen Staff (Production &amp; Stewarding)"
              icon={<UtensilsCrossed size={20} color="#059669" />}
              accentColor="#059669"
              staffList={kitchenStaff}
              days={days}
              gridData={gridData}
              onCellChange={handleCellChange}
            />
          </div>
        )}

      </main>

      {/* ── AI ROSTER ASSISTANT MODAL ── */}
      {showAiModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '24px', maxWidth: '680px', width: '100%',
            overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
            border: '1px solid #E2E8F0'
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1E1B4B, #312E81)', color: 'white',
              padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Brain size={22} color="#C4B5FD" />
                </div>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 900, margin: 0 }}>Crown Coffee Roster AI</h2>
                  <p style={{ fontSize: '13px', color: '#A5B4FC', margin: 0 }}>Train rules &amp; auto-generate weekly schedules</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                style={{ background: 'rgba(255,255,255,0.10)', border: 'none', color: 'white', width: '34px', height: '34px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              <button
                onClick={() => setActiveAiTab('generate')}
                style={{
                  flex: 1, padding: '14px', border: 'none', background: activeAiTab === 'generate' ? 'white' : 'transparent',
                  borderBottom: activeAiTab === 'generate' ? '3px solid #7C3AED' : 'none',
                  fontWeight: 800, fontSize: '14px', color: activeAiTab === 'generate' ? '#7C3AED' : '#64748B',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <Sparkles size={16} /> Auto-Generate Roster
              </button>
              <button
                onClick={() => setActiveAiTab('train')}
                style={{
                  flex: 1, padding: '14px', border: 'none', background: activeAiTab === 'train' ? 'white' : 'transparent',
                  borderBottom: activeAiTab === 'train' ? '3px solid #7C3AED' : 'none',
                  fontWeight: 800, fontSize: '14px', color: activeAiTab === 'train' ? '#7C3AED' : '#64748B',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <Edit3 size={16} /> Train AI Rules
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px 28px', maxHeight: '70vh', overflowY: 'auto' }}>

              {/* TAB 1: TRAIN AI RULES */}
              {activeAiTab === 'train' && (
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 8px', color: '#0F172A' }}>
                    Café Scheduling Preferences &amp; Rules
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px' }}>
                    Type your custom rules below. The AI will strictly follow these rules every time it plans your weekly roster.
                  </p>
                  <textarea
                    rows={6}
                    value={customRules}
                    onChange={e => setCustomRules(e.target.value)}
                    placeholder="Enter your custom scheduling rules here..."
                    style={{
                      width: '100%', padding: '14px', borderRadius: '12px',
                      border: '1.5px solid #CBD5E1', fontSize: '13.5px', fontFamily: 'inherit',
                      lineHeight: '1.6', outline: 'none', resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button
                      onClick={handleSaveRules}
                      style={{
                        background: '#0F172A', color: 'white', border: 'none',
                        padding: '10px 20px', borderRadius: '10px', fontSize: '13.5px',
                        fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                      }}
                    >
                      <Check size={16} /> Save Training Rules
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: GENERATE ROSTER */}
              {activeAiTab === 'generate' && (
                <div>
                  <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#6D28D9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACTIVE TRAINED RULES</div>
                    <div style={{ fontSize: '13px', color: '#4C1D95', marginTop: '4px', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                      {customRules}
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateAiRoster}
                    disabled={generatingAi}
                    style={{
                      width: '100%', background: 'linear-gradient(135deg, #7C3AED, #9333EA)',
                      color: 'white', border: 'none', padding: '14px', borderRadius: '14px',
                      fontSize: '15px', fontWeight: 900, cursor: generatingAi ? 'wait' : 'pointer',
                      boxShadow: '0 4px 14px rgba(124,58,237,0.30)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', gap: '10px'
                    }}
                  >
                    <Sparkles size={20} /> {generatingAi ? 'Gemini AI is drafting weekly schedule...' : 'Generate Weekly Roster with AI'}
                  </button>

                  {/* AI Output Preview */}
                  {aiReasoning && (
                    <div style={{ marginTop: '24px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: 800, fontSize: '14px', marginBottom: '8px' }}>
                        <CheckCircle size={18} /> AI Draft Generated Successfully!
                      </div>
                      <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 16px', lineHeight: '1.6' }}>
                        {aiReasoning}
                      </p>
                      <button
                        onClick={handleApplyAiDraft}
                        style={{
                          width: '100%', background: '#059669', color: 'white',
                          border: 'none', padding: '12px', borderRadius: '12px',
                          fontSize: '14px', fontWeight: 800, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                      >
                        Apply AI Draft to Roster Grid
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── HIDDEN / HIGH-RESOLUTION JPG EXPORT CONTAINER ── */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div
          ref={exportRef}
          id="roster-export-container"
          style={{
            width: '1200px', background: '#FFFFFF', padding: '40px',
            fontFamily: 'Segoe UI, Helvetica, Arial, sans-serif', color: '#0F172A'
          }}
        >
          {/* Export Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #6B3A2A', paddingBottom: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #6B3A2A, #A05228)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '22px' }}>
                  CC
                </div>
                <div>
                  <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#1C1410', margin: 0, letterSpacing: '-0.04em' }}>CROWN COFFEE</h1>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#D4933A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.10em' }}>Official Weekly Duty Roster</p>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right', background: '#FAF7F2', padding: '12px 20px', borderRadius: '12px', border: '1.5px solid #E8E0D4' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#6B3A2A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>ROSTER CYCLE</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#1C1410', marginTop: '2px' }}>{weekRangeText}</div>
            </div>
          </div>

          {/* Export Section 1: Front Staff */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ background: '#6B3A2A', color: 'white', padding: '10px 16px', borderRadius: '8px 8px 0 0', fontWeight: 900, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ☕ Front Staff (Service, Bar &amp; Cash)
            </div>
            <ExportGridTable staffList={frontStaff} days={days} gridData={gridData} />
          </div>

          {/* Export Section 2: Kitchen Staff */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ background: '#059669', color: 'white', padding: '10px 16px', borderRadius: '8px 8px 0 0', fontWeight: 900, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              👨‍🍳 Kitchen Staff (Production &amp; Stewarding)
            </div>
            <ExportGridTable staffList={kitchenStaff} days={days} gridData={gridData} />
          </div>

          {/* Export Legend & Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #E2E8F0', fontSize: '12px', color: '#64748B' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: '#0F172A' }}>SHIFT LEGEND:</span>
              <span style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>8:00 AM (Morning)</span>
              <span style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>11:00 AM (Mid)</span>
              <span style={{ background: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>1:00 PM (Evening)</span>
              <span style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FCA5A5', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>OFF (Day Off)</span>
            </div>
            <div style={{ fontWeight: 700 }}>Generated on {new Date().toLocaleDateString('en-GB')} • Crown Coffee Management</div>
          </div>
        </div>
      </div>

    </div>
  )
}

// ── Interactive Roster Section Component ──
function RosterSectionTable({ title, icon, accentColor, staffList, days, gridData, onCellChange }) {
  if (!staffList || staffList.length === 0) {
    return (
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
        No active staff members found in this category.
      </div>
    )
  }

  return (
    <div style={{ background: 'white', borderRadius: '18px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
      {/* Section Header */}
      <div style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {icon}
        <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0F172A' }}>{title}</h2>
        <span style={{ background: `${accentColor}15`, color: accentColor, fontSize: '12px', fontWeight: 800, padding: '2px 10px', borderRadius: '12px', marginLeft: 'auto' }}>
          {staffList.length} Active Staff
        </span>
      </div>

      {/* Grid Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', color: '#334155', fontSize: '12px', textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 18px', minWidth: '180px' }}>Staff Name</th>
              <th style={{ padding: '14px 12px', minWidth: '120px' }}>Designation</th>
              {days.map((d, i) => {
                const dateObj = new Date(d)
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
                const dayNum = dateObj.getDate()
                const isFriday = i === 6

                return (
                  <th key={d} style={{ padding: '12px 10px', textAlign: 'center', minWidth: '110px', background: isFriday ? '#FEF2F2' : 'transparent' }}>
                    <div style={{ color: isFriday ? '#DC2626' : '#0F172A', fontWeight: 800 }}>{dayName}</div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>{dayNum} {dateObj.toLocaleDateString('en-US', { month: 'short' })}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {staffList.map(s => {
              const staffGrid = gridData[s.id] || {}

              return (
                <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0F172A' }}>
                    {s.name}
                    <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>{s.employee_id || 'Staff'}</div>
                  </td>
                  <td style={{ padding: '14px 12px', color: '#64748B', fontWeight: 600, fontSize: '12.5px' }}>
                    {s.designation || 'Staff'}
                  </td>

                  {days.map((d, dayIdx) => {
                    const cell = staffGrid[d] || { shift_start: '08:00', is_off: false }
                    const val = cell.is_off ? 'OFF' : cell.shift_start

                    return (
                      <td key={d} style={{ padding: '10px 6px', textAlign: 'center' }}>
                        <select
                          value={val}
                          onChange={e => onCellChange(s.id, d, e.target.value)}
                          style={{
                            width: '100%', padding: '8px 6px', borderRadius: '10px',
                            border: val === 'OFF'
                              ? '1.5px solid #FCA5A5'
                              : val === '08:00'
                              ? '1.5px solid #BFDBFE'
                              : val === '11:00'
                              ? '1.5px solid #FDE68A'
                              : '1.5px solid #C7D2FE',
                            background: val === 'OFF'
                              ? '#FEF2F2'
                              : val === '08:00'
                              ? '#EFF6FF'
                              : val === '11:00'
                              ? '#FFFBEB'
                              : '#EEF2FF',
                            color: val === 'OFF'
                              ? '#991B1B'
                              : val === '08:00'
                              ? '#1D4ED8'
                              : val === '11:00'
                              ? '#B45309'
                              : '#4338CA',
                            fontWeight: 800,
                            fontSize: '12px',
                            cursor: 'pointer',
                            outline: 'none',
                            textAlign: 'center'
                          }}
                        >
                          <option value="08:00">8:00 AM</option>
                          <option value="11:00">11:00 AM</option>
                          <option value="13:00">1:00 PM</option>
                          <option value="OFF">OFF (Day Off)</option>
                        </select>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Export High-Resolution Table Component ──
function ExportGridTable({ staffList, days, gridData }) {
  if (!staffList || staffList.length === 0) {
    return <div style={{ padding: '16px', textAlign: 'center', color: '#94A3B8' }}>No staff</div>
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #CBD5E1' }}>
      <thead>
        <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #334155' }}>
          <th style={{ padding: '10px', textAlign: 'left', minWidth: '160px', borderRight: '1px solid #CBD5E1' }}>Staff Member</th>
          {days.map((d, i) => {
            const dateObj = new Date(d)
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
            const dayNum = dateObj.getDate()
            const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' })
            const isFriday = i === 6

            return (
              <th key={d} style={{ padding: '8px', textAlign: 'center', borderRight: i < 6 ? '1px solid #CBD5E1' : 'none', background: isFriday ? '#FEE2E2' : 'transparent' }}>
                <div style={{ fontWeight: 900, color: isFriday ? '#B91C1C' : '#0F172A' }}>{dayName}</div>
                <div style={{ fontSize: '10px', color: '#64748B' }}>{dayNum} {monthName}</div>
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {staffList.map((s, idx) => {
          const staffGrid = gridData[s.id] || {}

          return (
            <tr key={s.id} style={{ borderBottom: '1px solid #CBD5E1', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
              <td style={{ padding: '10px', fontWeight: 800, color: '#0F172A', borderRight: '1px solid #CBD5E1' }}>
                {s.name}
                <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>{s.designation || 'Staff'}</div>
              </td>

              {days.map((d, i) => {
                const cell = staffGrid[d] || { shift_start: '08:00', is_off: false }
                const val = cell.is_off ? 'OFF' : cell.shift_start

                const is8am = val === '08:00'
                const is11am = val === '11:00'
                const is1pm = val === '13:00'
                const isOff = val === 'OFF'

                return (
                  <td key={d} style={{ padding: '8px', textAlign: 'center', borderRight: i < 6 ? '1px solid #CBD5E1' : 'none' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontWeight: 900,
                      fontSize: '11px',
                      background: isOff ? '#FEF2F2' : is8am ? '#EFF6FF' : is11am ? '#FFFBEB' : '#EEF2FF',
                      color: isOff ? '#B91C1C' : is8am ? '#1D4ED8' : is11am ? '#B45309' : '#4338CA',
                      border: isOff ? '1px solid #FCA5A5' : is8am ? '1px solid #BFDBFE' : is11am ? '1px solid #FDE68A' : '1px solid #C7D2FE'
                    }}>
                      {is8am ? '8:00 AM' : is11am ? '11:00 AM' : is1pm ? '1:00 PM' : 'OFF'}
                    </span>
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Helper Functions ──
function getSaturdayOf(d = new Date()) {
  const date = new Date(d)
  const day = date.getDay() // 0 = Sun, 6 = Sat
  const diff = (day === 6 ? 0 : -(day + 1))
  date.setDate(date.getDate() + diff)
  return date.toISOString().split('T')[0]
}

function get7Days(saturdayStr) {
  const list = []
  const start = new Date(saturdayStr)
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    list.push(d.toISOString().split('T')[0])
  }
  return list
}

function getWeekRangeText(saturdayStr) {
  const days = get7Days(saturdayStr)
  const startObj = new Date(days[0])
  const endObj = new Date(days[6])

  const startFormatted = `${startObj.toLocaleDateString('en-US', { weekday: 'short' })}, ${startObj.getDate()} ${startObj.toLocaleDateString('en-US', { month: 'short' })}`
  const endFormatted = `${endObj.toLocaleDateString('en-US', { weekday: 'short' })}, ${endObj.getDate()} ${endObj.toLocaleDateString('en-US', { month: 'short' })} ${endObj.getFullYear()}`

  return `${startFormatted} – ${endFormatted}`
}

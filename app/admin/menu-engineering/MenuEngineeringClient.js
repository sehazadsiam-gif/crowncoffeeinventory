'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Coffee, BarChart2, LogOut, ChevronDown } from 'lucide-react'
import SectionA from './SectionA'
import SectionB from './SectionB'
import SectionC from './SectionC'
import ExportButton from './ExportButton'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function MenuEngineeringClient() {
  const router = useRouter()
  const now = new Date()

  const [activeTab, setActiveTab] = useState('A')
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  // Data
  const [items,       setItems]       = useState([])
  const [channels,    setChannels]    = useState([])
  const [pricingData, setPricingData] = useState([])
  const [loading,     setLoading]     = useState(true)

  // Section B totals (lifted state for Section C)
  const [sectionBTotals, setSectionBTotals] = useState({ totalCM: 0, totalRevenue: 0 })

  // Export data per section
  const [exportDataB, setExportDataB] = useState([])
  const [exportDataC, setExportDataC] = useState([])

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const pricingRes = await fetch('/api/admin/pricing')
      const pricingJson = await pricingRes.json()
      if (pricingJson.items) {
        setItems(pricingJson.items)
        setChannels(pricingJson.channels)
        setPricingData(pricingJson.items)
      }
    } catch (e) {
      console.error('Load error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function handleExport(section) {
    if (section === 'B') console.log('Export B triggered — data passed via ExportButton')
    if (section === 'C') console.log('Export C triggered')
  }

  async function handleLogout() {
    await fetch('/api/costing/auth/login', { method: 'DELETE' })
    router.replace('/menu-costings/login')
  }

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingSpinner} />
        <span style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 12 }}>Loading…</span>
      </div>
    )
  }

  return (
    <div style={styles.shell}>
      {/* ── SIDEBAR ─────────────────────────────────────── */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logoRow}>
            <div style={styles.logoIcon}><Coffee size={20} color="#fff" /></div>
            <div>
              <div style={styles.logoTitle}>Crown Coffee</div>
              <div style={styles.logoSub}>Admin Dashboard</div>
            </div>
          </div>
        </div>

        <nav style={styles.nav}>
          <div style={styles.navSection}>
            <div style={styles.navLabel}>Menu Engineering</div>
            {(['A','B','C']).map(tab => {
              const labels = { A: 'Items & Pricing', B: 'Monthly Sales', C: 'Profitability' }
              return (
                <button
                  key={tab}
                  id={`tab-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    ...styles.navItem,
                    background: activeTab === tab ? 'var(--accent-brown-dim)' : 'transparent',
                    color:      activeTab === tab ? 'var(--accent-brown)' : 'var(--text-secondary)',
                    borderLeft: activeTab === tab ? '3px solid var(--accent-brown)' : '3px solid transparent',
                    fontWeight: activeTab === tab ? 600 : 400,
                  }}
                >
                  <BarChart2 size={15} style={{ flexShrink: 0, opacity: activeTab === tab ? 1 : 0.5 }} />
                  <span style={styles.tabLabel}>{labels[tab]}</span>
                  <span style={{
                    ...styles.tabBadge,
                    background: activeTab === tab ? 'var(--accent-brown)' : 'var(--bg-hover)',
                    color: activeTab === tab ? '#fff' : 'var(--text-muted)',
                  }}>{tab}</span>
                </button>
              )
            })}
          </div>
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.chefLink}>
            <a href="/dashboard" style={{ fontSize: 12, color: 'var(--accent-brown)', textDecoration: 'none', fontWeight: 600, display: 'block', marginBottom: 4 }}>
              ← Main Admin Dashboard
            </a>
            <a href="/menu-costings" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>
              ↗ Go to Menu Costings
            </a>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────── */}
      <main style={styles.main}>
        {/* Top bar */}
        <div style={styles.topBar}>
          <div style={styles.topBarLeft}>
            <h1 style={styles.pageTitle}>
              {activeTab === 'A' && 'Items & Pricing'}
              {activeTab === 'B' && 'Monthly Sales & Classification'}
              {activeTab === 'C' && 'Business Profitability'}
            </h1>
          </div>

          {/* Month/Year Picker */}
          <div style={styles.monthPicker}>
            <div style={styles.monthPickerWrap}>
              <select
                id="month-select"
                value={month}
                onChange={e => setMonth(parseInt(e.target.value))}
                style={styles.monthSelect}
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={i} value={i+1}>{m}</option>
                ))}
              </select>
              <input
                id="year-input"
                type="number"
                min="2020"
                max="2040"
                value={year}
                onChange={e => setYear(parseInt(e.target.value) || now.getFullYear())}
                style={styles.yearInput}
              />
            </div>
          </div>
        </div>

        {/* Section content */}
        <div style={styles.content}>
          {activeTab === 'A' && (
            <SectionA
              items={items}
              channels={channels}
              onSave={loadData}
            />
          )}
          {activeTab === 'B' && (
            <SectionB
              items={items}
              pricingData={pricingData}
              year={year}
              month={month}
              onExport={section => {}}
            />
          )}
          {activeTab === 'C' && (
            <SectionC
              year={year}
              month={month}
              totalCM={sectionBTotals.totalCM}
              totalRevenue={sectionBTotals.totalRevenue}
              onExport={section => {}}
            />
          )}
        </div>
      </main>
    </div>
  )
}

const styles = {
  shell: {
    display: 'flex', minHeight: '100vh', background: 'var(--bg-base)',
  },
  loadingScreen: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', gap: 0,
  },
  loadingSpinner: {
    width: 32, height: 32,
    border: '3px solid var(--border-light)',
    borderTop: '3px solid var(--accent-brown)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  // Sidebar
  sidebar: {
    width: 240, flexShrink: 0,
    background: 'var(--bg-surface)',
    borderRight: '1px solid var(--border-light)',
    display: 'flex', flexDirection: 'column',
    position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
  },
  sidebarHeader: { padding: '20px 16px 16px', borderBottom: '1px solid var(--border-light)' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10 },
  logoIcon: {
    width: 36, height: 36, borderRadius: 10,
    background: 'linear-gradient(135deg, var(--accent-brown), var(--accent-gold))',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  logoTitle: { fontWeight: 700, fontSize: 14 },
  logoSub:   { fontSize: 11, color: 'var(--text-muted)' },
  nav:       { flex: 1, padding: '12px 0', overflowY: 'auto' },
  navSection:{ padding: '0 12px' },
  navLabel:  { fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '8px 4px 6px' },
  navItem:   {
    width: '100%', padding: '10px 12px',
    border: 'none', cursor: 'pointer', borderRadius: 8,
    display: 'flex', alignItems: 'center', gap: 10,
    marginBottom: 2, transition: 'all 0.15s',
    fontFamily: 'var(--font-sans)', fontSize: 13,
    textAlign: 'left',
  },
  tabLabel: { flex: 1 },
  tabBadge: { fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '1px 6px' },
  sidebarFooter: { padding: '12px 16px', borderTop: '1px solid var(--border-light)' },
  chefLink: { marginBottom: 8 },
  logoutBtn: {
    width: '100%', padding: '8px 10px',
    background: 'none', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 13, color: 'var(--danger)',
    borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-sans)',
  },
  // Main
  main: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowX: 'hidden' },
  topBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 28px',
    borderBottom: '1px solid var(--border-light)',
    background: 'var(--bg-surface)',
    flexWrap: 'wrap', gap: 12,
    position: 'sticky', top: 0, zIndex: 10,
  },
  topBarLeft:  { display: 'flex', alignItems: 'center', gap: 12 },
  pageTitle:   { fontSize: 18, fontWeight: 700, margin: 0 },
  monthPicker: { display: 'flex', alignItems: 'center', gap: 8 },
  monthPickerWrap: { display: 'flex', gap: 8, alignItems: 'center' },
  monthSelect: {
    padding: '8px 10px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-medium)', background: 'var(--bg-subtle)',
    color: 'var(--text-primary)', fontSize: 13,
    fontFamily: 'var(--font-sans)', cursor: 'pointer', outline: 'none',
  },
  yearInput: {
    padding: '8px 10px', width: 80, borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-medium)', background: 'var(--bg-subtle)',
    color: 'var(--text-primary)', fontSize: 13,
    fontFamily: 'var(--font-sans)', outline: 'none',
  },
  content: { flex: 1, padding: '24px 28px', overflowY: 'auto' },
}

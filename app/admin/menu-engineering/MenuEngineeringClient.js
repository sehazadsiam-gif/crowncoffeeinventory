'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Coffee, BarChart2, LogOut, ChevronDown, ExternalLink, Eye } from 'lucide-react'
import ThemeToggle from '../../../components/ThemeToggle'
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

  // Auth State
  const [isAdmin, setIsAdmin] = useState(false)
  const [pinModal, setPinModal] = useState(false)
  const [pinVal, setPinVal] = useState('')
  const [pinErr, setPinErr] = useState('')

  // Data
  const [items,       setItems]       = useState([])
  const [channels,    setChannels]    = useState([])
  const [pricingData, setPricingData] = useState([])
  const [loading,     setLoading]     = useState(true)

  // Section B totals (lifted state for Section C)
  const [salesData, setSalesData] = useState({})

  // Export data per section
  const [exportDataB, setExportDataB] = useState([])
  const [exportDataC, setExportDataC] = useState([])

  const getAuthHeaders = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cc_token') || 'admin_pin_session' : 'admin_pin_session'
    return {
      'Authorization': `Bearer ${token}`,
      'x-admin-pin': '1590',
      'Content-Type': 'application/json'
    }
  }, [])

  // Load pricing data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const pricingRes = await fetch('/api/admin/pricing', {
        headers: getAuthHeaders()
      })
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
  }, [getAuthHeaders])

  // Load sales data dynamically
  const loadSalesData = useCallback(async (y, m) => {
    try {
      const res = await fetch(`/api/admin/sales?year=${y}&month=${m}`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (Array.isArray(data)) {
        const sm = {}
        data.forEach(entry => {
          const itemId = entry.menu_item_id
          const channelId = entry.channel_id || 'dineIn'
          if (!sm[itemId]) sm[itemId] = {}
          sm[itemId][channelId] = entry.quantity_sold
        })
        setSalesData(sm)
      } else {
        setSalesData({})
      }
    } catch (e) {
      console.error('Load sales data error:', e)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cc_token') : null
    const role = typeof window !== 'undefined' ? localStorage.getItem('cc_role') : null
    const adminFlag = typeof window !== 'undefined' ? localStorage.getItem('isAdmin') : null

    if (adminFlag === 'true' || role === 'admin' || role === 'sub_admin' || token === 'admin_pin_session') {
      setIsAdmin(true)
      document.cookie = `cc_token=${token || 'admin_pin_session'}; path=/; max-age=604800; SameSite=Lax`
      document.cookie = `cc_costing_token=admin_costing_session; path=/; max-age=604800; SameSite=Lax`
      loadData()
      loadSalesData(year, month)
    } else {
      setPinModal(true)
      setLoading(false)
    }
  }, [loadData, loadSalesData, year, month])

  function handlePinSubmit(e) {
    e.preventDefault()
    if (pinVal.trim() === '1590' || pinVal.trim() === 'admin12345') {
      localStorage.setItem('isAdmin', 'true')
      localStorage.setItem('cc_token', 'admin_pin_session')
      localStorage.setItem('cc_role', 'admin')
      document.cookie = `cc_token=admin_pin_session; path=/; max-age=604800; SameSite=Lax`
      document.cookie = `cc_costing_token=admin_costing_session; path=/; max-age=604800; SameSite=Lax`
      setIsAdmin(true)
      setPinModal(false)
      loadData()
      loadSalesData(year, month)
    } else {
      setPinErr('Invalid Admin PIN. (Default: 1590)')
    }
  }

  // Derive Section B / C totals dynamically
  const totalRevenue = items.reduce((sum, item) => {
    const qtySold = Object.values(salesData[item.id] || { dineIn: 0 }).reduce((s, v) => s + (parseInt(v) || 0), 0)
    const dineInSp = parseFloat(item.dine_in_price) || 0
    return sum + (qtySold * dineInSp)
  }, 0)

  const totalCM = items.reduce((sum, item) => {
    const qtySold = Object.values(salesData[item.id] || { dineIn: 0 }).reduce((s, v) => s + (parseInt(v) || 0), 0)
    const dineInSp = parseFloat(item.dine_in_price) || 0
    const cogs = item.current_cogs || 0
    const dineCM = dineInSp - cogs
    return sum + (qtySold * dineCM)
  }, 0)

  function handleExport(section) {
    if (section === 'B') console.log('Export B triggered — data passed via ExportButton')
    if (section === 'C') console.log('Export C triggered')
  }

  async function handleLogout() {
    await fetch('/api/costing/auth/login', { method: 'DELETE' }).catch(() => {})
    router.replace('/dashboard')
  }

  if (pinModal) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg, #F8FAFC)',
        padding: 20
      }}>
        <form onSubmit={handlePinSubmit} style={{
          background: 'var(--bg-card, #ffffff)',
          padding: '36px 32px',
          borderRadius: 16,
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          maxWidth: 380,
          width: '100%',
          textAlign: 'center',
          border: '1px solid var(--border, rgba(0,0,0,0.08))'
        }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'var(--accent-brown-dim, rgba(124,58,30,0.1))',
            color: 'var(--accent-brown, #7C3A1E)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Coffee size={26} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>Crown Coffee Admin</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted, #64748B)', margin: '0 0 24px' }}>
            Enter Admin PIN to access Menu Engineering
          </p>
          <input
            type="password"
            autoFocus
            maxLength={6}
            placeholder="PIN (1590)"
            value={pinVal}
            onChange={e => { setPinVal(e.target.value); setPinErr('') }}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: 20,
              letterSpacing: 8,
              textAlign: 'center',
              borderRadius: 10,
              border: '1px solid var(--border, #CBD5E1)',
              background: 'var(--bg-subtle, #F8FAFC)',
              marginBottom: 16,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {pinErr && (
            <div style={{ color: 'var(--danger, #EF4444)', fontSize: 13, marginBottom: 16 }}>
              {pinErr}
            </div>
          )}
          <button type="submit" style={{
            width: '100%',
            padding: '12px 20px',
            background: 'var(--accent-brown, #7C3A1E)',
            color: '#fff',
            borderRadius: 10,
            border: 'none',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer'
          }}>
            Unlock Menu Engineering
          </button>
          <div style={{ marginTop: 16 }}>
            <a href="/dashboard" style={{ fontSize: 13, color: 'var(--text-muted, #64748B)', textDecoration: 'none' }}>
              ← Return to Dashboard
            </a>
          </div>
        </form>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingSpinner} />
        <span style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 12 }}>Loading Menu Engineering…</span>
      </div>
    )
  }

  return (
    <div className="admin-shell" style={styles.shell}>
      <style>{`
        @media (max-width: 900px) {
          .admin-shell {
            flex-direction: column !important;
          }
          .admin-sidebar {
            width: 100% !important;
            height: auto !important;
            position: relative !important;
            border-right: none !important;
            border-bottom: 1px solid var(--border-light) !important;
          }
          .admin-nav-section {
            display: flex !important;
            flex-direction: row !important;
            overflow-x: auto !important;
            gap: 6px !important;
            padding: 6px 12px !important;
            align-items: center !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .admin-nav-item {
            padding: 8px 12px !important;
            white-space: nowrap !important;
            margin-bottom: 0 !important;
            border-left: none !important;
            border-bottom: 3px solid transparent !important;
          }
          .admin-sidebar-footer {
            display: none !important;
          }
          .admin-topbar {
            padding: 12px 16px !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .admin-content {
            padding: 14px 10px !important;
          }
        }
        @media (min-width: 1921px) {
          .admin-sidebar {
            width: 280px !important;
          }
          .admin-topbar {
            padding: 22px 36px !important;
          }
          .admin-page-title {
            font-size: 24px !important;
          }
          .admin-content {
            padding: 32px 40px !important;
            max-width: 2600px !important;
          }
        }
      `}</style>
      {/* ── SIDEBAR ─────────────────────────────────────── */}
      <aside className="admin-sidebar" style={styles.sidebar}>
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
          <div className="admin-nav-section" style={styles.navSection}>
            <div style={styles.navLabel}>Menu Engineering</div>
            {(['A','B','C']).map(tab => {
              const labels = { A: 'Items & Pricing', B: 'Monthly Sales', C: 'Profitability' }
              return (
                <button
                  key={tab}
                  id={`tab-${tab}`}
                  className="admin-nav-item"
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

        <div className="admin-sidebar-footer" style={styles.sidebarFooter}>
          <div style={styles.chefLink}>
            <a
              href="/menu-engineering/view"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 10px',
                borderRadius: 8,
                background: 'rgba(124, 58, 30, 0.08)',
                border: '1px solid rgba(124, 58, 30, 0.2)',
                color: 'var(--accent-brown, #7C3A1E)',
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'none',
                marginBottom: 8
              }}
            >
              <Eye size={13} />
              <span>Public View-Only ↗</span>
            </a>
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
      <main className="admin-main" style={styles.main}>
        {/* Top bar */}
        <div className="admin-topbar" style={styles.topBar}>
          <div style={styles.topBarLeft}>
            <h1 className="admin-page-title" style={styles.pageTitle}>
              {activeTab === 'A' && 'Items & Pricing'}
              {activeTab === 'B' && 'Monthly Sales & Classification'}
              {activeTab === 'C' && 'Business Profitability'}
            </h1>
          </div>

          {/* Month/Year Picker & Theme Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <a
              href="/menu-engineering/view"
              target="_blank"
              rel="noopener noreferrer"
              title="Open public view-only page in new tab"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 13px',
                borderRadius: 8,
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border, #E2E8F0)',
                color: 'var(--accent-brown, #7C3A1E)',
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                cursor: 'pointer'
              }}
            >
              <Eye size={14} />
              <span>Public View</span>
              <ExternalLink size={12} style={{ opacity: 0.6 }} />
            </a>
            <ThemeToggle />
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
        </div>

        {/* Section content */}
        <div className="admin-content" style={styles.content}>
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
              salesData={salesData}
              setSalesData={setSalesData}
              onExport={section => {}}
            />
          )}
          {activeTab === 'C' && (
            <SectionC
              year={year}
              month={month}
              totalCM={totalCM}
              totalRevenue={totalRevenue}
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

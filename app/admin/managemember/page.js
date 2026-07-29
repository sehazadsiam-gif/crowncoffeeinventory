'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import html2canvas from 'html2canvas'

export default function AdminManageMemberPage() {
  const [members, setMembers] = useState([])
  const [cardLogs, setCardLogs] = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  
  // Security PIN state (PIN: 1590)
  const [pinVerified, setPinVerified] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Custom High-Res Download & Size State
  const [downloadScale, setDownloadScale] = useState(3) // 1x, 2x, 3x (300 DPI), 4x (4K)
  const [downloading, setDownloading] = useState(false)

  // Instant Member Input Form State
  const [newMemberForm, setNewMemberForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    special_dates: [
      { occasion_name: 'Birthday', month: 1, day: 1 }
    ],
    rfid_code: '',
    card_number: ''
  })

  const [rfidPairInput, setRfidPairInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('directory') // 'directory', 'create', 'studio', 'logs'
  const [cardTheme, setCardTheme] = useState('dark') // 'dark', 'gold', 'silver'

  const [visitLogDate, setVisitLogDate] = useState(new Date().toISOString().split('T')[0])
  const [dailyVisitsList, setDailyVisitsList] = useState([])
  // Edit/Delete visit state
  const [visitEditState, setVisitEditState] = useState(null) // { id, visited_at } while editing
  const [deleteConfirmId, setDeleteConfirmId] = useState(null) // visit id awaiting confirm
  const [visitActionLoading, setVisitActionLoading] = useState(false)


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAdmin = localStorage.getItem('isAdmin')
      const token = localStorage.getItem('cc_token')
      if (isAdmin === 'true' || token === 'admin_pin_session') {
        setPinVerified(true)
      }
    }
    fetchMembers()
    fetchLogs()
    fetchDailyVisitsList(visitLogDate)
  }, [visitLogDate])

  const fetchDailyVisitsList = async (dateStr) => {
    try {
      const res = await fetch(`/api/members/visits/list?date=${dateStr}`)
      const data = await res.json()
      if (data.success) {
        setDailyVisitsList(data.visits || [])
      }
    } catch (err) {
      console.error('Error fetching admin daily visits:', err)
    }
  }

  const handleDeleteVisit = async (visitId) => {
    setVisitActionLoading(true)
    try {
      const token = localStorage.getItem('cc_token') || ''
      const res = await fetch(`/api/members/visits/${visitId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setDeleteConfirmId(null)
        fetchDailyVisitsList(visitLogDate)
        setMessage('Visit deleted and member counters rolled back.')
      } else {
        setMessage(`Delete failed: ${data.error || 'Unknown error'}`)
      }
    } catch (err) {
      setMessage('Delete request failed.')
    } finally {
      setVisitActionLoading(false)
    }
  }

  const handleEditVisit = async (visitId) => {
    if (!visitEditState || visitEditState.id !== visitId) return
    setVisitActionLoading(true)
    try {
      const token = localStorage.getItem('cc_token') || ''
      const res = await fetch(`/api/members/visits/${visitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ visited_at: visitEditState.visited_at })
      })
      const data = await res.json()
      if (data.success) {
        setVisitEditState(null)
        fetchDailyVisitsList(visitLogDate)
        setMessage('Visit timestamp updated.')
      } else {
        setMessage(`Edit failed: ${data.error || 'Unknown error'}`)
      }
    } catch (err) {
      setMessage('Edit request failed.')
    } finally {
      setVisitActionLoading(false)
    }
  }


  const handleVerifyPin = (e) => {
    e.preventDefault()
    if (pinInput.trim() === '1590') {
      localStorage.setItem('isAdmin', 'true')
      localStorage.setItem('cc_token', 'admin_pin_session')
      localStorage.setItem('cc_role', 'admin')
      setPinVerified(true)
      setPinError('')
      fetchMembers()
    } else {
      setPinError('Invalid Admin PIN. Please try again.')
    }
  }

  const addSpecialDateRow = () => {
    setNewMemberForm(prev => ({
      ...prev,
      special_dates: [...prev.special_dates, { occasion_name: 'Anniversary', month: 1, day: 1 }]
    }))
  }

  const removeSpecialDateRow = (index) => {
    setNewMemberForm(prev => ({
      ...prev,
      special_dates: prev.special_dates.filter((_, i) => i !== index)
    }))
  }

  const updateSpecialDateRow = (index, field, value) => {
    setNewMemberForm(prev => {
      const updated = [...prev.special_dates]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, special_dates: updated }
    })
  }

  useEffect(() => {
    fetchMembers()
    fetchLogs()
  }, [])

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members/list')
      const data = await res.json()
      if (data.success) {
        setMembers(data.members || [])
        if (data.members && data.members.length > 0 && !selectedMember) {
          setSelectedMember(data.members[0])
        }
      }
    } catch (err) {
      console.error('Error fetching members:', err)
    }
  }

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/members/rfid/manage')
      const data = await res.json()
      if (data.success) {
        setCardLogs(data.logs || [])
      }
    } catch (err) {
      console.error('Error fetching logs:', err)
    }
  }

  // Handle Instant Member Creation + Card Generation
  const handleCreateMemberAndGenerateCard = async (e) => {
    e.preventDefault()
    if (!newMemberForm.full_name || !newMemberForm.email || !newMemberForm.phone) {
      setMessage('Please enter Full Name, Phone, and Email.')
      return
    }

    setLoading(true)
    setMessage('')
    try {
      // 1. Submit application to create member
      const specialDatesPayload = newMemberForm.special_dates
        .filter(d => d.occasion_name)
        .map(d => ({
          occasion_name: d.occasion_name,
          month: parseInt(d.month || '1'),
          day: parseInt(d.day || '1')
        }))

      const appRes = await fetch('/api/members/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newMemberForm.full_name,
          email: newMemberForm.email,
          phone: newMemberForm.phone,
          address: newMemberForm.address,
          special_dates: specialDatesPayload,
          card_number: newMemberForm.card_number || `CC-MEM-${Math.floor(1000 + Math.random() * 9000)}`
        })
      })

      const appData = await appRes.json()

      // ── Duplicate email / phone guard ──────────────────────────────────────
      if (appRes.status === 409) {
        const dupField = appData.duplicate_field === 'email' ? 'Email' : 'Phone Number'
        setMessage(
          `⛔ Duplicate ${dupField}: "${newMemberForm[appData.duplicate_field]}" is already registered ` +
          `under member "${appData.existing_name}" (${appData.existing_status}). ` +
          `Each member must have a unique email and phone. Go to the Directory tab to locate them.`
        )
        setLoading(false)
        return
      }

      if (!appData.success || (!appData.member && !appData.member_id)) {
        setMessage(`Error creating member: ${appData.error || 'Failed'}`)
        setLoading(false)
        return
      }

      const createdMemberId = appData.member?.id || appData.member_id
      const rfidToPair = newMemberForm.rfid_code.trim() || `RFID-${Math.floor(100000 + Math.random() * 900000)}`

      // 2. Pair RFID card and set 12 months expiration
      const pairRes = await fetch('/api/members/rfid/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pair',
          member_id: createdMemberId,
          rfid_code: rfidToPair,
          reason: 'Created & Generated via Admin Manage Member Hub'
        })
      })

      const pairData = await pairRes.json()

      if (pairData.success && pairData.member) {
        setSelectedMember(pairData.member)
        setMessage(`Member ${pairData.member.full_name} created & credit card generated! 12-month validity active.`)
        setNewMemberForm({ full_name: '', phone: '', email: '', rfid_code: '', card_number: '' })
        setActiveTab('studio')
        fetchMembers()
        fetchLogs()
      } else {
        setMessage(`Member created but RFID pairing failed: ${pairData.error}`)
      }
    } catch (err) {
      setMessage('Failed to process member creation and card generation')
    } finally {
      setLoading(false)
    }
  }

  const handlePairExistingCard = async (e) => {
    e.preventDefault()
    if (!selectedMember || !rfidPairInput.trim()) {
      setMessage('Please select a member and enter an RFID card code.')
      return
    }

    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/members/rfid/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pair',
          member_id: selectedMember.id,
          rfid_code: rfidPairInput.trim(),
          reason: 'Paired via Admin Manage Member Studio'
        })
      })

      const data = await res.json()
      if (data.success) {
        setMessage(`RFID Card successfully paired to ${selectedMember.full_name}! 12-month validity active.`)
        setRfidPairInput('')
        fetchMembers()
        fetchLogs()
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (err) {
      setMessage('Failed to pair RFID card')
    } finally {
      setLoading(false)
    }
  }

  const handlePrintCard = () => {
    window.print()
  }

  const handleDownloadCard = async (elementId, sideName) => {
    const element = document.getElementById(elementId)
    if (!element || !selectedMember) {
      setMessage('Please select a member first.')
      return
    }

    setDownloading(true)
    setMessage('')
    try {
      const canvas = await html2canvas(element, {
        scale: Number(downloadScale),
        useCORS: true,
        backgroundColor: null,
        logging: false
      })

      const link = document.createElement('a')
      const sanitizedName = selectedMember.full_name.replace(/[^a-zA-Z0-9]/g, '_')
      link.download = `CrownCoffee_${sanitizedName}_${sideName}_${downloadScale}x.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      link.click()
      setMessage(`Downloaded ${sideName} card image (${downloadScale}x resolution)!`)
    } catch (err) {
      console.error('Error rendering card image:', err)
      setMessage('Failed to render card image for download.')
    } finally {
      setDownloading(false)
    }
  }

  const getThemeStyles = () => {
    if (cardTheme === 'gold') {
      return {
        bg: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 25%, #B38728 50%, #FBF5B7 75%, #AA771C 100%)',
        textColor: '#2A1800',
        subColor: '#4A3200',
        borderColor: '#AA771C'
      }
    }
    if (cardTheme === 'silver') {
      return {
        bg: 'linear-gradient(135deg, #E0E0E0 0%, #F5F5F5 30%, #BDBDBD 60%, #EEEEEE 100%)',
        textColor: '#1A1A1A',
        subColor: '#424242',
        borderColor: '#9E9E9E'
      }
    }
    return {
      bg: 'linear-gradient(135deg, #1A0D07 0%, #3B2012 50%, #150A05 100%)',
      textColor: '#FFFFFF',
      subColor: '#D4AF37',
      borderColor: '#4A2810'
    }
  }

  const activeTheme = getThemeStyles()

  if (!pinVerified) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#1E110A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Inter', system-ui, sans-serif"
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '40px',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}>
          <h1 style={{ fontSize: '36px', fontWeight: 900, color: '#D4AF37', margin: 0 }}>CC</h1>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1C1917', margin: '8px 0 4px 0' }}>
            Admin Security Guard
          </h2>
          <p style={{ fontSize: '13px', color: '#78716C', margin: '0 0 24px 0' }}>
            Enter Admin PIN to access Member Management Studio
          </p>

          {pinError && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', color: '#991B1B', fontSize: '13px', marginBottom: '16px', fontWeight: 700 }}>
              {pinError}
            </div>
          )}

          <form onSubmit={handleVerifyPin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <input
                type="password"
                placeholder="Enter PIN (1590)"
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid #D6D3D1',
                  fontSize: '18px',
                  letterSpacing: '6px',
                  textAlign: 'center',
                  outline: 'none'
                }}
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#1E110A',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              ACCESS MEMBER STUDIO →
            </button>
          </form>
        </div>
      </div>
    )
  }

  const filteredMembers = members.filter(m => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      m.full_name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone?.includes(q) ||
      m.card_number?.toLowerCase().includes(q) ||
      m.rfid_code?.toLowerCase().includes(q)
    )
  })

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F5F4',
      color: '#1C1917',
      fontFamily: "'Inter', 'Segoe UI', sans-serif"
    }}>
      {/* Print Styles for PVC Plastic Card Printer */}
      <style>{`
        @media print {
          @page {
            size: auto;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible !important;
          }
          .print-area {
            position: relative !important;
            margin: 15px auto !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Navbar */}
      <header className="no-print" style={{
        backgroundColor: '#1E110A',
        color: '#FFFFFF',
        padding: '16px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#D4AF37' }}>
            Crown Coffee Member Management & ID Studio
          </h1>
          <span style={{
            fontSize: '12px',
            backgroundColor: '#382215',
            color: '#E0C870',
            padding: '4px 10px',
            borderRadius: '12px',
            fontWeight: 700
          }}>
            ccadmin.online/admin/managemember
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link
            href="/memberprogressview"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#382215',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 700
            }}
          >
            Manager Progress View →
          </Link>
          <Link
            href="/admin"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#D4AF37',
              color: '#100803',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 800
            }}
          >
            Admin Panel →
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="no-print" style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 20px' }}>

        {/* Feedback Alert Message */}
        {message && (
          <div style={{
            padding: '14px 20px',
            borderRadius: '10px',
            backgroundColor: message.includes('Error') ? '#FEF2F2' : '#F0FDF4',
            border: `1px solid ${message.includes('Error') ? '#FCA5A5' : '#86EFAC'}`,
            color: message.includes('Error') ? '#991B1B' : '#166534',
            fontWeight: 700,
            fontSize: '14px',
            marginBottom: '24px'
          }}>
            {message}
          </div>
        )}

        {/* Global Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '28px' }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E7E5E4', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', textTransform: 'uppercase' }}>Total Enlisted Members</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#1C1917', marginTop: '4px' }}>{members.length}</div>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E7E5E4', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', textTransform: 'uppercase' }}>Active Members</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#15803D', marginTop: '4px' }}>
              {members.filter(m => m.status === 'active' || m.card_status === 'active').length}
            </div>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E7E5E4', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', textTransform: 'uppercase' }}>Card Issuances</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#1E110A', marginTop: '4px' }}>{cardLogs.length}</div>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E7E5E4', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', textTransform: 'uppercase' }}>Card Validity</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#D4AF37', marginTop: '4px' }}>12 Months</div>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('directory')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'directory' ? '#1E110A' : '#E7E5E4',
              color: activeTab === 'directory' ? '#FFFFFF' : '#44403C',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            All Enlisted Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('daily_visits')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'daily_visits' ? '#1E110A' : '#E7E5E4',
              color: activeTab === 'daily_visits' ? '#FFFFFF' : '#44403C',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Daily Member Visits ({dailyVisitsList.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'create' ? '#1E110A' : '#E7E5E4',
              color: activeTab === 'create' ? '#FFFFFF' : '#44403C',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Create Member & Generate Credit Card
          </button>
          <button
            onClick={() => setActiveTab('studio')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'studio' ? '#1E110A' : '#E7E5E4',
              color: activeTab === 'studio' ? '#FFFFFF' : '#44403C',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Credit-Card ID Studio & Print
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'logs' ? '#1E110A' : '#E7E5E4',
              color: activeTab === 'logs' ? '#FFFFFF' : '#44403C',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Card Status Audit Logs ({cardLogs.length})
          </button>
        </div>

        {/* TAB 0: ALL ENLISTED MEMBERS DIRECTORY */}
        {activeTab === 'directory' && (
          <div style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '16px', border: '1px solid #E7E5E4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                  Enlisted Members Directory ({filteredMembers.length})
                </h3>
                <p style={{ fontSize: '12px', color: '#78716C', margin: '4px 0 0 0' }}>
                  Click "Generate Card & Print" next to any member to edit design or print CR80 plastic card.
                </p>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member by Name, Phone, Email, Card #..."
                style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '14px', width: '320px', outline: 'none' }}
              />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F5F5F4', textAlign: 'left', color: '#78716C' }}>
                    <th style={{ padding: '12px' }}>Member Name</th>
                    <th style={{ padding: '12px' }}>Card Number</th>
                    <th style={{ padding: '12px' }}>Mobile Phone</th>
                    <th style={{ padding: '12px' }}>Email</th>
                    <th style={{ padding: '12px' }}>RFID Code</th>
                    <th style={{ padding: '12px' }}>Visits</th>
                    <th style={{ padding: '12px' }}>Card Validity (12M)</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #E7E5E4' }}>
                      <td style={{ padding: '12px', fontWeight: 800, color: '#1C1917' }}>
                        {m.full_name}
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#6B3A2A' }}>
                        {m.card_number || 'CC-MEM-8042'}
                      </td>
                      <td style={{ padding: '12px', color: '#57534E' }}>{m.phone || '-'}</td>
                      <td style={{ padding: '12px', color: '#57534E' }}>{m.email || '-'}</td>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '6px', backgroundColor: m.rfid_code ? '#E0F2FE' : '#F5F5F4', color: m.rfid_code ? '#0369A1' : '#78716C', fontWeight: 700 }}>
                          {m.rfid_code || 'Unpaired'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 800 }}>#{m.total_visits || 0}</td>
                      <td style={{ padding: '12px', fontSize: '12px', fontWeight: 700, color: '#D4AF37' }}>
                        EXP: {m.card_expires_at 
                          ? new Date(m.card_expires_at).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' })
                          : new Date(new Date().setMonth(new Date().getMonth() + 12)).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setSelectedMember(m)
                            setActiveTab('studio')
                          }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#1E110A',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          Generate Card & Print →
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#78716C' }}>
                        No members found matching "{searchQuery}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 0.5: DAILY MEMBER VISITS LOG BY DATE */}
        {activeTab === 'daily_visits' && (
          <div style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '16px', border: '1px solid #E7E5E4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                  Daily Member Visits Audit Log ({dailyVisitsList.length} Visits)
                </h3>
                <p style={{ fontSize: '12px', color: '#78716C', margin: '4px 0 0 0' }}>
                  Filter and track every single member visit punch recorded on any specific calendar date.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#1C1917' }}>Select Date:</label>
                <input
                  type="date"
                  value={visitLogDate}
                  onChange={(e) => setVisitLogDate(e.target.value)}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '14px', outline: 'none', fontWeight: 700 }}
                />
                <button
                  onClick={() => setVisitLogDate(new Date().toISOString().split('T')[0])}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D6D3D1', backgroundColor: '#F5F5F4', color: '#1C1917', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Today
                </button>
              </div>
            </div>

            {message && (
              <div style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '16px',
                backgroundColor: message.toLowerCase().includes('fail') || message.toLowerCase().includes('error') ? '#FEE2E2' : '#D1FAE5',
                color: message.toLowerCase().includes('fail') || message.toLowerCase().includes('error') ? '#991B1B' : '#065F46',
                fontWeight: 700, fontSize: '13px' }}>
                {message}
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F5F5F4', textAlign: 'left', color: '#78716C' }}>
                    <th style={{ padding: '12px' }}>Visit Time</th>
                    <th style={{ padding: '12px' }}>Member Name</th>
                    <th style={{ padding: '12px' }}>Card Number</th>
                    <th style={{ padding: '12px' }}>Phone</th>
                    <th style={{ padding: '12px' }}>Email</th>
                    <th style={{ padding: '12px' }}>Punches</th>
                    <th style={{ padding: '12px' }}>Total Visits</th>
                    <th style={{ padding: '12px' }}>Recorded By</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyVisitsList.map(v => {
                    const isEditing = visitEditState?.id === v.id
                    const isDeleting = deleteConfirmId === v.id
                    return (
                      <>
                        <tr key={v.id} style={{ borderBottom: isEditing || isDeleting ? 'none' : '1px solid #E7E5E4',
                          backgroundColor: isEditing ? '#EFF6FF' : isDeleting ? '#FFF7ED' : 'white' }}>
                          <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#1E110A' }}>
                            {new Date(v.visited_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#1C1917' }}>
                            {v.members?.full_name || 'Member'}
                          </td>
                          <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#6B3A2A' }}>
                            {v.members?.card_number || '-'}
                          </td>
                          <td style={{ padding: '12px', color: '#57534E' }}>{v.members?.phone || '-'}</td>
                          <td style={{ padding: '12px', color: '#57534E' }}>{v.members?.email || '-'}</td>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#15803D' }}>
                            {v.members?.visit_punch_count || 0}/5
                          </td>
                          <td style={{ padding: '12px', fontWeight: 800 }}>#{v.members?.total_visits || 0}</td>
                          <td style={{ padding: '12px', fontSize: '11px', textTransform: 'uppercase', color: '#78716C' }}>
                            {v.recorded_by || 'RFID Tap'}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              {/* Edit button */}
                              {!isDeleting && (
                                <button
                                  onClick={() => {
                                    if (isEditing) {
                                      setVisitEditState(null)
                                    } else {
                                      setDeleteConfirmId(null)
                                      setVisitEditState({ id: v.id, visited_at: v.visited_at.slice(0, 16) })
                                    }
                                  }}
                                  style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                                    backgroundColor: isEditing ? '#DBEAFE' : '#F0F9FF', color: isEditing ? '#1D4ED8' : '#0369A1' }}
                                  title="Edit visit time"
                                >
                                  {isEditing ? '✕ Cancel' : '✏️ Edit'}
                                </button>
                              )}
                              {/* Delete button */}
                              {!isEditing && (
                                <button
                                  onClick={() => {
                                    if (isDeleting) {
                                      setDeleteConfirmId(null)
                                    } else {
                                      setVisitEditState(null)
                                      setDeleteConfirmId(v.id)
                                    }
                                  }}
                                  style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                                    backgroundColor: isDeleting ? '#FEE2E2' : '#FFF5F5', color: isDeleting ? '#991B1B' : '#DC2626' }}
                                  title="Delete visit"
                                >
                                  {isDeleting ? '✕ Cancel' : '🗑️ Delete'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Inline Edit Row */}
                        {isEditing && (
                          <tr key={`edit-${v.id}`} style={{ backgroundColor: '#EFF6FF', borderBottom: '1px solid #BFDBFE' }}>
                            <td colSpan={9} style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#1D4ED8' }}>✏️ Edit Visit Time for {v.members?.full_name}:</span>
                                <input
                                  type="datetime-local"
                                  value={visitEditState.visited_at}
                                  onChange={e => setVisitEditState(prev => ({ ...prev, visited_at: e.target.value }))}
                                  style={{ padding: '7px 12px', borderRadius: '7px', border: '1px solid #93C5FD', fontSize: '13px', fontWeight: 700, outline: 'none' }}
                                />
                                <button
                                  onClick={() => handleEditVisit(v.id)}
                                  disabled={visitActionLoading}
                                  style={{ padding: '7px 18px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 800,
                                    backgroundColor: '#1D4ED8', color: 'white', opacity: visitActionLoading ? 0.6 : 1 }}
                                >
                                  {visitActionLoading ? 'Saving…' : '✓ Save'}
                                </button>
                                <button
                                  onClick={() => setVisitEditState(null)}
                                  style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid #93C5FD', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                                    backgroundColor: 'white', color: '#1D4ED8' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Inline Delete Confirm Row */}
                        {isDeleting && (
                          <tr key={`del-${v.id}`} style={{ backgroundColor: '#FFF7ED', borderBottom: '1px solid #FED7AA' }}>
                            <td colSpan={9} style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#C2410C' }}>
                                  🗑️ Delete this visit for <strong>{v.members?.full_name}</strong>? Member counters will be rolled back.
                                </span>
                                <button
                                  onClick={() => handleDeleteVisit(v.id)}
                                  disabled={visitActionLoading}
                                  style={{ padding: '7px 18px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 800,
                                    backgroundColor: '#DC2626', color: 'white', opacity: visitActionLoading ? 0.6 : 1 }}
                                >
                                  {visitActionLoading ? 'Deleting…' : '✓ Yes, Delete'}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid #FCA5A5', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                                    backgroundColor: 'white', color: '#DC2626' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                  {dailyVisitsList.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#78716C' }}>
                        No member visits recorded for date: <strong>{visitLogDate}</strong>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}


        {/* TAB 1: CREATE MEMBER & GENERATE CARD */}
        {activeTab === 'create' && (
          <div style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '16px', border: '1px solid #E7E5E4' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: 0, marginBottom: '16px' }}>
              Input Member Details & Issue Credit-Card ID
            </h3>

            <form onSubmit={handleCreateMemberAndGenerateCard} style={{ maxWidth: '600px', display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', display: 'block', marginBottom: '6px' }}>Member Full Name *</label>
                <input
                  type="text"
                  value={newMemberForm.full_name}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, full_name: e.target.value })}
                  placeholder="Enter full name..."
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', display: 'block', marginBottom: '6px' }}>Mobile Phone *</label>
                  <input
                    type="text"
                    value={newMemberForm.phone}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
                    placeholder="Enter phone number..."
                    required
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', display: 'block', marginBottom: '6px' }}>Email Address *</label>
                  <input
                    type="email"
                    value={newMemberForm.email}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                    placeholder="Enter email address..."
                    required
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', display: 'block', marginBottom: '6px' }}>Member Address</label>
                <input
                  type="text"
                  value={newMemberForm.address}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, address: e.target.value })}
                  placeholder="Enter house address..."
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '14px' }}
                />
              </div>

              {/* Multiple Special Occasion Dates Input */}
              <div style={{ backgroundColor: '#FAFAF9', padding: '16px', borderRadius: '12px', border: '1px solid #E7E5E4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: '#1C1917' }}>
                    Special Occasion Dates (Birthday, Anniversary, etc.)
                  </label>
                  <button
                    type="button"
                    onClick={addSpecialDateRow}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      border: '1px solid #D6D3D1',
                      backgroundColor: '#FFFFFF',
                      color: '#1E110A',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    + Add Another Occasion
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {newMemberForm.special_dates.map((sd, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={sd.occasion_name}
                        onChange={(e) => updateSpecialDateRow(idx, 'occasion_name', e.target.value)}
                        placeholder="e.g. Birthday, Anniversary..."
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '13px' }}
                      />

                      <select
                        value={sd.month}
                        onChange={(e) => updateSpecialDateRow(idx, 'month', e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '13px', outline: 'none' }}
                      >
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                          <option key={m} value={i + 1}>{m}</option>
                        ))}
                      </select>

                      <select
                        value={sd.day}
                        onChange={(e) => updateSpecialDateRow(idx, 'day', e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '13px', outline: 'none' }}
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>

                      {newMemberForm.special_dates.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSpecialDateRow(idx)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#FEE2E2',
                            color: '#991B1B',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', display: 'block', marginBottom: '6px' }}>
                    RFID Card Code (Tap on Reader)
                  </label>
                  <input
                    type="text"
                    value={newMemberForm.rfid_code}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, rfid_code: e.target.value })}
                    placeholder="Scan RFID card tag..."
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', display: 'block', marginBottom: '6px' }}>
                    Card Number (Optional - Auto Generated)
                  </label>
                  <input
                    type="text"
                    value={newMemberForm.card_number}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, card_number: e.target.value })}
                    placeholder="e.g. CC-MEM-8042"
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFBEB', padding: '12px 16px', borderRadius: '8px', border: '1px solid #FDE68A', fontSize: '13px', color: '#92400E' }}>
                Card validity will be calculated as <strong>12 Months</strong> from today. Format: <strong>EXP: {new Date(new Date().setMonth(new Date().getMonth() + 12)).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' })}</strong>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#1E110A',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  marginTop: '8px'
                }}
              >
                {loading ? 'Creating & Generating Card...' : 'Save Member & Generate Credit Card →'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: ID CARD STUDIO & PRINT PREVIEW */}
        {activeTab === 'studio' && (
          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px' }}>
            
            {/* Member Selection Panel */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #E7E5E4' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginTop: 0, marginBottom: '16px' }}>Select Member</h3>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', display: 'block', marginBottom: '6px' }}>Member Profile</label>
                <select
                  value={selectedMember?.id || ''}
                  onChange={(e) => {
                    const m = members.find(item => item.id === e.target.value)
                    if (m) setSelectedMember(m)
                  }}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '14px', outline: 'none' }}
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.card_number || 'CC-MEM'}) — RFID: {m.rfid_code || 'Unpaired'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Manual RFID Card Tag Pairing for Selected Member */}
              <form onSubmit={handlePairExistingCard} style={{ marginBottom: '20px', backgroundColor: '#FAFAF9', padding: '12px', borderRadius: '8px', border: '1px solid #E7E5E4' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#1C1917', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Manual RFID Tag Number Input
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={rfidPairInput}
                    onChange={(e) => setRfidPairInput(e.target.value)}
                    placeholder="Type/scan RFID number..."
                    style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid #D6D3D1', fontSize: '13px' }}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#1E110A',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Pair Tag
                  </button>
                </div>
              </form>

              {/* Theme Customizer */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', display: 'block', marginBottom: '8px' }}>Plastic Card Theme</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {['dark', 'gold', 'silver'].map(t => (
                    <button
                      key={t}
                      onClick={() => setCardTheme(t)}
                      style={{
                        padding: '10px 4px',
                        borderRadius: '6px',
                        border: cardTheme === t ? '2px solid #1E110A' : '1px solid #D6D3D1',
                        backgroundColor: t === 'gold' ? '#EAB308' : t === 'silver' ? '#E5E7EB' : '#1C1917',
                        color: t === 'dark' ? '#FFF' : '#000',
                        fontSize: '12px',
                        fontWeight: 800,
                        textTransform: 'capitalize',
                        cursor: 'pointer'
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Download & Resolution Controls */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#78716C', display: 'block', marginBottom: '8px' }}>
                  Image Download Resolution
                </label>
                <select
                  value={downloadScale}
                  onChange={(e) => setDownloadScale(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '13px', outline: 'none' }}
                >
                  <option value={1}>1x Standard (337 × 212 px)</option>
                  <option value={2}>2x High Definition (674 × 424 px)</option>
                  <option value={3}>3x 300 DPI Ultra HD (1011 × 636 px) — Best for PVC Printers</option>
                  <option value={4}>4x 4K Ultra High-Res (1348 × 848 px)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => handleDownloadCard('card-front-preview', 'Front')}
                  disabled={downloading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #1E110A',
                    backgroundColor: '#F5F5F4',
                    color: '#1E110A',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: downloading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {downloading ? 'Rendering Image...' : 'Download Front Card (PNG)'}
                </button>

                <button
                  onClick={() => handleDownloadCard('card-back-preview', 'Back')}
                  disabled={downloading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #1E110A',
                    backgroundColor: '#F5F5F4',
                    color: '#1E110A',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: downloading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {downloading ? 'Rendering Image...' : 'Download Back Card (PNG)'}
                </button>

                <button
                  onClick={handlePrintCard}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#1E110A',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    marginTop: '4px'
                  }}
                >
                  Direct Print (CR80)
                </button>
              </div>
            </div>

            {/* CR80 Plastic Card Visual Preview */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '16px', border: '1px solid #E7E5E4' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginTop: 0, marginBottom: '20px' }}>
                CR80 Credit-Card Style ID Layout (85.6mm x 53.98mm)
              </h3>

              {selectedMember ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', alignItems: 'center' }}>
                  
                  {/* FRONT SIDE OF CARD */}
                  <div id="card-front-preview" className="print-area" style={{
                    width: '337px',
                    height: '212px',
                    borderRadius: '14px',
                    background: activeTheme.bg,
                    color: activeTheme.textColor,
                    padding: '20px 24px',
                    boxSizing: 'border-box',
                    position: 'relative',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
                    border: `1px solid ${activeTheme.borderColor}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '1px' }}>CROWN COFFEE</div>
                        <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1.5px', color: activeTheme.subColor, fontWeight: 700 }}>
                          Official Membership Card
                        </div>
                      </div>
                      <div style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        border: `1px solid ${activeTheme.subColor}`,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        color: activeTheme.subColor
                      }}>
                        GOLD
                      </div>
                    </div>

                    {/* RFID Microchip Icon */}
                    <div style={{
                      width: '38px',
                      height: '28px',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #FFE082 0%, #FFB300 100%)',
                      border: '1px solid #D4AF37',
                      position: 'relative'
                    }} />

                    {/* Member Details */}
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {selectedMember.full_name}
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        marginTop: '4px'
                      }}>
                        <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '1.5px' }}>
                          {selectedMember.card_number || 'CC-MEM-8042'}
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: activeTheme.subColor }}>
                          EXP:{' '}
                          {selectedMember.card_expires_at 
                            ? new Date(selectedMember.card_expires_at).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' })
                            : new Date(new Date().setMonth(new Date().getMonth() + 12)).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BACK SIDE OF CARD */}
                  <div id="card-back-preview" className="print-area" style={{
                    width: '337px',
                    height: '212px',
                    borderRadius: '14px',
                    background: activeTheme.bg,
                    color: activeTheme.textColor,
                    boxSizing: 'border-box',
                    position: 'relative',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
                    border: `1px solid ${activeTheme.borderColor}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ width: '100%', height: '36px', backgroundColor: '#111', marginTop: '16px' }} />

                    <div style={{ padding: '0 24px 20px 24px', fontSize: '9.5px', lineHeight: '1.6', color: activeTheme.subColor }}>
                      <div>- Property of Crown Coffee.</div>
                      <div>- Tap card at counter to enjoy 10% lifetime discount & earn 5-visit rewards.</div>
                      <div>- Non-transferable. Valid for 12 months from issue date.</div>
                    </div>
                  </div>

                </div>
              ) : (
                <div>No member selected</div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '16px', border: '1px solid #E7E5E4' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: 0, marginBottom: '16px' }}>
              Card Issuance & Replacement Audit Logs
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F5F5F4', textAlign: 'left', color: '#78716C' }}>
                    <th style={{ padding: '12px' }}>Timestamp</th>
                    <th style={{ padding: '12px' }}>Member</th>
                    <th style={{ padding: '12px' }}>Card #</th>
                    <th style={{ padding: '12px' }}>RFID Code</th>
                    <th style={{ padding: '12px' }}>Action</th>
                    <th style={{ padding: '12px' }}>Reason / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {cardLogs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #E7E5E4' }}>
                      <td style={{ padding: '12px', color: '#78716C', fontSize: '12px' }}>
                        {new Date(log.created_at).toLocaleString('en-GB')}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700 }}>
                        {log.members?.full_name || 'Member'}
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'monospace' }}>{log.card_number || '-'}</td>
                      <td style={{ padding: '12px', fontFamily: 'monospace' }}>{log.rfid_code || '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          backgroundColor: log.action === 'issued' ? '#DCFCE7' : log.action === 'lost' ? '#FEE2E2' : '#FEF3C7',
                          color: log.action === 'issued' ? '#15803D' : log.action === 'lost' ? '#991B1B' : '#92400E'
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#57534E' }}>{log.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

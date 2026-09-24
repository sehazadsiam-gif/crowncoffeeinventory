'use client'
import { useState, useRef } from 'react'
import {
  Upload, FileText, CheckCircle, AlertCircle, X, Download, Plus, RefreshCw, ArrowRight
} from 'lucide-react'

export default function MenuUploadModal({ isOpen, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('csv') // 'csv' | 'single' | 'sync'
  
  // CSV Upload State
  const [file, setFile] = useState(null)
  const [parsedRows, setParsedRows] = useState([])
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  // Single Item Add State
  const [singleItem, setSingleItem] = useState({
    name: '',
    category: 'Coffee',
    price: '',
    cogs: ''
  })
  const [singleSaving, setSingleSaving] = useState(false)
  const [singleMsg, setSingleMsg] = useState('')

  // Sync State
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)

  if (!isOpen) return null

  // Helpers
  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cc_token') || 'admin_pin_session' : 'admin_pin_session'
    return {
      'Authorization': `Bearer ${token}`,
      'x-admin-pin': '1590',
      'Content-Type': 'application/json'
    }
  }

  // Handle CSV file selection
  function handleFileSelect(e) {
    const f = e.target.files?.[0]
    if (!f) return
    parseCSVFile(f)
  }

  function handleDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (!f) return
    parseCSVFile(f)
  }

  function parseCSVFile(f) {
    setFile(f)
    setParseError('')
    setImportResult(null)

    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const text = ev.target.result
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
        if (lines.length < 2) {
          setParseError('The file seems empty or contains only a header line.')
          return
        }

        const headers = splitRow(lines[0]).map(h => h.toLowerCase().trim().replace(/['"]/g, ''))
        const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('item'))
        const catIdx  = headers.findIndex(h => h.includes('category') || h.includes('type') || h.includes('group'))
        const priceIdx = headers.findIndex(h => h.includes('price') || h.includes('rate') || h.includes('sp'))
        const costIdx  = headers.findIndex(h => h.includes('cost') || h.includes('cogs') || h.includes('cp'))

        const rows = []
        for (let i = 1; i < lines.length; i++) {
          const cols = splitRow(lines[i])
          if (!cols || cols.length === 0) continue

          const name = nameIdx >= 0 ? cols[nameIdx] : cols[0]
          if (!name || !name.trim()) continue

          const category = catIdx >= 0 && cols[catIdx] ? cols[catIdx].trim() : 'General'
          const price = priceIdx >= 0 && cols[priceIdx] ? parseFloat(cols[priceIdx].replace(/[^0-9.]/g, '')) || 0 : 0
          const cogs  = costIdx >= 0 && cols[costIdx] ? parseFloat(cols[costIdx].replace(/[^0-9.]/g, '')) || 0 : 0

          rows.push({ name: name.trim(), category, price, cogs })
        }

        if (rows.length === 0) {
          setParseError('No valid menu rows could be extracted. Please check the column headers.')
        } else {
          setParsedRows(rows)
        }
      } catch (err) {
        setParseError('Failed to read file: ' + err.message)
      }
    }
    reader.readAsText(f)
  }

  function splitRow(row) {
    const result = []
    let insideQuote = false
    let current = ''
    for (let i = 0; i < row.length; i++) {
      const char = row[i]
      if (char === '"' || char === "'") {
        insideQuote = !insideQuote
      } else if (char === ',' && !insideQuote) {
        result.push(current.trim().replace(/^["']|["']$/g, ''))
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ''))
    return result
  }

  // Submit CSV
  async function submitCSV() {
    if (!parsedRows.length) return
    setImporting(true)
    setParseError('')

    try {
      const res = await fetch('/api/admin/menu/upload', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ items: parsedRows })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')

      setImportResult({
        total: data.total,
        created: data.created,
        updated: data.updated
      })
      if (onSuccess) onSuccess()
    } catch (err) {
      setParseError(err.message)
    } finally {
      setImporting(false)
    }
  }

  // Submit Single Item
  async function submitSingleItem(e) {
    e.preventDefault()
    if (!singleItem.name.trim()) {
      setSingleMsg('Item Name is required')
      return
    }

    setSingleSaving(true)
    setSingleMsg('')

    try {
      const payload = {
        items: [{
          name: singleItem.name.trim(),
          category: singleItem.category.trim() || 'General',
          price: parseFloat(singleItem.price) || 0,
          cogs: parseFloat(singleItem.cogs) || 0
        }]
      }

      const res = await fetch('/api/admin/menu/upload', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save item')

      setSingleMsg('✅ Item added successfully!')
      setSingleItem({ name: '', category: 'Coffee', price: '', cogs: '' })
      if (onSuccess) onSuccess()
    } catch (err) {
      setSingleMsg('❌ ' + err.message)
    } finally {
      setSingleSaving(false)
    }
  }

  // Trigger POS Sync
  async function triggerSync() {
    setSyncing(true)
    setSyncResult(null)

    try {
      const res = await fetch('/api/admin/menu/sync-pos', {
        method: 'POST',
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sync failed')
      setSyncResult(data)
      if (onSuccess) onSuccess()
    } catch (err) {
      setSyncResult({ error: err.message })
    } finally {
      setSyncing(false)
    }
  }

  // Download template
  function downloadTemplate() {
    const csvContent = 'Item Name,Category,Price,Cost\n' +
      'Espresso,Coffee,150,45\n' +
      'Cappuccino,Coffee,220,60\n' +
      'Caffè Latte,Coffee,250,70\n' +
      'Americano,Coffee,180,35\n' +
      'Flat White,Coffee,240,65\n' +
      'Cold Brew,Cold Brew & Tea,220,50\n' +
      'Masala Chai,Cold Brew & Tea,80,25\n' +
      'BBQ Chicken Pizza,Pizza,650,220\n' +
      'Beef Bolognese Pasta,Pasta,450,150\n' +
      'Traditional Breakfast,Breakfast,380,120'

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'crown_coffee_menu_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>Upload Menu &amp; Pricing</h2>
            <p style={styles.modalSub}>
              Import or update menu items, selling prices, and making costs (COGS)
            </p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={18} />
          </button>
        </div>

        {/* Tab navigation */}
        <div style={styles.tabNav}>
          <button
            onClick={() => setActiveTab('csv')}
            style={{ ...styles.tabBtn, ...(activeTab === 'csv' ? styles.tabBtnActive : {}) }}
          >
            <Upload size={15} /> Upload CSV File
          </button>
          <button
            onClick={() => setActiveTab('single')}
            style={{ ...styles.tabBtn, ...(activeTab === 'single' ? styles.tabBtnActive : {}) }}
          >
            <Plus size={15} /> Add Single Item
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            style={{ ...styles.tabBtn, ...(activeTab === 'sync' ? styles.tabBtnActive : {}) }}
          >
            <RefreshCw size={15} /> Sync from POS / Recipes
          </button>
        </div>

        {/* Tab Content */}
        <div style={styles.tabBody}>
          {/* TAB 1: CSV UPLOAD */}
          {activeTab === 'csv' && (
            <div>
              <div style={styles.templateNotice}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={18} color="var(--accent-brown, #7C3A1E)" />
                  <span style={{ fontSize: 13 }}>
                    CSV columns: <strong>Item Name</strong>, <strong>Category</strong>, <strong>Price</strong>, <strong>Cost</strong> (or COGS)
                  </span>
                </div>
                <button onClick={downloadTemplate} style={styles.templateBtn}>
                  <Download size={13} /> Sample CSV Template
                </button>
              </div>

              {/* Dropzone */}
              {!parsedRows.length && (
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={styles.dropzone}
                >
                  <Upload size={36} color="var(--accent-brown, #7C3A1E)" style={{ marginBottom: 12 }} />
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                    Click or Drag &amp; Drop CSV File Here
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Supports UTF-8 CSV exports from Excel, Google Sheets, or POS
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />
                </div>
              )}

              {parseError && (
                <div style={styles.errorBox}>
                  <AlertCircle size={16} />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Preview table */}
              {parsedRows.length > 0 && (
                <div>
                  <div style={styles.previewHeader}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      Parsed {parsedRows.length} items from <span style={{ color: 'var(--accent-brown, #7C3A1E)' }}>{file?.name}</span>
                    </div>
                    <button
                      onClick={() => { setParsedRows([]); setFile(null); setImportResult(null) }}
                      style={styles.textBtn}
                    >
                      Choose Different File
                    </button>
                  </div>

                  <div style={styles.tableScroll}>
                    <table style={styles.previewTable}>
                      <thead>
                        <tr>
                          <th style={styles.pth}>#</th>
                          <th style={styles.pth}>Item Name</th>
                          <th style={styles.pth}>Category</th>
                          <th style={styles.pth}>Price (৳)</th>
                          <th style={styles.pth}>Cost / COGS (৳)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.slice(0, 15).map((row, idx) => (
                          <tr key={idx} style={styles.ptr}>
                            <td style={styles.ptd}>{idx + 1}</td>
                            <td style={{ ...styles.ptd, fontWeight: 600 }}>{row.name}</td>
                            <td style={styles.ptd}>{row.category}</td>
                            <td style={{ ...styles.ptd, color: 'var(--success, #10B981)', fontWeight: 600 }}>
                              ৳{row.price}
                            </td>
                            <td style={styles.ptd}>৳{row.cogs}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedRows.length > 15 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                      Showing first 15 of {parsedRows.length} items. All will be imported.
                    </div>
                  )}

                  {importResult ? (
                    <div style={styles.successBox}>
                      <CheckCircle size={18} color="#10B981" />
                      <div>
                        <strong>Successfully Imported!</strong>
                        <div style={{ fontSize: 12, marginTop: 2 }}>
                          {importResult.created} new items created, {importResult.updated} existing items updated.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                      <button onClick={onClose} style={styles.cancelBtn}>
                        Cancel
                      </button>
                      <button
                        onClick={submitCSV}
                        disabled={importing}
                        style={styles.primaryBtn}
                      >
                        {importing ? 'Saving Menu Items…' : `Confirm & Save ${parsedRows.length} Items`}
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SINGLE ITEM ADD */}
          {activeTab === 'single' && (
            <form onSubmit={submitSingleItem} style={{ maxWidth: 500, margin: '0 auto' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vanilla Bean Latte"
                  value={singleItem.name}
                  onChange={e => setSingleItem({ ...singleItem, name: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Category</label>
                <select
                  value={singleItem.category}
                  onChange={e => setSingleItem({ ...singleItem, category: e.target.value })}
                  style={styles.input}
                >
                  <option value="Coffee">Coffee</option>
                  <option value="Cold Brew &amp; Tea">Cold Brew &amp; Tea</option>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Pizza">Pizza</option>
                  <option value="Pasta">Pasta</option>
                  <option value="Sandwich">Sandwich</option>
                  <option value="Main Course">Main Course</option>
                  <option value="Appetizers">Appetizers</option>
                  <option value="Desserts">Desserts</option>
                  <option value="Cold Beverages">Cold Beverages</option>
                  <option value="General">General / Other</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Dine-in Selling Price (৳) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="250"
                    value={singleItem.price}
                    onChange={e => setSingleItem({ ...singleItem, price: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Making Cost / COGS (৳)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="65"
                    value={singleItem.cogs}
                    onChange={e => setSingleItem({ ...singleItem, cogs: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>

              {singleMsg && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  marginTop: 12,
                  background: singleMsg.startsWith('✅') ? 'var(--success-bg, #ECFDF5)' : 'var(--danger-bg, #FEF2F2)',
                  color: singleMsg.startsWith('✅') ? 'var(--success, #10B981)' : 'var(--danger, #EF4444)'
                }}>
                  {singleMsg}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                <button type="button" onClick={onClose} style={styles.cancelBtn}>
                  Done
                </button>
                <button type="submit" disabled={singleSaving} style={styles.primaryBtn}>
                  {singleSaving ? 'Adding…' : 'Add to Menu'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: POS SYNC */}
          {activeTab === 'sync' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--accent-brown-dim, rgba(124,58,30,0.1))',
                color: 'var(--accent-brown, #7C3A1E)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <RefreshCw size={28} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                Sync from POS &amp; Inventory Recipes
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto 20px', lineHeight: 1.5 }}>
                Automatically scans all menu items in the cafe POS and inventory system, pulls their current selling prices, and calculates COGS based on recipe ingredient costs.
              </p>

              {syncResult && (
                <div style={{
                  padding: '12px 18px',
                  borderRadius: 8,
                  marginBottom: 18,
                  textAlign: 'left',
                  background: syncResult.error ? 'var(--danger-bg, #FEF2F2)' : 'var(--success-bg, #ECFDF5)',
                  color: syncResult.error ? 'var(--danger, #EF4444)' : 'var(--success, #10B981)',
                  fontSize: 13
                }}>
                  {syncResult.error ? `Error: ${syncResult.error}` : syncResult.message}
                </div>
              )}

              <button
                onClick={triggerSync}
                disabled={syncing}
                style={{ ...styles.primaryBtn, margin: '0 auto' }}
              >
                <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Synchronizing…' : 'Start Synchronization'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 16
  },
  modal: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '90vh',
    background: 'var(--bg-card, #ffffff)',
    color: 'var(--text, #1E293B)',
    borderRadius: 16,
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid var(--border, rgba(0,0,0,0.08))'
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--border, rgba(0,0,0,0.08))',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700
  },
  modalSub: {
    margin: '4px 0 0',
    fontSize: 12,
    color: 'var(--text-muted, #64748B)'
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted, #64748B)',
    padding: 6,
    borderRadius: 6
  },
  tabNav: {
    display: 'flex',
    borderBottom: '1px solid var(--border, rgba(0,0,0,0.08))',
    background: 'var(--bg-subtle, #F8FAFC)'
  },
  tabBtn: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-muted, #64748B)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderBottom: '2px solid transparent'
  },
  tabBtnActive: {
    color: 'var(--accent-brown, #7C3A1E)',
    borderBottomColor: 'var(--accent-brown, #7C3A1E)',
    background: 'var(--bg-card, #ffffff)'
  },
  tabBody: {
    padding: 24,
    overflowY: 'auto'
  },
  templateNotice: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    padding: '10px 14px',
    background: 'var(--bg-subtle, #F8FAFC)',
    borderRadius: 8,
    marginBottom: 16,
    border: '1px solid var(--border, rgba(0,0,0,0.06))'
  },
  templateBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'transparent',
    border: '1px solid var(--border, rgba(0,0,0,0.15))',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--accent-brown, #7C3A1E)',
    cursor: 'pointer'
  },
  dropzone: {
    border: '2px dashed var(--accent-brown, #7C3A1E)',
    borderRadius: 12,
    padding: '36px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    background: 'var(--bg-subtle, #F8FAFC)',
    transition: 'all 0.15s ease'
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 14px',
    borderRadius: 8,
    background: 'var(--danger-bg, #FEF2F2)',
    color: 'var(--danger, #EF4444)',
    fontSize: 13,
    marginTop: 14
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  textBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-brown, #7C3A1E)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'underline'
  },
  tableScroll: {
    maxHeight: 260,
    overflowY: 'auto',
    border: '1px solid var(--border, rgba(0,0,0,0.08))',
    borderRadius: 8
  },
  previewTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12,
    textAlign: 'left'
  },
  pth: {
    padding: '8px 12px',
    background: 'var(--bg-subtle, #F8FAFC)',
    fontWeight: 600,
    color: 'var(--text-muted, #64748B)',
    position: 'sticky',
    top: 0
  },
  ptr: {
    borderBottom: '1px solid var(--border, rgba(0,0,0,0.04))'
  },
  ptd: {
    padding: '8px 12px'
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    borderRadius: 8,
    background: 'var(--success-bg, #ECFDF5)',
    color: '#065F46',
    marginTop: 16
  },
  formGroup: {
    marginBottom: 14
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 6,
    color: 'var(--text-muted, #64748B)'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--border, rgba(0,0,0,0.15))',
    fontSize: 14,
    background: 'var(--bg, #ffffff)',
    color: 'var(--text, #1E293B)',
    outline: 'none',
    boxSizing: 'border-box'
  },
  cancelBtn: {
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid var(--border, rgba(0,0,0,0.15))',
    background: 'transparent',
    color: 'var(--text-muted, #64748B)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer'
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--accent-brown, #7C3A1E)',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer'
  }
}

'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'
import { useToast } from '../../components/Toast'
import { 
  FileText, Upload, CheckCircle2, 
  AlertTriangle, ChevronRight, Package, Info, ArrowLeft, RefreshCw, Calendar
} from 'lucide-react'

export default function SalesImportPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [file, setFile] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [previewData, setPreviewData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || (role !== 'admin' && role !== 'sub_admin')) {
      router.replace('/')
    }
  }, [])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) uploadAndParse(selectedFile)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const selectedFile = e.dataTransfer.files[0]
    if (selectedFile) uploadAndParse(selectedFile)
  }

  const uploadAndParse = async (file) => {
    if (file.size > 10 * 1024 * 1024) {
      addToast('File size exceeds 10MB limit', 'error')
      return
    }
    setFile(file)
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('date', selectedDate)

      const res = await fetch('/api/sales/import', {
        method: 'POST',
        body: formData
      })
      const result = await res.json()

      if (!res.ok) throw new Error(result.error || 'Failed to parse file')

      setPreviewData(result.sales)
      addToast('Daily POS sales report parsed successfully with Gemini!', 'success')
    } catch (err) {
      console.error(err)
      addToast(err.message || 'Error parsing file', 'error')
      setFile(null)
    } finally {
      setLoading(false)
    }
  }

  const confirmImport = async () => {
    if (!previewData || previewData.length === 0) return
    
    // Check if there are unmatched items and warn user
    const unmatchedCount = previewData.filter(s => s.unmatched).length
    if (unmatchedCount > 0) {
      const proceed = confirm(`${unmatchedCount} items are unmatched and cannot be saved. Proceed anyway?`)
      if (!proceed) return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/sales/import', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales: previewData,
          date: selectedDate
        })
      })
      const result = await res.json()

      if (result.success) {
        addToast(`Successfully imported ${result.imported} sales records. Stock deducted.`, 'success')
        router.push('/sales')
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      addToast(err.message || 'Saving sales failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <Navbar />
      <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 24px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button 
            onClick={() => router.push('/sales')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', margin: 0 }}>POS Sales Report Import</h1>
            <p style={{ color: '#64748B', marginTop: '4px' }}>Upload end-of-day POS report (PDF/CSV) to log daily sales and auto-deduct ingredients</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Date Config */}
            {!previewData && (
              <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B', marginBottom: '12px' }}>Select Sales Date</h3>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', maxWidth: '300px' }}>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                    <input 
                      type="date" 
                      value={selectedDate} 
                      onChange={(e) => setSelectedDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 40px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: '#1E293B',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Upload Zone */}
            {!previewData && !loading && (
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                style={{
                  border: '2px dashed #CBD5E1',
                  borderRadius: '16px',
                  padding: '60px 40px',
                  textAlign: 'center',
                  background: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => document.getElementById('fileInput').click()}
              >
                <input 
                  id="fileInput" 
                  type="file" 
                  accept=".pdf,.csv,.txt,.xlsx,.xls,.png,.jpg,.jpeg" 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange}
                />
                <div style={{ background: '#F1F5F9', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Upload size={32} color="#64748B" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }}>
                  Click to upload sales report or drag and drop
                </h3>
                <p style={{ color: '#64748B', fontSize: '14px' }}>
                  PDF, Excel, Images, CSV or Text files up to 10MB (Processed securely by AI)
                </p>
              </div>
            )}

            {loading && (
              <div className="card" style={{ padding: '60px 40px', textAlign: 'center', background: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <RefreshCw className="animate-spin" size={32} color="#D4933A" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }}>
                  Gemini AI is parsing your sales report...
                </h3>
                <p style={{ color: '#64748B', fontSize: '14px' }}>
                  Matching sales against your database menu items.
                </p>
              </div>
            )}

            {/* Preview Section */}
            {previewData && (
              <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B' }}>
                      Preview: {previewData.length} Items Found
                    </h3>
                    <p style={{ color: '#64748B', fontSize: '13px' }}>
                      Date: <strong>{selectedDate}</strong>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      className="btn-secondary" 
                      onClick={() => { setFile(null); setPreviewData(null); }}
                      style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn-primary" 
                      onClick={confirmImport}
                      disabled={saving}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      {saving ? 'Saving...' : 'Confirm and Save'}
                    </button>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #E2E8F0', paddingBottom: '12px' }}>
                        <th style={{ padding: '12px', color: '#64748B', fontWeight: 600 }}>POS Item Name</th>
                        <th style={{ padding: '12px', color: '#64748B', fontWeight: 600 }}>System Match</th>
                        <th style={{ padding: '12px', color: '#64748B', fontWeight: 600 }}>Qty Sold</th>
                        <th style={{ padding: '12px', color: '#64748B', fontWeight: 600 }}>Estimated Revenue</th>
                        <th style={{ padding: '12px', color: '#64748B', fontWeight: 600 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px', color: '#1E293B', fontWeight: 500 }}>{item.name}</td>
                          <td style={{ padding: '12px', color: '#475569' }}>
                            {item.matched_name || <span style={{ color: '#EF4444' }}>No match found</span>}
                          </td>
                          <td style={{ padding: '12px', color: '#0F172A', fontWeight: 700 }}>{item.quantity}</td>
                          <td style={{ padding: '12px', color: 'var(--primary)', fontWeight: 600 }}>
                            ৳ {item.quantity * item.price}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {item.unmatched ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                                <AlertTriangle size={12} /> Unmatched (Skipped)
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                                <CheckCircle2 size={12} /> Ready
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  )
}

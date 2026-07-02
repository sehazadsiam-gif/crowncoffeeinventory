'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'
import { useToast } from '../../components/Toast'
import { 
  FileText, Upload, CheckCircle2, 
  AlertCircle, ChevronRight, Package, Info, ArrowLeft, RefreshCw
} from 'lucide-react'

export default function StockImportPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [file, setFile] = useState(null)
  const [mode, setMode] = useState('add') // 'add' or 'overwrite'
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
      formData.append('mode', mode)

      const res = await fetch('/api/stock/import', {
        method: 'POST',
        body: formData
      })
      const result = await res.json()

      if (!res.ok) throw new Error(result.error || 'Failed to parse file')

      setPreviewData(result.ingredients)
      addToast('Document parsed successfully with Gemini!', 'success')
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
    setSaving(true)
    try {
      const res = await fetch('/api/stock/import', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: previewData,
          mode: mode
        })
      })
      const result = await res.json()

      if (result.success) {
        addToast(`Successfully imported: Created ${result.created} new, Updated ${result.updated} existing items`, 'success')
        router.push('/stock')
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      addToast(err.message || 'Saving failed', 'error')
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
            onClick={() => router.push('/stock')}
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
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Kitchen Stock Import</h1>
            <p style={{ color: '#64748B', marginTop: '4px' }}>Upload inventory sheets to bulk update raw ingredient stock levels</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Options Toggle */}
            {!previewData && (
              <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B', marginBottom: '12px' }}>Import Configuration</h3>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                    <input 
                      type="radio" 
                      name="mode" 
                      value="add" 
                      checked={mode === 'add'} 
                      onChange={() => setMode('add')} 
                    />
                    Add to Existing Stock
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                    <input 
                      type="radio" 
                      name="mode" 
                      value="overwrite" 
                      checked={mode === 'overwrite'} 
                      onChange={() => setMode('overwrite')} 
                    />
                    Overwrite Existing Stock (Set exact values)
                  </label>
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
                  Click to upload inventory sheet or drag and drop
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
                  Gemini AI is parsing your stock document...
                </h3>
                <p style={{ color: '#64748B', fontSize: '14px' }}>
                  This takes just a few seconds.
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
                      Mode: <strong>{mode === 'overwrite' ? 'Overwrite stock level' : 'Add to stock level'}</strong>
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
                        <th style={{ padding: '12px', color: '#64748B', fontWeight: 600 }}>Ingredient Name</th>
                        <th style={{ padding: '12px', color: '#64748B', fontWeight: 600 }}>Quantity to {mode === 'overwrite' ? 'Set' : 'Add'}</th>
                        <th style={{ padding: '12px', color: '#64748B', fontWeight: 600 }}>Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px', color: '#1E293B', fontWeight: 500 }}>{item.name}</td>
                          <td style={{ padding: '12px', color: '#0F172A', fontWeight: 700 }}>{item.quantity}</td>
                          <td style={{ padding: '12px', color: '#64748B' }}>{item.unit}</td>
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

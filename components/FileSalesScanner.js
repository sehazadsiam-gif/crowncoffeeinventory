'use client'
import { useState, useRef } from 'react'
import { UploadCloud, FileText, X, Loader2 } from 'lucide-react'

export default function FileSalesScanner({ onScanComplete, menuItems = [] }) {
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const fileInputRef = useRef(null)

  function handleDragOver(e) { e.preventDefault(); e.stopPropagation(); setIsDragging(true) }
  function handleDragLeave(e) { e.preventDefault(); e.stopPropagation(); setIsDragging(false) }
  function handleDrop(e) {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (!droppedFile) return
    validateAndSetFile(droppedFile)
  }
  function handleFileInput(e) {
    const selected = e.target.files[0]
    if (!selected) return
    validateAndSetFile(selected)
  }
  function validateAndSetFile(f) {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv']
    if (!allowed.includes(f.type)) { setError('Invalid file type. Please upload a PDF, Excel, or CSV file.'); return }
    if (f.size > 10 * 1024 * 1024) { setError('File is too large. Maximum size is 10MB.'); return }
    setError(null); setFile(f)
  }
  function clearFile() {
    setFile(null); setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }
  async function scanDocument() {
    if (!file) return
    setScanning(true); setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      let endpoint
      if (file.type === 'application/pdf') endpoint = '/api/scan-pdf-sales'
      else if (file.type.includes('spreadsheet') || file.type.includes('excel')) endpoint = '/api/scan-excel-sales'
      else throw new Error('CSV scanning not implemented yet')
      const res = await fetch(endpoint, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Could not read the document')
      onScanComplete(data)
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during scanning.')
    } finally {
      setScanning(false)
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <input ref={fileInputRef} type="file" accept=".pdf,.xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFileInput} />

      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
          style={{
            cursor: 'pointer',
            borderRadius: '10px',
            border: `2px ${isDragging ? 'solid' : 'dashed'} ${isDragging ? 'var(--primary)' : 'var(--border-medium)'}`,
            background: isDragging ? 'var(--bg-subtle)' : 'var(--bg-base)',
            padding: '36px 24px',
            textAlign: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center', transform: isDragging ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.3s ease' }}>
            <UploadCloud size={40} style={{ color: isDragging ? 'var(--primary)' : 'var(--text-muted)' }} strokeWidth={1.5} />
          </div>
          <h4 style={{ fontFamily: 'var(--font-sans)', fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '6px' }}>
            {isDragging ? 'Release to upload' : 'Drag and drop your file here'}
          </h4>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>or click to browse</p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            PDF, XLSX, XLS, CSV — Max 10MB
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: '10px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ background: 'var(--bg-subtle)', padding: '10px', borderRadius: '8px', flexShrink: 0 }}>
              <FileText size={20} style={{ color: 'var(--primary)' }} strokeWidth={1.5} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{formatSize(file.size)}</p>
            </div>
            <button onClick={clearFile} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center', transition: 'color 0.15s ease' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <X size={18} />
            </button>
          </div>

          <button onClick={scanDocument} disabled={scanning} className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '12px' }}>
            {scanning ? <><Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} /> Processing...</> : 'Read File and Fill Sales'}
          </button>
        </div>
      )}

      {error && (
        <div style={{ marginTop: '12px', padding: '12px 14px', background: 'var(--danger-bg)', border: '1px solid rgba(166,60,60,0.2)', borderRadius: '8px', fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--danger)' }}>
          {error}
        </div>
      )}
    </div>
  )
}

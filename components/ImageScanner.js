'use client'
import { useState, useRef, useEffect } from 'react'
import { UploadCloud, Image as ImageIcon, X, Loader2 } from 'lucide-react'

export default function ImageScanner({ onScanComplete, scanType = 'sales', menuItems = [] }) {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleDragOver(e) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
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
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowed.includes(f.type)) {
      setError("Invalid file type. Please upload an image (JPG, PNG, WEBP, GIF).")
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Image is too large. Maximum size is 5MB.")
      return
    }
    setError(null)
    setFile(f)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(f))
  }

  function clearFile() {
    setFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function scanDocument() {
    if (!file) return
    setScanning(true)
    setError(null)

    try {
      const reader = new FileReader()
      const base64Promise = new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result.split(',')[1])
        reader.readAsDataURL(file)
      })
      const base64Content = await base64Promise
      
      const endpoint = scanType === 'bazar' ? '/api/scan-bazar' : '/api/scan-sales'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Content, mimeType: file.type, menuItems }),
      })

      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || "Could not scan the image")

      onScanComplete(data)
    } catch (err) {
      setError(err.message || "An unexpected error occurred during scanning.")
    } finally {
      setScanning(false)
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />

      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
          style={{
            cursor: 'pointer',
            borderRadius: '10px',
            border: `2px ${isDragging ? 'solid' : 'dashed'} ${isDragging ? 'var(--accent-brown)' : 'var(--border-medium)'}`,
            background: isDragging ? 'var(--bg-subtle)' : 'var(--bg-base)',
            padding: '48px 24px',
            textAlign: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', transition: 'transform 0.3s ease', transform: isDragging ? 'scale(1.1)' : 'scale(1)' }}>
            <UploadCloud size={48} style={{ color: isDragging ? 'var(--accent-brown)' : 'var(--text-muted)' }} strokeWidth={1.5} />
          </div>
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>
            {isDragging ? 'Release to upload' : 'Drag and drop image'}
          </h4>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>or click to browse</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '20px', padding: '8px 20px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              JPG, PNG, WEBP, GIF — Max 5MB
            </span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-light)', background: 'var(--bg-subtle)', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {previewUrl && (
              <img 
                src={previewUrl} 
                alt="Preview" 
                style={{ maxHeight: '250px', objectFit: 'contain', borderRadius: '8px', boxShadow: 'var(--shadow-md)' }}
              />
            )}
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <ImageIcon size={18} style={{ color: 'var(--accent-brown)', flexShrink: 0 }} />
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</p>
              </div>
              <button 
                onClick={clearFile}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'all 0.15s ease' }}
              >
                <X size={13} /> Remove
              </button>
            </div>
          </div>

          <button
            onClick={scanDocument}
            disabled={scanning}
            className="btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '13px' }}
          >
            {scanning ? (
              <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Analyzing Image...</>
            ) : (
              <><ImageIcon size={16} /> Scan Image with AI</>
            )}
          </button>
        </div>
      )}

      {error && (
        <div style={{ marginTop: '12px', padding: '12px 14px', background: 'var(--danger-bg)', border: '1px solid rgba(166,60,60,0.2)', borderRadius: '8px', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--danger)' }}>
          {error}
        </div>
      )}
    </div>
  )
}

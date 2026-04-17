'use client'
import { useState, useRef, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import { UploadCloud, Image as ImageIcon, X, Loader2, FileText, Copy, Check } from 'lucide-react'

export default function TranscribePage() {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

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
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(f.type)) { setError('Invalid file type. Please upload an image (JPG, PNG, WEBP, GIF).'); return }
    if (f.size > 100 * 1024 * 1024) { setError('Image is too large. Maximum size is 100MB.'); return }
    setError(null); setFile(f)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(f))
    setResult(null)
  }
  function clearFile() {
    setFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null); setError(null); setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  async function transcribeDocument() {
    if (!file) return
    setScanning(true); setError(null)
    try {
      const reader = new FileReader()
      const base64Promise = new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result.split(',')[1])
        reader.readAsDataURL(file)
      })
      const base64Content = await base64Promise
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Content, mimeType: file.type }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Transcription failed')
      setResult(data.text)
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setScanning(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />

      <header style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)', padding: '32px 0 24px' }}>
        <div style={{ maxWidth: '896px', margin: '0 auto', padding: '0 24px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 400, color: 'var(--text-primary)' }}>
            AI Transcriber
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '6px' }}>
            Convert document images to text instantly
          </p>
          <div style={{ marginTop: '12px', width: '40px', height: '1px', background: 'var(--accent-gold)' }} />
        </div>
      </header>

      <main style={{ maxWidth: '896px', margin: '0 auto', padding: '32px 24px 60px' }}>
        <div className="instruction-box animate-in">
          Upload any image — receipts, handwritten notes, printed menus — and our AI will extract the text precisely.
          High accuracy for both printed and handwritten content.
        </div>

        <div className="card animate-in" style={{ marginTop: '8px' }}>
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
                padding: '64px 32px',
                textAlign: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', transition: 'transform 0.3s ease', transform: isDragging ? 'scale(1.1)' : 'scale(1)' }}>
                <UploadCloud size={56} style={{ color: isDragging ? 'var(--accent-brown)' : 'var(--text-muted)' }} strokeWidth={1.5} />
              </div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>
                {isDragging ? 'Release to upload' : 'Drag and drop your image here'}
              </h4>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                or click to browse your computer
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '20px', padding: '8px 20px' }}>
                {['JPG', 'PNG', 'WEBP', 'GIF', 'Max 100MB'].map((t, i) => (
                  <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{t}</span>
                    {i < 4 && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-gold)', display: 'inline-block' }} />}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ borderRadius: '10px', border: '1px solid var(--border-light)', overflow: 'hidden', background: 'var(--bg-subtle)' }}>
                {previewUrl && (
                  <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', background: 'var(--bg-subtle)' }}>
                    <img src={previewUrl} alt="Preview" style={{ maxHeight: '400px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: 'var(--shadow-md)' }} />
                  </div>
                )}
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: 'var(--bg-subtle)', padding: '8px', borderRadius: '8px' }}>
                      <ImageIcon size={18} style={{ color: 'var(--accent-brown)' }} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
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
                onClick={transcribeDocument}
                disabled={scanning}
                className="btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '13px' }}
              >
                {scanning ? (
                  <><Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite' }} /> Transcribing with AI...</>
                ) : (
                  'Start Transcription'
                )}
              </button>
            </div>
          )}

          {error && (
            <div style={{ marginTop: '16px', padding: '14px 16px', background: 'var(--danger-bg)', border: '1px solid rgba(166,60,60,0.2)', borderRadius: '8px', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          {result && (
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={16} style={{ color: 'var(--accent-gold)' }} />
                  <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Transcription Result
                  </h3>
                </div>
                <button
                  onClick={handleCopy}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'none', border: '1px solid var(--border-medium)',
                    color: copied ? 'var(--success)' : 'var(--text-muted)',
                    borderColor: copied ? 'var(--success)' : 'var(--border-medium)',
                    borderRadius: '6px', padding: '6px 12px', cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600,
                    letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'all 0.2s ease',
                  }}
                >
                  {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-light)',
                borderTop: '3px solid var(--accent-brown)',
                borderRadius: '0 0 10px 10px',
                padding: '20px',
                minHeight: '200px',
                fontFamily: 'monospace',
                fontSize: '13px',
                lineHeight: 1.8,
                whiteSpace: 'pre-wrap',
                color: 'var(--text-secondary)',
                boxShadow: 'var(--shadow-sm)',
              }}>
                {result}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

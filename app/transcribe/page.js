'use client'
import { useState, useRef, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import { UploadCloud, Image as ImageIcon, X, Loader2, FileText, Zap } from 'lucide-react'

export default function TranscribePage() {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
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
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(f.type)) {
      setError('Invalid file type. Please upload an image (JPG, PNG, WEBP, GIF).')
      return
    }
    if (f.size > 100 * 1024 * 1024) {
      setError('Image is too large. Maximum size is 100MB.')
      return
    }
    setError(null)
    setFile(f)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(f))
    setResult(null)
  }

  function clearFile() {
    setFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setError(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function transcribeDocument() {
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

  const draggingClass = 'scale-[1.01] border-solid border-[var(--cafe-brown)] bg-amber-100 shadow-xl'
  const idleClass = 'border-dashed border-amber-200 bg-[var(--cafe-cream)] hover:bg-amber-50/50 hover:border-amber-300'

  return (
    <div className="min-h-screen bg-[var(--cafe-cream)]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">

        {/* Header */}
        <section className="instruction-box fade-in mb-8">
          <div className="flex items-start gap-4">
            <div className="bg-white/20 p-3 rounded-2xl shrink-0">
              <Zap size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">AI Document Transcriber</h2>
              <p className="text-white/80 text-sm max-w-2xl leading-relaxed">
                Convert any document image into text instantly. High-precision AI analysis
                for receipts, menus, or handwritten notes.
              </p>
            </div>
          </div>
        </section>

        <div className="card-premium fade-in">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileInput}
          />

          {/* Drop Zone */}
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
              className={`relative cursor-pointer rounded-2xl border-2 p-16 text-center transition-all duration-200 ${isDragging ? draggingClass : idleClass}`}
            >
              <div className={`mb-8 flex justify-center transition-transform duration-300 ${isDragging ? 'scale-125' : ''}`}>
                <UploadCloud
                  size={80}
                  className={isDragging ? 'text-[var(--cafe-brown)]' : 'text-amber-400'}
                />
              </div>
              <h4 className="text-2xl font-bold text-[var(--cafe-brown)]">
                {isDragging ? 'Release to upload' : 'Drag and drop your image here'}
              </h4>
              <p className="text-gray-500 mt-2 font-medium">or click to browse your computer</p>
              <div className="mt-10 inline-flex items-center gap-3 text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] bg-white/60 py-3 px-6 rounded-full border border-amber-100">
                <span>JPG</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                <span>PNG</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                <span>WEBP</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                <span>GIF</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                <span>Max 100MB</span>
              </div>
            </div>
          ) : (
            /* File Preview */
            <div className="space-y-6">
              <div className="rounded-2xl overflow-hidden border-2 border-[var(--cafe-gold-light)] bg-white shadow-lg p-6 flex flex-col items-center">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-[400px] w-auto object-contain rounded-xl shadow-sm"
                  />
                )}
                <div className="mt-5 flex items-center justify-between w-full border-t border-gray-100 pt-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-amber-50 p-2 rounded-lg text-amber-600 shrink-0">
                      <ImageIcon size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--cafe-brown)] truncate">{file.name}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={clearFile}
                    className="flex items-center gap-1.5 ml-4 shrink-0 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-700 px-3 py-2 rounded-lg hover:bg-rose-50 transition-colors border border-rose-100"
                  >
                    <X size={14} /> Remove
                  </button>
                </div>
              </div>

              <button
                onClick={transcribeDocument}
                disabled={scanning}
                className="btn-primary w-full py-5 text-sm font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl disabled:opacity-50"
              >
                {scanning ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Transcribing with AI...
                  </>
                ) : (
                  <>
                    <Zap size={20} />
                    Start Transcription
                  </>
                )}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-6 p-5 bg-rose-50 border border-rose-100 rounded-2xl text-sm font-bold text-rose-600">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-2 text-[var(--cafe-brown)]">
                <FileText size={18} className="text-[var(--cafe-gold)]" />
                <h3 className="font-black uppercase text-xs tracking-[0.2em]">Transcription Result</h3>
              </div>
              <div className="bg-white border-2 border-amber-100 rounded-2xl p-6 shadow-inner min-h-[200px] font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
                {result}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(result)}
                className="btn-secondary w-full py-3 text-[10px] font-black uppercase tracking-widest"
              >
                Copy to Clipboard
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

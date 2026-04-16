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
      // Logic from DocumentScanner.js adapted for ImageScanner
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
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileInput}
      />

      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
          className={`
            relative cursor-pointer rounded-2xl border-2 p-12 text-center transition-all duration-200
            ${isDragging 
              ? 'scale-[1.01] border-solid border-[var(--cafe-brown)] bg-amber-100 shadow-xl' 
              : 'border-dashed border-amber-200 bg-[var(--cafe-cream)] hover:bg-amber-50/50 hover:border-amber-300'}
          `}
        >
          <div className={`mb-6 flex justify-center transition-transform duration-300 ${isDragging ? 'scale-125' : ''}`}>
            <UploadCloud size={56} className={isDragging ? 'text-[var(--cafe-brown)]' : 'text-amber-400'} />
          </div>
          <h4 className="text-lg font-bold text-[var(--cafe-brown)]">
            {isDragging ? 'Release to upload' : 'Drag and drop your image here'}
          </h4>
          <p className="text-sm text-gray-500 mt-1 font-medium">or click to browse</p>
          <p className="text-[10px] uppercase font-bold text-gray-400 mt-6 tracking-[0.2em]">
            Accepted formats: JPG, PNG, WEBP, GIF - Max 5MB
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative group rounded-2xl overflow-hidden border-2 border-[var(--cafe-gold-light)] bg-white shadow-md p-4 flex flex-col items-center">
            {previewUrl && (
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="max-h-[300px] w-auto object-contain rounded-lg shadow-sm"
              />
            )}
            <div className="mt-3 flex items-center justify-between w-full">
              <div className="flex items-center gap-2 overflow-hidden">
                <ImageIcon size={14} className="text-amber-500 shrink-0" />
                <p className="text-xs font-bold text-[var(--cafe-brown)] truncate">{file.name}</p>
              </div>
              <button 
                onClick={clearFile}
                className="flex items-center gap-1 text-[10px] font-black uppercase text-rose-500 hover:text-rose-700 transition-colors"
              >
                <X size={14} /> Remove
              </button>
            </div>
          </div>

          <button
            onClick={scanDocument}
            disabled={scanning}
            className="btn-primary w-full py-4 text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg"
          >
            {scanning ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analyzing Image...
              </>
            ) : (
              <>
                <ImageIcon size={16} />
                Scan Document with AI
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600">
          {error}
        </div>
      )}
    </div>
  )
}

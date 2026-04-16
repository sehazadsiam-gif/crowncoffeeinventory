'use client'
import { useState, useRef } from 'react'
import { UploadCloud, FileText, X, Loader2 } from 'lucide-react'

export default function FileSalesScanner({ onScanComplete, menuItems = [] }) {
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const fileInputRef = useRef(null)

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
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ]
    if (!allowed.includes(f.type)) {
      setError("Invalid file type. Please upload a PDF, Excel, or CSV file.")
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File is too large. Maximum size is 10MB.")
      return
    }
    setError(null)
    setFile(f)
  }

  function clearFile() {
    setFile(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  async function scanDocument() {
    if (!file) return
    setScanning(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      let endpoint
      if (file.type === 'application/pdf') {
        endpoint = '/api/scan-pdf-sales'
      } else if (file.type.includes('spreadsheet') || file.type.includes('excel')) {
        endpoint = '/api/scan-excel-sales'
      } else {
        throw new Error("CSV scanning not implemented yet")
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || "Could not read the document")

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
        accept=".pdf,.xlsx,.xls,.csv"
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
            {isDragging ? 'Release to upload' : 'Drag and drop your file here'}
          </h4>
          <p className="text-sm text-gray-500 mt-1 font-medium">or click to browse</p>
          <p className="text-[10px] uppercase font-bold text-gray-400 mt-6 tracking-[0.2em]">
            Accepted formats: PDF, XLSX, XLS, CSV - Max 10MB
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card bg-white p-4 flex items-center gap-4 border-2 border-[var(--cafe-gold-light)] shadow-sm">
            <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
              <FileText size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[var(--cafe-brown)] truncate">{file.name}</p>
              <p className="text-xs text-gray-400 font-bold uppercase">{formatSize(file.size)}</p>
            </div>
            <button 
              onClick={clearFile}
              className="p-2 rounded-full hover:bg-rose-50 text-gray-400 hover:text-rose-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <button
            onClick={scanDocument}
            disabled={scanning}
            className="btn-primary w-full py-4 text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2"
          >
            {scanning ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processing...
              </>
            ) : (
              'Read File and Fill Sales'
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

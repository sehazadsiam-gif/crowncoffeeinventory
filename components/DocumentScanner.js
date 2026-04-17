'use client';
import { useState, useRef } from 'react';
import { UploadCloud, Scan, Loader2, FileImage, X, FileText, FileSpreadsheet } from 'lucide-react';

export default function DocumentScanner({ onScanComplete, scanType, menuItems = [] }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  function handleDragOver(e) { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }
  function handleDragLeave(e) { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }
  function handleDrop(e) {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;
    validateAndSetFile(droppedFile);
  }

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    validateAndSetFile(selectedFile);
  };

  function validateAndSetFile(selectedFile) {
    setError(null);
    setSuccess(false);

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit.");
      return;
    }

    setFile(selectedFile);

    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(selectedFile);
    } else if (selectedFile.type === 'application/pdf') {
      setPreview('pdf');
    } else if (selectedFile.type.includes('spreadsheet') || selectedFile.type.includes('excel') || selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.csv')) {
      setPreview('excel');
    } else {
      setPreview('file');
    }
  }

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const scanDocument = async () => {
    if (!file) return;

    setScanning(true);
    setError(null);
    setSuccess(false);

    try {
      let res;
      if (file.type.startsWith('image/')) {
        const base64Content = preview.split(',')[1];
        const endpoint = scanType === 'bazar' ? '/api/scan-bazar' : '/api/scan-sales';
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Content, mimeType: file.type, menuItems }),
        });
      } else {
        const formData = new FormData();
        formData.append('file', file);
        
        let endpoint;
        if (preview === 'pdf') {
          endpoint = '/api/scan-pdf-sales';
        } else if (preview === 'excel') {
          endpoint = '/api/scan-excel-sales';
        } else {
          throw new Error("Unsupported file type for AI scanning");
        }

        res = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });
      }

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Could not read the document");
      }

      setSuccess(true);
      onScanComplete(data);
    } catch (err) {
      setError(err.message || "An unexpected error occurred during scanning.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="card-premium" style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ background: 'var(--bg-subtle)', padding: '8px', borderRadius: '8px' }}>
          <Scan size={20} style={{ color: 'var(--primary)' }} />
        </div>
        <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
          AI Document Scanner
        </h3>
      </div>

      {!file ? (
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            cursor: 'pointer',
            borderRadius: '10px',
            border: `2px ${isDragging ? 'solid' : 'dashed'} ${isDragging ? 'var(--primary)' : 'var(--border-medium)'}`,
            background: isDragging ? 'var(--bg-subtle)' : 'var(--bg-base)',
            padding: '48px 24px',
            textAlign: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,.pdf,.xlsx,.xls,.csv"
            style={{ display: 'none' }}
          />
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', transform: isDragging ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.3s ease' }}>
            <UploadCloud size={48} style={{ color: isDragging ? 'var(--primary)' : 'var(--text-muted)' }} strokeWidth={1.5} />
          </div>
          <h4 style={{ fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>
            {isDragging ? 'Release to upload' : 'Drag & Drop Document'}
          </h4>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Images, PDFs, or Excel sheets
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '20px', padding: '8px 20px' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Max 10MB</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-light)', background: 'var(--bg-subtle)', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
            {preview && preview.startsWith('data:image') ? (
              <img src={preview} alt="Preview" style={{ maxHeight: '250px', objectFit: 'contain', borderRadius: '8px', boxShadow: 'var(--shadow-md)' }} />
            ) : preview === 'excel' ? (
              <div style={{ display: 'flex', flexDirection: 'column', itemsCenter: 'center', gap: '12px', color: 'var(--success)' }}>
                <FileSpreadsheet size={64} style={{ margin: '0 auto' }} />
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600 }}>{file.name}</p>
              </div>
            ) : preview === 'pdf' ? (
              <div style={{ display: 'flex', flexDirection: 'column', itemsCenter: 'center', gap: '12px', color: 'var(--danger)' }}>
                <FileText size={64} style={{ margin: '0 auto' }} />
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600 }}>{file.name}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', itemsCenter: 'center', gap: '12px', color: 'var(--text-muted)' }}>
                <FileImage size={64} style={{ margin: '0 auto' }} />
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600 }}>{file.name}</p>
              </div>
            )}
            
            <button 
              onClick={clearFile}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--bg-surface)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={scanDocument}
              disabled={scanning}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '13px' }}
            >
              {scanning ? (
                <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Processing with AI...</>
              ) : (
                <><Scan size={16} /> Read Document & Fill Forms</>
              )}
            </button>

            {error && (
              <div style={{ padding: '14px 16px', background: 'var(--danger-bg)', border: '1px solid rgba(166,60,60,0.2)', borderRadius: '8px', fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--danger)' }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ padding: '14px 16px', background: 'var(--success-bg)', border: '1px solid rgba(58,125,92,0.2)', borderRadius: '8px', fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--success)' }}>
                Document processed! Review extracted items below.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

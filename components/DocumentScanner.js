'use client';
import { useState, useRef } from 'react';
import { Upload, Scan, Loader2, FileImage, X, FileText, FileSpreadsheet } from 'lucide-react';


export default function DocumentScanner({ onScanComplete, scanType, menuItems = [] }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setError(null);
    setSuccess(false);

    if (!selectedFile) return;

    // Size limit 10MB for Docs
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit.");
      return;
    }

    setFile(selectedFile);

    // Handle Previews
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(selectedFile);
    } else if (selectedFile.type === 'application/pdf') {
      setPreview('pdf');
    } else if (selectedFile.type.includes('spreadsheet') || selectedFile.type.includes('excel') || selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
      setPreview('excel');
    } else {
      setPreview('file');
    }
  };

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
        // PDF or Excel - use FormData and new dedicated endpoints
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
          body: formData, // Browser handles boundary and Content-Type
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
    <div className="card-premium mb-8 overflow-hidden">
      <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
        <div className="bg-[var(--cafe-gold)] p-2 rounded-lg">
          <Scan size={20} className="text-[var(--cafe-brown)]" />
        </div>
        <h3 className="font-bold text-[var(--cafe-brown)] uppercase text-xs tracking-widest">
          AI Smart Scanner (Image, PDF, Excel)
        </h3>
      </div>

      {!file ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-[var(--cafe-gold)] hover:bg-amber-50/20 transition-all cursor-pointer group"
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,.pdf,.xlsx,.xls"
            className="hidden"
          />
          <div className="bg-gray-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <Upload size={28} className="text-gray-400 group-hover:text-[var(--cafe-gold)]" />
          </div>
          <h4 className="font-bold text-[var(--cafe-brown)] mb-1">Upload Document</h4>
          <p className="text-gray-400 text-xs max-w-xs mx-auto">
            Upload images, PDFs, or Excel sheets of your sales or purchases
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50 p-8 flex flex-col items-center justify-center min-h-[200px]">
            {preview.startsWith('data:image') ? (
              <img src={preview} alt="Preview" className="max-h-[300px] object-contain rounded-lg" />
            ) : preview === 'excel' ? (
              <div className="flex flex-col items-center gap-3 text-emerald-600">
                <FileSpreadsheet size={64} />
                <p className="font-bold text-sm">{file.name}</p>
              </div>
            ) : preview === 'pdf' ? (
              <div className="flex flex-col items-center gap-3 text-rose-500">
                <FileText size={64} />
                <p className="font-bold text-sm">{file.name}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <FileImage size={64} />
                <p className="font-bold text-sm">{file.name}</p>
              </div>
            )}
            
            <button 
              onClick={clearFile}
              className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm p-1.5 rounded-full text-gray-500 hover:text-rose-500 transition-colors shadow-sm"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={scanDocument}
              disabled={scanning}
              className="btn-primary w-full py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {scanning ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Analyzing {preview === 'excel' ? 'Spreadsheet' : 'Document'}...
                </>
              ) : (
                <>
                  <Scan size={16} />
                  Process with AI
                </>
              )}
            </button>

            {error && (
              <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-xs font-bold border border-rose-100">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-xs font-bold border border-emerald-100">
                Document processed! Review extracted items below.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

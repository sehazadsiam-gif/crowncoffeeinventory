import { useState, useRef } from 'react';
import { Upload, Scan, Loader2, FileImage, X } from 'lucide-react';

export default function ImageScanner({ onScanComplete, scanType, menuItems = [] }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setError(null);
    setSuccess(false);

    if (!selectedFile) return;

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit. Please upload a smaller image.");
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(selectedFile.type)) {
      setError("Unsupported file format. Please upload JPG, PNG, WEBP, or GIF.");
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(selectedFile);
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
      const base64Content = preview.split(',')[1];
      const mimeType = file.type;

      const endpoint = scanType === 'bazar' ? '/api/scan-bazar' : '/api/scan-sales';
      const body = { image: base64Content, mimeType };
      if (scanType === 'sales') body.menuItems = menuItems;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Could not read the document");
      }

      setSuccess(true);
      onScanComplete(data);
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError("Network Error: Could not reach the local server. Ensure 'npm run dev' is running and active.");
      } else {
        setError(err.message || "An unexpected error occurred during scanning.");
      }
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
          AI Document Scanner
        </h3>
      </div>

      {!preview ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-[var(--cafe-gold)] hover:bg-amber-50/20 transition-all cursor-pointer group"
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <div className="bg-gray-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <Upload size={28} className="text-gray-400 group-hover:text-[var(--cafe-gold)]" />
          </div>
          <h4 className="font-bold text-[var(--cafe-brown)] mb-1">Upload Handwritten Document</h4>
          <p className="text-gray-400 text-xs max-w-xs mx-auto">
            Take a photo or upload an image of your handwritten bazar list or sales record
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50 max-h-[300px] flex justify-center">
            <img src={preview} alt="Preview" className="max-h-[300px] object-contain" />
            <button 
              onClick={clearFile}
              className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm p-1.5 rounded-full text-gray-500 hover:text-rose-500 transition-colors"
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
                  Reading your document...
                </>
              ) : (
                <>
                  <Scan size={16} />
                  Scan Document with AI
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
                Document scanned. Review the extracted data below before saving.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

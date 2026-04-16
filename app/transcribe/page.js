'use client';
import { useState, useRef } from 'react';
import Navbar from '../../components/Navbar';
import { Upload, FileText, Loader2, Copy, Trash2, X, ScanLine } from 'lucide-react';

export default function TranscribePage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setError(null);
    if (!selectedFile) return;

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit. Please upload a smaller image.");
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const transcribeDocument = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const base64Content = preview.split(',')[1];
      const mimeType = file.type;

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Content, mimeType }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Could not read the document');

      setText(data.transcription);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
  };

  const resetPage = () => {
    setFile(null);
    setPreview(null);
    setText('');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-[var(--cafe-cream)] no-scrollbar">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        
        {/* Instruction Header */}
        <section className="instruction-box fade-in mb-8">
          <div className="flex items-start gap-4">
            <div className="bg-white/20 p-3 rounded-2xl shrink-0">
              <ScanLine size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">Scan and Transcribe Document</h2>
              <p className="text-white/80 text-sm max-w-2xl leading-relaxed">
                Upload a photo of any handwritten document.
                Crown Coffee AI will read and transcribe it for you.
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 fade-in">
          {/* Upload Section */}
          <div className="card-premium">
            <h3 className="font-bold text-[var(--cafe-brown)] uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
              <Upload size={14} className="text-[var(--cafe-gold)]" /> Source Document
            </h3>

            {!preview ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:border-[var(--cafe-gold)] hover:bg-amber-50/20 transition-all cursor-pointer group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <div className="bg-gray-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Upload size={32} className="text-gray-400 group-hover:text-[var(--cafe-gold)]" />
                </div>
                <h4 className="font-bold text-[var(--cafe-brown)] text-lg mb-2">Upload Image</h4>
                <p className="text-gray-400 text-sm max-w-xs mx-auto">
                   Drag and drop or click to browse (Max 5MB)
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50 flex justify-center max-h-[400px]">
                  <img src={preview} alt="Preview" className="max-h-[400px] object-contain" />
                  <button 
                    onClick={resetPage}
                    className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-full text-gray-500 hover:text-rose-500 shadow-md transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={transcribeDocument}
                    disabled={loading || !file}
                    className="btn-primary w-full py-4 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Transcribing...
                      </>
                    ) : (
                      <>
                        <FileText size={18} />
                        Transcribe Document
                      </>
                    )}
                  </button>
                  {error && (
                    <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-xs font-bold border border-rose-100">
                      {error}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Result Section */}
          {text && (
            <div className="card-premium fade-in">
              <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                <h3 className="font-bold text-[var(--cafe-brown)] uppercase text-xs tracking-widest flex items-center gap-2">
                  <FileText size={14} className="text-[var(--cafe-gold)]" /> Transcription Result
                </h3>
                <div className="flex gap-2">
                  <button 
                    onClick={copyToClipboard}
                    className="p-2 text-gray-400 hover:text-[var(--cafe-gold)] transition-colors hover:bg-amber-50 rounded-lg"
                    title="Copy to Clipboard"
                  >
                    <Copy size={18} />
                  </button>
                  <button 
                    onClick={resetPage}
                    className="p-2 text-gray-400 hover:text-rose-500 transition-colors hover:bg-rose-50 rounded-lg"
                    title="Clear"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="relative bg-amber-50/30 rounded-2xl p-6 border border-amber-100/50">
                <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--cafe-brown)] leading-relaxed select-text">
                  {text}
                </pre>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

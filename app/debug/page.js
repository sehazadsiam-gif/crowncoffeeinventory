'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import { 
  ShieldAlert, ShieldCheck, Globe, Database, 
  Terminal, ArrowRight, Copy, CheckCircle2 
} from 'lucide-react'

export default function DebugPage() {
  const [status, setStatus] = useState({
    url: 'Checking...',
    key: 'Checking...',
    connection: 'Pending',
    error: null
  })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function runDiagnostics() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING'
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Present (Hidden)' : 'MISSING'
      
      let connection = 'Success'
      let error = null

      try {
        const { error: dbError } = await supabase.from('ingredients').select('count', { count: 'exact', head: true })
        if (dbError) {
          connection = 'Failed'
          error = dbError.message
        }
      } catch (e) {
        connection = 'Failed'
        error = e.message
      }

      setStatus({ url, key, connection, error })
    }

    runDiagnostics()
  }, [])

  const copyInstruction = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isHealthy = status.url !== 'MISSING' && status.key !== 'MISSING' && status.connection === 'Success'

  return (
    <div className="min-h-screen bg-[var(--cafe-cream)]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <header className="mb-12 text-center">
          <div className={`w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg transition-colors ${isHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`}>
            {isHealthy ? <ShieldCheck size={40} className="text-white" /> : <ShieldAlert size={40} className="text-white" />}
          </div>
          <h1 className="text-3xl font-black text-[var(--cafe-brown)] uppercase tracking-tighter mb-2">System Diagnostics</h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.2em]">Deployment Connectivity Check</p>
        </header>

        <div className="grid gap-6">
          {/* Status Overview */}
          <div className="card-premium">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
              <Globe size={16} /> Environment Status
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <StatusCard 
                label="Environment URL" 
                value={status.url === 'MISSING' ? 'Not Configured' : 'Detected'} 
                isOk={status.url !== 'MISSING'} 
              />
              <StatusCard 
                label="Anon Key" 
                value={status.key === 'MISSING' ? 'Not Configured' : 'Detected'} 
                isOk={status.key !== 'MISSING'} 
              />
              <StatusCard 
                label="DB Connection" 
                value={status.connection} 
                isOk={status.connection === 'Success'} 
              />
            </div>
          </div>

          {!isHealthy && (
            <div className="card-premium border-l-rose-500 bg-rose-50/30">
              <h3 className="text-sm font-bold uppercase tracking-widest text-rose-800 mb-4 flex items-center gap-2">
                <Terminal size={16} /> How to fix this in Vercel
              </h3>
              <p className="text-rose-900/70 text-sm mb-6 leading-relaxed">
                Your live website cannot find your database. Please copy these two values and add them to your <strong className="text-rose-900">Vercel Project Settings → Environment Variables</strong>.
              </p>

              <div className="space-y-4">
                <CopyRow label="NEXT_PUBLIC_SUPABASE_URL" value="https://smaoazpzngwyuqbdghfn.supabase.co" onCopy={copyInstruction} />
                <CopyRow label="NEXT_PUBLIC_SUPABASE_ANON_KEY" value="[Go to Supabase -> Project Settings -> API to find this]" onCopy={copyInstruction} />
              </div>

              <div className="mt-8 p-4 bg-rose-50 rounded-xl border border-rose-100 flex items-start gap-3">
                <div className="bg-rose-100 p-2 rounded-lg text-rose-600 shrink-0">
                  <ArrowRight size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-rose-900 uppercase">After adding the variables:</p>
                  <p className="text-xs text-rose-800/80 mt-1">Go to the "Deployments" tab in Vercel and click "Redeploy" for the change to take effect.</p>
                </div>
              </div>
            </div>
          )}

          {status.error && (
            <div className="card-premium border-l-amber-500">
               <h3 className="text-sm font-bold uppercase tracking-widest text-amber-800 mb-2 flex items-center gap-2">
                <Database size={16} /> Raw Error Log
              </h3>
              <code className="block bg-black text-emerald-400 p-4 rounded-xl text-xs overflow-x-auto whitespace-pre font-mono">
                {status.error}
              </code>
            </div>
          )}
        </div>
      </main>
      
      {copied && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[var(--cafe-brown)] text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="text-sm font-bold">Value copied to clipboard!</span>
        </div>
      )}
    </div>
  )
}

function StatusCard({ label, value, isOk }) {
  return (
    <div className={`p-4 rounded-2xl border ${isOk ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-rose-50 border-rose-100 text-rose-900'}`}>
      <p className="text-[10px] uppercase font-black opacity-40 tracking-widest mb-1">{label}</p>
      <p className="text-sm font-black">{value}</p>
    </div>
  )
}

function CopyRow({ label, value, onCopy }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-white/50 rounded-xl border border-rose-100 group hover:border-rose-300 transition-colors">
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-rose-900 opacity-50 uppercase tracking-widest">{label}</span>
        <span className="text-xs font-mono font-bold text-gray-700 truncate max-w-[300px]">{value}</span>
      </div>
      <button 
        onClick={() => onCopy(value)}
        className="btn-primary py-2 px-4 text-[10px] uppercase tracking-widest flex items-center gap-2"
      >
        <Copy size={12} /> Copy Value
      </button>
    </div>
  )
}

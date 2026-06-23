'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { translations } from '../../../lib/i18n'
import { Moon, Sun, Languages, ArrowLeft, Check, X, Send } from 'lucide-react'

export default function AdminQueriesPage() {
  const router = useRouter()
  const [lang, setLang] = useState('en')
  const [darkMode, setDarkMode] = useState(false)
  const [queries, setQueries] = useState([])
  const [loading, setLoading] = useState(true)
  
  // For replying
  const [replyText, setReplyText] = useState({})
  const [updatingId, setUpdatingId] = useState(null)

  const t = translations[lang]

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
      setDarkMode(isDark)
      if (isDark) document.documentElement.classList.add('dark')
      
      const isAdmin = localStorage.getItem('isAdmin')
      if (!isAdmin) {
        router.push('/login')
        return
      }
    }
    fetchQueries()
  }, [])

  const fetchQueries = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/staffquery')
      const result = await res.json()
      if (result.data) {
        setQueries(result.data)
      }
    } catch (err) {
      console.error('Failed to fetch queries:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id)
    try {
      const reply = replyText[id] || ''
      const res = await fetch('/api/staffquery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, admin_reply: reply })
      })
      if (!res.ok) throw new Error('Failed to update')
      
      // Update local state
      setQueries(queries.map(q => q.id === id ? { ...q, status: newStatus, admin_reply: reply } : q))
    } catch (err) {
      console.error(err)
      alert('Error updating status')
    } finally {
      setUpdatingId(null)
    }
  }

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    if (newMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'bn' : 'en')
  }

  if (loading && queries.length === 0) return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${darkMode ? 'bg-slate-950' : 'bg-[#FAF7F2]'}`}>
      <div className="loader"></div>
    </div>
  )

  return (
    <div className={`min-h-screen transition-colors duration-500 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans`}>
      <nav className={`px-6 flex items-center justify-between h-[70px] sticky top-0 z-50 transition-all duration-300 backdrop-blur-md border-b ${darkMode ? 'bg-slate-950/80 border-slate-800 shadow-sm shadow-slate-900/50' : 'bg-white/80 border-slate-200 shadow-sm'}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/admin/dashboard')} className={`p-2.5 rounded-full transition-all active:scale-95 ${darkMode ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'}`}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">{t.adminTitle}</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`flex items-center p-1 rounded-full border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-gray-100 border-gray-200'}`}>
            <button 
              onClick={() => setLang('en')} 
              className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-300 ${lang === 'en' ? (darkMode ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-gray-800 shadow-sm') : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLang('bn')} 
              className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-300 ${lang === 'bn' ? (darkMode ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-gray-800 shadow-sm') : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              BN
            </button>
          </div>
          
          <button onClick={toggleDarkMode} className={`relative overflow-hidden w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 border hover:scale-105 active:scale-95 ${darkMode ? 'bg-slate-900 border-slate-700 text-yellow-400 hover:shadow-[0_0_15px_rgba(250,204,21,0.2)]' : 'bg-white border-gray-200 text-gray-600 hover:shadow-md'}`} title={darkMode ? t.lightMode : t.darkMode}>
            <div className={`absolute transition-transform duration-500 ${darkMode ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`}>
              <Sun size={18} />
            </div>
            <div className={`absolute transition-transform duration-500 ${darkMode ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'}`}>
              <Moon size={18} />
            </div>
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 py-10">
        <div className="mb-10 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight mb-2">{t.adminTitle}</h2>
            <p className="text-lg opacity-60 font-medium">{t.adminSubtitle}</p>
          </div>
          <button onClick={fetchQueries} className={`px-5 py-2.5 rounded-xl font-bold transition-all duration-300 hover:shadow-md active:scale-95 border ${darkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-blue-400' : 'bg-white hover:bg-gray-50 border-gray-200 text-blue-600'}`}>
            Refresh Inbox
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {queries.length === 0 ? (
            <div className={`p-16 text-center rounded-3xl border-dashed border-2 ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-gray-300 bg-white/50'}`}>
              <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 ${darkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
                <span className="text-5xl opacity-50">📭</span>
              </div>
              <p className="text-xl font-semibold opacity-60">No queries found in the inbox.</p>
            </div>
          ) : (
            queries.map((q, i) => {
              const isPending = q.status === 'Pending'
              const isApproved = q.status === 'Approved'
              const isRejected = q.status === 'Rejected'

              return (
                <div key={q.id} className={`p-8 rounded-3xl border shadow-sm transition-all duration-300 hover:shadow-lg animate-in fade-in slide-in-from-bottom-4 ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'}`} style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
                  <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 pb-6 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'} gap-4`}>
                    <div>
                      <h3 className="font-extrabold text-xl mb-2 flex items-center gap-3">
                        {q.staff_name}
                      </h3>
                      <div className="flex items-center flex-wrap gap-3">
                        <span className={`text-xs font-extrabold px-3 py-1.5 rounded-lg uppercase tracking-widest ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                          {q.type}
                        </span>
                        <span className="text-sm font-medium opacity-50 flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-300'}`}></span>
                          {new Date(q.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className={`flex items-center gap-2 text-xs font-extrabold px-4 py-2 rounded-full ${
                      isPending ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20' :
                      isApproved ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' :
                      'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${isPending ? 'bg-yellow-500 animate-pulse' : isApproved ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      {q.status}
                    </div>
                  </div>

                  <p className={`whitespace-pre-wrap text-lg leading-relaxed mb-8 ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>{q.message}</p>

                  {/* Reply Section */}
                  {isPending ? (
                    <div className={`p-6 rounded-2xl border transition-all duration-300 ${darkMode ? 'bg-slate-950 border-slate-800 focus-within:border-blue-500/50 focus-within:shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'bg-slate-50 border-slate-200 focus-within:border-blue-500/50 focus-within:shadow-[0_0_20px_rgba(59,130,246,0.1)]'}`}>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-3 opacity-70">Admin Reply</label>
                      <textarea
                        placeholder={t.replyPlaceholder}
                        value={replyText[q.id] || ''}
                        onChange={(e) => setReplyText({...replyText, [q.id]: e.target.value})}
                        className={`w-full p-4 rounded-xl border-2 outline-none resize-y mb-4 transition-all duration-300 text-base ${darkMode ? 'bg-slate-900 border-slate-800 focus:border-blue-500 focus:bg-slate-950' : 'bg-white border-slate-200 focus:border-blue-500 focus:bg-white'}`}
                        rows={3}
                      />
                      <div className="flex justify-end gap-4">
                        <button 
                          disabled={updatingId === q.id}
                          onClick={() => handleStatusChange(q.id, 'Rejected')}
                          className="px-6 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:border-red-900/30 dark:text-red-400 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 active:scale-95"
                        >
                          <X size={18} /> {t.btnReject}
                        </button>
                        <button 
                          disabled={updatingId === q.id}
                          onClick={() => handleStatusChange(q.id, 'Approved')}
                          className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 active:scale-95"
                        >
                          <Check size={18} /> {t.btnApprove}
                        </button>
                      </div>
                    </div>
                  ) : (
                    q.admin_reply && (
                      <div className={`p-6 rounded-2xl border ${
                        isApproved ? 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-900/30' : 
                        isRejected ? 'bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-900/30' : 
                        'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-900/30'
                      }`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold text-white shadow-sm ${isApproved ? 'bg-green-500' : isRejected ? 'bg-red-500' : 'bg-blue-500'}`}>
                            A
                          </div>
                          <p className={`text-sm font-extrabold uppercase tracking-wider ${isApproved ? 'text-green-700 dark:text-green-400' : isRejected ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'}`}>Your Reply</p>
                        </div>
                        <p className={`text-lg ml-11 ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>{q.admin_reply}</p>
                      </div>
                    )
                  )}
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}

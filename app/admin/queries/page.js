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

  if (loading && queries.length === 0) return <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 dark:text-white">Loading...</div>

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} font-sans`}>
      <nav className={`border-b px-6 flex items-center justify-between h-[60px] sticky top-0 z-50 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin/dashboard')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">{t.adminTitle}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={toggleLanguage} className={`p-2 rounded-full transition flex items-center gap-2 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
            <Languages size={18} /> <span className="text-sm font-semibold">{lang === 'en' ? 'বাংলা' : 'English'}</span>
          </button>
          
          <button onClick={toggleDarkMode} className={`p-2 rounded-full transition ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-4 py-8">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold mb-1">{t.adminTitle}</h2>
            <p className="opacity-60">{t.adminSubtitle}</p>
          </div>
          <button onClick={fetchQueries} className="text-blue-600 font-semibold hover:underline">Refresh</button>
        </div>

        <div className="flex flex-col gap-6">
          {queries.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <p className="text-4xl mb-4">📭</p>
              <p className="opacity-60">No queries found.</p>
            </div>
          ) : (
            queries.map((q) => {
              const isPending = q.status === 'Pending'
              const isApproved = q.status === 'Approved'
              const isRejected = q.status === 'Rejected'

              return (
                <div key={q.id} className={`p-6 rounded-2xl border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex justify-between items-start mb-4 border-b pb-4 dark:border-gray-700">
                    <div>
                      <h3 className="font-bold text-lg mb-1">{q.staff_name}</h3>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          {q.type}
                        </span>
                        <span className="text-xs opacity-60">
                          {new Date(q.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                      isPending ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      isApproved ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {q.status}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap mb-6">{q.message}</p>

                  {/* Reply Section */}
                  {isPending ? (
                    <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                      <textarea
                        placeholder={t.replyPlaceholder}
                        value={replyText[q.id] || ''}
                        onChange={(e) => setReplyText({...replyText, [q.id]: e.target.value})}
                        className={`w-full p-3 rounded-lg border outline-none resize-y mb-3 ${darkMode ? 'bg-gray-800 border-gray-600 focus:border-blue-500' : 'bg-white border-gray-300 focus:border-blue-500'}`}
                        rows={2}
                      />
                      <div className="flex justify-end gap-3">
                        <button 
                          disabled={updatingId === q.id}
                          onClick={() => handleStatusChange(q.id, 'Rejected')}
                          className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg font-bold transition flex items-center gap-2"
                        >
                          <X size={16} /> {t.btnReject}
                        </button>
                        <button 
                          disabled={updatingId === q.id}
                          onClick={() => handleStatusChange(q.id, 'Approved')}
                          className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400 rounded-lg font-bold transition flex items-center gap-2"
                        >
                          <Check size={16} /> {t.btnApprove}
                        </button>
                      </div>
                    </div>
                  ) : (
                    q.admin_reply && (
                      <div className={`p-4 rounded-xl border-l-4 ${
                        isApproved ? 'bg-green-50 border-green-500 dark:bg-green-900/20' : 
                        isRejected ? 'bg-red-50 border-red-500 dark:bg-red-900/20' : 
                        'bg-blue-50 border-blue-500 dark:bg-blue-900/20'
                      }`}>
                        <p className="text-xs font-bold mb-1 opacity-80">Your Reply:</p>
                        <p className="text-sm">{q.admin_reply}</p>
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

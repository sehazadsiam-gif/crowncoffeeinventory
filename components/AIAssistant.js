'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Sparkles, X, Send, Bot, User, Maximize2, Minimize2, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

function getPageText() {
  if (typeof window === 'undefined') return ''
  const aiWidget = document.getElementById('cc-ai-assistant')
  let text = ''
  if (aiWidget) {
    const originalDisplay = aiWidget.style.display
    aiWidget.style.display = 'none'
    text = document.body.innerText
    aiWidget.style.display = originalDisplay
  } else {
    text = document.body.innerText
  }
  return text.substring(0, 10000)
}

export default function AIAssistant() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [contextData, setContextData] = useState(null)
  const messagesEndRef = useRef(null)

  // Load chat history
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('cc_ai_chat')
      if (saved) {
        setMessages(JSON.parse(saved))
      } else {
        setMessages([
          { role: 'assistant', content: 'Hello! I am the Crown Coffee AI Assistant. How can I help you manage your cafe today?' }
        ])
      }
    } catch (e) {}
  }, [])

  // Save chat history
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('cc_ai_chat', JSON.stringify(messages))
    }
  }, [messages])

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, loading])

  // Fetch page context when pathname changes
  useEffect(() => {
    async function fetchContext() {
      const date = new Date().toISOString().split('T')[0]
      let ctx = { page: pathname }
      
      try {
        if (pathname === '/dashboard' || pathname === '/') {
          const { data: sales } = await supabase.from('sales').select('total_revenue').eq('date', date)
          ctx.todaySales = sales?.reduce((s, r) => s + (r.total_revenue || 0), 0) || 0
        } else if (pathname.includes('/stock')) {
          const { data: stock } = await supabase.from('ingredients').select('name, current_stock, min_stock')
          ctx.lowStockItems = stock?.filter(i => i.current_stock <= i.min_stock).map(i => i.name) || []
          ctx.totalItems = stock?.length || 0
        } else if (pathname.includes('/staff')) {
          const parts = pathname.split('/')
          const staffId = parts[2]
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
          
          if (staffId && uuidRegex.test(staffId)) {
            // Fetch detailed viewed staff data
            const [staffRes, leaveRes, advRes, payrollRes] = await Promise.all([
              supabase.from('staff').select('*').eq('id', staffId).single(),
              supabase.from('leave_balance').select('*').eq('staff_id', staffId).eq('year', new Date().getFullYear()).single(),
              supabase.from('advance_log').select('*').eq('staff_id', staffId).order('date', { ascending: false }).limit(5),
              supabase.from('payroll_entries').select('*').eq('staff_id', staffId).order('year', { ascending: false }).order('month', { ascending: false }).limit(6)
            ])
            ctx.viewedStaff = {
              profile: staffRes.data || null,
              leave: leaveRes.data || null,
              advances: advRes.data || [],
              payroll: payrollRes.data || []
            }
          }
          const { data: staff } = await supabase.from('staff').select('id, name').eq('is_active', true)
          ctx.activeStaffCount = staff?.length || 0
        } else if (pathname.includes('/menu')) {
          const { data: menu } = await supabase.from('menu_items').select('id, name, category, selling_price').eq('is_active', true)
          ctx.activeMenuCount = menu?.length || 0
        }
        setContextData(ctx)
      } catch (e) {
        console.error("Failed to fetch AI context", e)
      }
    }
    
    if (isOpen) fetchContext()
  }, [pathname, isOpen])

  const handleClear = () => {
    const initial = [{ role: 'assistant', content: 'Chat history cleared. How can I help you?' }]
    setMessages(initial)
    sessionStorage.setItem('cc_ai_chat', JSON.stringify(initial))
  }

  const handleSend = async (text = input) => {
    if (!text.trim() || loading) return

    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      // Extract active page text content for AI context
      const pageText = getPageText()
      
      // Build system prompt based on context and active page text
      let systemPrompt = `Current page: ${pathname}. `
      if (pageText) {
        systemPrompt += `Page Text Content: ${pageText}. `
      }
      if (contextData) {
        systemPrompt += `Page Data Context: ${JSON.stringify(contextData)}. `
      }

      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          system: systemPrompt
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI response')
      }

      setMessages([...newMessages, { 
        role: 'assistant', 
        content: data.content[0]?.text || 'Sorry, I received an empty response.' 
      }])
    } catch (err) {
      console.error(err)
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: `Error: ${err.message}. Please try again later.` 
      }])
    } finally {
      setLoading(false)
    }
  }

  const formatMessage = (text) => {
    // Simple markdown rendering for bold and line breaks
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .split('\n')
      .map((line, i) => (
        <span key={i}>
          <span dangerouslySetInnerHTML={{ __html: line }} />
          <br/>
        </span>
      ))
  }

  const suggestions = {
    '/dashboard': ['What are my total sales today?', 'Any low stock items?'],
    '/stock': ['List my low stock items', 'How many ingredients do we track?'],
    '/staff': ['How many active staff members do we have?', 'Help me calculate payroll'],
    '/sales': ['How do I import sales?', 'Analyze my sales trend']
  }
  const currentSuggestions = suggestions[Object.keys(suggestions).find(k => pathname.startsWith(k))] || ['How do I use this page?', 'Generate a summary report']

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, fontFamily: 'var(--font-sans)' }}>
      {isOpen && (
        <div style={{
          background: 'var(--bg-surface)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-light)',
          width: isExpanded ? '600px' : '360px',
          height: isExpanded ? '80vh' : '500px',
          maxHeight: '90vh',
          maxWidth: '90vw',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          animation: 'chatFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {/* Header */}
          <div style={{
            background: 'var(--bg-subtle)',
            borderBottom: '1px solid var(--border-light)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                background: 'linear-gradient(135deg, var(--accent-blue) 0%, #8B5CF6 100%)',
                padding: '6px', borderRadius: '8px', color: 'white'
              }}>
                <Sparkles size={16} />
              </div>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>AI Assistant</span>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Powered by Claude</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button onClick={handleClear} title="Clear Chat" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: 'var(--text-muted)', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <Trash2 size={16} />
              </button>
              <button onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "Collapse" : "Expand"} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: 'var(--text-muted)', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button onClick={() => setIsOpen(false)} title="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: 'var(--text-muted)', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ 
                display: 'flex', 
                gap: '12px', 
                alignItems: 'flex-start',
                flexDirection: m.role === 'user' ? 'row-reverse' : 'row'
              }}>
                <div style={{
                  background: m.role === 'user' ? 'var(--accent-blue-dim)' : 'var(--bg-subtle)',
                  color: m.role === 'user' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  padding: '8px', borderRadius: '50%', flexShrink: 0
                }}>
                  {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div style={{
                  background: m.role === 'user' ? 'var(--accent-blue)' : 'var(--bg-subtle)',
                  color: m.role === 'user' ? 'white' : 'var(--text-primary)',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  borderTopRightRadius: m.role === 'user' ? '4px' : '16px',
                  borderTopLeftRadius: m.role === 'assistant' ? '4px' : '16px',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  maxWidth: '85%',
                  boxShadow: 'var(--shadow-sm)',
                  whiteSpace: 'pre-wrap'
                }}>
                  {formatMessage(m.content)}
                </div>
              </div>
            ))}
            
            {loading && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', padding: '8px', borderRadius: '50%' }}>
                  <Bot size={16} />
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: '16px', borderRadius: '16px', borderTopLeftRadius: '4px' }}>
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {!loading && messages.length <= 2 && (
            <div style={{ padding: '0 16px 12px', display: 'flex', gap: '8px', overflowX: 'auto', flexWrap: 'wrap' }}>
              {currentSuggestions.map((s, i) => (
                <button key={i} onClick={() => handleSend(s)} style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '100px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-blue-dim)'; e.currentTarget.style.color = 'var(--accent-blue)'; e.currentTarget.style.borderColor = 'var(--accent-blue)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-medium)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-surface)' }}>
            <form onSubmit={e => { e.preventDefault(); handleSend(); }} style={{ position: 'relative' }}>
              <input 
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask the AI Assistant..."
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 48px 12px 16px',
                  borderRadius: '100px',
                  border: '1px solid var(--border-medium)',
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-medium)'}
              />
              <button 
                type="submit"
                disabled={!input.trim() || loading}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '6px',
                  bottom: '6px',
                  width: '36px',
                  borderRadius: '50%',
                  background: input.trim() ? 'var(--accent-blue)' : 'var(--border-medium)',
                  color: 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: input.trim() ? 'pointer' : 'default',
                  transition: 'background 0.2s'
                }}
              >
                <Send size={16} style={{ marginLeft: '-2px' }} />
              </button>
            </form>
          </div>
        </div>
      )}
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'linear-gradient(135deg, var(--accent-blue) 0%, #8B5CF6 100%)',
          color: '#fff',
          width: '56px', height: '56px', borderRadius: '50%',
          boxShadow: 'var(--shadow-lg)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
          transform: isOpen ? 'scale(0.9) rotate(90deg)' : 'scale(1) rotate(0deg)',
          position: 'relative',
          marginLeft: 'auto'
        }}
        onMouseEnter={e => !isOpen && (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseLeave={e => !isOpen && (e.currentTarget.style.transform = 'scale(1)')}
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </button>
    </div>
  )
}

'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Sparkles, X, Send, Bot, User, Maximize2, Minimize2, Trash2, Paperclip, FileText } from 'lucide-react'
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
  const [attachment, setAttachment] = useState(null)
  const messagesEndRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit')
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      setAttachment({
        name: file.name,
        type: file.type,
        base64: event.target.result.split(',')[1]
      })
    }
    reader.readAsDataURL(file)
  }

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
    if ((!text.trim() && !attachment) || loading) return

    const userMsg = { role: 'user', content: text }
    if (attachment) {
      userMsg.attachment = attachment
    }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    const activeAttachment = attachment
    setAttachment(null)

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
          system: systemPrompt,
          attachment: activeAttachment
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
    if (!text) return null
    const blocks = []
    const lines = text.split('\n')
    let currentBlock = null

    const parseInline = (str) => {
      const parts = []
      let lastIdx = 0
      const regex = /(\*\*.*?\*\*|`.*?`)/g
      let match
      
      while ((match = regex.exec(str)) !== null) {
        const textBefore = str.substring(lastIdx, match.index)
        if (textBefore) parts.push(textBefore)
        
        const matchedStr = match[0]
        if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
          parts.push(<strong key={match.index}>{matchedStr.slice(2, -2)}</strong>)
        } else if (matchedStr.startsWith('`') && matchedStr.endsWith('`')) {
          parts.push(
            <code 
              key={match.index} 
              style={{ 
                background: 'rgba(0,0,0,0.06)', 
                padding: '2px 5px', 
                borderRadius: '4px', 
                fontSize: '12px', 
                fontFamily: 'monospace',
                color: 'var(--accent-blue)'
              }}
            >
              {matchedStr.slice(1, -1)}
            </code>
          )
        }
        lastIdx = regex.lastIndex
      }
      
      const textAfter = str.substring(lastIdx)
      if (textAfter) parts.push(textAfter)
      return parts.length > 0 ? parts : str
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      if (line.trim().startsWith('```')) {
        if (currentBlock && currentBlock.type === 'code') {
          blocks.push(currentBlock)
          currentBlock = null
        } else {
          if (currentBlock) blocks.push(currentBlock)
          currentBlock = { type: 'code', lines: [], lang: line.replace('```', '').trim() }
        }
        continue
      }
      
      if (currentBlock && currentBlock.type === 'code') {
        currentBlock.lines.push(line)
        continue
      }
      
      if (line.trim().startsWith('|')) {
        if (currentBlock && currentBlock.type === 'table') {
          currentBlock.rows.push(line)
        } else {
          if (currentBlock) blocks.push(currentBlock)
          currentBlock = { type: 'table', rows: [line] }
        }
        continue
      } else if (currentBlock && currentBlock.type === 'table') {
        blocks.push(currentBlock)
        currentBlock = null
      }

      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const content = line.trim().substring(2)
        if (currentBlock && currentBlock.type === 'ul') {
          currentBlock.items.push(content)
        } else {
          if (currentBlock) blocks.push(currentBlock)
          currentBlock = { type: 'ul', items: [content] }
        }
        continue
      } else if (currentBlock && currentBlock.type === 'ul') {
        blocks.push(currentBlock)
        currentBlock = null
      }

      if (/^\d+\.\s/.test(line.trim())) {
        const content = line.trim().replace(/^\d+\.\s/, '')
        if (currentBlock && currentBlock.type === 'ol') {
          currentBlock.items.push(content)
        } else {
          if (currentBlock) blocks.push(currentBlock)
          currentBlock = { type: 'ol', items: [content] }
        }
        continue
      } else if (currentBlock && currentBlock.type === 'ol') {
        blocks.push(currentBlock)
        currentBlock = null
      }

      if (line.trim() === '') {
        if (currentBlock) {
          blocks.push(currentBlock)
          currentBlock = null
        }
        continue
      }

      if (currentBlock && currentBlock.type === 'p') {
        currentBlock.text += '\n' + line
      } else {
        if (currentBlock) blocks.push(currentBlock)
        currentBlock = { type: 'p', text: line }
      }
    }
    
    if (currentBlock) blocks.push(currentBlock)

    return blocks.map((b, idx) => {
      if (b.type === 'code') {
        return (
          <pre 
            key={idx} 
            style={{ 
              background: '#1E1E24', 
              color: '#F8F8F2', 
              padding: '12px 16px', 
              borderRadius: '10px', 
              overflowX: 'auto', 
              fontSize: '12px',
              fontFamily: 'monospace',
              margin: '8px 0',
              border: '1px solid #2D2D35'
            }}
          >
            <code>{b.lines.join('\n')}</code>
          </pre>
        )
      }
      
      if (b.type === 'table') {
        const cleanRows = b.rows.filter(r => !/^[|\s-:]+$/.test(r.trim()))
        if (cleanRows.length === 0) return null
        
        const headerCols = cleanRows[0].split('|').slice(1, -1).map(c => c.trim())
        const bodyRows = cleanRows.slice(1).map(r => r.split('|').slice(1, -1).map(c => c.trim()))
        
        return (
          <div key={idx} style={{ overflowX: 'auto', margin: '12px 0', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                  {headerCols.map((h, i) => (
                    <th key={i} style={{ padding: '8px 12px', fontWeight: 700 }}>{parseInline(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: rIdx < bodyRows.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} style={{ padding: '8px 12px' }}>{parseInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      if (b.type === 'ul') {
        return (
          <ul key={idx} style={{ margin: '8px 0', paddingLeft: '20px', listStyleType: 'disc' }}>
            {b.items.map((item, i) => (
              <li key={i} style={{ marginBottom: '4px', fontSize: '13.5px' }}>{parseInline(item)}</li>
            ))}
          </ul>
        )
      }

      if (b.type === 'ol') {
        return (
          <ol key={idx} style={{ margin: '8px 0', paddingLeft: '20px', listStyleType: 'decimal' }}>
            {b.items.map((item, i) => (
              <li key={i} style={{ marginBottom: '4px', fontSize: '13.5px' }}>{parseInline(item)}</li>
            ))}
          </ol>
        )
      }

      return (
        <p key={idx} style={{ margin: '0 0 8px 0', lineHeight: '1.5', fontSize: '13.5px' }}>
          {parseInline(b.text)}
        </p>
      )
    })
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
                  {m.attachment && (
                    <div style={{ 
                      marginTop: '8px', 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      background: m.role === 'user' ? 'rgba(255,255,255,0.15)' : 'var(--bg-base)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      fontSize: '12px',
                      maxWidth: '100%'
                    }}>
                      {m.attachment.type.startsWith('image/') ? (
                        <img 
                          src={`data:${m.attachment.type};base64,${m.attachment.base64}`} 
                          alt="upload" 
                          style={{ maxWidth: '160px', maxHeight: '160px', borderRadius: '6px', display: 'block' }} 
                        />
                      ) : (
                        <>
                          <FileText size={16} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.attachment.name}</span>
                        </>
                      )}
                    </div>
                  )}
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

          {/* Attachment Preview */}
          {attachment && (
            <div style={{ 
              padding: '8px 16px', 
              background: 'var(--bg-subtle)', 
              borderTop: '1px solid var(--border-light)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {attachment.type.startsWith('image/') ? (
                  <img src={`data:${attachment.type};base64,${attachment.base64}`} alt="preview" style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover' }} />
                ) : (
                  <FileText size={16} />
                )}
                <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.name}</span>
              </div>
              <button 
                onClick={() => setAttachment(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px' }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-surface)' }}>
            <form onSubmit={e => { e.preventDefault(); handleSend(); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', width: '100%' }}>
              <input 
                type="file" 
                id="ai-file-input" 
                style={{ display: 'none' }} 
                accept=".pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.txt" 
                onChange={handleFileChange} 
              />
              <button 
                type="button" 
                onClick={() => document.getElementById('ai-file-input').click()}
                title="Attach document/image"
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: 'var(--text-muted)', 
                  padding: '8px', 
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <Paperclip size={18} />
              </button>
              
              <div style={{ position: 'relative', flex: 1 }}>
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
                  disabled={(!input.trim() && !attachment) || loading}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '6px',
                    bottom: '6px',
                    width: '36px',
                    borderRadius: '50%',
                    background: (input.trim() || attachment) ? 'var(--accent-blue)' : 'var(--border-medium)',
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: (input.trim() || attachment) ? 'pointer' : 'default',
                    transition: 'background 0.2s',
                    flexShrink: 0
                  }}
                >
                  <Send size={16} style={{ marginLeft: '-2px' }} />
                </button>
              </div>
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

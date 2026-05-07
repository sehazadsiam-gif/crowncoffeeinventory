'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Trash2, AlertCircle, CheckCircle, Award, User } from 'lucide-react'
import { useParams } from 'next/navigation'

const styles = {
  container: { padding: '32px', maxWidth: '1000px', margin: '0 auto' },
  header: { marginBottom: '32px' },
  title: { fontSize: '32px', fontWeight: 800, color: '#1F1F1F', margin: '0 0 8px 0', letterSpacing: '-0.5px' },
  subtitle: { fontSize: '14px', color: '#9C8A76', margin: '0' },
  card: { background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  sectionTitle: { fontSize: '13px', fontWeight: 700, color: '#9C8A76', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' },
  inputLabel: { fontSize: '13px', color: '#9C8A76', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' },
  input: { width: '100%', padding: '12px', border: '1px solid #E0E0E0', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit', transition: 'all 0.2s', marginBottom: '16px' },
  button: { width: '100%', padding: '12px', background: '#6B3A2A', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'all 0.2s' },
  badge: { display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' },
  noteCard: { background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '16px', marginBottom: '12px', transition: 'all 0.2s' }
}

const getNoteTypeConfig = (type) => {
  const configs = {
    warning: { icon: AlertCircle, bg: '#FFEBEE', border: '#D32F2F', text: '#D32F2F' },
    commendation: { icon: Award, bg: '#E8F5E9', border: '#2E7D32', text: '#2E7D32' },
    performance: { icon: CheckCircle, bg: '#E3F2FD', border: '#1976D2', text: '#1976D2' },
    general: { icon: MessageSquare, bg: '#F5F5F5', border: '#9C8A76', text: '#5C4A36' }
  }
  return configs[type] || configs.general
}

export default function StaffNotesPage() {
  const params = useParams()
  const staffId = params.id
  const [staff, setStaff] = useState(null)
  const [notes, setNotes] = useState([])
  const [noteType, setNoteType] = useState('performance')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0])
  const [visibleToStaff, setVisibleToStaff] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (staffId) {
      fetchStaff()
      fetchNotes()
    }
  }, [staffId])

  const fetchStaff = async () => {
    try {
      const res = await fetch(`/api/staff/${staffId}`)
      const data = await res.json()
      setStaff(data.staff)
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/staff/${staffId}/notes`)
      const data = await res.json()
      setNotes(data.notes || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
    }
  }

  const handleAddNote = async () => {
    if (!title || !content) {
      alert('Please fill in title and content')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/staff/${staffId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_type: noteType,
          title,
          content,
          date_noted: noteDate,
          visible_to_staff: visibleToStaff
        })
      })

      if (res.ok) {
        setTitle('')
        setContent('')
        setNoteDate(new Date().toISOString().split('T')[0])
        setVisibleToStaff(false)
        fetchNotes()
      }
    } catch (error) {
      alert('Error adding note')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Delete this note?')) return

    try {
      const res = await fetch(`/api/staff/${staffId}/notes/${noteId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchNotes()
      }
    } catch (error) {
      alert('Error deleting note')
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Performance Notes</h1>
        {staff && <p style={styles.subtitle}>{staff.full_name} • {staff.designation_editable || 'Staff Member'}</p>}
      </div>

      {/* Add Note Section */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Add New Note</div>

        <div style={{marginBottom: '16px'}}>
          <label style={styles.inputLabel}>Note Type</label>
          <select 
            value={noteType}
            onChange={(e) => setNoteType(e.target.value)}
            style={styles.input}
          >
            <option value="performance">Performance</option>
            <option value="warning">Warning</option>
            <option value="commendation">Commendation</option>
            <option value="general">General</option>
          </select>
        </div>

        <div style={{marginBottom: '16px'}}>
          <label style={styles.inputLabel}>Title</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={styles.input}
            placeholder="Note title..."
          />
        </div>

        <div style={{marginBottom: '16px'}}>
          <label style={styles.inputLabel}>Content</label>
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{...styles.input, marginBottom: 0, fontFamily: 'inherit', minHeight: '100px'}}
            placeholder="Detailed note content..."
          />
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', marginTop: '16px'}}>
          <div>
            <label style={styles.inputLabel}>Date</label>
            <input 
              type="date" 
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
              style={{...styles.input, marginBottom: 0}}
            />
          </div>
          <div style={{display: 'flex', alignItems: 'center', marginBottom: '0'}}>
            <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, marginTop: '20px'}}>
              <input 
                type="checkbox" 
                checked={visibleToStaff}
                onChange={(e) => setVisibleToStaff(e.target.checked)}
              />
              Visible to staff
            </label>
          </div>
        </div>

        <button
          onClick={handleAddNote}
          disabled={loading}
          style={{...styles.button, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '16px'}}
          onMouseEnter={(e) => !loading && (e.target.style.background = '#8B5E3C')}
          onMouseLeave={(e) => (e.target.style.background = '#6B3A2A')}
        >
          {loading ? 'Saving...' : 'Add Note'}
        </button>
      </div>

      {/* Notes Timeline */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>All Notes ({notes.length})</div>
        
        {notes.length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px', color: '#9C8A76', fontSize: '14px'}}>
            No notes yet. Add one above to get started.
          </div>
        ) : (
          notes.map((note, idx) => {
            const config = getNoteTypeConfig(note.note_type)
            const Icon = config.icon

            return (
              <div 
                key={idx} 
                style={{
                  ...styles.noteCard, 
                  borderLeft: `4px solid ${config.border}`,
                  background: config.bg
                }}
              >
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start'}}>
                  <div style={{display: 'flex', gap: '12px', alignItems: 'start'}}>
                    <div style={{padding: '8px', background: 'white', borderRadius: '50%', border: `1px solid ${config.border}`}}>
                      <Icon size={18} color={config.text} />
                    </div>
                    <div>
                      <div style={{display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px'}}>
                        <span style={{...styles.badge, background: config.bg, color: config.text, border: `1px solid ${config.text}`}}>
                          {note.note_type}
                        </span>
                        {note.visible_to_staff && (
                          <span style={{...styles.badge, background: '#F5F5F5', color: '#9C8A76', fontSize: '10px'}}>
                            Visible to Staff
                          </span>
                        )}
                      </div>
                      <h4 style={{fontSize: '15px', fontWeight: 700, color: '#1F1F1F', margin: '0 0 6px 0'}}>
                        {note.title}
                      </h4>
                      <p style={{fontSize: '14px', color: '#5C4A36', lineHeight: '1.6', margin: '0 0 10px 0'}}>
                        {note.content}
                      </p>
                      <div style={{fontSize: '12px', color: '#9C8A76'}}>
                        {new Date(note.date_noted).toLocaleDateString()} • Added by {note.created_by || 'Admin'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    style={{background: 'none', border: 'none', color: '#D32F2F', cursor: 'pointer', padding: '4px', opacity: 0.6}}
                    onMouseEnter={(e) => e.target.style.opacity = '1'}
                    onMouseLeave={(e) => e.target.style.opacity = '0.6'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

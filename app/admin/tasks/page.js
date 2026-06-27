'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import { 
  ClipboardList, Plus, Trash2, Calendar, AlertTriangle, CheckCircle, 
  Clock, XCircle, User, Info, ArrowLeftRight, CheckSquare
} from 'lucide-react'

export default function AdminTasksPage() {
  const router = useRouter()
  const { addToast } = useToast()
  
  const [lang, setLang] = useState('en')
  const [staffList, setStaffList] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [filterStaff, setFilterStaff] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  
  const [form, setForm] = useState({
    staff_id: '',
    title: '',
    description: '',
    priority: 'normal',
    due_date: new Date().toISOString().split('T')[0]
  })

  // Bilingual translation dictionary specific to this page
  const t = {
    en: {
      pageTitle: "Staff Task Assignment",
      pageSubtitle: "Create, monitor and manage tasks assigned to team members",
      assignNew: "Assign New Task",
      selectStaff: "Select Staff Member",
      taskTitle: "Task Title",
      taskDesc: "Description / Instructions",
      dueDate: "Due Date",
      priority: "Priority Level",
      priorityUrgent: "Urgent",
      priorityHigh: "High",
      priorityNormal: "Normal",
      btnAssign: "Assign Task",
      btnAssigning: "Assigning...",
      allStaff: "All Staff",
      allStatus: "All Statuses",
      filterByStaff: "Filter by Staff",
      filterByStatus: "Filter by Status",
      statusPending: "Pending",
      statusDone: "Done",
      statusNotDone: "Not Done",
      taskList: "Assigned Tasks List",
      noTasks: "No tasks found matching the criteria.",
      created: "Assigned on",
      due: "Due by",
      priorityLabel: "Priority",
      statusLabel: "Status",
      noteLabel: "Staff Note",
      deleteConfirm: "Are you sure you want to delete this task?",
      deleteSuccess: "Task deleted successfully",
      assignSuccess: "Task successfully assigned to staff",
      validationErr: "Please select a staff member and provide a task title",
      placeholderTitle: "e.g. Clean espresso machine group heads",
      placeholderDesc: "Provide clear step-by-step instructions..."
    },
    bn: {
      pageTitle: "স্টাফ কাজের বরাদ্দকরণ",
      pageSubtitle: "দলীয় সদস্যদের বরাদ্দ করা কাজগুলো তৈরি, তদারকি এবং পরিচালনা করুন",
      assignNew: "নতুন কাজ বরাদ্দ করুন",
      selectStaff: "স্টাফ সদস্য নির্বাচন করুন",
      taskTitle: "কাজের শিরোনাম",
      taskDesc: "বিস্তারিত বিবরণ / নির্দেশাবলী",
      dueDate: "শেষ সময়",
      priority: "অগ্রাধিকার স্তর",
      priorityUrgent: "জরুরি",
      priorityHigh: "উচ্চ",
      priorityNormal: "সাধারণ",
      btnAssign: "কাজ বরাদ্দ করুন",
      btnAssigning: "বরাদ্দ করা হচ্ছে...",
      allStaff: "সকল স্টাফ",
      allStatus: "সকল অবস্থা",
      filterByStaff: "স্টাফ অনুযায়ী ফিল্টার",
      filterByStatus: "অবস্থা অনুযায়ী ফিল্টার",
      statusPending: "চলমান",
      statusDone: "সম্পন্ন",
      statusNotDone: "অসম্পন্ন",
      taskList: "বরাদ্দকৃত কাজের তালিকা",
      noTasks: "কোনো কাজ পাওয়া যায়নি।",
      created: "বরাদ্দ করা হয়েছে",
      due: "শেষ তারিখ",
      priorityLabel: "অগ্রাধিকার",
      statusLabel: "অবস্থা",
      noteLabel: "স্টাফ মন্তব্য",
      deleteConfirm: "আপনি কি নিশ্চিত যে আপনি এই কাজটি মুছে ফেলতে চান?",
      deleteSuccess: "কাজটি সফলভাবে মুছে ফেলা হয়েছে",
      assignSuccess: "কাজটি সফলভাবে স্টাফকে বরাদ্দ করা হয়েছে",
      validationErr: "অনুগ্রহ করে একজন স্টাফ নির্বাচন করুন এবং কাজের শিরোনাম দিন",
      placeholderTitle: "যেমন: এসপ্রেসো মেশিন গ্রুপ হেড পরিষ্কার করুন",
      placeholderDesc: "ধাপে ধাপে পরিষ্কার নির্দেশাবলী দিন..."
    }
  }[lang]

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || role !== 'admin') {
      router.replace('/')
      return
    }
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const [staffRes, tasksRes] = await Promise.all([
        supabase.from('staff').select('id, name, designation').eq('is_active', true).order('name'),
        fetch('/api/tasks/list').then(res => res.json()).then(data => ({ data: data.tasks || [], error: null }))
      ])
      
      if (staffRes.error) throw staffRes.error
      if (tasksRes.error) throw tasksRes.error

      setStaffList(staffRes.data || [])
      setTasks(tasksRes.data || [])
    } catch (err) {
      console.error(err)
      addToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTask(e) {
    e.preventDefault()
    if (!form.staff_id || !form.title.trim()) {
      addToast(t.validationErr, 'error')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to create task')

      addToast(t.assignSuccess, 'success')
      setForm({
        ...form,
        title: '',
        description: '',
        priority: 'normal',
        due_date: new Date().toISOString().split('T')[0]
      })
      
      // Refresh tasks
      const resTasks = await fetch('/api/tasks/list')
      const dataTasks = await resTasks.json()
      setTasks(dataTasks.tasks || [])
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteTask(id) {
    if (!window.confirm(t.deleteConfirm)) return

    try {
      const res = await fetch(`/api/tasks/list?id=${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.error || 'Failed to delete task')
      }

      addToast(t.deleteSuccess, 'success')
      setTasks(tasks.filter(task => task.id !== id))
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  async function handleVerifyTask(taskId, verify) {
    try {
      const body = verify 
        ? { task_id: taskId, status: 'done', is_verified: true }
        : { task_id: taskId, status: 'pending', is_verified: false }
        
      const res = await fetch('/api/tasks/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to verify task')

      addToast(verify ? 'Task marked as verified' : 'Task rejected back to pending', 'success')
      
      // Refresh tasks
      const resTasks = await fetch('/api/tasks/list')
      const dataTasks = await resTasks.json()
      setTasks(dataTasks.tasks || [])
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  const filteredTasks = tasks.filter(task => {
    const staffMatch = filterStaff === 'all' || task.staff_id === filterStaff
    const statusMatch = filterStatus === 'all' || task.status === filterStatus
    return staffMatch && statusMatch
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', paddingBottom: '60px' }}>
      <Navbar />
      
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        
        {/* Top Header Panel */}
        <div style={{
          background: 'linear-gradient(135deg, #1E2E44 0%, #0F1A2B 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: 'white',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '10px' }}>
                <ClipboardList size={24} color="#60A5FA" />
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                {t.pageTitle}
              </h1>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.70)', fontSize: '13px', margin: 0 }}>
              {t.pageSubtitle}
            </p>
          </div>

          {/* Language Toggle */}
          <button 
            onClick={() => setLang(l => l === 'en' ? 'bn' : 'en')}
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.20)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          >
            <ArrowLeftRight size={14} />
            {lang === 'en' ? 'বাংলা সংস্করণ' : 'English Version'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          {/* ASSIGN TASK FORM */}
          <div className="card" style={{ padding: '24px', borderRadius: '16px', height: 'fit-content' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <Plus size={18} color="var(--primary)" />
              {t.assignNew}
            </h3>

            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {t.selectStaff} *
                </label>
                <select
                  value={form.staff_id}
                  onChange={e => setForm({ ...form, staff_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border-medium)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '14px'
                  }}
                  required
                >
                  <option value="">-- {t.selectStaff} --</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {t.taskTitle} *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder={t.placeholderTitle}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border-medium)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {t.taskDesc}
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder={t.placeholderDesc}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border-medium)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {t.priority}
                  </label>
                  <select
                    value={form.priority}
                    onChange={e => setForm({ ...form, priority: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-medium)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '14px'
                    }}
                  >
                    <option value="normal">{t.priorityNormal}</option>
                    <option value="high">{t.priorityHigh}</option>
                    <option value="urgent">{t.priorityUrgent}</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {t.dueDate}
                  </label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={e => setForm({ ...form, due_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-medium)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: 'linear-gradient(135deg, var(--accent-brown) 0%, var(--accent-brown-light) 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-glow-brown)',
                  transition: 'opacity 0.2s',
                  marginTop: '8px'
                }}
              >
                {submitting ? t.btnAssigning : t.btnAssign}
              </button>
            </form>
          </div>

          {/* TASK LIST PANEL */}
          <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {t.taskList}
              </h3>
              
              {/* Filters */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <select
                  value={filterStaff}
                  onChange={e => setFilterStaff(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-medium)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  <option value="all">{t.allStaff}</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-medium)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  <option value="all">{t.allStatus}</option>
                  <option value="pending">{t.statusPending}</option>
                  <option value="done">{t.statusDone}</option>
                  <option value="not_done">{t.statusNotDone}</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <div className="loader" />
              </div>
            ) : filteredTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <Info size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>{t.noTasks}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredTasks.map(task => {
                  const isUrgent = task.priority === 'urgent'
                  const isHigh = task.priority === 'high'
                  const pColor = isUrgent ? 'var(--danger)' : isHigh ? 'var(--warning)' : 'var(--success)'
                  
                  const isDone = task.status === 'done'
                  const isNotDone = task.status === 'not_done'
                  
                  const statusBg = isDone 
                    ? (task.is_verified ? 'var(--success-bg)' : 'var(--warning-bg)') 
                    : isNotDone ? 'var(--danger-bg)' : 'var(--warning-bg)'
                  const statusColor = isDone 
                    ? (task.is_verified ? 'var(--success)' : 'var(--warning)') 
                    : isNotDone ? 'var(--danger)' : 'var(--warning)'
                  
                  const statusText = isDone 
                    ? (task.is_verified ? (lang === 'bn' ? 'যাচাইকৃত সম্পন্ন' : 'Verified Done') : (lang === 'bn' ? 'যাচাইকরণ পেন্ডিং' : 'Pending Verification'))
                    : isNotDone ? t.statusNotDone : t.statusPending

                  return (
                    <div key={task.id} style={{
                      background: 'var(--bg-surface)',
                      border: `1.5px solid ${isUrgent ? 'var(--danger)' : 'var(--border-light)'}`,
                      borderRadius: '12px',
                      padding: '16px',
                      boxShadow: 'var(--shadow-xs)',
                      position: 'relative'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            {task.staff?.name} ({task.staff?.designation})
                          </span>
                          <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '4px 0', color: 'var(--text-primary)' }}>
                            {task.title}
                          </h4>
                        </div>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '6px'
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {task.description && (
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.55 }}>
                          {task.description}
                        </p>
                      )}

                      {task.staff_note && (
                        <div style={{ background: 'var(--bg-subtle)', borderRadius: '8px', padding: '10px', marginBottom: '12px', borderLeft: '3px solid var(--accent-brown)' }}>
                          <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>
                            {t.noteLabel}
                          </p>
                          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
                            {task.staff_note}
                          </p>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '10px', marginTop: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                          <span style={{ background: statusBg, color: statusColor, fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
                            {statusText}
                          </span>
                          <span style={{ background: 'var(--bg-subtle)', color: pColor, fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
                            {task.priority === 'urgent' ? t.priorityUrgent : task.priority === 'high' ? t.priorityHigh : t.priorityNormal}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                          <Calendar size={12} />
                          <span>{t.due}: {task.due_date ? new Date(task.due_date).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', { dateStyle: 'medium' }) : 'N/A'}</span>
                        </div>
                      </div>

                      {task.status === 'done' && !task.is_verified && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px dashed var(--border-light)', paddingTop: '12px' }}>
                          <button
                            onClick={() => handleVerifyTask(task.id, true)}
                            style={{
                              flex: 1,
                              background: 'var(--success)',
                              color: 'white',
                              border: 'none',
                              padding: '8px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <CheckCircle size={14} />
                            {lang === 'en' ? 'Verify Done' : 'যাচাই করুন'}
                          </button>
                          <button
                            onClick={() => handleVerifyTask(task.id, false)}
                            style={{
                              flex: 1,
                              background: 'var(--danger)',
                              color: 'white',
                              border: 'none',
                              padding: '8px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <XCircle size={14} />
                            {lang === 'en' ? 'Reject / Re-open' : 'প্রত্যাখ্যান'}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  )
}

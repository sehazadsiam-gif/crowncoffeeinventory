'use client'

import { useState, useEffect } from 'react'
import Navbar from '../../../components/Navbar'
import { Trophy, Award, Star, Medal, CheckCircle, AlertTriangle, UserCheck, ChevronLeft, ChevronRight, Edit3, Save, DollarSign } from 'lucide-react'

export default function StaffPerformancePage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Edit Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [adminScoreInput, setAdminScoreInput] = useState(100)
  const [adminCommentsInput, setAdminCommentsInput] = useState('')
  const [bonusInput, setBonusInput] = useState(0)
  const [toast, setToast] = useState(null)

  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    fetchPerformance()
  }, [month, year])

  const fetchPerformance = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/staff/performance?month=${month}&year=${year}`)
      const data = await res.json()
      setLeaderboard(data.leaderboard || [])
    } catch (err) {
      console.error('Error fetching performance leaderboard:', err)
      showToast('Failed to load performance data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const changeMonth = (delta) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1)
    setCurrentDate(newDate)
  }

  const openEvaluationModal = (item) => {
    setSelectedStaff(item)
    setAdminScoreInput(item.scores.admin_score ?? 100)
    setAdminCommentsInput(item.admin_comments || '')
    setBonusInput(item.awarded_bonus || 0)
    setModalOpen(true)
  }

  const handleSaveEvaluation = async () => {
    if (!selectedStaff) return
    try {
      setSaving(true)
      const res = await fetch('/api/staff/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: selectedStaff.staff_id,
          month,
          year,
          admin_score: Number(adminScoreInput),
          admin_comments: adminCommentsInput,
          awarded_bonus: Number(bonusInput)
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      showToast(`Evaluation saved for ${selectedStaff.name}!`)
      setModalOpen(false)
      fetchPerformance()
    } catch (err) {
      console.error('Error saving evaluation:', err)
      showToast(err.message || 'Failed to save evaluation', 'error')
    } finally {
      setSaving(false)
    }
  }

  const winner = leaderboard.length > 0 ? leaderboard[0] : null
  const second = leaderboard.length > 1 ? leaderboard[1] : null
  const third = leaderboard.length > 2 ? leaderboard[2] : null

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#0F172A' }}>
      <Navbar />
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '20px', zIndex: 9999,
          background: toast.type === 'error' ? '#EF4444' : '#10B981', color: '#FFF',
          padding: '12px 20px', borderRadius: '10px', fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {toast.msg}
        </div>
      )}

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
        
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Trophy size={32} color="#D97706" />
              Staff Performance & Employee of the Month
            </h1>
            <p style={{ color: '#64748B', marginTop: '4px', fontSize: '14px', margin: '4px 0 0 0' }}>
              Combined 200-Point Score: 100 System Auto-Points (Attendance, Tasks, Quality) + 100 Admin Assessment Points.
            </p>
          </div>

          {/* Month Navigator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#FFFFFF', padding: '6px 14px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#475569' }}>
              <ChevronLeft size={20} />
            </button>
            <span style={{ fontWeight: 800, fontSize: '15px', color: '#1E293B', minWidth: '140px', textAlign: 'center' }}>
              {monthNames[month - 1]} {year}
            </span>
            <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#475569' }}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748B', fontWeight: 600 }}>
            Loading performance leaderboard...
          </div>
        ) : (
          <>
            {/* Podium Cards Section (1st, 2nd, 3rd) */}
            {winner && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '36px' }}>
                
                {/* 1st Place: Employee of the Month Winner */}
                <div style={{
                  background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
                  border: '2px solid #F59E0B', borderRadius: '20px', padding: '24px', position: 'relative',
                  boxShadow: '0 10px 25px rgba(245,158,11,0.15)'
                }}>
                  <div style={{ position: 'absolute', top: '-14px', right: '20px', background: '#F59E0B', color: '#FFF', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🏆 Employee of the Month
                  </div>

                  <div style={{ display: 'flex', itemsAlign: 'center', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 900, border: '2px solid #F59E0B' }}>
                      👑
                    </div>
                    <div>
                      <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#78350F', margin: 0 }}>{winner.name}</h3>
                      <p style={{ fontSize: '13px', color: '#92400E', margin: '2px 0 0 0', fontWeight: 700 }}>{winner.designation} ({winner.employee_id})</p>
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #FDE68A' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>Combined Score</span>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#B45309' }}>
                        {winner.scores.total_score} <span style={{ fontSize: '14px', color: '#78350F' }}>/ 200 pts</span>
                      </div>
                    </div>
                    <button onClick={() => openEvaluationModal(winner)} style={{ padding: '8px 14px', background: '#F59E0B', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}>
                      Edit Rating
                    </button>
                  </div>
                  {winner.admin_comments && (
                    <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#78350F', marginTop: '12px', margin: '12px 0 0 0' }}>
                      "{winner.admin_comments}"
                    </p>
                  )}
                </div>

                {/* 2nd Place */}
                {second && (
                  <div style={{ background: '#FFFFFF', border: '1.5px solid #CBD5E1', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800 }}>
                        🥈
                      </div>
                      <div>
                        <h4 style={{ fontSize: '17px', fontWeight: 800, color: '#1E293B', margin: 0 }}>{second.name}</h4>
                        <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>2nd Place · {second.designation}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Total Score</span>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#334155' }}>{second.scores.total_score} / 200 pts</div>
                      </div>
                      <button onClick={() => openEvaluationModal(second)} style={{ padding: '6px 12px', background: '#F1F5F9', color: '#334155', border: '1px solid #CBD5E1', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}>
                        Evaluate
                      </button>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {third && (
                  <div style={{ background: '#FFFFFF', border: '1.5px solid #CBD5E1', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#FFEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800 }}>
                        🥉
                      </div>
                      <div>
                        <h4 style={{ fontSize: '17px', fontWeight: 800, color: '#1E293B', margin: 0 }}>{third.name}</h4>
                        <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>3rd Place · {third.designation}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Total Score</span>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#C2410C' }}>{third.scores.total_score} / 200 pts</div>
                      </div>
                      <button onClick={() => openEvaluationModal(third)} style={{ padding: '6px 12px', background: '#F1F5F9', color: '#334155', border: '1px solid #CBD5E1', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}>
                        Evaluate
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Leaderboard Table */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Full Monthly Performance Rankings ({monthNames[month - 1]} {year})
                </h2>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                  Total Active Staff: {leaderboard.length}
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0', color: '#475569', fontWeight: 800 }}>
                      <th style={{ padding: '14px 16px' }}>Rank</th>
                      <th style={{ padding: '14px 16px' }}>Staff Name</th>
                      <th style={{ padding: '14px 16px' }}>Punctuality (40)</th>
                      <th style={{ padding: '14px 16px' }}>Tasks (30)</th>
                      <th style={{ padding: '14px 16px' }}>Quality (30)</th>
                      <th style={{ padding: '14px 16px' }}>System (100)</th>
                      <th style={{ padding: '14px 16px' }}>Admin Score (100)</th>
                      <th style={{ padding: '14px 16px' }}>Combined Total</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((item) => (
                      <tr key={item.staff_id} style={{ borderBottom: '1px solid #F1F5F9', background: item.rank === 1 ? '#FFFDF5' : '#FFFFFF' }}>
                        <td style={{ padding: '16px', fontWeight: 900, color: item.rank === 1 ? '#D97706' : '#334155' }}>
                          #{item.rank} {item.rank === 1 && '👑'}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px' }}>{item.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{item.designation} ({item.employee_id})</div>
                        </td>
                        <td style={{ padding: '16px', fontWeight: 700, color: '#16A34A' }}>
                          {item.scores.punctuality_score} / 40
                          <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>{item.stats.late_days} late, {item.stats.absent_days} abs</div>
                        </td>
                        <td style={{ padding: '16px', fontWeight: 700, color: '#2563EB' }}>
                          {item.scores.task_score} / 30
                          <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>{item.stats.tasks_done}/{item.stats.tasks_total} done</div>
                        </td>
                        <td style={{ padding: '16px', fontWeight: 700, color: '#D97706' }}>
                          {item.scores.quality_score} / 30
                          <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>{item.stats.penalties_count} penalties</div>
                        </td>
                        <td style={{ padding: '16px', fontWeight: 800, color: '#475569' }}>
                          {item.scores.system_score} / 100
                        </td>
                        <td style={{ padding: '16px', fontWeight: 800, color: '#0284C7' }}>
                          {item.scores.admin_score} / 100
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 900, color: item.rank === 1 ? '#D97706' : '#0F172A' }}>
                            {item.scores.total_score}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}> / 200</span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <button
                            onClick={() => openEvaluationModal(item)}
                            style={{
                              padding: '8px 14px', borderRadius: '8px', background: '#3B82F6', color: '#FFF',
                              border: 'none', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
                            }}
                          >
                            <Edit3 size={14} /> Evaluate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </main>

      {/* Admin Evaluation Modal */}
      {modalOpen && selectedStaff && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{ background: '#FFFFFF', borderRadius: '20px', maxWidth: '520px', width: '100%', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: 0 }}>
              Evaluate {selectedStaff.name}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', marginBottom: '20px' }}>
              Monthly Evaluation for {monthNames[month - 1]} {year} (Role: {selectedStaff.designation})
            </p>

            <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', fontSize: '13px' }}>
              <div>System Score: <strong>{selectedStaff.scores.system_score} / 100</strong></div>
              <div style={{ color: '#64748B', fontSize: '11px', marginTop: '2px' }}>
                Punctuality: {selectedStaff.scores.punctuality_score} | Tasks: {selectedStaff.scores.task_score} | Quality: {selectedStaff.scores.quality_score}
              </div>
            </div>

            {/* Admin Manual Score (0 to 100) */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                Admin Manual Rating (0 to 100 Points)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={adminScoreInput}
                onChange={(e) => setAdminScoreInput(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '16px', fontWeight: 800, outline: 'none' }}
              />
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Rate work attitude, teamwork, customer feedback, and effort.
              </span>
            </div>

            {/* Evaluation Comments */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                Admin Evaluation Comments & Notes
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Excellent teamwork, handled customer rush calmly, polite behavior..."
                value={adminCommentsInput}
                onChange={(e) => setAdminCommentsInput(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '13px', outline: 'none', resize: 'vertical' }}
              />
            </div>

            {/* Award Bonus */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                Employee of the Month Bonus Award (৳ Taka)
              </label>
              <input
                type="number"
                min="0"
                value={bonusInput}
                onChange={(e) => setBonusInput(e.target.value)}
                placeholder="e.g. 2000"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '15px', fontWeight: 800, outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{ padding: '10px 18px', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={handleSaveEvaluation}
                style={{ padding: '10px 22px', background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Save size={16} /> Save Score & Comments
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

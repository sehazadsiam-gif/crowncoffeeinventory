'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Trash2, Eye, Edit2, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function MembersPage() {
  const router = useRouter()
  const [members, setMembers] = useState([])
  const [filteredMembers, setFilteredMembers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deactivateConfirm, setDeactivateConfirm] = useState(null)

  useEffect(() => {
    fetchMembers()
  }, [])

  useEffect(() => {
    filterMembers()
  }, [members, search, filter])

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch('/api/members/list', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setMembers(data.members || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterMembers = () => {
    let result = members

    if (filter === 'active') result = result.filter(m => m.status === 'active')
    if (filter === 'pending') result = result.filter(m => m.status === 'pending')
    if (filter === 'deactivated') result = result.filter(m => m.status === 'deactivated')
    if (filter === 'deleted') result = result.filter(m => m.status === 'deleted')

    if (search) {
      result = result.filter(m =>
        m.full_name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase()) ||
        m.phone.includes(search)
      )
    }

    setFilteredMembers(result)
  }

  const handleDeactivate = async (memberId) => {
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch(`/api/admin/members/${memberId}/delete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'deactivate' })
      })

      if (res.ok) {
        alert('Member deactivated successfully')
        fetchMembers()
      }
    } catch (error) {
      alert('Error deactivating member')
    }
    setDeactivateConfirm(null)
  }

  const handleDelete = async (memberId) => {
    try {
      const token = localStorage.getItem('cc_token')
      const res = await fetch(`/api/admin/members/${memberId}/delete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'delete' })
      })

      if (res.ok) {
        alert('Member deleted successfully')
        fetchMembers()
      }
    } catch (error) {
      alert('Error deleting member')
    }
    setDeleteConfirm(null)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return { bg: '#E8F5E9', text: '#2E7D32', label: 'Active' }
      case 'pending': return { bg: '#FFF3E0', text: '#F57C00', label: 'Pending' }
      case 'deactivated': return { bg: '#FFEBEE', text: '#D32F2F', label: 'Deactivated' }
      case 'deleted': return { bg: '#F3E5F5', text: '#7B1FA2', label: 'Deleted' }
      default: return { bg: '#E0E0E0', text: '#424242', label: status }
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle size={16} />
      case 'pending': return <Clock size={16} />
      case 'deactivated': return <XCircle size={16} />
      case 'deleted': return <Trash2 size={16} />
      default: return null
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#9C8A76' }}>Loading members...</div>
  }

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1F1F1F', marginBottom: '8px' }}>
        Members Management
      </h1>
      <p style={{ color: '#9C8A76', marginBottom: '32px' }}>
        View, manage, and delete members
      </p>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9C8A76' }} />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '40px', padding: '12px 12px 12px 40px', border: '1px solid #E0E0E0', borderRadius: '8px' }}
          />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '12px 12px', border: '1px solid #E0E0E0', borderRadius: '8px' }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="deactivated">Deactivated</option>
          <option value="deleted">Deleted</option>
        </select>
      </div>

      {/* Members Table */}
      <div style={{ background: 'white', border: '1px solid #E0E0E0', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F5F5F5' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 700, borderBottom: '1px solid #E0E0E0' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 700, borderBottom: '1px solid #E0E0E0' }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 700, borderBottom: '1px solid #E0E0E0' }}>Phone</th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 700, borderBottom: '1px solid #E0E0E0' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 700, borderBottom: '1px solid #E0E0E0' }}>Visits</th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 700, borderBottom: '1px solid #E0E0E0' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#9C8A76' }}>
                  No members found
                </td>
              </tr>
            ) : (
              filteredMembers.map(member => {
                const statusColor = getStatusColor(member.status)
                return (
                  <tr key={member.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: 700 }}>{member.full_name}</td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#5C4A36' }}>{member.email}</td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#5C4A36' }}>{member.phone}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '12px', background: statusColor.bg, color: statusColor.text, fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {getStatusIcon(member.status)}
                        {statusColor.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 700 }}>{member.total_visits || 0}</td>
                    <td style={{ padding: '12px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button
                        onClick={() => router.push(`/admin/members/${member.id}`)}
                        style={{ padding: '6px 12px', background: '#6B3A2A', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        View
                      </button>

                      {member.status === 'active' && (
                        <button
                          onClick={() => setDeactivateConfirm(member.id)}
                          style={{ padding: '6px 12px', background: '#F57C00', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Deactivate
                        </button>
                      )}

                      {member.status === 'deactivated' && (
                        <button
                          onClick={() => setDeleteConfirm(member.id)}
                          style={{ padding: '6px 12px', background: '#D32F2F', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Deactivate Confirmation Modal */}
      {deactivateConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '32px', maxWidth: '400px', textAlign: 'center' }}>
            <h2 style={{ color: '#1F1F1F', fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Deactivate Member?</h2>
            <p style={{ color: '#9C8A76', marginBottom: '24px' }}>
              Are you sure you want to deactivate this membership? They can be reactivated later.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDeactivateConfirm(null)}
                style={{ flex: 1, padding: '10px', background: '#E0E0E0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeactivate(deactivateConfirm)}
                style={{ flex: 1, padding: '10px', background: '#F57C00', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '32px', maxWidth: '400px', textAlign: 'center' }}>
            <h2 style={{ color: '#D32F2F', fontSize: '18px', fontWeight: 700', marginBottom: '12px' }}>Delete Member Permanently?</h2>
            <p style={{ color: '#9C8A76', marginBottom: '24px' }}>
              This action cannot be undone. The member record will be marked as deleted.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, padding: '10px', background: '#E0E0E0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{ flex: 1, padding: '10px', background: '#D32F2F', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

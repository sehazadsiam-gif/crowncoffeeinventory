'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Trash2, Download } from 'lucide-react'

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

  const handleExportMembers = () => {
    if (filteredMembers.length === 0) {
      alert('No members to export')
      return
    }

    const headers = ['Full Name', 'Email', 'Phone', 'Status', 'Visits', 'Tier']
    const rows = filteredMembers.map(m => [
      m.full_name,
      m.email,
      m.phone,
      m.status,
      m.total_visits || 0,
      m.tier || 'silver'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `members_${new Date().toISOString().split('T')[0]}.csv`)
    link.click()
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

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#9C8A76' }}>Loading members...</div>
  }

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1F1F1F', margin: 0 }}>
            Members Management
          </h1>
          <p style={{ color: '#9C8A76', margin: '4px 0 0 0' }}>
            View, manage, and delete members
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/members/pending')}
          style={{ padding: '12px 20px', background: '#2E7D32', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, boxShadow: '0 4px 12px rgba(46, 125, 50, 0.2)' }}
        >
          View Pending Approvals
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9C8A76' }} />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '40px', padding: '12px 12px 12px 40px', border: '1px solid #E0E0E0', borderRadius: '8px', boxSizing: 'border-box' }}
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

        <button
          onClick={handleExportMembers}
          style={{ padding: '12px 16px', background: '#6B3A2A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

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
                      <span style={{ padding: '4px 10px', borderRadius: '12px', background: statusColor.bg, color: statusColor.text, fontSize: '11px', fontWeight: 700 }}>
                        {statusColor.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 700 }}>{member.total_visits || 0}</td>
                    <td style={{ padding: '12px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button
                        onClick={() => router.push(`/admin/members/${member.id}`)}
                        style={{ padding: '6px 12px', background: '#6B3A2A', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                      >
                        View
                      </button>

                      {member.status === 'active' && (
                        <button
                          onClick={() => setDeactivateConfirm(member.id)}
                          style={{ padding: '6px 12px', background: '#F57C00', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                        >
                          Deactivate
                        </button>
                      )}

                      {member.status === 'deactivated' && (
                        <button
                          onClick={() => setDeleteConfirm(member.id)}
                          style={{ padding: '6px 12px', background: '#D32F2F', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                        >
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

      {deleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '32px', maxWidth: '400px', textAlign: 'center' }}>
            <h2 style={{ color: '#D32F2F', fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Delete Member Permanently?</h2>
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

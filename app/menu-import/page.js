'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'
import { useToast } from '../../components/Toast'
import { 
  FileSpreadsheet, Upload, Download, CheckCircle2, 
  AlertCircle, ChevronRight, Package, Info, History
} from 'lucide-react'
import * as XLSX from 'xlsx'

export default function MenuImportPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [file, setFile] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [importHistory, setImportHistory] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || role !== 'admin') {
      router.replace('/')
      return
    }
    // Load local history
    const saved = localStorage.getItem('menu_import_history')
    if (saved) setImportHistory(JSON.parse(saved))
  }, [])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) processFile(selectedFile)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const selectedFile = e.dataTransfer.files[0]
    if (selectedFile) processFile(selectedFile)
  }

  const processFile = async (file) => {
    if (file.size > 5 * 1024 * 1024) {
      addToast('File size exceeds 5MB limit', 'error')
      return
    }
    setFile(file)
    setLoading(true)

    try {
      const bytes = await file.arrayBuffer()
      const workbook = XLSX.read(bytes, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(worksheet)

      // Group by Item Name for preview
      const grouped = {}
      rows.forEach(row => {
        const itemName = row['Item Name'] || row['item_name']
        if (!itemName) return
        if (!grouped[itemName]) {
          grouped[itemName] = {
            name: itemName,
            category: row['Category'] || row['category'] || 'Other',
            price: row['Price'] || row['price'] || 0,
            ingredients: []
          }
        }
        grouped[itemName].ingredients.push({
          name: row['Ingredient'] || row['ingredient'],
          qty: row['Quantity'] || row['quantity'],
          unit: row['Unit'] || row['unit']
        })
      })
      setPreviewData(Object.values(grouped))
    } catch (err) {
      addToast('Error parsing file', 'error')
    } finally {
      setLoading(false)
    }
  }

  const confirmImport = async () => {
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/menu/import', {
        method: 'POST',
        body: formData
      })
      const result = await res.json()

      if (result.success) {
        addToast(`Successfully imported ${result.items} items and ${result.recipes} recipes`, 'success')
        
        // Update history
        const newEntry = {
          date: new Date().toLocaleString(),
          items: result.items,
          recipes: result.recipes,
          fileName: file.name
        }
        const updatedHistory = [newEntry, ...importHistory].slice(0, 10)
        setImportHistory(updatedHistory)
        localStorage.setItem('menu_import_history', JSON.stringify(updatedHistory))
        
        setFile(null)
        setPreviewData(null)
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      addToast(err.message || 'Import failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <Navbar />
      <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 24px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Menu Import</h1>
            <p style={{ color: '#64748B', marginTop: '4px' }}>Upload Excel or CSV with menu items and recipes</p>
          </div>
          <a 
            href="/api/menu/template" 
            className="btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
          >
            <Download size={18} /> Download Template
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: previewData ? '1fr' : '1fr 350px', gap: '32px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Upload Zone */}
            {!previewData && (
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                style={{
                  border: '2px dashed #CBD5E1',
                  borderRadius: '16px',
                  padding: '60px 40px',
                  textAlign: 'center',
                  background: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => document.getElementById('fileInput').click()}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#94A3B8'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#CBD5E1'}
              >
                <input 
                  id="fileInput" 
                  type="file" 
                  accept=".xlsx,.xls,.csv" 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange}
                />
                <div style={{ background: '#F1F5F9', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Upload size={32} color="#64748B" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }}>
                  Click to upload or drag and drop
                </h3>
                <p style={{ color: '#64748B', fontSize: '14px' }}>
                  Excel (.xlsx, .xls) or CSV files up to 5MB
                </p>
              </div>
            )}

            {/* Preview Section */}
            {previewData && (
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B' }}>
                    Preview: {previewData.length} Items Found
                  </h3>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      className="btn-secondary" 
                      onClick={() => { setFile(null); setPreviewData(null); }}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn-primary" 
                      onClick={confirmImport}
                      disabled={loading}
                    >
                      {loading ? 'Importing...' : 'Confirm Import'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                  {previewData.map((item, idx) => (
                    <div key={idx} style={{ 
                      border: '1px solid #E2E8F0', 
                      borderRadius: '12px', 
                      padding: '16px',
                      background: '#F8FAFC'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div>
                          <p style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{item.name}</p>
                          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>{item.category}</span>
                        </div>
                        <p style={{ fontWeight: 800, color: '#10B981' }}>৳{item.price}</p>
                      </div>
                      
                      <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>Recipe</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {item.ingredients.map((ing, iIdx) => (
                            <div key={iIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                              <span style={{ color: '#475569' }}>{ing.name}</span>
                              <span style={{ fontWeight: 600, color: '#1E293B' }}>{ing.qty} {ing.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!previewData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="card" style={{ padding: '24px', borderLeft: '4px solid #3B82F6' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '16px' }}>
                  <Info size={18} color="#3B82F6" /> Instructions
                </h4>
                <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: '#475569' }}>
                  <li>Use the template for correct headers.</li>
                  <li>Each row represents one ingredient.</li>
                  <li>Items with multiple ingredients should have the same name in multiple rows.</li>
                  <li>Importing will replace existing recipes for matched items.</li>
                </ul>
              </div>

              {importHistory.length > 0 && (
                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <History size={18} color="#64748B" />
                    <h4 style={{ margin: 0, fontSize: '15px' }}>Recent Imports</h4>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {importHistory.map((h, i) => (
                      <div key={i} style={{ padding: '12px 20px', borderBottom: i === importHistory.length - 1 ? 'none' : '1px solid #F1F5F9' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>{h.fileName}</p>
                        <p style={{ fontSize: '11px', color: '#94A3B8', margin: '2px 0 6px' }}>{h.date}</p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <span style={{ fontSize: '10px', background: '#E0F2FE', color: '#0369A1', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{h.items} Items</span>
                          <span style={{ fontSize: '10px', background: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{h.recipes} Recipes</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

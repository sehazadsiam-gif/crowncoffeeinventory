'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Plus,
  Search,
  Download,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  KeyRound,
  X,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Printer,
  Sparkles,
  FileText,
  Tag
} from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const PIN_CODE = '456456'

const DEFAULT_CATEGORIES = [
  'All',
  'Coffee & Espresso',
  'Cold Beverages',
  'Pastry & Bakery',
  'Kitchen & Food',
  'Signatures & Ratios'
]

// Fallback seed data if database is empty initially
const SEED_RECIPES = [
  {
    id: 'seed-1',
    title: 'Crown Signature Caramel Macchiato',
    category: 'Coffee & Espresso',
    paragraph: `1. Extraction: Pull 2 shots of fresh Crown Espresso (18g in -> 36g out, 27s extraction time).
2. Steaming: Steam 220ml of fresh whole milk to 65°C with silky microfoam.
3. Sauce & Layering: Add 15ml vanilla syrup to glass base. Pour steamed milk, top with double espresso shots slowly for a bold layered appearance.
4. Finish: Drizzle gold caramel sauce in a double-crosshatch pattern over microfoam.`,
    image_url: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  {
    id: 'seed-2',
    title: 'Iced Spanish Latte',
    category: 'Cold Beverages',
    paragraph: `1. Base Ratios: Combine 30ml condensed milk with 15ml fresh whole milk in pitcher and stir thoroughly until silky smooth.
2. Assembly: Fill a 16oz serving glass with clear ice cubes (approx 150g). Pour sweet milk mixture over ice.
3. Espresso: Pull 2 shots (36ml) hot espresso and pour directly over ice layer.
4. Serve with long eco-straw. Garnish with a light pinch of cocoa powder on top.`,
    image_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  }
]

export default function RecipeBookPage() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    category: 'Coffee & Espresso',
    paragraph: '',
    image_url: ''
  })
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const printableRef = useRef(null)

  // Check PIN & Admin session on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('cc_role')
      const storedUnlocked = sessionStorage.getItem('cc_recipebook_unlocked')

      if (storedRole === 'admin') {
        setIsAdmin(true)
        setIsUnlocked(true)
      } else if (storedUnlocked === 'true') {
        setIsUnlocked(true)
      }
    }
  }, [])

  // Load recipes from API or LocalStorage fallback
  useEffect(() => {
    if (isUnlocked) {
      fetchRecipes()
    }
  }, [isUnlocked])

  const fetchRecipes = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/recipebook')
      const json = await res.json()
      if (json.success && json.data && json.data.length > 0) {
        setRecipes(json.data)
        if (typeof window !== 'undefined') {
          localStorage.setItem('cc_recipes_cache', JSON.stringify(json.data))
        }
      } else {
        // Fallback to local storage or seed data
        const localCache = localStorage.getItem('cc_recipes_cache')
        if (localCache) {
          setRecipes(JSON.parse(localCache))
        } else {
          setRecipes(SEED_RECIPES)
        }
      }
    } catch (err) {
      console.warn('Using offline/cached recipes fallback:', err)
      const localCache = localStorage.getItem('cc_recipes_cache')
      if (localCache) {
        setRecipes(JSON.parse(localCache))
      } else {
        setRecipes(SEED_RECIPES)
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePinSubmit = (e) => {
    e.preventDefault()
    if (pinInput.trim() === PIN_CODE) {
      setIsUnlocked(true)
      setPinError('')
      sessionStorage.setItem('cc_recipebook_unlocked', 'true')
    } else {
      setPinError('Incorrect PIN. Please try again.')
      setPinInput('')
    }
  }

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  const openAddModal = () => {
    setEditingItem(null)
    setFormData({
      title: '',
      category: selectedCategory !== 'All' ? selectedCategory : 'Coffee & Espresso',
      paragraph: '',
      image_url: ''
    })
    setIsModalOpen(true)
  }

  const openEditModal = (recipe) => {
    setEditingItem(recipe)
    setFormData({
      title: recipe.title || '',
      category: recipe.category || 'General',
      paragraph: recipe.paragraph || '',
      image_url: recipe.image_url || ''
    })
    setIsModalOpen(true)
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        alert('File size exceeds 4MB. Please select a smaller photo.')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, image_url: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveRecipe = async (e) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.paragraph.trim()) {
      alert('Please enter both Item Name and Recipe Paragraph.')
      return
    }

    setSaving(true)
    try {
      if (editingItem) {
        // Edit mode
        const res = await fetch('/api/recipebook', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingItem.id,
            ...formData
          })
        })
        const json = await res.json()
        if (json.success && json.data) {
          setRecipes((prev) => prev.map((item) => (item.id === editingItem.id ? json.data : item)))
        } else {
          // Local state update fallback
          const updated = { ...editingItem, ...formData, updated_at: new Date().toISOString() }
          setRecipes((prev) => prev.map((item) => (item.id === editingItem.id ? updated : item)))
        }
        showToast('Recipe updated successfully!')
      } else {
        // Add new item mode
        const res = await fetch('/api/recipebook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        const json = await res.json()
        if (json.success && json.data) {
          setRecipes((prev) => [json.data, ...prev])
        } else {
          // Local fallback
          const newItem = {
            id: 'local-' + Date.now(),
            ...formData,
            created_at: new Date().toISOString()
          }
          setRecipes((prev) => [newItem, ...prev])
        }
        showToast('New recipe added to book!')
      }

      // Sync local storage cache
      setTimeout(() => {
        localStorage.setItem('cc_recipes_cache', JSON.stringify(recipes))
      }, 500)

      setIsModalOpen(false)
    } catch (err) {
      console.error('Failed to save recipe:', err)
      showToast('Saved locally!')
      setIsModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRecipe = async (id) => {
    if (!confirm('Are you sure you want to delete this recipe item?')) return

    try {
      await fetch(`/api/recipebook?id=${id}`, { method: 'DELETE' })
      const filtered = recipes.filter((item) => item.id !== id)
      setRecipes(filtered)
      localStorage.setItem('cc_recipes_cache', JSON.stringify(filtered))
      showToast('Recipe deleted.')
    } catch (err) {
      const filtered = recipes.filter((item) => item.id !== id)
      setRecipes(filtered)
      localStorage.setItem('cc_recipes_cache', JSON.stringify(filtered))
      showToast('Recipe deleted locally.')
    }
  }

  // Generate PDF document download
  const handleDownloadPDF = async () => {
    setDownloadingPdf(true)
    try {
      const element = printableRef.current
      if (!element) return

      // Use canvas capture
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF'
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const pageHeight = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`Crown_Coffee_Recipe_Book_${new Date().toISOString().slice(0, 10)}.pdf`)
      showToast('Recipe Book PDF downloaded!')
    } catch (err) {
      console.error('PDF export error:', err)
      // Fallback to browser print
      window.print()
    } finally {
      setDownloadingPdf(false)
    }
  }

  // Filtered List
  const filteredRecipes = recipes.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.paragraph.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // ----------------------------------------------------
  // PIN LOCKED GATE SCREEN
  // ----------------------------------------------------
  if (!isUnlocked) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1C1410 0%, #3B1E16 50%, #6B3A2A 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{
          background: 'rgba(28, 20, 16, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(201, 148, 58, 0.3)',
          borderRadius: '24px',
          padding: '40px 32px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #C9943A 0%, #E5B869 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 20px rgba(201, 148, 58, 0.4)'
          }}>
            <Lock size={32} color="#1C1410" />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            Crown Coffee Recipe Book
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '28px' }}>
            Enter your 6-digit access PIN to view, edit, and download official cafe recipes.
          </p>

          <form onSubmit={handlePinSubmit}>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <KeyRound size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#C9943A' }} />
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter 6-Digit PIN"
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 48px',
                  background: 'rgba(255,255,255,0.08)',
                  border: pinError ? '1px solid #EF4444' : '1px solid rgba(201, 148, 58, 0.4)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '18px',
                  letterSpacing: '0.2em',
                  textAlign: 'center',
                  outline: 'none'
                }}
                autoFocus
              />
            </div>

            {pinError && (
              <div style={{ color: '#F87171', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <AlertCircle size={15} /> {pinError}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #C9943A 0%, #A87624 100%)',
                color: '#1C1410',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Unlock size={18} /> Unlock Recipe Book
            </button>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            Admin URL: <span style={{ color: '#C9943A' }}>ccadmin.online/recipebook</span>
          </div>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------
  // UNLOCKED RECIPE BOOK MAIN DASHBOARD
  // ----------------------------------------------------
  return (
    <div style={{
      minHeight: '100vh',
      background: '#F9F6F0',
      color: '#1C1410',
      fontFamily: "'Inter', system-ui, sans-serif"
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#1C1410',
          color: '#C9943A',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 2000,
          fontWeight: '600',
          fontSize: '14px'
        }}>
          <CheckCircle2 size={18} /> {toastMessage}
        </div>
      )}

      {/* TOP NAVBAR */}
      <header style={{
        background: '#6B3A2A',
        color: 'white',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 500,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Link href="/admin/dashboard" style={{ textDecoration: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                background: '#C9943A',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '20px',
                color: '#1C1410'
              }}>
                <BookOpen size={22} />
              </div>
            </Link>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Crown Coffee Recipe Book
                <span style={{ fontSize: '10px', background: 'rgba(201,148,58,0.25)', color: '#FFD700', padding: '2px 8px', borderRadius: '20px', border: '1px solid rgba(201,148,58,0.4)', textTransform: 'uppercase' }}>
                  Online Access
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                ccadmin.online/recipebook
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={openAddModal}
              style={{
                background: '#C9943A',
                color: '#1C1410',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(201, 148, 58, 0.3)'
              }}
            >
              <Plus size={18} /> Add New Recipe
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPdf}
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.25)',
                padding: '10px 18px',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Download size={18} /> {downloadingPdf ? 'Generating PDF...' : 'Download Recipe Book'}
            </button>
          </div>
        </div>
      </header>

      {/* SUB-HEADER / FILTERS */}
      <section style={{
        background: 'white',
        borderBottom: '1px solid #E5E0D8',
        padding: '16px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
              <input
                type="text"
                placeholder="Search recipe by item name or ingredient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 42px',
                  borderRadius: '10px',
                  border: '1px solid #DDD',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#FAF8F5'
                }}
              />
            </div>

            <div style={{ fontSize: '13px', color: '#666', fontWeight: '600' }}>
              Showing {filteredRecipes.length} Recipe{filteredRecipes.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {DEFAULT_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: active ? '700' : '500',
                    background: active ? '#6B3A2A' : '#F0ECE3',
                    color: active ? '#FFF' : '#4A4A4A',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {cat}
                </button>
              )
            })}
          </div>

        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      <main style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 24px' }}>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#777' }}>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>Loading Recipe Book...</div>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '48px',
            textAlign: 'center',
            border: '1px dashed #DDD'
          }}>
            <FileText size={48} color="#CCC" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#444' }}>No recipes found</h3>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>
              {searchTerm ? `No matches for "${searchTerm}"` : 'Your recipe book is empty.'}
            </p>
            <button
              onClick={openAddModal}
              style={{
                background: '#6B3A2A',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '10px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Add First Recipe
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '24px'
          }}>
            {filteredRecipes.map((recipe) => (
              <div
                key={recipe.id}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  border: '1px solid #EBE7DF',
                  overflow: 'hidden',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, boxShadow 0.2s ease'
                }}
              >
                {/* Photo Display (Optional) */}
                {recipe.image_url ? (
                  <div style={{ height: '200px', width: '100%', overflow: 'hidden', position: 'relative', background: '#F0ECE3' }}>
                    <img
                      src={recipe.image_url}
                      alt={recipe.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(28, 20, 16, 0.75)',
                      backdropFilter: 'blur(8px)',
                      color: '#FFD700',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Tag size={12} /> {recipe.category || 'General'}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '16px 20px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{
                      background: 'rgba(107, 58, 42, 0.08)',
                      color: '#6B3A2A',
                      fontSize: '12px',
                      fontWeight: '700',
                      padding: '4px 12px',
                      borderRadius: '12px'
                    }}>
                      {recipe.category || 'General'}
                    </span>
                  </div>
                )}

                {/* Card Body */}
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '800',
                    color: '#1C1410',
                    marginBottom: '12px',
                    lineHeight: '1.3'
                  }}>
                    {recipe.title}
                  </h3>

                  {/* Paragraph Box */}
                  <div style={{
                    background: '#FAF8F5',
                    border: '1px solid #EBE6DC',
                    borderRadius: '12px',
                    padding: '14px',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    color: '#333',
                    whiteSpace: 'pre-wrap',
                    flex: 1,
                    marginBottom: '16px',
                    fontFamily: "'Inter', sans-serif"
                  }}>
                    {recipe.paragraph}
                  </div>

                  {/* Card Footer Actions */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    borderTop: '1px solid #F0ECE3',
                    paddingTop: '14px'
                  }}>
                    <button
                      onClick={() => openEditModal(recipe)}
                      style={{
                        background: '#FAF8F5',
                        color: '#6B3A2A',
                        border: '1px solid #DDD',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <Edit2 size={14} /> Edit
                    </button>

                    <button
                      onClick={() => handleDeleteRecipe(recipe.id)}
                      style={{
                        background: '#FEF2F2',
                        color: '#DC2626',
                        border: '1px solid #FCA5A5',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* ---------------------------------------------------- */}
      {/* HIDDEN PRINTABLE CONTAINER FOR PDF GENERATION */}
      {/* ---------------------------------------------------- */}
      <div style={{ display: 'none' }}>
        <div ref={printableRef} style={{ width: '800px', padding: '40px', background: '#FFFFFF', color: '#1C1410', fontFamily: 'Arial, sans-serif' }}>
          
          <div style={{ borderBottom: '3px solid #6B3A2A', paddingBottom: '20px', marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#6B3A2A', margin: 0 }}>CROWN COFFEE</h1>
              <h2 style={{ fontSize: '18px', color: '#C9943A', margin: '4px 0 0 0' }}>OFFICIAL RECIPE BOOK</h2>
            </div>
            <div style={{ textAlign: 'right', fontSize: '12px', color: '#666' }}>
              <div>Generated: {new Date().toLocaleDateString()}</div>
              <div>ccadmin.online/recipebook</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {recipes.map((item, idx) => (
              <div key={item.id || idx} style={{ border: '1px solid #E0E0E0', borderRadius: '8px', padding: '20px', pageBreakInside: 'avoid' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', background: '#6B3A2A', color: 'white', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                      {item.category || 'General'}
                    </span>
                    <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1C1410', margin: '8px 0 4px 0' }}>
                      {idx + 1}. {item.title}
                    </h3>
                  </div>
                </div>

                {item.image_url && (
                  <div style={{ marginBottom: '12px', maxHeight: '180px', overflow: 'hidden', borderRadius: '6px' }}>
                    <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                  </div>
                )}

                <div style={{ background: '#F9F9F9', borderLeft: '4px solid #C9943A', padding: '12px 16px', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {item.paragraph}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* ADD / EDIT RECIPE MODAL */}
      {/* ---------------------------------------------------- */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            position: 'relative'
          }}>
            <button
              onClick={() => setIsModalOpen(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: '#F0ECE3',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '4px', color: '#6B3A2A' }}>
              {editingItem ? 'Edit Recipe Item' : 'Add New Recipe Item'}
            </h2>
            <p style={{ fontSize: '13px', color: '#777', marginBottom: '20px' }}>
              Enter recipe title, select category, add multi-paragraph details, and optionally attach a photo.
            </p>

            <form onSubmit={handleSaveRecipe}>
              
              {/* Item Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#333' }}>
                  Item Name <span style={{ color: '#E11D48' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spanish Latte, Chocolate Croissant, etc."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CCC',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Category */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#333' }}>
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CCC',
                    fontSize: '14px',
                    outline: 'none',
                    background: 'white'
                  }}
                >
                  {DEFAULT_CATEGORIES.filter(c => c !== 'All').map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="General">General</option>
                </select>
              </div>

              {/* Recipe Paragraph / Box */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#333' }}>
                  Recipe Paragraph / Instructions / Ratios <span style={{ color: '#E11D48' }}>*</span>
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Write recipe paragraphs here... Include ingredients, extraction times, milk temperatures, step-by-step instructions, secret ratios, etc."
                  value={formData.paragraph}
                  onChange={(e) => setFormData({ ...formData, paragraph: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #CCC',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: "'Inter', sans-serif"
                  }}
                />
              </div>

              {/* Optional Photo */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#333' }}>
                  Recipe Photo (Optional)
                </label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ fontSize: '13px' }}
                  />
                  <span style={{ fontSize: '12px', color: '#888' }}>or paste image URL:</span>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #DDD',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                {formData.image_url && (
                  <div style={{ marginTop: '12px', position: 'relative', width: '120px', height: '90px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #DDD' }}>
                    <img src={formData.image_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image_url: '' })}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid #CCC',
                    background: '#FAF8F5',
                    color: '#555',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#6B3A2A',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  {saving ? 'Saving...' : editingItem ? 'Update Recipe' : 'Add Recipe'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Print-specific CSS */}
      <style jsx global>{`
        @media print {
          header, section, button, .no-print {
            display: none !important;
          }
          main {
            display: none !important;
          }
          .printable-area {
            display: block !important;
          }
        }
      `}</style>

    </div>
  )
}

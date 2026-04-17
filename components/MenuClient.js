'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import {
  Plus, Trash2, BookOpen, Layers,
  ChevronDown, ChevronUp, ShoppingBag,
  Info, X, Search
} from 'lucide-react'

export default function MenuClient({ initialMenuItems, initialIngredients }) {
  const { addToast } = useToast()
  const [menuItems, setMenuItems] = useState(initialMenuItems)
  const [ingredients, setIngredients] = useState(initialIngredients)
  const [expanded, setExpanded] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showAddIngredient, setShowAddIngredient] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState({})

  const [newMenu, setNewMenu] = useState({ name: '', category: 'Coffee', selling_price: '' })
  const [newIngredient, setNewIngredient] = useState({ name: '', unit: 'gm', min_stock: '', cost_per_unit: '', price_basis: '1', opening_stock: '' })
  const [recipeForm, setRecipeForm] = useState({ ingredient_id: '', quantity: '', unit: 'gm' })

  async function refreshData() {
    const [menuRes, ingRes] = await Promise.all([
      supabase.from('menu_items').select(`*, recipes(*, ingredients(*))`).order('category'),
      supabase.from('ingredients').select('*').order('name'),
    ])
    setMenuItems(menuRes.data || [])
    setIngredients(ingRes.data || [])
  }

  async function addMenuItem() {
    if (!newMenu.name || !newMenu.selling_price) return addToast('Please enter both name and price', 'error')
    const { error } = await supabase.from('menu_items').insert([{
      ...newMenu,
      selling_price: parseFloat(newMenu.selling_price) || 0
    }])
    if (error) { addToast(error.message || 'Something went wrong', 'error'); return }
    setNewMenu({ name: '', category: 'Coffee', selling_price: '' })
    setShowAddMenu(false)
    addToast('Item added to menu', 'success')
    refreshData()
  }

  async function addIngredient() {
    if (!newIngredient.name || !newIngredient.unit || !newIngredient.cost_per_unit) return addToast('Please fill all fields', 'error')
    const basis = parseFloat(newIngredient.price_basis) || 1
    const totalCost = parseFloat(newIngredient.cost_per_unit) || 0
    const costPerSingle = totalCost / basis
    const openingStock = parseFloat(newIngredient.opening_stock) || 0
    const { data: ingData, error } = await supabase.from('ingredients').insert([{
      name: newIngredient.name,
      unit: newIngredient.unit,
      min_stock: parseFloat(newIngredient.min_stock) || 0,
      cost_per_unit: costPerSingle,
      current_stock: openingStock
    }]).select()
    if (error) { addToast(error.message || 'Something went wrong', 'error'); return }
    if (openingStock > 0 && ingData?.[0]) {
      await supabase.from('stock_movements').insert([{
        ingredient_id: ingData[0].id,
        movement_type: 'manual_adjust',
        quantity: openingStock,
        notes: 'Initial opening stock setup'
      }])
    }
    setNewIngredient({ name: '', unit: 'gm', min_stock: '', cost_per_unit: '', price_basis: '1', opening_stock: '' })
    setShowAddIngredient(false)
    addToast('Ingredient created', 'success')
    refreshData()
  }

  async function deleteMenuItem(id) {
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) { addToast(error.message || 'Something went wrong', 'error'); return }
    addToast('Item removed from menu', 'success')
    refreshData()
  }

  async function addRecipe(menuItemId) {
    if (!recipeForm.ingredient_id || !recipeForm.quantity) return addToast('Fill all fields', 'error')
    const { error } = await supabase.from('recipes').insert([{
      menu_item_id: menuItemId,
      ingredient_id: recipeForm.ingredient_id,
      quantity: parseFloat(recipeForm.quantity),
      unit: recipeForm.unit
    }])
    if (error) { addToast(error.message || 'Something went wrong', 'error'); return }
    setRecipeForm({ ingredient_id: '', quantity: '', unit: 'gm' })
    addToast('Ingredient added to recipe', 'success')
    refreshData()
  }

  async function deleteRecipe(id) {
    const { error } = await supabase.from('recipes').delete().eq('id', id)
    if (error) { addToast(error.message || 'Something went wrong', 'error'); return }
    refreshData()
  }

  const categories = ['Coffee', 'Tea', 'Pastry', 'Sandwich', 'Other']

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: '24px', alignItems: 'start' }}
        className="menu-grid">

        {/* Menu List */}
        <div className="card animate-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Active Menu
              </h3>
              <div style={{ position: 'relative', width: '200px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search menu..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px 6px 30px', fontSize: '13px', borderRadius: '20px', border: '1px solid var(--border-medium)', background: 'var(--bg-surface)', outline: 'none' }}
                />
              </div>
            </div>
            <button className="btn-primary" onClick={() => setShowAddMenu(true)} style={{ padding: '8px 16px', fontSize: '11px' }}>
              <Plus size={13} /> Add Item
            </button>
          </div>

          <div>
            {categories.map(cat => {
              const items = menuItems.filter(i => 
                i.category === cat && 
                (!searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase()))
              )
              if (items.length === 0) return null
              return (
                <div key={cat} style={{ marginBottom: '28px' }}>
                  <div className="divider-label">{cat}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {items.map(item => (
                      <div key={item.id} style={{
                        border: `1px solid ${expanded === item.id ? 'var(--border-medium)' : 'var(--border-light)'}`,
                        borderRadius: '10px',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                        boxShadow: expanded === item.id ? 'var(--shadow-md)' : 'none',
                      }}>
                        <div
                          style={{
                            padding: '14px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            background: expanded === item.id ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                            transition: 'background 0.15s ease',
                          }}
                          onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                        >
                          <div>
                            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {item.name}
                            </p>
                            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                              {item.recipes?.length || 0} ingredients in recipe
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 600, color: 'var(--primary)' }}>
                              ৳{item.selling_price}
                            </p>
                            <div style={{ color: 'var(--text-muted)' }}>
                              {expanded === item.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>
                        </div>

                        {expanded === item.id && (
                          <div style={{
                            background: 'var(--bg-subtle)',
                            padding: '16px',
                            borderTop: '1px solid var(--border-light)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                Recipe Breakdown
                              </p>
                              <button
                                onClick={() => {
                                  setModalConfig({
                                    title: 'Delete Menu Item',
                                    message: `Are you sure you want to remove ${item.name} from the menu? This cannot be undone.`,
                                    onConfirm: () => deleteMenuItem(item.id),
                                    confirmLabel: 'Delete Item',
                                  })
                                  setModalOpen(true)
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px' }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                              {item.recipes?.map(r => (
                                <div key={r.id} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 12px',
                                  background: 'var(--bg-surface)',
                                  borderRadius: '8px',
                                  border: '1px solid var(--border-light)',
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--warning)', flexShrink: 0 }} />
                                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                      {r.ingredients?.name}
                                    </p>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-muted)' }}>
                                      {r.quantity} <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>{r.unit || r.ingredients?.unit}</span>
                                    </p>
                                    <button onClick={() => deleteRecipe(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border-medium)' }}>
                                      <X size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {(!item.recipes || item.recipes.length === 0) && (
                                <div style={{ textAlign: 'center', padding: '20px', border: '1px dashed var(--border-medium)', borderRadius: '8px' }}>
                                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--text-muted)' }}>No recipe items added yet</p>
                                </div>
                              )}
                            </div>

                            <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>
                                Add ingredient to recipe
                              </p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                <select
                                  className="input"
                                  style={{ flex: '1 1 160px', fontSize: '13px' }}
                                  value={recipeForm.ingredient_id}
                                  onChange={e => setRecipeForm({ ...recipeForm, ingredient_id: e.target.value })}
                                >
                                  <option value="">Select ingredient...</option>
                                  {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                                </select>
                                <input
                                  className="input"
                                  style={{ width: '80px', flex: '0 0 80px', fontSize: '13px' }}
                                  type="number"
                                  placeholder="Qty"
                                  value={recipeForm.quantity}
                                  onChange={e => setRecipeForm({ ...recipeForm, quantity: e.target.value })}
                                />
                                <select
                                  className="input"
                                  style={{ width: '80px', flex: '0 0 80px', fontSize: '12px' }}
                                  value={recipeForm.unit}
                                  onChange={e => setRecipeForm({ ...recipeForm, unit: e.target.value })}
                                >
                                  <option value="gm">gm</option>
                                  <option value="kg">kg</option>
                                  <option value="ml">ml</option>
                                  <option value="ltr">ltr</option>
                                  <option value="pcs">pcs</option>
                                </select>
                                <button className="btn-primary" onClick={() => addRecipe(item.id)} style={{ padding: '10px 16px', fontSize: '11px' }}>
                                  Add
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {menuItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                <BookOpen size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} strokeWidth={1} />
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px' }}>No menu items yet. Add your first item above.</p>
              </div>
            )}
          </div>
        </div>

        {/* Ingredients Sidebar */}
        <div style={{ position: 'sticky', top: '80px' }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Raw Materials
              </h3>
              <button
                onClick={() => setShowAddIngredient(true)}
                style={{ background: 'none', border: '1px solid var(--border-medium)', borderRadius: '6px', cursor: 'pointer', padding: '6px', color: 'var(--primary)', display: 'flex', alignItems: 'center' }}
              >
                <Plus size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '450px', overflowY: 'auto' }} className="no-scrollbar">
              {ingredients.map(ing => (
                <div key={ing.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'var(--bg-subtle)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  transition: 'border-color 0.15s ease',
                }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>{ing.name}</p>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {ing.unit} &bull; min {ing.min_stock}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>৳{ing.cost_per_unit || 0}</p>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>per {ing.unit}</p>
                  </div>
                </div>
              ))}
              {ingredients.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px' }}>No ingredients yet.</p>
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px', padding: '14px', background: 'var(--bg-subtle)', borderRadius: '8px', borderLeft: '3px solid var(--warning)' }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Create your ingredients first, then assign them to menu items to build recipes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={showAddMenu}
        onClose={() => setShowAddMenu(false)}
        title="New Menu Item"
        confirmLabel="Add Item"
        onConfirm={addMenuItem}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
          <div>
            <label className="label">Item Name</label>
            <input className="input" placeholder="e.g. Iced Latte" value={newMenu.name} onChange={e => setNewMenu({ ...newMenu, name: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="label">Category</label>
              <select className="input" value={newMenu.category} onChange={e => setNewMenu({ ...newMenu, category: e.target.value })}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Selling Price (৳)</label>
              <input className="input" type="number" placeholder="280" value={newMenu.selling_price} onChange={e => setNewMenu({ ...newMenu, selling_price: e.target.value })} />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAddIngredient}
        onClose={() => setShowAddIngredient(false)}
        title="New Ingredient"
        confirmLabel="Create Ingredient"
        onConfirm={addIngredient}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
          <div>
            <label className="label">Ingredient Name</label>
            <input className="input" placeholder="e.g. Whole Milk" value={newIngredient.name} onChange={e => setNewIngredient({ ...newIngredient, name: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="label">Unit</label>
              <select className="input" value={newIngredient.unit} onChange={e => setNewIngredient({ ...newIngredient, unit: e.target.value })}>
                <option value="gm">gm (Grams)</option>
                <option value="kg">kg (Kilograms)</option>
                <option value="ml">ml (Milliliters)</option>
                <option value="ltr">ltr (Liters)</option>
                <option value="pcs">pcs (Pieces)</option>
                <option value="pkt">pkt (Packet)</option>
                <option value="box">box (Box)</option>
                <option value="cup">cup</option>
                <option value="tsp">tsp</option>
                <option value="tbsp">tbsp</option>
                <option value="can">can</option>
                <option value="btl">btl (Bottle)</option>
              </select>
            </div>
            <div>
              <label className="label" style={{ color: 'var(--warning)' }}>Initial Stock on Hand</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type="number"
                  placeholder="0"
                  value={newIngredient.opening_stock}
                  onChange={e => setNewIngredient({ ...newIngredient, opening_stock: e.target.value })}
                  style={{ paddingRight: '40px' }}
                />
                <span style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase'
                }}>{newIngredient.unit}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="label">Minimum Stock Level</label>
            <input className="input" type="number" placeholder="e.g. 100" value={newIngredient.min_stock} onChange={e => setNewIngredient({ ...newIngredient, min_stock: e.target.value })} />
          </div>

          <div style={{ background: 'var(--success-bg)', border: '1px solid rgba(58,125,92,0.15)', borderRadius: '8px', padding: '14px' }}>
            <label className="label" style={{ color: 'var(--success)' }}>Price Calculation</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--text-secondary)' }}>Price for</span>
              <input
                className="input"
                type="number"
                value={newIngredient.price_basis}
                onChange={e => setNewIngredient({ ...newIngredient, price_basis: e.target.value })}
                style={{ width: '70px' }}
              />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--text-secondary)' }}>{newIngredient.unit} is ৳</span>
              <input
                className="input"
                type="number"
                placeholder="Cost"
                value={newIngredient.cost_per_unit}
                onChange={e => setNewIngredient({ ...newIngredient, cost_per_unit: e.target.value })}
                style={{ flex: 1, minWidth: '80px' }}
              />
            </div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Example: "Price for 1000 gm is 3100" equals ৳3.10 per gm.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        {...modalConfig}
      />

      <style>{`
        @media (max-width: 768px) {
          .menu-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

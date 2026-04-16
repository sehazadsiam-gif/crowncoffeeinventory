'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import { 
  Plus, Trash2, BookOpen, Layers, 
  ChevronDown, ChevronUp, ShoppingBag, Coffee,
  Info, X, Search, Filter, AlertCircle
} from 'lucide-react'

export default function MenuClient({ initialMenuItems, initialIngredients }) {
  const { addToast } = useToast()
  const [menuItems, setMenuItems] = useState(initialMenuItems)
  const [ingredients, setIngredients] = useState(initialIngredients)
  const [expanded, setExpanded] = useState(null)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showAddIngredient, setShowAddIngredient] = useState(false)
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState({})

  // New menu item form
  const [newMenu, setNewMenu] = useState({ name: '', category: 'Coffee', selling_price: '' })
  const [newIngredient, setNewIngredient] = useState({ name: '', unit: 'gm', min_stock: '', cost_per_unit: '' })

  // Recipe management
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
    if (!newMenu.name || !newMenu.selling_price) {
      return addToast('Please enter both name and price', 'error')
    }
    const { data, error } = await supabase.from('menu_items').insert([{
      ...newMenu,
      selling_price: parseFloat(newMenu.selling_price) || 0
    }]).select()
    
    if (error) {
      console.error("Supabase error:", error)
      addToast(error.message || "Something went wrong", "error")
      return
    }
    
    setNewMenu({ name: '', category: 'Coffee', selling_price: '' })
    setShowAddMenu(false)
    addToast('Item added to menu', 'success')
    refreshData()
  }

  async function addIngredient() {
    if (!newIngredient.name) return addToast('Please enter ingredient name', 'error')
    const { error } = await supabase.from('ingredients').insert([{ 
      ...newIngredient, 
      min_stock: parseFloat(newIngredient.min_stock) || 0,
      cost_per_unit: parseFloat(newIngredient.cost_per_unit) || 0,
      current_stock: 0 
    }])
    
    if (error) {
      console.error("Supabase error:", error)
      addToast(error.message || "Something went wrong", "error")
      return
    }
    
    setNewIngredient({ name: '', unit: 'gm', min_stock: '', cost_per_unit: '' })
    setShowAddIngredient(false)
    addToast('Ingredient created', 'success')
    refreshData()
  }

  async function deleteMenuItem(id) {
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) {
      console.error("Supabase error:", error)
      addToast(error.message || "Something went wrong", "error")
      return
    }
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
    
    if (error) {
      console.error("Supabase error:", error)
      addToast(error.message || "Something went wrong", "error")
      return
    }
    
    setRecipeForm({ ingredient_id: '', quantity: '', unit: 'gm' })
    addToast('Ingredient added to recipe', 'success')
    refreshData()
  }

  async function deleteRecipe(id) {
    const { error } = await supabase.from('recipes').delete().eq('id', id)
    if (error) {
      console.error("Supabase error:", error)
      addToast(error.message || "Something went wrong", "error")
      return
    }
    refreshData()
  }

  const categories = ['Coffee', 'Tea', 'Pastry', 'Sandwich', 'Other']

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start fade-in">
      
      {/* Menu List - Left/Top */}
      <div className="lg:col-span-8 space-y-6">
        <div className="card-premium">
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
            <h3 className="font-bold text-[var(--cafe-brown)] uppercase text-xs tracking-widest flex items-center gap-2">
              <BookOpen size={14} className="text-[var(--cafe-gold)]" /> Active Menu
            </h3>
            <button
              onClick={() => setShowAddMenu(true)}
              className="btn-primary py-2 px-4 text-[10px] uppercase tracking-[0.2em]"
            >
              <Plus size={14} /> Add New Item
            </button>
          </div>

          <div className="space-y-4">
            {categories.map(cat => {
              const items = menuItems.filter(i => i.category === cat)
              if (items.length === 0) return null
              return (
                <div key={cat} className="mb-8">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] mb-4 flex items-center gap-2">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    {cat}
                    <div className="h-px bg-gray-200 flex-1"></div>
                  </h4>
                  <div className="grid gap-3">
                    {items.map(item => (
                      <div key={item.id} className={`card p-0 overflow-hidden transition-all duration-300 ${expanded === item.id ? 'ring-2 ring-[var(--cafe-gold)] shadow-xl' : 'hover:border-[var(--cafe-gold-light)]'}`}>
                        <div 
                          className="p-5 flex items-center justify-between cursor-pointer group"
                          onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${expanded === item.id ? 'bg-[var(--cafe-brown)] text-white' : 'bg-gray-50 text-[var(--cafe-brown)] group-hover:bg-amber-50'}`}>
                              <Coffee size={20} className={expanded === item.id ? 'animate-pulse' : ''} />
                            </div>
                            <div>
                              <p className="font-bold text-[var(--cafe-brown)] text-lg leading-tight">{item.name}</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{item.recipes?.length || 0} Ingredients</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <p className="text-xl font-black text-emerald-600 tracking-tighter">৳{item.selling_price}</p>
                            <div className="text-gray-300 group-hover:text-[var(--cafe-gold)] transition-colors">
                              {expanded === item.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </div>
                          </div>
                        </div>

                        {expanded === item.id && (
                          <div className="bg-[var(--cafe-cream)] p-6 border-t border-[var(--cafe-cream-dark)] fade-in">
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--cafe-brown)] opacity-70 flex items-center gap-2">
                                <Layers size={12} /> Recipe Breakdown
                              </h5>
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
                                className="text-rose-400 hover:text-rose-600 p-1 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            <div className="space-y-2 mb-6">
                              {item.recipes?.map(r => (
                                <div key={r.id} className="flex items-center justify-between bg-white/60 p-3 rounded-xl border border-white">
                                  <div className="flex items-center gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--cafe-gold)]"></span>
                                    <p className="text-sm font-bold text-[var(--cafe-brown)]">{r.ingredients?.name}</p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <p className="text-sm font-black text-gray-500">{r.quantity} <span className="text-[10px] uppercase font-black text-[var(--cafe-gold)]">{r.unit || r.ingredients?.unit}</span></p>
                                    <button onClick={() => deleteRecipe(r.id)} className="text-gray-300 hover:text-rose-500 transition-colors">
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {(!item.recipes || item.recipes.length === 0) && (
                                <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-2xl">
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No recipe items added</p>
                                </div>
                              )}
                            </div>

                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mt-4">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Add ingredient to recipe</p>
                              <div className="flex flex-col md:flex-row gap-3">
                                <select 
                                  className="input text-xs flex-1"
                                  value={recipeForm.ingredient_id}
                                  onChange={e => setRecipeForm({ ...recipeForm, ingredient_id: e.target.value })}
                                >
                                  <option value="">Select ingredient...</option>
                                  {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                                </select>
                                <div className="flex gap-2">
                                  <input 
                                    className="input text-xs w-20" 
                                    type="number" 
                                    placeholder="Qty" 
                                    value={recipeForm.quantity}
                                    onChange={e => setRecipeForm({ ...recipeForm, quantity: e.target.value })}
                                  />
                                  <select 
                                    className="input text-[10px] w-20 px-1 font-bold"
                                    value={recipeForm.unit}
                                    onChange={e => setRecipeForm({ ...recipeForm, unit: e.target.value })}
                                  >
                                    <option value="gm">gm</option>
                                    <option value="kg">kg</option>
                                    <option value="ml">ml</option>
                                    <option value="ltr">ltr</option>
                                    <option value="pcs">pcs</option>
                                  </select>
                                  <button onClick={() => addRecipe(item.id)} className="btn-primary py-2 px-6 text-[10px] uppercase tracking-widest">Add</button>
                                </div>
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
          </div>
        </div>
      </div>

      {/* Ingredients Sidebar - Right/Bottom */}
      <div className="lg:col-span-4 space-y-6">
        <div className="card h-fit sticky top-8">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
             <h3 className="font-bold text-[var(--cafe-brown)] uppercase text-xs tracking-widest flex items-center gap-2">
              <ShoppingBag size={14} className="text-[var(--cafe-gold)]" /> Raw Materials
            </h3>
            <button onClick={() => setShowAddIngredient(true)} className="p-1 hover:bg-gray-100 rounded-lg text-[var(--cafe-gold)] transition-colors">
              <Plus size={20} />
            </button>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
            {ingredients.map(ing => (
              <div key={ing.id} className="flex items-center justify-between p-3 bg-[var(--cafe-cream)] rounded-xl border border-[var(--cafe-cream-dark)] group hover:border-[var(--cafe-gold-light)] transition-all">
                <div>
                  <p className="text-sm font-bold text-[var(--cafe-brown)]">{ing.name}</p>
                  <p className="text-[10px] uppercase font-bold text-gray-400">{ing.unit} • min {ing.min_stock}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-[var(--cafe-brown)]">৳{ing.cost_per_unit || 0}</p>
                  <p className="text-[9px] uppercase font-bold text-gray-400 tracking-tighter">per {ing.unit}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 bg-amber-50/50 p-6 rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="bg-[var(--cafe-brown)] p-2 rounded-lg text-white">
                <Info size={16} />
              </div>
              <p className="text-[11px] leading-relaxed text-[var(--cafe-brown)] opacity-80 italic">
                <strong>Tip:</strong> Create your generic ingredients here first, then add them to your menu items!
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
        <div className="space-y-4 py-4">
          <div>
            <label className="label">Item Name</label>
            <input className="input" placeholder="e.g. Iced Latte" value={newMenu.name} onChange={e => setNewMenu({ ...newMenu, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
        <div className="space-y-4 py-4">
          <div>
            <label className="label">Ingredient Name</label>
            <input className="input" placeholder="e.g. Whole Milk" value={newIngredient.name} onChange={e => setNewIngredient({ ...newIngredient, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Unit</label>
              <select className="input text-sm" value={newIngredient.unit} onChange={e => setNewIngredient({ ...newIngredient, unit: e.target.value })}>
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
              <label className="label">Min Alert level</label>
              <input className="input" type="number" placeholder="1000" value={newIngredient.min_stock} onChange={e => setNewIngredient({ ...newIngredient, min_stock: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Cost per unit (৳)</label>
            <input className="input" type="number" placeholder="0.25" value={newIngredient.cost_per_unit} onChange={e => setNewIngredient({ ...newIngredient, cost_per_unit: e.target.value })} />
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        {...modalConfig}
      />
    </div>
  )
}

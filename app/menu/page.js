'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { 
  Plus, Trash2, ChevronDown, ChevronUp, Edit2, 
  BookOpen, Info, Package, DollarSign, List, 
  PlusCircle, X
} from 'lucide-react'

export default function MenuPage() {
  const { addToast } = useToast()
  const [menuItems, setMenuItems] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showAddIngredient, setShowAddIngredient] = useState(false)
  const [loading, setLoading] = useState(true)

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState({})

  // New menu item form
  const [newMenu, setNewMenu] = useState({ name: '', category: 'Coffee', selling_price: '' })
  const [newIngredient, setNewIngredient] = useState({ name: '', unit: 'gm', min_stock: '', cost_per_unit: '' })

  // Recipe management
  const [recipeForm, setRecipeForm] = useState({ ingredient_id: '', quantity: '' })
  const [editingRecipeFor, setEditingRecipeFor] = useState(null)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    try {
      const [menuRes, ingRes] = await Promise.all([
        supabase.from('menu_items').select(`*, recipes(*, ingredients(*))`).order('category'),
        supabase.from('ingredients').select('*').order('name'),
      ])
      setMenuItems(menuRes.data || [])
      setIngredients(ingRes.data || [])
    } catch (error) {
      addToast('Failed to load menu data', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function addMenuItem() {
    if (!newMenu.name || !newMenu.selling_price) {
      return addToast('Please enter both name and price', 'error')
    }
    const { data, error } = await supabase.from('menu_items').insert([newMenu]).select()
    if (error) {
      console.error("Supabase error:", error)
      addToast(error.message || "Something went wrong", "error")
      return
    }
    
    setNewMenu({ name: '', category: 'Coffee', selling_price: '' })
    setShowAddMenu(false)
    await fetchAll()
    if (data && data[0]) {
      setExpanded(data[0].id)
      addToast('Menu item added. Now add its ingredients below.', 'success')
    }
  }

  async function addIngredient() {
    if (!newIngredient.name) return addToast('Please enter ingredient name', 'error')
    const { error } = await supabase.from('ingredients').insert([{ ...newIngredient, current_stock: 0 }])
    if (error) {
      console.error("Supabase error:", error)
      addToast(error.message || "Something went wrong", "error")
      return
    }
    
    setNewIngredient({ name: '', unit: 'gm', min_stock: '', cost_per_unit: '' })
    setShowAddIngredient(false)
    addToast(`${newIngredient.name} added to ingredients`, 'success')
    fetchAll()
  }

  function confirmDeleteMenuItem(item) {
    setModalConfig({
      title: 'Delete Menu Item',
      message: `Are you sure you want to remove "${item.name}"? This action cannot be undone.`,
      onConfirm: () => deleteMenuItem(item.id),
      confirmLabel: 'Delete Item',
    })
    setModalOpen(true)
  }

  async function deleteMenuItem(id) {
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) {
      console.error("Supabase error:", error)
      addToast(error.message || "Something went wrong", "error")
      return
    }
    addToast('Item removed from menu', 'success')
    fetchAll()
  }

  async function addRecipe(menuItemId) {
    if (!recipeForm.ingredient_id || !recipeForm.quantity) {
      return addToast('Select an ingredient and enter amount', 'error')
    }
    const { error } = await supabase.from('recipes').insert([{
      menu_item_id: menuItemId,
      ingredient_id: recipeForm.ingredient_id,
      quantity: parseFloat(recipeForm.quantity),
    }])
    if (error) {
      console.error("Supabase error:", error)
      addToast(error.message || "Something went wrong", "error")
      return
    }
    
    setRecipeForm({ ingredient_id: '', quantity: '' })
    addToast('Ingredient added to recipe', 'success')
    fetchAll()
  }

  async function deleteRecipe(id) {
    const { error } = await supabase.from('recipes').delete().eq('id', id)
    if (error) {
      console.error("Supabase error:", error)
      addToast(error.message || "Something went wrong", "error")
      return
    }
    fetchAll()
  }

  const categories = ['Coffee', 'Tea', 'Juice', 'Food', 'Snack', 'Beverage', 'Other']
  const units = ['gm', 'ml', 'pcs', 'kg', 'liter', 'tbsp', 'tsp']

  return (
    <div className="min-h-screen bg-[var(--cafe-cream)] no-scrollbar">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        
        {/* Instruction Box */}
        <section className="instruction-box fade-in">
          <div className="flex items-start gap-4">
            <div className="bg-white/20 p-3 rounded-2xl shrink-0">
              <BookOpen size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">Menu and Recipes</h2>
              <p className="text-white/80 text-sm max-w-2xl leading-relaxed">
                First, add your raw ingredients such as milk, sugar, and beans. 
                Then add menu items and set their recipe to automate stock deduction.
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start fade-in">
          
          {/* Left: Ingredients Sidebar */}
          <div className="space-y-6">
            <div className="card-premium">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-[var(--cafe-brown)] uppercase tracking-tight flex items-center gap-2">
                  <Package size={18} className="text-[var(--cafe-gold)]" /> Raw Ingredients
                </h3>
                <button 
                  onClick={() => setShowAddIngredient(!showAddIngredient)} 
                  className={showAddIngredient ? 'text-rose-500 hover:scale-110' : 'text-emerald-500 hover:scale-110'}
                >
                  {showAddIngredient ? <X size={20} /> : <PlusCircle size={20} />}
                </button>
              </div>

              {showAddIngredient && (
                <div className="bg-[var(--cafe-cream)] p-4 rounded-xl border border-[var(--cafe-cream-dark)] mb-6 space-y-3">
                  <div>
                    <label className="label uppercase text-[10px]">Ingredient Name</label>
                    <input className="input text-sm" placeholder="e.g. Arabica Beans" value={newIngredient.name} onChange={e => setNewIngredient({ ...newIngredient, name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label uppercase text-[10px]">Unit</label>
                      <select className="input text-sm" value={newIngredient.unit} onChange={e => setNewIngredient({ ...newIngredient, unit: e.target.value })}>
                        {units.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label uppercase text-[10px]">Min Alert</label>
                      <input className="input text-sm" type="number" placeholder="500" value={newIngredient.min_stock} onChange={e => setNewIngredient({ ...newIngredient, min_stock: e.target.value })} />
                    </div>
                  </div>
                  <button onClick={addIngredient} className="btn-primary w-full py-2 text-sm mt-2">Add to Stock</button>
                </div>
              )}

              {ingredients.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-gray-400 italic">No ingredients found. Start by adding one above.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
                  {ingredients.map(ing => (
                    <div key={ing.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl group hover:bg-[var(--cafe-cream-dark)] transition-colors">
                      <div>
                        <p className="text-sm font-bold text-gray-800 tracking-tight">{ing.name}</p>
                        <p className="text-[10px] uppercase font-bold text-gray-400">Unit: {ing.unit}</p>
                      </div>
                      <span className="badge-amber">{ing.min_stock} min</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Menu Items List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[var(--cafe-brown)] flex items-center gap-2">
                <List size={20} className="text-[var(--cafe-gold)]" /> Active Menu Items
              </h3>
              <button onClick={() => setShowAddMenu(!showAddMenu)} className="btn-primary py-2 px-4 text-xs uppercase tracking-widest">
                {showAddMenu ? 'Close Form' : 'New Menu Item'}
              </button>
            </div>

            {/* Add Menu Item Inline Form */}
            {showAddMenu && (
              <div className="card border-2 border-[var(--cafe-gold)] bg-amber-50/30 fade-in">
                <h4 className="font-black text-[var(--cafe-brown)] uppercase text-xs tracking-widest mb-4">Add Item to Catalog</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Item Name</label>
                    <input className="input" placeholder="e.g. Caramel Latte" value={newMenu.name} onChange={e => setNewMenu({ ...newMenu, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <select className="input" value={newMenu.category} onChange={e => setNewMenu({ ...newMenu, category: e.target.value })}>
                      {categories.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Price (৳)</label>
                    <input className="input" type="number" placeholder="250" value={newMenu.selling_price} onChange={e => setNewMenu({ ...newMenu, selling_price: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={addMenuItem} className="btn-primary flex-1">Save Item</button>
                  <button onClick={() => setShowAddMenu(false)} className="btn-secondary">Cancel</button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-100 border-t-amber-900"></div></div>
            ) : menuItems.length === 0 ? (
              <div className="card text-center py-20 grayscale opacity-60">
                <BookOpen size={48} className="mx-auto text-[var(--cafe-brown)] mb-4" />
                <p className="text-lg font-bold text-[var(--cafe-brown)]">No menu items yet.</p>
                <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">Start by adding an ingredient on the left, then create your first menu item.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {menuItems.map(item => (
                  <div key={item.id} className={`card border transition-all duration-300 ${expanded === item.id ? 'border-[var(--cafe-gold)] ring-1 ring-[var(--cafe-gold)] shadow-lg' : 'hover:border-[var(--cafe-gold-light)]'}`}>
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${expanded === item.id ? 'bg-[var(--cafe-brown)] text-white' : 'bg-amber-50 text-[var(--cafe-brown)]'}`}>
                          {expanded === item.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                        <div>
                          <p className="font-bold text-[var(--cafe-brown)] text-lg leading-tight">{item.name}</p>
                          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-tighter mt-0.5">{item.category} • {item.recipes?.length || 0} Ingredients</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-xl font-black text-emerald-600">৳{item.selling_price}</span>
                        <button onClick={(e) => { e.stopPropagation(); confirmDeleteMenuItem(item); }} className="text-gray-300 hover:text-rose-500 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Recipe Section */}
                    {expanded === item.id && (
                      <div className="mt-8 pt-8 border-t-2 border-dashed border-[var(--cafe-cream-dark)] fade-in">
                        <div className="flex items-center justify-between mb-4 px-1">
                          <h4 className="font-black text-xs uppercase tracking-widest text-[var(--cafe-brown)] opacity-70 flex items-center gap-2">
                            <Info size={14} /> Recipe per serving
                          </h4>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                          {item.recipes?.length === 0 ? (
                            <div className="bg-amber-50 p-6 rounded-2xl text-center border border-amber-100">
                              <p className="text-sm font-bold text-amber-700">No ingredients in recipe yet.</p>
                              <p className="text-[11px] text-amber-600 mt-1 opacity-80 uppercase tracking-tight">Now add ingredients for this item below.</p>
                            </div>
                          ) : (
                            item.recipes?.map(r => (
                              <div key={r.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl group/row">
                                <div className="flex items-center gap-3">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--cafe-gold)]" />
                                  <span className="font-bold text-gray-700">{r.ingredients?.name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="font-black text-[var(--cafe-brown)]">{r.quantity} <span className="text-[10px] uppercase opacity-50 font-bold tracking-tighter">{r.ingredients?.unit}</span></span>
                                  <button onClick={() => deleteRecipe(r.id)} className="opacity-0 group-hover/row:opacity-100 text-rose-400 hover:text-rose-600 transition-all">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Add Ingredient to Recipe Row */}
                        <div className="grid md:grid-cols-12 gap-2 bg-[var(--cafe-cream)] p-2 rounded-2xl">
                          <div className="md:col-span-7">
                            <select
                              className="input border-transparent bg-white shadow-sm text-sm"
                              value={editingRecipeFor === item.id ? recipeForm.ingredient_id : ''}
                              onChange={e => {
                                setEditingRecipeFor(item.id)
                                setRecipeForm({ ...recipeForm, ingredient_id: e.target.value })
                              }}
                            >
                              <option value="">Select ingredient...</option>
                              {ingredients.map(i => (
                                <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-3">
                            <input
                              className="input border-transparent bg-white shadow-sm text-sm"
                              type="number"
                              placeholder="Qty"
                              value={editingRecipeFor === item.id ? recipeForm.quantity : ''}
                              onChange={e => {
                                setEditingRecipeFor(item.id)
                                setRecipeForm({ ...recipeForm, quantity: e.target.value })
                              }}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <button onClick={() => addRecipe(item.id)} className="btn-primary w-full py-2.5 text-sm h-full uppercase tracking-tighter">
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        {...modalConfig}
      />
    </div>
  )
}

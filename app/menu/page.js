import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import MenuClient from '../../components/MenuClient'

export const revalidate = 0

async function getMenuData() {
  try {
    const [menuRes, ingRes] = await Promise.all([
      supabase.from('menu_items').select(`*, recipes(*, ingredients(*))`).order('category'),
      supabase.from('ingredients').select('*').order('name'),
    ])
    return {
      menuItems: menuRes.data || [],
      ingredients: ingRes.data || []
    }
  } catch (error) {
    console.error('Menu data fetch error:', error)
    return { menuItems: [], ingredients: [] }
  }
}

export default async function MenuPage() {
  const { menuItems, ingredients } = await getMenuData()

  return (
    <div className="min-h-screen bg-[var(--cafe-cream)] no-scrollbar">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        
        {/* Instruction Box */}
        <section className="instruction-box fade-in">
          <div className="flex items-start gap-4">
            <div className="bg-white/20 p-3 rounded-2xl shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M8 7h6"/><path d="M8 11h8"/></svg>
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">Master Menu & Recipes</h2>
              <p className="text-white/80 text-sm max-w-2xl leading-relaxed">
                Build your cafe's menu and define the precise recipe for each cup. 
                This allows the system to calculate your costs and track ingredient levels automatically.
              </p>
            </div>
          </div>
        </section>

        <MenuClient initialMenuItems={menuItems} initialIngredients={ingredients} />
      </main>
    </div>
  )
}

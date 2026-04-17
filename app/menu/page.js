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
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />

      <header style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)', padding: '32px 0 24px' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px' }}>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '36px', fontWeight: 400, color: 'var(--text-primary)' }}>
            Menu & Recipes
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '6px' }}>
            Ingredients, menu items and recipe definitions
          </p>
          <div style={{ marginTop: '12px', width: '40px', height: '1px', background: 'var(--warning)' }} />
        </div>
      </header>

      <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 24px 60px' }}>
        <div className="instruction-box animate-in">
          <strong style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', color: 'var(--text-primary)' }}>Master Menu</strong>
          <p style={{ marginTop: '6px' }}>
            Build your cafe's ingredient library and define the precise recipe for each menu item.
            The system uses recipes to calculate costs and automatically track stock deductions on every sale.
          </p>
        </div>
        <MenuClient initialMenuItems={menuItems} initialIngredients={ingredients} />
      </main>
    </div>
  )
}

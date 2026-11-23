'use client'

// Shared practice-mode banner component + helpers reused across all practice pages

export function PracticeBanner() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #F59E0B, #D97706)',
      color: '#fff',
      textAlign: 'center',
      padding: '10px 16px',
      fontWeight: 800,
      fontSize: '13px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      boxShadow: '0 2px 8px rgba(245,158,11,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    }}>
      <span style={{ fontSize: '18px' }}>⚠️</span>
      PRACTICE MODE — this does not affect real inventory
      <span style={{ fontSize: '18px' }}>⚠️</span>
    </div>
  )
}

// Format raw integer quantity for display
export function fmtQty(qty, unit) {
  if (unit === 'g') {
    if (qty >= 1000) return `${(qty / 1000).toFixed(qty % 1000 === 0 ? 0 : 2)} kg`
    return `${qty} g`
  }
  if (unit === 'ml') {
    if (qty >= 1000) return `${(qty / 1000).toFixed(qty % 1000 === 0 ? 0 : 2)} L`
    return `${qty} ml`
  }
  return `${qty} pcs`
}

export const PRACTICE_PAGES = [
  { href: '/practice-bazar', label: '🛒 Bazar Trips' },
  { href: '/practice-bazar/inventory', label: '📦 Practice Inventory' },
  { href: '/practice-bazar/items', label: '🏷️ Manage Items' },
  { href: '/practice-bazar/barcodes', label: '🖨️ Print Barcodes' },
]

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

// Format raw integer quantity for display: <amount> gram/kg/litre
export function fmtQty(qty, unit) {
  const num = Number(qty) || 0
  if (unit === 'g') {
    if (Math.abs(num) >= 1000) {
      const val = (num / 1000).toFixed(num % 1000 === 0 ? 0 : 2)
      return `${val} kg`
    }
    return `${num} gram`
  }
  if (unit === 'ml') {
    if (Math.abs(num) >= 1000) {
      const val = (num / 1000).toFixed(num % 1000 === 0 ? 0 : 2)
      return `${val} litre`
    }
    return `${num} ml`
  }
  return `${num} pcs`
}

export const PRACTICE_PAGES = [
  { href: '/practice-bazar', label: '🛒 Bazar Trips' },
  { href: '/practice-bazar/inventory', label: '📦 Practice Inventory' },
  { href: '/practice-bazar/items', label: '🏷️ Manage Items' },
  { href: '/practice-bazar/barcodes', label: '🖨️ Print Barcodes' },
]

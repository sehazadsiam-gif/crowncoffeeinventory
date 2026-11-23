'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import { PracticeBanner, PRACTICE_PAGES } from '../PracticeShared'
import { Printer } from 'lucide-react'

// Quantity barcodes for printing
const QTY_CODES = [
  { code: 'QTY-X1',       label: 'Qty × 1 (pack size)' },
  { code: 'QTY-X5',       label: 'Qty × 5' },
  { code: 'QTY-X10',      label: 'Qty × 10' },
  { code: 'QTY-X50',      label: 'Qty × 50' },
  { code: 'QTY-PLUS1KG',  label: '+1 kg' },
  { code: 'QTY-PLUS5KG',  label: '+5 kg' },
]

export default function BarcodesPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [jsBarLoaded, setJsBarLoaded] = useState(false)
  const printRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || (role !== 'admin' && role !== 'sub_admin' && role !== 'staff' && role !== 'manager')) {
      router.replace('/'); return
    }
    fetchItems()
    loadJsBarcode()
  }, [])

  function loadJsBarcode() {
    if (typeof window === 'undefined') return
    if (window.JsBarcode) { setJsBarLoaded(true); return }
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js'
    script.onload = () => setJsBarLoaded(true)
    document.head.appendChild(script)
  }

  async function fetchItems() {
    setLoading(true)
    const res = await fetch('/api/practice/items')
    const json = await res.json()
    if (json.error) addToast(json.error, 'error')
    setItems((json.items || []).filter(i => i.active))
    setLoading(false)
  }

  useEffect(() => {
    if (jsBarLoaded && !loading && window.JsBarcode) {
      // Give DOM time to render svgs
      setTimeout(() => {
        document.querySelectorAll('.barcode-svg').forEach(el => {
          try {
            window.JsBarcode(el, el.dataset.value, {
              format: 'CODE128',
              width: 2.2,
              height: 60,
              displayValue: false,
              margin: 4,
            })
          } catch (e) {}
        })
      }, 200)
    }
  }, [jsBarLoaded, loading, items])

  function handlePrint() {
    window.print()
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <PracticeBanner />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 24px 80px' }} className="no-print">
        {/* Sub-nav */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {PRACTICE_PAGES.map(p => (
            <Link key={p.href} href={p.href} style={{
              padding: '7px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
              background: p.href === '/practice-bazar/barcodes' ? 'var(--primary)' : 'var(--bg-surface)',
              color: p.href === '/practice-bazar/barcodes' ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${p.href === '/practice-bazar/barcodes' ? 'var(--primary)' : 'var(--border-medium)'}`,
              textDecoration: 'none',
            }}>
              {p.label}
            </Link>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Print Barcode Sheet</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>A4 layout — item barcodes + quantity codes. Print and cut for a USB scanner.</p>
          </div>
          <button className="btn-primary" onClick={handlePrint} style={{ padding: '12px 24px', fontSize: '15px' }}>
            <Printer size={18} /> Print Sheet
          </button>
        </div>

        <div className="card instruction-box" style={{ marginBottom: '24px' }}>
          <strong>How quantity codes work:</strong> QTY-X1 / QTY-X5 / QTY-X10 / QTY-X50 multiply the item's default pack size.
          QTY-PLUS1KG and QTY-PLUS5KG add 1000g or 5000g and only work on gram-unit items.
          Scan an item first, then scan a quantity code to adjust its amount.
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}><div className="loader" /></div>
        ) : null}
      </main>

      {/* Print area — always in DOM so print CSS picks it up */}
      <div ref={printRef} className="print-area">
        <div className="barcode-page-title">
          PRACTICE MODE — Barcode Sheet
        </div>
        <div className="barcode-section-label">📦 Item Barcodes</div>
        <div className="barcode-grid">
          {items.map(item => (
            <div key={item.id} className="barcode-cell">
              <svg className="barcode-svg" data-value={item.barcode} />
              <div className="barcode-label">{item.name}</div>
              <div className="barcode-sub">{item.barcode}</div>
              <div className="barcode-sub">{item.base_unit} · pack: {item.pack_size}</div>
            </div>
          ))}
        </div>

        <div className="barcode-section-label" style={{ marginTop: '32px' }}>⚙️ Quantity Codes</div>
        <div className="barcode-grid">
          {QTY_CODES.map(q => (
            <div key={q.code} className="barcode-cell barcode-cell-qty">
              <svg className="barcode-svg" data-value={q.code} />
              <div className="barcode-label">{q.label}</div>
              <div className="barcode-sub">{q.code}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .print-area {
          display: none;
        }

        @media print {
          body > *:not(.print-area) { display: none !important; }
          .print-area {
            display: block !important;
            padding: 12mm;
            font-family: Arial, sans-serif;
          }
          .barcode-page-title {
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 8mm;
            padding: 4mm 6mm;
            background: #FEF9C3;
            border: 2px solid #D97706;
            border-radius: 4px;
          }
          .barcode-section-label {
            font-size: 11pt;
            font-weight: bold;
            margin: 6mm 0 4mm;
            padding-bottom: 2mm;
            border-bottom: 1px solid #ccc;
          }
          .barcode-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 6mm;
          }
          .barcode-cell {
            width: 44mm;
            text-align: center;
            border: 1px solid #ddd;
            border-radius: 3mm;
            padding: 3mm 2mm 4mm;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .barcode-cell-qty {
            border: 2px solid #D97706;
            background: #FFFBEB;
          }
          .barcode-cell svg {
            max-width: 100%;
            height: auto;
          }
          .barcode-label {
            font-size: 8pt;
            font-weight: bold;
            margin-top: 2mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .barcode-sub {
            font-size: 6pt;
            color: #666;
            margin-top: 1mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          @page {
            size: A4;
            margin: 10mm;
          }
        }

        /* Preview on screen too */
        @media screen {
          .print-area {
            display: block;
            padding: 24px;
          }
          .barcode-page-title {
            font-size: 16px;
            font-weight: 800;
            text-align: center;
            padding: 10px 16px;
            background: #FEF9C3;
            border: 2px solid #D97706;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .barcode-section-label {
            font-size: 15px;
            font-weight: 700;
            margin: 20px 0 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid var(--border-light);
          }
          .barcode-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
          }
          .barcode-cell {
            width: 160px;
            text-align: center;
            border: 1px solid var(--border-medium);
            border-radius: 10px;
            padding: 10px 8px 12px;
            background: var(--bg-surface);
          }
          .barcode-cell-qty {
            border: 2px solid #D97706;
            background: #FFFBEB;
          }
          .barcode-cell svg {
            max-width: 100%;
          }
          .barcode-label {
            font-size: 11px;
            font-weight: 700;
            margin-top: 6px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .barcode-sub {
            font-size: 10px;
            color: var(--text-muted);
            margin-top: 2px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}

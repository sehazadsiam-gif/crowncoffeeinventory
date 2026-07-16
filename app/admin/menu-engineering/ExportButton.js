'use client'
import { Download } from 'lucide-react'

/**
 * Exports Section B or C data as CSV or PDF.
 * Uses xlsx for CSV (already installed) and jsPDF for PDF (already installed).
 */
export default function ExportButton({ section, data, year, month, label }) {
  async function exportCSV() {
    if (!data?.length) return
    const { utils, writeFile } = await import('xlsx')
    const ws = utils.json_to_sheet(data)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, `${section} ${year}-${String(month).padStart(2,'0')}`)
    writeFile(wb, `crown-coffee-${section.toLowerCase()}-${year}-${String(month).padStart(2,'0')}.xlsx`)
  }

  async function exportPDF() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const title = `Crown Coffee — Menu Engineering ${section} | ${year}-${String(month).padStart(2,'0')}`

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 14, 18)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26)

    // Render table rows manually
    if (data?.length) {
      const headers = Object.keys(data[0])
      let y = 36
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(headers.join('   |   '), 14, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      data.forEach(row => {
        const line = headers.map(h => String(row[h] ?? '')).join('   |   ')
        if (y > 190) { doc.addPage(); y = 20 }
        doc.text(line, 14, y)
        y += 5
      })
    }

    doc.save(`crown-coffee-${section.toLowerCase()}-${year}-${String(month).padStart(2,'0')}.pdf`)
  }

  return (
    <div style={styles.wrap}>
      <button id={`export-csv-${section}`} onClick={exportCSV} style={styles.btn}>
        <Download size={13} /> CSV
      </button>
      <button id={`export-pdf-${section}`} onClick={exportPDF} style={styles.btn}>
        <Download size={13} /> PDF
      </button>
    </div>
  )
}

const styles = {
  wrap: { display: 'flex', gap: 8 },
  btn:  {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '7px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-medium)',
    background: 'none',
    color: 'var(--text-secondary)',
    fontSize: 12, cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
  },
}

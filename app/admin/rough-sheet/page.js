'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Download,
  Upload,
  Search,
  Copy,
  Save,
  Check,
  Phone,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Edit2,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
  Columns,
  Rows,
  X,
  AlertCircle
} from 'lucide-react'

const DEFAULT_COL_COUNT = 6
const DEFAULT_ROW_COUNT = 25

// Column letter generator (A, B, C... Z, AA, AB...)
function getColumnLetter(colIndex) {
  let letter = ''
  let temp = colIndex
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter
    temp = Math.floor(temp / 26) - 1
  }
  return letter
}

// Regex to detect phone numbers in rough cells
function extractPhoneNumber(text) {
  if (!text || typeof text !== 'string') return null
  const cleaned = text.replace(/[\s\-\(\)\.]/g, '')
  // Look for 7 to 15 digits, optionally prefixed with +
  const match = cleaned.match(/^(\+?\d{7,15})$/)
  return match ? match[1] : null
}

function createDefaultColumns(count = DEFAULT_COL_COUNT) {
  const initialTitles = ['Name', 'Phone Number', 'Category / Tag', 'Notes / Details', 'Amount / Status', 'Extra']
  return Array.from({ length: count }, (_, i) => ({
    key: `col_${i + 1}`,
    letter: getColumnLetter(i),
    title: initialTitles[i] || `Column ${getColumnLetter(i)}`,
    width: i === 0 ? 170 : i === 1 ? 170 : i === 2 ? 140 : i === 3 ? 240 : 130
  }))
}

function createDefaultRows(columns, count = DEFAULT_ROW_COUNT) {
  const sampleRows = [
    { col_1: 'Rahim Ahmed', col_2: '01711000001', col_3: 'VIP Customer', col_4: 'Prefers Flat White w/ Almond Milk', col_5: 'Active' },
    { col_1: 'Coffee Bean Supplier', col_2: '+8801812345678', col_3: 'Supplier', col_4: 'Delivers 50kg beans every Tuesday', col_5: 'Pending' },
    { col_1: 'Dairy Farm Milk Co.', col_2: '01999888777', col_3: 'Supplier', col_4: 'Call before 8:30 AM for fresh delivery', col_5: 'Active' },
    { col_1: 'Weekly Event Reservation', col_2: '01655443322', col_3: 'Event', col_4: '15 people birthday reservation Friday', col_5: 'Confirmed' },
    { col_1: 'Syrup & Flavoring Vendor', col_2: '01700112233', col_3: 'Vendor', col_4: 'Vanilla, Caramel, Hazelnut stocks', col_5: 'Active' }
  ]

  return Array.from({ length: count }, (_, rowIndex) => {
    const rowObj = {}
    columns.forEach(col => {
      rowObj[col.key] = sampleRows[rowIndex]?.[col.key] || ''
    })
    return rowObj
  })
}

export default function RoughSheetPage() {
  const router = useRouter()
  const { addToast } = useToast()

  // Workbook sheets state
  const [sheets, setSheets] = useState([])
  const [activeSheetIndex, setActiveSheetIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Selection & Navigation State
  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 })
  const [editingCell, setEditingCell] = useState(null) // { row, col } or null
  const [formulaValue, setFormulaValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingHeaderKey, setEditingHeaderKey] = useState(null)
  const [headerTitleDraft, setHeaderTitleDraft] = useState('')
  const [editingSheetTitleIndex, setEditingSheetTitleIndex] = useState(null)
  const [sheetTitleDraft, setSheetTitleDraft] = useState('')

  // Cell Styles Map { "row_col": { bold: true, italic: true, bg: '#fff' } }
  const [cellStyles, setCellStyles] = useState({})

  // File upload ref
  const fileInputRef = useRef(null)
  const gridContainerRef = useRef(null)
  const cellInputRef = useRef(null)

  // Auth gate
  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || (role !== 'admin' && role !== 'sub_admin')) {
      router.replace('/')
    }
  }, [router])

  // Load sheets from backend API or local storage
  const loadSheets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/rough-sheets')
      const result = await res.json()

      if (result.success && result.data && result.data.length > 0) {
        const formatted = result.data.map(sheet => {
          const cols = sheet.columns && sheet.columns.length > 0 ? sheet.columns : createDefaultColumns()
          const rows = sheet.data && sheet.data.length > 0 ? sheet.data : createDefaultRows(cols)
          return {
            id: sheet.id,
            sheet_name: sheet.sheet_name || 'Phone Directory',
            columns: cols.map((c, i) => ({ ...c, letter: getColumnLetter(i) })),
            data: rows,
            styles: sheet.styles || {}
          }
        })
        setSheets(formatted)
        setCellStyles(formatted[0]?.styles || {})
      } else {
        // Fallback to local storage or initial defaults
        const cached = localStorage.getItem('cc_rough_sheets_backup')
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSheets(parsed)
              setCellStyles(parsed[0]?.styles || {})
              setLoading(false)
              return
            }
          } catch (e) {
            console.error('Failed to parse cached sheets', e)
          }
        }

        // Initialize default sheet
        const defaultCols = createDefaultColumns()
        const defaultRows = createDefaultRows(defaultCols)
        const initial = [
          {
            sheet_name: 'Phone Directory',
            columns: defaultCols,
            data: defaultRows,
            styles: {}
          },
          {
            sheet_name: 'Daily Rough Notes',
            columns: createDefaultColumns(),
            data: createDefaultRows(createDefaultColumns(), 20),
            styles: {}
          }
        ]
        setSheets(initial)
      }
    } catch (err) {
      console.error('Error loading sheets:', err)
      addToast('Working in offline/local mode', 'info')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    loadSheets()
  }, [loadSheets])

  const currentSheet = sheets[activeSheetIndex] || {
    sheet_name: 'Sheet 1',
    columns: createDefaultColumns(),
    data: createDefaultRows(createDefaultColumns()),
    styles: {}
  }

  // Update formula bar value when active cell changes
  useEffect(() => {
    if (!currentSheet || !currentSheet.columns || !currentSheet.data) return
    const colKey = currentSheet.columns[activeCell.col]?.key
    if (colKey) {
      const val = currentSheet.data[activeCell.row]?.[colKey] || ''
      setFormulaValue(String(val))
    }
  }, [activeCell, activeSheetIndex, currentSheet])

  // Save changes to API & LocalStorage
  const handleSave = useCallback(async (customSheets) => {
    const sheetsToSave = customSheets || sheets
    setSaving(true)
    try {
      // Save locally first
      localStorage.setItem('cc_rough_sheets_backup', JSON.stringify(sheetsToSave))

      const res = await fetch('/api/rough-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheets: sheetsToSave })
      })
      const result = await res.json()
      if (result.success) {
        setHasUnsavedChanges(false)
        setLastSaved(new Date().toLocaleTimeString())
        addToast('All changes saved to cloud!', 'success')
      } else {
        setHasUnsavedChanges(false)
        setLastSaved(new Date().toLocaleTimeString() + ' (Local)')
        addToast('Saved locally in browser!', 'info')
      }
    } catch (err) {
      console.error('Save failed:', err)
      setHasUnsavedChanges(false)
      setLastSaved(new Date().toLocaleTimeString() + ' (Local)')
      addToast('Saved locally in browser!', 'info')
    } finally {
      setSaving(false)
    }
  }, [sheets, addToast])

  // Debounced auto-save
  useEffect(() => {
    if (!hasUnsavedChanges) return
    const timer = setTimeout(() => {
      handleSave()
    }, 2500)
    return () => clearTimeout(timer)
  }, [hasUnsavedChanges, handleSave])

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  // Update a single cell value
  const updateCellValue = (rowIndex, colIndex, value) => {
    setSheets(prevSheets => {
      const newSheets = [...prevSheets]
      const targetSheet = { ...newSheets[activeSheetIndex] }
      const newData = [...targetSheet.data]
      const colKey = targetSheet.columns[colIndex]?.key
      if (!colKey) return prevSheets

      newData[rowIndex] = {
        ...newData[rowIndex],
        [colKey]: value
      }
      targetSheet.data = newData
      newSheets[activeSheetIndex] = targetSheet
      return newSheets
    })
    setFormulaValue(value)
    setHasUnsavedChanges(true)
  }

  // Formula bar input changes
  const handleFormulaChange = (e) => {
    const val = e.target.value
    setFormulaValue(val)
    updateCellValue(activeCell.row, activeCell.col, val)
  }

  // Navigation with Arrow keys, Enter, Tab
  const handleCellKeyDown = (e, rowIndex, colIndex) => {
    if (editingCell) {
      if (e.key === 'Enter') {
        e.preventDefault()
        setEditingCell(null)
        // Move to next row
        if (rowIndex + 1 < currentSheet.data.length) {
          setActiveCell({ row: rowIndex + 1, col: colIndex })
        }
      } else if (e.key === 'Tab') {
        e.preventDefault()
        setEditingCell(null)
        // Move to next col
        if (colIndex + 1 < currentSheet.columns.length) {
          setActiveCell({ row: rowIndex, col: colIndex + 1 })
        }
      } else if (e.key === 'Escape') {
        setEditingCell(null)
      }
      return
    }

    if (e.key === 'ArrowDown' || (e.key === 'Enter' && !e.shiftKey)) {
      e.preventDefault()
      if (rowIndex + 1 < currentSheet.data.length) {
        setActiveCell({ row: rowIndex + 1, col: colIndex })
      }
    } else if (e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey)) {
      e.preventDefault()
      if (rowIndex > 0) {
        setActiveCell({ row: rowIndex - 1, col: colIndex })
      }
    } else if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault()
      if (colIndex + 1 < currentSheet.columns.length) {
        setActiveCell({ row: rowIndex, col: colIndex + 1 })
      }
    } else if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault()
      if (colIndex > 0) {
        setActiveCell({ row: rowIndex, col: colIndex - 1 })
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      updateCellValue(rowIndex, colIndex, '')
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Start typing immediately into cell
      setEditingCell({ row: rowIndex, col: colIndex })
    }
  }

  // Handle Multi-Cell Excel / Google Sheets Clipboard Paste!
  const handlePaste = (e) => {
    const pasteData = e.clipboardData.getData('text')
    if (!pasteData) return

    // If typing in an input directly, let default paste happen unless it contains tabs/newlines
    if (editingCell && !pasteData.includes('\t') && !pasteData.includes('\n')) {
      return
    }

    e.preventDefault()

    // Parse Excel TSV / CSV clipboard
    const rows = pasteData.split(/\r\n|\n|\r/).filter((r, idx, arr) => {
      // keep lines except trailing blank
      if (idx === arr.length - 1 && r.trim() === '') return false
      return true
    })

    if (rows.length === 0) return

    const parsedMatrix = rows.map(r => r.split('\t'))
    const startRow = activeCell.row
    const startCol = activeCell.col

    setSheets(prevSheets => {
      const newSheets = [...prevSheets]
      const targetSheet = { ...newSheets[activeSheetIndex] }
      let targetColumns = [...targetSheet.columns]
      let targetData = [...targetSheet.data]

      const requiredCols = startCol + Math.max(...parsedMatrix.map(r => r.length))
      const requiredRows = startRow + parsedMatrix.length

      // Auto-expand columns if needed
      while (targetColumns.length < requiredCols) {
        const nextColIndex = targetColumns.length
        targetColumns.push({
          key: `col_${nextColIndex + 1}`,
          letter: getColumnLetter(nextColIndex),
          title: `Column ${getColumnLetter(nextColIndex)}`,
          width: 140
        })
      }

      // Auto-expand rows if needed
      while (targetData.length < requiredRows) {
        const rowObj = {}
        targetColumns.forEach(c => { rowObj[c.key] = '' })
        targetData.push(rowObj)
      }

      // Fill in cells
      parsedMatrix.forEach((pRow, rIdx) => {
        const rTarget = startRow + rIdx
        targetData[rTarget] = { ...targetData[rTarget] }
        pRow.forEach((val, cIdx) => {
          const cTarget = startCol + cIdx
          const colKey = targetColumns[cTarget].key
          targetData[rTarget][colKey] = val.trim()
        })
      })

      targetSheet.columns = targetColumns
      targetSheet.data = targetData
      newSheets[activeSheetIndex] = targetSheet
      return newSheets
    })

    setHasUnsavedChanges(true)
    addToast(`Pasted ${parsedMatrix.length} row(s) from clipboard!`, 'success')
  }

  // Add Rows
  const handleAddRows = (count = 1) => {
    setSheets(prevSheets => {
      const newSheets = [...prevSheets]
      const targetSheet = { ...newSheets[activeSheetIndex] }
      const newRows = Array.from({ length: count }, () => {
        const rowObj = {}
        targetSheet.columns.forEach(col => { rowObj[col.key] = '' })
        return rowObj
      })
      targetSheet.data = [...targetSheet.data, ...newRows]
      newSheets[activeSheetIndex] = targetSheet
      return newSheets
    })
    setHasUnsavedChanges(true)
    addToast(`Added ${count} row(s)`, 'info')
  }

  // Add Column
  const handleAddColumn = () => {
    setSheets(prevSheets => {
      const newSheets = [...prevSheets]
      const targetSheet = { ...newSheets[activeSheetIndex] }
      const newColIndex = targetSheet.columns.length
      const newCol = {
        key: `col_${Date.now()}_${newColIndex + 1}`,
        letter: getColumnLetter(newColIndex),
        title: `Column ${getColumnLetter(newColIndex)}`,
        width: 140
      }
      targetSheet.columns = [...targetSheet.columns, newCol]
      targetSheet.data = targetSheet.data.map(row => ({
        ...row,
        [newCol.key]: ''
      }))
      newSheets[activeSheetIndex] = targetSheet
      return newSheets
    })
    setHasUnsavedChanges(true)
    addToast('New column added', 'info')
  }

  // Delete Current Row
  const handleDeleteRow = (rowIndex) => {
    if (currentSheet.data.length <= 1) {
      addToast('Cannot delete the only row', 'warning')
      return
    }
    setSheets(prevSheets => {
      const newSheets = [...prevSheets]
      const targetSheet = { ...newSheets[activeSheetIndex] }
      targetSheet.data = targetSheet.data.filter((_, i) => i !== rowIndex)
      newSheets[activeSheetIndex] = targetSheet
      return newSheets
    })
    if (activeCell.row >= currentSheet.data.length - 1) {
      setActiveCell(prev => ({ ...prev, row: Math.max(0, prev.row - 1) }))
    }
    setHasUnsavedChanges(true)
    addToast('Row deleted', 'info')
  }

  // Clear Empty Rows
  const handleClearEmptyRows = () => {
    setSheets(prevSheets => {
      const newSheets = [...prevSheets]
      const targetSheet = { ...newSheets[activeSheetIndex] }
      const cleaned = targetSheet.data.filter(row => {
        return Object.values(row).some(v => v && String(v).trim() !== '')
      })
      targetSheet.data = cleaned.length > 0 ? cleaned : createDefaultRows(targetSheet.columns, 5)
      newSheets[activeSheetIndex] = targetSheet
      return newSheets
    })
    setHasUnsavedChanges(true)
    addToast('Cleaned up empty rows', 'success')
  }

  // Column Header Rename
  const startEditingHeader = (colKey, currentTitle) => {
    setEditingHeaderKey(colKey)
    setHeaderTitleDraft(currentTitle)
  }

  const saveHeaderTitle = (colKey) => {
    if (!headerTitleDraft.trim()) {
      setEditingHeaderKey(null)
      return
    }
    setSheets(prevSheets => {
      const newSheets = [...prevSheets]
      const targetSheet = { ...newSheets[activeSheetIndex] }
      targetSheet.columns = targetSheet.columns.map(c => {
        if (c.key === colKey) {
          return { ...c, title: headerTitleDraft.trim() }
        }
        return c
      })
      newSheets[activeSheetIndex] = targetSheet
      return newSheets
    })
    setEditingHeaderKey(null)
    setHasUnsavedChanges(true)
  }

  // Formatting Tools (Bold, Italic, Bg Color)
  const toggleStyle = (styleKey) => {
    const cellKey = `${activeCell.row}_${activeCell.col}`
    const existing = cellStyles[cellKey] || {}
    const updated = {
      ...cellStyles,
      [cellKey]: {
        ...existing,
        [styleKey]: !existing[styleKey]
      }
    }
    setCellStyles(updated)
    setSheets(prev => {
      const copy = [...prev]
      copy[activeSheetIndex] = { ...copy[activeSheetIndex], styles: updated }
      return copy
    })
    setHasUnsavedChanges(true)
  }

  const setCellBgColor = (color) => {
    const cellKey = `${activeCell.row}_${activeCell.col}`
    const existing = cellStyles[cellKey] || {}
    const updated = {
      ...cellStyles,
      [cellKey]: {
        ...existing,
        bg: color
      }
    }
    setCellStyles(updated)
    setSheets(prev => {
      const copy = [...prev]
      copy[activeSheetIndex] = { ...copy[activeSheetIndex], styles: updated }
      return copy
    })
    setHasUnsavedChanges(true)
  }

  // Add Sheet / Tab
  const handleAddSheet = () => {
    const newSheetIndex = sheets.length + 1
    const newCols = createDefaultColumns()
    const newSheet = {
      sheet_name: `Sheet ${newSheetIndex}`,
      columns: newCols,
      data: createDefaultRows(newCols, 20),
      styles: {}
    }
    const updatedSheets = [...sheets, newSheet]
    setSheets(updatedSheets)
    setActiveSheetIndex(updatedSheets.length - 1)
    setCellStyles({})
    setActiveCell({ row: 0, col: 0 })
    setHasUnsavedChanges(true)
    addToast(`Added new sheet: Sheet ${newSheetIndex}`, 'success')
  }

  // Rename Sheet Tab
  const handleRenameSheet = (index) => {
    if (!sheetTitleDraft.trim()) {
      setEditingSheetTitleIndex(null)
      return
    }
    setSheets(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], sheet_name: sheetTitleDraft.trim() }
      return copy
    })
    setEditingSheetTitleIndex(null)
    setHasUnsavedChanges(true)
  }

  // Delete Sheet Tab
  const handleDeleteSheet = (index, e) => {
    e?.stopPropagation()
    if (sheets.length <= 1) {
      addToast('Cannot delete the only sheet', 'warning')
      return
    }
    if (!confirm(`Are you sure you want to delete "${sheets[index].sheet_name}"?`)) return

    const sheetToDelete = sheets[index]
    const updatedSheets = sheets.filter((_, i) => i !== index)
    setSheets(updatedSheets)
    setActiveSheetIndex(Math.max(0, index - 1))
    setHasUnsavedChanges(true)
    addToast(`Deleted ${sheetToDelete.sheet_name}`, 'info')

    // If sheet had an id in DB, call DELETE API
    if (sheetToDelete.id) {
      fetch(`/api/rough-sheets?id=${sheetToDelete.id}`, { method: 'DELETE' }).catch(console.error)
    }
  }

  // Excel (.xlsx) Export
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new()

      sheets.forEach((sheet) => {
        // Build table array with headers as first row
        const headerRow = sheet.columns.map(c => c.title || c.letter)
        const rowData = sheet.data.map(row => {
          return sheet.columns.map(c => row[c.key] || '')
        })

        const wsData = [headerRow, ...rowData]
        const ws = XLSX.utils.aoa_to_sheet(wsData)
        XLSX.utils.book_append_sheet(wb, ws, (sheet.sheet_name || 'Sheet').slice(0, 31))
      })

      const filename = `Crown_Coffee_Rough_Workbook_${new Date().toISOString().slice(0, 10)}.xlsx`
      XLSX.writeFile(wb, filename)
      addToast('Exported workbook to Excel!', 'success')
    } catch (err) {
      console.error('Export error:', err)
      addToast('Failed to export Excel file', 'error')
    }
  }

  // Excel / CSV File Import
  const handleImportFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const sheetName = wb.SheetNames[0]
        const ws = wb.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 })

        if (!jsonData || jsonData.length === 0) {
          addToast('Imported file was empty', 'warning')
          return
        }

        // First row is headers
        const firstRow = jsonData[0] || []
        const importedCols = firstRow.map((headerText, i) => ({
          key: `col_${i + 1}`,
          letter: getColumnLetter(i),
          title: String(headerText || `Column ${getColumnLetter(i)}`),
          width: 160
        }))

        // Rest are data rows
        const importedRows = jsonData.slice(1).map(r => {
          const rowObj = {}
          importedCols.forEach((col, idx) => {
            rowObj[col.key] = r[idx] !== undefined && r[idx] !== null ? String(r[idx]) : ''
          })
          return rowObj
        })

        const newSheet = {
          sheet_name: file.name.replace(/\.[^/.]+$/, '').slice(0, 30),
          columns: importedCols.length > 0 ? importedCols : createDefaultColumns(),
          data: importedRows.length > 0 ? importedRows : createDefaultRows(importedCols),
          styles: {}
        }

        const updated = [...sheets, newSheet]
        setSheets(updated)
        setActiveSheetIndex(updated.length - 1)
        setHasUnsavedChanges(true)
        addToast(`Imported "${file.name}" with ${importedRows.length} rows!`, 'success')
      } catch (err) {
        console.error('Import failed', err)
        addToast('Error importing file. Make sure it is a valid .xlsx or .csv', 'error')
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  // Active cell coordinate label
  const activeColLetter = currentSheet.columns[activeCell.col]?.letter || 'A'
  const activeCellCoord = `${activeColLetter}${activeCell.row + 1}`

  // Active cell value and phone check
  const activeCellKey = currentSheet.columns[activeCell.col]?.key
  const activeCellValue = currentSheet.data[activeCell.row]?.[activeCellKey] || ''
  const detectedPhone = extractPhoneNumber(activeCellValue)

  // Status bar calculations: count & sum
  const activeSheetTotalRows = currentSheet.data.length
  const activeSheetTotalCols = currentSheet.columns.length
  let filledCellCount = 0
  let numericSum = 0
  let hasNumericValues = false

  currentSheet.data.forEach(row => {
    currentSheet.columns.forEach(col => {
      const v = row[col.key]
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        filledCellCount++
        const num = parseFloat(String(v).replace(/[^\d.-]/g, ''))
        if (!isNaN(num)) {
          numericSum += num
          hasNumericValues = true
        }
      }
    })
  })

  // Duplicate Phone Detection across active sheet
  const phoneCounts = {}
  currentSheet.data.forEach(row => {
    Object.values(row).forEach(val => {
      const p = extractPhoneNumber(val)
      if (p) {
        phoneCounts[p] = (phoneCounts[p] || 0) + 1
      }
    })
  })
  const duplicatePhoneList = Object.keys(phoneCounts).filter(p => phoneCounts[p] > 1)

  return (
    <div 
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main, #0F1117)', color: 'var(--text-main, #E4E7EB)' }}
      onPaste={handlePaste}
    >
      <Navbar />

      {/* Top Application Header */}
      <div style={{
        background: 'var(--bg-surface, #181B24)',
        borderBottom: '1px solid var(--border-light, #262B38)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #107C41 0%, #18A756 100%)',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 14px rgba(16, 124, 65, 0.35)'
          }}>
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main, #FFFFFF)', letterSpacing: '-0.01em' }}>
                Rough Workbook & Phone Directory
              </h1>
              <span style={{
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10B981',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid rgba(16, 185, 129, 0.25)'
              }}>
                Excel Mode
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted, #94A3B8)' }}>
              Rough scratchpad for phone numbers, notes, supplier lists, and fast multi-cell Excel paste
            </p>
          </div>
        </div>

        {/* Sync Status & Primary Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Cloud Sync Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: hasUnsavedChanges ? '#F59E0B' : '#10B981',
            background: hasUnsavedChanges ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.08)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: `1px solid ${hasUnsavedChanges ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.2)'}`
          }}>
            {saving ? (
              <>
                <RefreshCw size={13} className="spin" />
                <span>Saving to cloud...</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <AlertCircle size={13} />
                <span>Unsaved edits</span>
              </>
            ) : (
              <>
                <Check size={13} />
                <span>Saved {lastSaved ? `(${lastSaved})` : 'to cloud'}</span>
              </>
            )}
          </div>

          {/* Manual Save */}
          <button
            onClick={() => handleSave()}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: hasUnsavedChanges ? '#107C41' : '#262B38',
              color: '#fff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: hasUnsavedChanges ? '0 2px 8px rgba(16, 124, 65, 0.4)' : 'none'
            }}
          >
            <Save size={15} />
            <span>{saving ? 'Saving...' : 'Save (Ctrl+S)'}</span>
          </button>

          {/* Import File */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#262B38',
              color: 'var(--text-main, #E4E7EB)',
              border: '1px solid var(--border-light, #374151)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <Upload size={14} />
            <span>Import Excel</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />

          {/* Export File */}
          <button
            onClick={handleExportExcel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#262B38',
              color: 'var(--text-main, #E4E7EB)',
              border: '1px solid var(--border-light, #374151)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <Download size={14} />
            <span>Export .xlsx</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Toolbar (Formulas, Formatting, Add rows/cols) */}
      <div style={{
        background: 'var(--bg-surface, #141720)',
        borderBottom: '1px solid var(--border-light, #262B38)',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {/* Row & Column Adders */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => handleAddRows(1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: '#1F2430',
              color: '#CBD5E1',
              border: '1px solid #2F3647',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <Rows size={13} />
            <span>+ Row</span>
          </button>
          <button
            onClick={() => handleAddRows(5)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: '#1F2430',
              color: '#CBD5E1',
              border: '1px solid #2F3647',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <span>+5 Rows</span>
          </button>
          <button
            onClick={handleAddColumn}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: '#1F2430',
              color: '#CBD5E1',
              border: '1px solid #2F3647',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <Columns size={13} />
            <span>+ Column</span>
          </button>
          <button
            onClick={handleClearEmptyRows}
            title="Remove completely blank rows"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: '#1F2430',
              color: '#94A3B8',
              border: '1px solid #2F3647',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <span>Clear Blanks</span>
          </button>
        </div>

        <div style={{ width: '1px', height: '22px', background: '#2B3242' }} />

        {/* Formatting Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => toggleStyle('bold')}
            style={{
              background: cellStyles[`${activeCell.row}_${activeCell.col}`]?.bold ? '#107C41' : '#1F2430',
              color: '#fff',
              border: '1px solid #2F3647',
              padding: '5px 8px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            title="Bold"
          >
            <Bold size={13} />
          </button>
          <button
            onClick={() => toggleStyle('italic')}
            style={{
              background: cellStyles[`${activeCell.row}_${activeCell.col}`]?.italic ? '#107C41' : '#1F2430',
              color: '#fff',
              border: '1px solid #2F3647',
              padding: '5px 8px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            title="Italic"
          >
            <Italic size={13} />
          </button>

          {/* Color markers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
            {['#107C4140', '#F59E0B30', '#3B82F630', '#EF444430', ''].map((color, i) => (
              <button
                key={i}
                onClick={() => setCellBgColor(color)}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  background: color || '#262B38',
                  border: '1px solid #4B5563',
                  cursor: 'pointer'
                }}
                title={color ? 'Highlight cell' : 'Clear highlight'}
              />
            ))}
          </div>
        </div>

        <div style={{ width: '1px', height: '22px', background: '#2B3242' }} />

        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: '#1F2430',
          padding: '4px 10px',
          borderRadius: '6px',
          border: '1px solid #2F3647',
          flex: 1,
          maxWidth: '280px'
        }}>
          <Search size={13} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search workbook..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '12px',
              width: '100%',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <X size={12} color="#94A3B8" style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
          )}
        </div>

        {/* Duplicate Phone Notice */}
        {duplicatePhoneList.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#EF4444',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px'
          }}>
            <AlertCircle size={13} />
            <span>{duplicatePhoneList.length} duplicate phone number(s) found</span>
          </div>
        )}
      </div>

      {/* Formula Bar & Active Cell Info */}
      <div style={{
        background: 'var(--bg-surface, #181B24)',
        borderBottom: '1px solid var(--border-light, #262B38)',
        padding: '6px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        {/* Active Coordinate */}
        <div style={{
          background: '#0F1117',
          border: '1px solid #2F3647',
          padding: '4px 12px',
          borderRadius: '4px',
          fontSize: '13px',
          fontWeight: 700,
          color: '#10B981',
          minWidth: '60px',
          textAlign: 'center'
        }}>
          {activeCellCoord}
        </div>

        {/* fx symbol */}
        <div style={{ color: '#64748B', fontWeight: 700, fontSize: '13px', userSelect: 'none' }}>
          fx
        </div>

        {/* Value Editor */}
        <input
          type="text"
          value={formulaValue}
          onChange={handleFormulaChange}
          placeholder="Click any cell or type rough value here..."
          style={{
            flex: 1,
            background: '#0F1117',
            border: '1px solid #2F3647',
            padding: '5px 12px',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '13px',
            outline: 'none'
          }}
        />

        {/* Detected Phone Number Action Pill */}
        {detectedPhone && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px'
          }}>
            <Phone size={12} color="#10B981" />
            <span style={{ color: '#10B981', fontWeight: 600 }}>{detectedPhone}</span>
            <a
              href={`https://wa.me/${detectedPhone.replace(/^\+/, '')}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#25D366',
                textDecoration: 'none',
                fontWeight: 600,
                marginLeft: '4px'
              }}
            >
              <MessageCircle size={13} />
              <span>WhatsApp</span>
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(detectedPhone)
                addToast('Phone number copied!', 'success')
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Copy number"
            >
              <Copy size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Main Grid Canvas */}
      <div 
        ref={gridContainerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          background: '#0F1117',
          position: 'relative'
        }}
      >
        <table style={{
          borderCollapse: 'collapse',
          width: 'max-content',
          minWidth: '100%',
          tableLayout: 'fixed',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '13px'
        }}>
          {/* Header Row */}
          <thead>
            <tr>
              {/* Corner Cell */}
              <th style={{
                position: 'sticky',
                top: 0,
                left: 0,
                zIndex: 30,
                width: '46px',
                minWidth: '46px',
                background: '#1A1D27',
                borderRight: '1px solid #2B3242',
                borderBottom: '1px solid #2B3242',
                color: '#64748B',
                fontSize: '11px',
                textAlign: 'center',
                padding: '6px 0',
                userSelect: 'none'
              }}>
                #
              </th>

              {/* Column Headers (A, B, C... with customizable title) */}
              {currentSheet.columns.map((col, colIndex) => {
                const isColActive = activeCell.col === colIndex
                return (
                  <th
                    key={col.key}
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 20,
                      width: `${col.width || 150}px`,
                      minWidth: '110px',
                      background: isColActive ? '#232938' : '#1A1D27',
                      borderRight: '1px solid #2B3242',
                      borderBottom: '1px solid #2B3242',
                      color: isColActive ? '#10B981' : '#94A3B8',
                      padding: '8px 10px',
                      textAlign: 'left',
                      fontWeight: 600,
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, overflow: 'hidden' }}>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>{col.letter}</span>
                        {editingHeaderKey === col.key ? (
                          <input
                            type="text"
                            value={headerTitleDraft}
                            autoFocus
                            onChange={(e) => setHeaderTitleDraft(e.target.value)}
                            onBlur={() => saveHeaderTitle(col.key)}
                            onKeyDown={(e) => e.key === 'Enter' && saveHeaderTitle(col.key)}
                            style={{
                              background: '#0F1117',
                              border: '1px solid #10B981',
                              color: '#fff',
                              fontSize: '12px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              width: '100%',
                              outline: 'none'
                            }}
                          />
                        ) : (
                          <span
                            onDoubleClick={() => startEditingHeader(col.key, col.title)}
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer'
                            }}
                            title="Double-click to rename column"
                          >
                            {col.title}
                          </span>
                        )}
                      </div>
                      <Edit2
                        size={11}
                        color="#64748B"
                        style={{ cursor: 'pointer', flexShrink: 0 }}
                        onClick={() => startEditingHeader(col.key, col.title)}
                        title="Rename column"
                      />
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>

          {/* Table Data Rows */}
          <tbody>
            {currentSheet.data.map((row, rowIndex) => {
              const isRowActive = activeCell.row === rowIndex
              return (
                <tr key={rowIndex}>
                  {/* Row Number Header */}
                  <td
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 10,
                      background: isRowActive ? '#232938' : '#141720',
                      borderRight: '1px solid #2B3242',
                      borderBottom: '1px solid #1E2330',
                      color: isRowActive ? '#10B981' : '#64748B',
                      fontSize: '11px',
                      fontWeight: 600,
                      textAlign: 'center',
                      padding: '4px 0',
                      userSelect: 'none',
                      position: 'sticky',
                      left: 0
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                      <span>{rowIndex + 1}</span>
                      <button
                        onClick={() => handleDeleteRow(rowIndex)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#64748B',
                          cursor: 'pointer',
                          padding: '2px',
                          display: isRowActive ? 'inline-block' : 'none'
                        }}
                        title="Delete row"
                      >
                        <Trash2 size={10} color="#EF4444" />
                      </button>
                    </div>
                  </td>

                  {/* Cells */}
                  {currentSheet.columns.map((col, colIndex) => {
                    const isSelected = activeCell.row === rowIndex && activeCell.col === colIndex
                    const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex
                    const cellVal = row[col.key] || ''
                    const cellKey = `${rowIndex}_${colIndex}`
                    const style = cellStyles[cellKey] || {}
                    const phone = extractPhoneNumber(cellVal)
                    const isDuplicate = phone && phoneCounts[phone] > 1

                    const isSearchMatch = searchQuery && String(cellVal).toLowerCase().includes(searchQuery.toLowerCase())

                    return (
                      <td
                        key={col.key}
                        onClick={() => {
                          setActiveCell({ row: rowIndex, col: colIndex })
                        }}
                        onDoubleClick={() => {
                          setActiveCell({ row: rowIndex, col: colIndex })
                          setEditingCell({ row: rowIndex, col: colIndex })
                        }}
                        style={{
                          borderRight: '1px solid #1E2330',
                          borderBottom: '1px solid #1E2330',
                          padding: 0,
                          height: '32px',
                          position: 'relative',
                          background: isSearchMatch 
                            ? 'rgba(245, 158, 11, 0.25)' 
                            : style.bg || (isSelected ? '#182232' : 'transparent'),
                          outline: isSelected ? '2px solid #10B981' : 'none',
                          outlineOffset: '-2px',
                          zIndex: isSelected ? 5 : 1
                        }}
                      >
                        {isEditing ? (
                          <input
                            ref={cellInputRef}
                            type="text"
                            autoFocus
                            defaultValue={cellVal}
                            onBlur={(e) => {
                              updateCellValue(rowIndex, colIndex, e.target.value)
                              setEditingCell(null)
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, rowIndex, colIndex)}
                            style={{
                              width: '100%',
                              height: '100%',
                              background: '#0B0D13',
                              border: 'none',
                              color: '#fff',
                              padding: '0 8px',
                              fontSize: '13px',
                              outline: 'none',
                              fontWeight: style.bold ? 'bold' : 'normal',
                              fontStyle: style.italic ? 'italic' : 'normal'
                            }}
                          />
                        ) : (
                          <div
                            tabIndex={0}
                            onKeyDown={(e) => handleCellKeyDown(e, rowIndex, colIndex)}
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0 8px',
                              cursor: 'cell',
                              outline: 'none',
                              fontWeight: style.bold ? 'bold' : 'normal',
                              fontStyle: style.italic ? 'italic' : 'normal',
                              color: isDuplicate ? '#FCA5A5' : 'inherit'
                            }}
                          >
                            <span style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {cellVal}
                            </span>

                            {/* If Cell contains Phone Number, show subtle direct WhatsApp button on hover/selection */}
                            {phone && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: isSelected ? 1 : 0.4 }}>
                                <a
                                  href={`https://wa.me/${phone.replace(/^\+/, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Message on WhatsApp"
                                  style={{
                                    color: '#25D366',
                                    display: 'flex',
                                    alignItems: 'center',
                                    textDecoration: 'none'
                                  }}
                                >
                                  <MessageCircle size={12} />
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Sheets Tab Bar & Status Bar (Google Sheets style) */}
      <div style={{
        background: 'var(--bg-surface, #141720)',
        borderTop: '1px solid var(--border-light, #262B38)',
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {/* Sheet Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', maxWidth: '70%' }}>
          <button
            onClick={handleAddSheet}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#1F2430',
              color: '#10B981',
              border: '1px solid #2F3647',
              borderRadius: '6px',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              flexShrink: 0
            }}
            title="Add New Sheet Tab"
          >
            <Plus size={16} />
          </button>

          {sheets.map((sheet, idx) => {
            const isActive = activeSheetIndex === idx
            return (
              <div
                key={idx}
                onClick={() => {
                  setActiveSheetIndex(idx)
                  setCellStyles(sheet.styles || {})
                  setActiveCell({ row: 0, col: 0 })
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isActive ? '#107C41' : '#1F2430',
                  color: isActive ? '#fff' : '#94A3B8',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  border: isActive ? '1px solid #18A756' : '1px solid #2F3647'
                }}
              >
                {editingSheetTitleIndex === idx ? (
                  <input
                    type="text"
                    value={sheetTitleDraft}
                    autoFocus
                    onChange={(e) => setSheetTitleDraft(e.target.value)}
                    onBlur={() => handleRenameSheet(idx)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRenameSheet(idx)}
                    style={{
                      background: '#0F1117',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      outline: 'none',
                      width: '100px'
                    }}
                  />
                ) : (
                  <span 
                    onDoubleClick={() => {
                      setEditingSheetTitleIndex(idx)
                      setSheetTitleDraft(sheet.sheet_name || `Sheet ${idx + 1}`)
                    }}
                    title="Double-click to rename sheet"
                  >
                    {sheet.sheet_name || `Sheet ${idx + 1}`}
                  </span>
                )}

                {sheets.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteSheet(idx, e)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: isActive ? '#fff' : '#64748B',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Delete Sheet"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Status Bar Metrics (Sum, Count, Rows) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: '#94A3B8' }}>
          <span>Cells: <strong>{filledCellCount}</strong> filled</span>
          {hasNumericValues && (
            <span>Sum: <strong style={{ color: '#10B981' }}>{numericSum.toLocaleString()}</strong></span>
          )}
          <span>Grid: <strong>{activeSheetTotalRows}</strong> rows × <strong>{activeSheetTotalCols}</strong> cols</span>
        </div>
      </div>
    </div>
  )
}

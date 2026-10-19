'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
  AlertCircle,
  CheckSquare
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
    width: i === 0 ? 180 : i === 1 ? 170 : i === 2 ? 140 : i === 3 ? 240 : 130
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
  const [isCloudSynced, setIsCloudSynced] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Selection & Navigation State
  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 })
  const [selection, setSelection] = useState({
    mode: 'cells', // 'cells' | 'rows' | 'cols' | 'all'
    startRow: 0,
    startCol: 0,
    endRow: 0,
    endCol: 0,
    selectedRowIndices: [],
    selectedColIndices: []
  })

  const [editingCell, setEditingCell] = useState(null) // { row, col, initialValue } or null
  const [formulaValue, setFormulaValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingHeaderKey, setEditingHeaderKey] = useState(null)
  const [headerTitleDraft, setHeaderTitleDraft] = useState('')
  const [editingSheetTitleIndex, setEditingSheetTitleIndex] = useState(null)
  const [sheetTitleDraft, setSheetTitleDraft] = useState('')

  // Cell Styles Map { "row_col": { bold: true, italic: true, bg: '#fff' } }
  const [cellStyles, setCellStyles] = useState({})

  // File upload ref & input refs
  const fileInputRef = useRef(null)
  const gridContainerRef = useRef(null)
  const cellInputRef = useRef(null)

  // Mouse drag selection refs
  const isMouseDownRef = useRef(false)
  const dragAnchorRef = useRef({ row: 0, col: 0, type: 'cell' })

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
        setIsCloudSynced(true)
        setLastSaved('Cloud Synced')
      } else {
        // Fallback to local storage or initial defaults
        const cached = localStorage.getItem('cc_rough_sheets_backup')
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSheets(parsed)
              setCellStyles(parsed[0]?.styles || {})
              setIsCloudSynced(false)
              setLastSaved('Local Backup')
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
        setIsCloudSynced(false)
        setLastSaved('Ready')
      }
    } catch (err) {
      console.error('Error loading sheets:', err)
      const cached = localStorage.getItem('cc_rough_sheets_backup')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSheets(parsed)
            setCellStyles(parsed[0]?.styles || {})
          }
        } catch (e) {}
      }
      setIsCloudSynced(false)
      setLastSaved('Offline')
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

  // Global mouse up for selection drag release
  useEffect(() => {
    const handleMouseUp = () => {
      isMouseDownRef.current = false
    }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

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
    if (!sheetsToSave || sheetsToSave.length === 0) return
    setSaving(true)
    try {
      localStorage.setItem('cc_rough_sheets_backup', JSON.stringify(sheetsToSave))

      const res = await fetch('/api/rough-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheets: sheetsToSave })
      })
      const result = await res.json()
      if (result.success) {
        setHasUnsavedChanges(false)
        setIsCloudSynced(true)
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
        addToast('All changes saved to cloud!', 'success')
      } else {
        setHasUnsavedChanges(false)
        setIsCloudSynced(false)
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (Local)')
        addToast('Saved locally in browser!', 'info')
      }
    } catch (err) {
      console.error('Save failed:', err)
      setHasUnsavedChanges(false)
      setIsCloudSynced(false)
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (Local)')
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

  // Keyboard shortcut Ctrl+S / Cmd+S & Select All Ctrl+A
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return
        e.preventDefault()
        setSelection({
          mode: 'all',
          startRow: 0,
          startCol: 0,
          endRow: currentSheet.data.length - 1,
          endCol: currentSheet.columns.length - 1,
          selectedRowIndices: [],
          selectedColIndices: []
        })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, currentSheet])

  // Update a single cell value
  const updateCellValue = useCallback((rowIndex, colIndex, value) => {
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
  }, [activeSheetIndex])

  // Formula bar input changes
  const handleFormulaChange = (e) => {
    const val = e.target.value
    setFormulaValue(val)
    updateCellValue(activeCell.row, activeCell.col, val)
  }

  // --- SELECTION HELPERS & CHECKERS ---
  const isCellSelected = useCallback((r, c) => {
    if (selection.mode === 'all') return true
    if (selection.mode === 'rows') {
      if (selection.selectedRowIndices?.length > 0) {
        return selection.selectedRowIndices.includes(r)
      }
      const minR = Math.min(selection.startRow, selection.endRow)
      const maxR = Math.max(selection.startRow, selection.endRow)
      return r >= minR && r <= maxR
    }
    if (selection.mode === 'cols') {
      if (selection.selectedColIndices?.length > 0) {
        return selection.selectedColIndices.includes(c)
      }
      const minC = Math.min(selection.startCol, selection.endCol)
      const maxC = Math.max(selection.startCol, selection.endCol)
      return c >= minC && c <= maxC
    }
    // 'cells' mode
    const minR = Math.min(selection.startRow, selection.endRow)
    const maxR = Math.max(selection.startRow, selection.endRow)
    const minC = Math.min(selection.startCol, selection.endCol)
    const maxC = Math.max(selection.startCol, selection.endCol)
    return r >= minR && r <= maxR && c >= minC && c <= maxC
  }, [selection])

  const isRowSelected = useCallback((r) => {
    if (selection.mode === 'all') return true
    if (selection.mode === 'rows') {
      if (selection.selectedRowIndices?.length > 0) {
        return selection.selectedRowIndices.includes(r)
      }
      const minR = Math.min(selection.startRow, selection.endRow)
      const maxR = Math.max(selection.startRow, selection.endRow)
      return r >= minR && r <= maxR
    }
    return false
  }, [selection])

  const isColSelected = useCallback((c) => {
    if (selection.mode === 'all') return true
    if (selection.mode === 'cols') {
      if (selection.selectedColIndices?.length > 0) {
        return selection.selectedColIndices.includes(c)
      }
      const minC = Math.min(selection.startCol, selection.endCol)
      const maxC = Math.max(selection.startCol, selection.endCol)
      return c >= minC && c <= maxC
    }
    return false
  }, [selection])

  // Extract all currently selected cells as array of { row, col }
  const getSelectedCells = useCallback(() => {
    const list = []
    const totalR = currentSheet.data.length
    const totalC = currentSheet.columns.length

    if (selection.mode === 'all') {
      for (let r = 0; r < totalR; r++) {
        for (let c = 0; c < totalC; c++) {
          list.push({ row: r, col: c })
        }
      }
    } else if (selection.mode === 'rows') {
      const rows = selection.selectedRowIndices?.length > 0
        ? selection.selectedRowIndices
        : Array.from(
            { length: Math.abs(selection.endRow - selection.startRow) + 1 },
            (_, i) => Math.min(selection.startRow, selection.endRow) + i
          )
      rows.forEach(r => {
        if (r >= 0 && r < totalR) {
          for (let c = 0; c < totalC; c++) {
            list.push({ row: r, col: c })
          }
        }
      })
    } else if (selection.mode === 'cols') {
      const cols = selection.selectedColIndices?.length > 0
        ? selection.selectedColIndices
        : Array.from(
            { length: Math.abs(selection.endCol - selection.startCol) + 1 },
            (_, i) => Math.min(selection.startCol, selection.endCol) + i
          )
      cols.forEach(c => {
        if (c >= 0 && c < totalC) {
          for (let r = 0; r < totalR; r++) {
            list.push({ row: r, col: c })
          }
        }
      })
    } else {
      const minR = Math.min(selection.startRow, selection.endRow)
      const maxR = Math.max(selection.startRow, selection.endRow)
      const minC = Math.min(selection.startCol, selection.endCol)
      const maxC = Math.max(selection.startCol, selection.endCol)
      for (let r = minR; r <= maxR && r < totalR; r++) {
        for (let c = minC; c <= maxC && c < totalC; c++) {
          list.push({ row: r, col: c })
        }
      }
    }
    return list
  }, [currentSheet, selection])

  // --- MOUSE SELECTION HANDLERS ---
  const handleCellMouseDown = (e, rowIndex, colIndex) => {
    if (editingCell) return

    if (e.shiftKey) {
      // Shift+Click: expand selection box from activeCell
      setSelection({
        mode: 'cells',
        startRow: activeCell.row,
        startCol: activeCell.col,
        endRow: rowIndex,
        endCol: colIndex,
        selectedRowIndices: [],
        selectedColIndices: []
      })
    } else {
      // Regular click: reset to single cell and start drag
      setActiveCell({ row: rowIndex, col: colIndex })
      setSelection({
        mode: 'cells',
        startRow: rowIndex,
        startCol: colIndex,
        endRow: rowIndex,
        endCol: colIndex,
        selectedRowIndices: [],
        selectedColIndices: []
      })
      isMouseDownRef.current = true
      dragAnchorRef.current = { row: rowIndex, col: colIndex, type: 'cell' }
    }
  }

  const handleCellMouseEnter = (rowIndex, colIndex) => {
    if (!isMouseDownRef.current || dragAnchorRef.current.type !== 'cell') return
    setSelection(prev => ({
      ...prev,
      mode: 'cells',
      endRow: rowIndex,
      endCol: colIndex,
      selectedRowIndices: [],
      selectedColIndices: []
    }))
  }

  // Row header click and drag (multi-row selection)
  const handleRowHeaderMouseDown = (e, rowIndex) => {
    e.preventDefault()
    const totalCols = currentSheet.columns.length - 1

    if (e.ctrlKey || e.metaKey) {
      // Toggle row in non-contiguous multi-row selection
      const prevRows = selection.mode === 'rows' && selection.selectedRowIndices?.length > 0
        ? [...selection.selectedRowIndices]
        : [activeCell.row]

      const newRows = prevRows.includes(rowIndex)
        ? prevRows.filter(r => r !== rowIndex)
        : [...prevRows, rowIndex]

      setActiveCell({ row: rowIndex, col: 0 })
      setSelection({
        mode: 'rows',
        startRow: rowIndex,
        startCol: 0,
        endRow: rowIndex,
        endCol: totalCols,
        selectedRowIndices: newRows,
        selectedColIndices: []
      })
    } else if (e.shiftKey) {
      // Shift+Click: range select rows
      setSelection(prev => ({
        mode: 'rows',
        startRow: prev.startRow,
        startCol: 0,
        endRow: rowIndex,
        endCol: totalCols,
        selectedRowIndices: [],
        selectedColIndices: []
      }))
    } else {
      // Single row select and start drag
      setActiveCell({ row: rowIndex, col: 0 })
      setSelection({
        mode: 'rows',
        startRow: rowIndex,
        startCol: 0,
        endRow: rowIndex,
        endCol: totalCols,
        selectedRowIndices: [rowIndex],
        selectedColIndices: []
      })
      isMouseDownRef.current = true
      dragAnchorRef.current = { row: rowIndex, col: 0, type: 'row' }
    }
  }

  const handleRowHeaderMouseEnter = (rowIndex) => {
    if (!isMouseDownRef.current || dragAnchorRef.current.type !== 'row') return
    const totalCols = currentSheet.columns.length - 1
    setSelection(prev => ({
      ...prev,
      mode: 'rows',
      endRow: rowIndex,
      endCol: totalCols,
      selectedRowIndices: []
    }))
  }

  // Column header click and drag (multi-column selection)
  const handleColumnHeaderMouseDown = (e, colIndex) => {
    e.preventDefault()
    const totalRows = currentSheet.data.length - 1

    if (e.ctrlKey || e.metaKey) {
      // Toggle column in non-contiguous multi-col selection
      const prevCols = selection.mode === 'cols' && selection.selectedColIndices?.length > 0
        ? [...selection.selectedColIndices]
        : [activeCell.col]

      const newCols = prevCols.includes(colIndex)
        ? prevCols.filter(c => c !== colIndex)
        : [...prevCols, colIndex]

      setActiveCell({ row: 0, col: colIndex })
      setSelection({
        mode: 'cols',
        startRow: 0,
        startCol: colIndex,
        endRow: totalRows,
        endCol: colIndex,
        selectedRowIndices: [],
        selectedColIndices: newCols
      })
    } else if (e.shiftKey) {
      // Shift+Click: range select columns
      setSelection(prev => ({
        mode: 'cols',
        startRow: 0,
        startCol: prev.startCol,
        endRow: totalRows,
        endCol: colIndex,
        selectedRowIndices: [],
        selectedColIndices: []
      }))
    } else {
      // Single column select and start drag
      setActiveCell({ row: 0, col: colIndex })
      setSelection({
        mode: 'cols',
        startRow: 0,
        startCol: colIndex,
        endRow: totalRows,
        endCol: colIndex,
        selectedRowIndices: [],
        selectedColIndices: [colIndex]
      })
      isMouseDownRef.current = true
      dragAnchorRef.current = { row: 0, col: colIndex, type: 'col' }
    }
  }

  const handleColumnHeaderMouseEnter = (colIndex) => {
    if (!isMouseDownRef.current || dragAnchorRef.current.type !== 'col') return
    const totalRows = currentSheet.data.length - 1
    setSelection(prev => ({
      ...prev,
      mode: 'cols',
      endRow: totalRows,
      endCol: colIndex,
      selectedRowIndices: [],
      selectedColIndices: []
    }))
  }

  // Select all via top-left corner '#'
  const handleSelectAll = () => {
    setActiveCell({ row: 0, col: 0 })
    setSelection({
      mode: 'all',
      startRow: 0,
      startCol: 0,
      endRow: currentSheet.data.length - 1,
      endCol: currentSheet.columns.length - 1,
      selectedRowIndices: [],
      selectedColIndices: []
    })
    addToast('Selected all cells', 'info')
  }

  // Navigation with Arrow keys, Enter, Tab, Shift+Arrows, Backspace, Ctrl+C
  const handleCellKeyDown = (e, rowIndex, colIndex) => {
    // If inside cell inline editor
    if (editingCell) {
      if (e.key === 'Enter') {
        e.preventDefault()
        const val = e.currentTarget.value
        updateCellValue(rowIndex, colIndex, val)
        setEditingCell(null)
        if (e.shiftKey) {
          if (rowIndex > 0) {
            setActiveCell({ row: rowIndex - 1, col: colIndex })
            setSelection({ mode: 'cells', startRow: rowIndex - 1, startCol: colIndex, endRow: rowIndex - 1, endCol: colIndex, selectedRowIndices: [], selectedColIndices: [] })
          }
        } else {
          if (rowIndex + 1 < currentSheet.data.length) {
            setActiveCell({ row: rowIndex + 1, col: colIndex })
            setSelection({ mode: 'cells', startRow: rowIndex + 1, startCol: colIndex, endRow: rowIndex + 1, endCol: colIndex, selectedRowIndices: [], selectedColIndices: [] })
          }
        }
      } else if (e.key === 'Tab') {
        e.preventDefault()
        const val = e.currentTarget.value
        updateCellValue(rowIndex, colIndex, val)
        setEditingCell(null)
        if (e.shiftKey) {
          if (colIndex > 0) {
            setActiveCell({ row: rowIndex, col: colIndex - 1 })
            setSelection({ mode: 'cells', startRow: rowIndex, startCol: colIndex - 1, endRow: rowIndex, endCol: colIndex - 1, selectedRowIndices: [], selectedColIndices: [] })
          }
        } else {
          if (colIndex + 1 < currentSheet.columns.length) {
            setActiveCell({ row: rowIndex, col: colIndex + 1 })
            setSelection({ mode: 'cells', startRow: rowIndex, startCol: colIndex + 1, endRow: rowIndex, endCol: colIndex + 1, selectedRowIndices: [], selectedColIndices: [] })
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setEditingCell(null)
      }
      return
    }

    // Copy with Ctrl+C / Cmd+C (Supports single cell & full multi-cell selection grid)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
      const selectedCells = getSelectedCells()
      if (selectedCells.length <= 1) {
        const colKey = currentSheet.columns[colIndex]?.key
        const val = currentSheet.data[rowIndex]?.[colKey] || ''
        navigator.clipboard.writeText(String(val))
        addToast('Copied cell to clipboard', 'info')
      } else {
        const minR = Math.min(...selectedCells.map(c => c.row))
        const maxR = Math.max(...selectedCells.map(c => c.row))
        const minC = Math.min(...selectedCells.map(c => c.col))
        const maxC = Math.max(...selectedCells.map(c => c.col))

        const lines = []
        for (let r = minR; r <= maxR; r++) {
          const lineVals = []
          for (let c = minC; c <= maxC; c++) {
            const isSel = selectedCells.some(item => item.row === r && item.col === c)
            if (isSel) {
              const colKey = currentSheet.columns[c]?.key
              lineVals.push(currentSheet.data[r]?.[colKey] || '')
            } else {
              lineVals.push('')
            }
          }
          lines.push(lineVals.join('\t'))
        }
        navigator.clipboard.writeText(lines.join('\n'))
        addToast(`Copied ${selectedCells.length} cells (${maxR - minR + 1}×${maxC - minC + 1}) to clipboard`, 'success')
      }
      return
    }

    // Shift + Arrow keys to expand/contract selection range
    if (e.shiftKey && ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault()
      setSelection(prev => {
        let nEndRow = prev.endRow
        let nEndCol = prev.endCol
        if (e.key === 'ArrowDown') nEndRow = Math.min(currentSheet.data.length - 1, prev.endRow + 1)
        if (e.key === 'ArrowUp') nEndRow = Math.max(0, prev.endRow - 1)
        if (e.key === 'ArrowRight') nEndCol = Math.min(currentSheet.columns.length - 1, prev.endCol + 1)
        if (e.key === 'ArrowLeft') nEndCol = Math.max(0, prev.endCol - 1)
        return {
          ...prev,
          mode: 'cells',
          endRow: nEndRow,
          endCol: nEndCol,
          selectedRowIndices: [],
          selectedColIndices: []
        }
      })
      return
    }

    // Grid navigation (Single cell movement)
    if (e.key === 'ArrowDown' || (e.key === 'Enter' && !e.shiftKey)) {
      e.preventDefault()
      if (rowIndex + 1 < currentSheet.data.length) {
        setActiveCell({ row: rowIndex + 1, col: colIndex })
        setSelection({ mode: 'cells', startRow: rowIndex + 1, startCol: colIndex, endRow: rowIndex + 1, endCol: colIndex, selectedRowIndices: [], selectedColIndices: [] })
      }
    } else if (e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey)) {
      e.preventDefault()
      if (rowIndex > 0) {
        setActiveCell({ row: rowIndex - 1, col: colIndex })
        setSelection({ mode: 'cells', startRow: rowIndex - 1, startCol: colIndex, endRow: rowIndex - 1, endCol: colIndex, selectedRowIndices: [], selectedColIndices: [] })
      }
    } else if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault()
      if (colIndex + 1 < currentSheet.columns.length) {
        setActiveCell({ row: rowIndex, col: colIndex + 1 })
        setSelection({ mode: 'cells', startRow: rowIndex, startCol: colIndex + 1, endRow: rowIndex, endCol: colIndex + 1, selectedRowIndices: [], selectedColIndices: [] })
      }
    } else if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault()
      if (colIndex > 0) {
        setActiveCell({ row: rowIndex, col: colIndex - 1 })
        setSelection({ mode: 'cells', startRow: rowIndex, startCol: colIndex - 1, endRow: rowIndex, endCol: colIndex - 1, selectedRowIndices: [], selectedColIndices: [] })
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      const selectedCells = getSelectedCells()
      if (selectedCells.length <= 1) {
        updateCellValue(rowIndex, colIndex, '')
      } else {
        // Bulk clear all selected cells
        setSheets(prevSheets => {
          const newSheets = [...prevSheets]
          const targetSheet = { ...newSheets[activeSheetIndex] }
          const newData = [...targetSheet.data]

          selectedCells.forEach(({ row: r, col: c }) => {
            const colKey = targetSheet.columns[c]?.key
            if (colKey && newData[r]) {
              newData[r] = { ...newData[r], [colKey]: '' }
            }
          })

          targetSheet.data = newData
          newSheets[activeSheetIndex] = targetSheet
          return newSheets
        })
        setFormulaValue('')
        setHasUnsavedChanges(true)
        addToast(`Cleared ${selectedCells.length} cells`, 'info')
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Start typing immediately into cell
      e.preventDefault()
      updateCellValue(rowIndex, colIndex, e.key)
      setEditingCell({ row: rowIndex, col: colIndex, initialValue: e.key })
    }
  }

  // Handle Multi-Cell Excel / Google Sheets Clipboard Paste!
  const handlePaste = (e) => {
    const pasteData = e.clipboardData.getData('text')
    if (!pasteData) return

    if (editingCell && !pasteData.includes('\t') && !pasteData.includes('\n')) {
      return
    }

    e.preventDefault()

    const rows = pasteData.split(/\r\n|\n|\r/).filter((r, idx, arr) => {
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

      while (targetColumns.length < requiredCols) {
        const nextColIndex = targetColumns.length
        targetColumns.push({
          key: `col_${nextColIndex + 1}`,
          letter: getColumnLetter(nextColIndex),
          title: `Column ${getColumnLetter(nextColIndex)}`,
          width: 140
        })
      }

      while (targetData.length < requiredRows) {
        const rowObj = {}
        targetColumns.forEach(c => { rowObj[c.key] = '' })
        targetData.push(rowObj)
      }

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

    // Update selection to match pasted range
    setSelection({
      mode: 'cells',
      startRow,
      startCol,
      endRow: startRow + parsedMatrix.length - 1,
      endCol: startCol + Math.max(...parsedMatrix.map(r => r.length)) - 1,
      selectedRowIndices: [],
      selectedColIndices: []
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
    setSelection({ mode: 'cells', startRow: 0, startCol: 0, endRow: 0, endCol: 0, selectedRowIndices: [], selectedColIndices: [] })
    setHasUnsavedChanges(true)
    addToast('Row deleted', 'info')
  }

  // Bulk Delete Selected Rows
  const handleDeleteSelectedRows = () => {
    const selectedRowsSet = new Set()
    if (selection.mode === 'rows') {
      if (selection.selectedRowIndices?.length > 0) {
        selection.selectedRowIndices.forEach(r => selectedRowsSet.add(r))
      } else {
        const minR = Math.min(selection.startRow, selection.endRow)
        const maxR = Math.max(selection.startRow, selection.endRow)
        for (let r = minR; r <= maxR; r++) selectedRowsSet.add(r)
      }
    } else {
      selectedRowsSet.add(activeCell.row)
    }

    if (currentSheet.data.length <= selectedRowsSet.size) {
      addToast('Cannot delete all rows in sheet', 'warning')
      return
    }

    setSheets(prevSheets => {
      const newSheets = [...prevSheets]
      const targetSheet = { ...newSheets[activeSheetIndex] }
      targetSheet.data = targetSheet.data.filter((_, idx) => !selectedRowsSet.has(idx))
      newSheets[activeSheetIndex] = targetSheet
      return newSheets
    })

    setActiveCell({ row: 0, col: 0 })
    setSelection({ mode: 'cells', startRow: 0, startCol: 0, endRow: 0, endCol: 0, selectedRowIndices: [], selectedColIndices: [] })
    setHasUnsavedChanges(true)
    addToast(`Deleted ${selectedRowsSet.size} selected row(s)`, 'info')
  }

  // Bulk Delete Selected Columns
  const handleDeleteSelectedColumns = () => {
    const selectedColsSet = new Set()
    if (selection.mode === 'cols') {
      if (selection.selectedColIndices?.length > 0) {
        selection.selectedColIndices.forEach(c => selectedColsSet.add(c))
      } else {
        const minC = Math.min(selection.startCol, selection.endCol)
        const maxC = Math.max(selection.startCol, selection.endCol)
        for (let c = minC; c <= maxC; c++) selectedColsSet.add(c)
      }
    } else {
      selectedColsSet.add(activeCell.col)
    }

    if (currentSheet.columns.length <= selectedColsSet.size) {
      addToast('Cannot delete all columns in sheet', 'warning')
      return
    }

    setSheets(prevSheets => {
      const newSheets = [...prevSheets]
      const targetSheet = { ...newSheets[activeSheetIndex] }
      const remainingCols = targetSheet.columns
        .filter((_, idx) => !selectedColsSet.has(idx))
        .map((col, idx) => ({ ...col, letter: getColumnLetter(idx) }))

      targetSheet.columns = remainingCols
      newSheets[activeSheetIndex] = targetSheet
      return newSheets
    })

    setActiveCell({ row: 0, col: 0 })
    setSelection({ mode: 'cells', startRow: 0, startCol: 0, endRow: 0, endCol: 0, selectedRowIndices: [], selectedColIndices: [] })
    setHasUnsavedChanges(true)
    addToast(`Deleted ${selectedColsSet.size} selected column(s)`, 'info')
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

  // Formatting Tools applied to ALL selected cells (Bold, Italic, Bg Color)
  const toggleStyle = (styleKey) => {
    const selectedCells = getSelectedCells()
    const activeKey = `${activeCell.row}_${activeCell.col}`
    const targetState = !cellStyles[activeKey]?.[styleKey]

    const updatedStyles = { ...cellStyles }
    selectedCells.forEach(({ row, col }) => {
      const k = `${row}_${col}`
      updatedStyles[k] = {
        ...(updatedStyles[k] || {}),
        [styleKey]: targetState
      }
    })

    setCellStyles(updatedStyles)
    setSheets(prev => {
      const copy = [...prev]
      copy[activeSheetIndex] = { ...copy[activeSheetIndex], styles: updatedStyles }
      return copy
    })
    setHasUnsavedChanges(true)
    if (selectedCells.length > 1) {
      addToast(`Applied ${styleKey} to ${selectedCells.length} cells`, 'info')
    }
  }

  const setCellBgColor = (color) => {
    const selectedCells = getSelectedCells()
    const updatedStyles = { ...cellStyles }
    selectedCells.forEach(({ row, col }) => {
      const k = `${row}_${col}`
      updatedStyles[k] = {
        ...(updatedStyles[k] || {}),
        bg: color
      }
    })

    setCellStyles(updatedStyles)
    setSheets(prev => {
      const copy = [...prev]
      copy[activeSheetIndex] = { ...copy[activeSheetIndex], styles: updatedStyles }
      return copy
    })
    setHasUnsavedChanges(true)
    if (selectedCells.length > 1) {
      addToast(color ? `Highlighted ${selectedCells.length} cells` : `Cleared highlight for ${selectedCells.length} cells`, 'info')
    }
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
    setSelection({ mode: 'cells', startRow: 0, startCol: 0, endRow: 0, endCol: 0, selectedRowIndices: [], selectedColIndices: [] })
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

    if (sheetToDelete.id) {
      fetch(`/api/rough-sheets?id=${sheetToDelete.id}`, { method: 'DELETE' }).catch(console.error)
    }
  }

  // Excel (.xlsx) Export
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new()

      sheets.forEach((sheet) => {
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

        const firstRow = jsonData[0] || []
        const importedCols = firstRow.map((headerText, i) => ({
          key: `col_${i + 1}`,
          letter: getColumnLetter(i),
          title: String(headerText || `Column ${getColumnLetter(i)}`),
          width: 160
        }))

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

  // Focus and select cell input on edit mount
  useEffect(() => {
    if (editingCell && cellInputRef.current) {
      cellInputRef.current.focus()
      const len = cellInputRef.current.value.length
      cellInputRef.current.setSelectionRange(len, len)
    }
  }, [editingCell])

  // Active cell coordinate label
  const activeColLetter = currentSheet.columns[activeCell.col]?.letter || 'A'
  const activeCellCoord = `${activeColLetter}${activeCell.row + 1}`

  // Active cell value and phone check
  const activeCellKey = currentSheet.columns[activeCell.col]?.key
  const activeCellValue = currentSheet.data[activeCell.row]?.[activeCellKey] || ''
  const detectedPhone = extractPhoneNumber(activeCellValue)

  // Selection metrics calculation
  const selectedCells = useMemo(() => getSelectedCells(), [getSelectedCells])
  const isMultiSelected = selectedCells.length > 1

  const selectionMetrics = useMemo(() => {
    let sum = 0
    let numericCount = 0
    let min = Infinity
    let max = -Infinity

    selectedCells.forEach(({ row, col }) => {
      const colKey = currentSheet.columns[col]?.key
      const v = currentSheet.data[row]?.[colKey]
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        const num = parseFloat(String(v).replace(/[^\d.-]/g, ''))
        if (!isNaN(num)) {
          sum += num
          numericCount++
          if (num < min) min = num
          if (num > max) max = num
        }
      }
    })

    return {
      count: selectedCells.length,
      numericCount,
      sum,
      avg: numericCount > 0 ? sum / numericCount : 0,
      min: min !== Infinity ? min : null,
      max: max !== -Infinity ? max : null
    }
  }, [selectedCells, currentSheet])

  // Overall sheet status metrics
  const activeSheetTotalRows = currentSheet.data.length
  const activeSheetTotalCols = currentSheet.columns.length
  let filledCellCount = 0
  let wholeSheetSum = 0
  let hasNumericValues = false

  currentSheet.data.forEach(row => {
    currentSheet.columns.forEach(col => {
      const v = row[col.key]
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        filledCellCount++
        const num = parseFloat(String(v).replace(/[^\d.-]/g, ''))
        if (!isNaN(num)) {
          wholeSheetSum += num
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

  // Selected row/col counts for toolbar indicator
  const selectedRowsCount = selection.mode === 'rows'
    ? (selection.selectedRowIndices?.length || (Math.abs(selection.endRow - selection.startRow) + 1))
    : 0

  const selectedColsCount = selection.mode === 'cols'
    ? (selection.selectedColIndices?.length || (Math.abs(selection.endCol - selection.startCol) + 1))
    : 0

  return (
    <div 
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-base, #F2F5FA)',
        color: 'var(--text-primary, #0D1117)',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        userSelect: isMouseDownRef.current ? 'none' : 'auto'
      }}
      onPaste={handlePaste}
    >
      <Navbar />

      {/* Top Application Header */}
      <div style={{
        background: 'var(--bg-surface, #FFFFFF)',
        borderBottom: '1px solid var(--border-light, #E5E7EB)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #107C41 0%, #16A34A 100%)',
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 14px rgba(16, 124, 65, 0.25)',
            flexShrink: 0
          }}>
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text-primary, #0D1117)',
                letterSpacing: '-0.01em'
              }}>
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
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted, #6B7280)' }}>
              Rough scratchpad for phone numbers, notes, supplier lists, and fast multi-cell Excel paste
            </p>
          </div>
        </div>

        {/* Sync Status & Primary Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Sync Status Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: hasUnsavedChanges ? '#D97706' : '#10B981',
            background: hasUnsavedChanges ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: `1px solid ${hasUnsavedChanges ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            fontWeight: 500
          }}>
            {saving ? (
              <>
                <RefreshCw size={13} className="spin" />
                <span>Saving...</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <AlertCircle size={13} />
                <span>Unsaved edits</span>
              </>
            ) : (
              <>
                <Check size={13} />
                <span>{lastSaved ? (isCloudSynced ? `Saved to cloud (${lastSaved})` : `Saved (${lastSaved})`) : 'Saved'}</span>
              </>
            )}
          </div>

          {/* Manual Save Button */}
          <button
            onClick={() => handleSave()}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: hasUnsavedChanges ? '#107C41' : 'var(--bg-subtle, #EEF1F8)',
              color: hasUnsavedChanges ? '#FFFFFF' : 'var(--text-secondary, #374151)',
              border: hasUnsavedChanges ? 'none' : '1px solid var(--border-light, #E5E7EB)',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: hasUnsavedChanges ? '0 2px 10px rgba(16, 124, 65, 0.35)' : 'none'
            }}
          >
            <Save size={15} />
            <span>{saving ? 'Saving...' : 'Save (Ctrl+S)'}</span>
          </button>

          {/* Import File Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--bg-subtle, #EEF1F8)',
              color: 'var(--text-secondary, #374151)',
              border: '1px solid var(--border-light, #E5E7EB)',
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

          {/* Export File Button */}
          <button
            onClick={handleExportExcel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--bg-subtle, #EEF1F8)',
              color: 'var(--text-secondary, #374151)',
              border: '1px solid var(--border-light, #E5E7EB)',
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

      {/* Spreadsheet Toolbar (Formulas, Formatting, Add rows/cols, Multi-Select Bulk Actions) */}
      <div style={{
        background: 'var(--bg-surface, #FFFFFF)',
        borderBottom: '1px solid var(--border-light, #E5E7EB)',
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
              background: 'var(--bg-subtle, #EEF1F8)',
              color: 'var(--text-secondary, #374151)',
              border: '1px solid var(--border-light, #E5E7EB)',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
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
              background: 'var(--bg-subtle, #EEF1F8)',
              color: 'var(--text-secondary, #374151)',
              border: '1px solid var(--border-light, #E5E7EB)',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
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
              background: 'var(--bg-subtle, #EEF1F8)',
              color: 'var(--text-secondary, #374151)',
              border: '1px solid var(--border-light, #E5E7EB)',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
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
              background: 'var(--bg-subtle, #EEF1F8)',
              color: 'var(--text-muted, #6B7280)',
              border: '1px solid var(--border-light, #E5E7EB)',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <span>Clear Blanks</span>
          </button>
        </div>

        {/* Dynamic Context Actions for Multi-Row / Multi-Column Selection */}
        {selectedRowsCount > 0 && (
          <>
            <div style={{ width: '1px', height: '22px', background: 'var(--border-light, #E5E7EB)' }} />
            <button
              onClick={handleDeleteSelectedRows}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#EF4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Delete all currently selected rows"
            >
              <Trash2 size={13} />
              <span>Delete {selectedRowsCount} Row{selectedRowsCount > 1 ? 's' : ''}</span>
            </button>
          </>
        )}

        {selectedColsCount > 0 && (
          <>
            <div style={{ width: '1px', height: '22px', background: 'var(--border-light, #E5E7EB)' }} />
            <button
              onClick={handleDeleteSelectedColumns}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#EF4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Delete all currently selected columns"
            >
              <Trash2 size={13} />
              <span>Delete {selectedColsCount} Column{selectedColsCount > 1 ? 's' : ''}</span>
            </button>
          </>
        )}

        <div style={{ width: '1px', height: '22px', background: 'var(--border-light, #E5E7EB)' }} />

        {/* Formatting Tools (Applied to selection) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => toggleStyle('bold')}
            style={{
              background: cellStyles[`${activeCell.row}_${activeCell.col}`]?.bold ? '#107C41' : 'var(--bg-subtle, #EEF1F8)',
              color: cellStyles[`${activeCell.row}_${activeCell.col}`]?.bold ? '#FFFFFF' : 'var(--text-secondary, #374151)',
              border: '1px solid var(--border-light, #E5E7EB)',
              padding: '5px 8px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            title={isMultiSelected ? `Bold selection (${selectedCells.length} cells)` : 'Bold'}
          >
            <Bold size={13} />
          </button>
          <button
            onClick={() => toggleStyle('italic')}
            style={{
              background: cellStyles[`${activeCell.row}_${activeCell.col}`]?.italic ? '#107C41' : 'var(--bg-subtle, #EEF1F8)',
              color: cellStyles[`${activeCell.row}_${activeCell.col}`]?.italic ? '#FFFFFF' : 'var(--text-secondary, #374151)',
              border: '1px solid var(--border-light, #E5E7EB)',
              padding: '5px 8px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            title={isMultiSelected ? `Italic selection (${selectedCells.length} cells)` : 'Italic'}
          >
            <Italic size={13} />
          </button>

          {/* Color markers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
            {['#10B98125', '#F59E0B25', '#3B82F625', '#EF444425', ''].map((color, i) => (
              <button
                key={i}
                onClick={() => setCellBgColor(color)}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  background: color || 'var(--bg-surface, #FFFFFF)',
                  border: color ? '1px solid rgba(0,0,0,0.2)' : '1px solid var(--border-medium, #D1D5DB)',
                  cursor: 'pointer'
                }}
                title={color ? 'Highlight selection' : 'Clear highlight'}
              />
            ))}
          </div>
        </div>

        <div style={{ width: '1px', height: '22px', background: 'var(--border-light, #E5E7EB)' }} />

        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--bg-subtle, #EEF1F8)',
          padding: '4px 10px',
          borderRadius: '6px',
          border: '1px solid var(--border-light, #E5E7EB)',
          flex: 1,
          maxWidth: '260px'
        }}>
          <Search size={13} color="var(--text-muted, #6B7280)" />
          <input
            type="text"
            placeholder="Search workbook..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary, #0D1117)',
              fontSize: '12px',
              width: '100%',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <X size={12} color="var(--text-muted, #6B7280)" style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
          )}
        </div>

        {/* Duplicate Phone Notice */}
        {duplicatePhoneList.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#EF4444',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500
          }}>
            <AlertCircle size={13} />
            <span>{duplicatePhoneList.length} duplicate phone number(s) found</span>
          </div>
        )}
      </div>

      {/* Formula Bar & Active Cell Info */}
      <div style={{
        background: 'var(--bg-surface, #FFFFFF)',
        borderBottom: '1px solid var(--border-light, #E5E7EB)',
        padding: '6px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        {/* Active Coordinate / Selection Range */}
        <div style={{
          background: 'var(--bg-subtle, #EEF1F8)',
          border: '1px solid var(--border-light, #E5E7EB)',
          padding: '4px 12px',
          borderRadius: '4px',
          fontSize: '13px',
          fontWeight: 700,
          color: '#107C41',
          minWidth: '60px',
          textAlign: 'center',
          fontFamily: 'var(--font-mono, monospace)',
          userSelect: 'none'
        }}>
          {isMultiSelected 
            ? `${activeCellCoord} (${selectedCells.length})`
            : activeCellCoord}
        </div>

        {/* fx symbol */}
        <div style={{ color: 'var(--text-muted, #6B7280)', fontWeight: 700, fontSize: '13px', userSelect: 'none' }}>
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
            background: 'var(--bg-subtle, #EEF1F8)',
            border: '1px solid var(--border-light, #E5E7EB)',
            padding: '6px 12px',
            borderRadius: '4px',
            color: 'var(--text-primary, #0D1117)',
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
            background: 'rgba(16, 185, 129, 0.12)',
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
            <a
              href={`tel:${detectedPhone}`}
              style={{
                color: 'var(--text-muted, #6B7280)',
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none'
              }}
              title="Call Phone"
            >
              <ExternalLink size={12} />
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(detectedPhone)
                addToast('Phone number copied!', 'success')
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #6B7280)',
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
          background: 'var(--bg-base, #F2F5FA)',
          position: 'relative'
        }}
      >
        <table style={{
          borderCollapse: 'collapse',
          width: 'max-content',
          minWidth: '100%',
          tableLayout: 'fixed',
          fontFamily: 'var(--font-sans, system-ui, sans-serif)',
          fontSize: '13px'
        }}>
          {/* Header Row */}
          <thead>
            <tr>
              {/* Corner Cell: Select All */}
              <th 
                onClick={handleSelectAll}
                style={{
                  position: 'sticky',
                  top: 0,
                  left: 0,
                  zIndex: 35,
                  width: '46px',
                  minWidth: '46px',
                  background: selection.mode === 'all' ? '#107C41' : 'var(--bg-subtle, #EEF1F8)',
                  borderRight: '1px solid var(--border-light, #E5E7EB)',
                  borderBottom: '1px solid var(--border-light, #E5E7EB)',
                  color: selection.mode === 'all' ? '#FFFFFF' : 'var(--text-muted, #6B7280)',
                  fontSize: '11px',
                  textAlign: 'center',
                  padding: '6px 0',
                  userSelect: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
                title="Select All (Ctrl+A)"
              >
                #
              </th>

              {/* Column Headers (A, B, C... with customizable title) */}
              {currentSheet.columns.map((col, colIndex) => {
                const isColActive = isColSelected(colIndex)
                return (
                  <th
                    key={col.key}
                    onMouseDown={(e) => handleColumnHeaderMouseDown(e, colIndex)}
                    onMouseEnter={() => handleColumnHeaderMouseEnter(colIndex)}
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 20,
                      width: `${col.width || 150}px`,
                      minWidth: '110px',
                      background: isColActive ? 'rgba(16, 124, 65, 0.14)' : 'var(--bg-subtle, #EEF1F8)',
                      borderRight: '1px solid var(--border-light, #E5E7EB)',
                      borderBottom: isColActive ? '2px solid #107C41' : '1px solid var(--border-light, #E5E7EB)',
                      color: isColActive ? '#107C41' : 'var(--text-secondary, #374151)',
                      padding: '8px 10px',
                      textAlign: 'left',
                      fontWeight: 600,
                      userSelect: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.12s ease'
                    }}
                    title={`Column ${col.letter} (Click to select, drag/Shift to multi-select)`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, overflow: 'hidden' }}>
                        <span style={{ fontSize: '11px', color: isColActive ? '#107C41' : 'var(--text-muted, #6B7280)', fontWeight: 700 }}>
                          {col.letter}
                        </span>
                        {editingHeaderKey === col.key ? (
                          <input
                            type="text"
                            value={headerTitleDraft}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onChange={(e) => setHeaderTitleDraft(e.target.value)}
                            onBlur={() => saveHeaderTitle(col.key)}
                            onKeyDown={(e) => e.key === 'Enter' && saveHeaderTitle(col.key)}
                            style={{
                              background: 'var(--bg-surface, #FFFFFF)',
                              border: '1px solid #107C41',
                              color: 'var(--text-primary, #0D1117)',
                              fontSize: '12px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              width: '100%',
                              outline: 'none'
                            }}
                          />
                        ) : (
                          <span
                            onDoubleClick={(e) => {
                              e.stopPropagation()
                              startEditingHeader(col.key, col.title)
                            }}
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title="Double-click to rename column"
                          >
                            {col.title}
                          </span>
                        )}
                      </div>
                      <Edit2
                        size={11}
                        color="var(--text-muted, #6B7280)"
                        style={{ cursor: 'pointer', flexShrink: 0 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          startEditingHeader(col.key, col.title)
                        }}
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
              const isRowActive = isRowSelected(rowIndex)
              return (
                <tr key={rowIndex}>
                  {/* Row Number Header */}
                  <td
                    onMouseDown={(e) => handleRowHeaderMouseDown(e, rowIndex)}
                    onMouseEnter={() => handleRowHeaderMouseEnter(rowIndex)}
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 10,
                      background: isRowActive ? 'rgba(16, 124, 65, 0.14)' : 'var(--bg-subtle, #EEF1F8)',
                      borderRight: isRowActive ? '2px solid #107C41' : '1px solid var(--border-light, #E5E7EB)',
                      borderBottom: '1px solid var(--border-light, #E5E7EB)',
                      color: isRowActive ? '#107C41' : 'var(--text-muted, #6B7280)',
                      fontSize: '11px',
                      fontWeight: 700,
                      textAlign: 'center',
                      padding: '4px 0',
                      userSelect: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.12s ease'
                    }}
                    title={`Row ${rowIndex + 1} (Click to select, drag/Shift to multi-select)`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                      <span>{rowIndex + 1}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteRow(rowIndex)
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          padding: '2px',
                          display: isRowActive ? 'inline-block' : 'none'
                        }}
                        title="Delete this row"
                      >
                        <Trash2 size={10} color="#EF4444" />
                      </button>
                    </div>
                  </td>

                  {/* Cells */}
                  {currentSheet.columns.map((col, colIndex) => {
                    const isFocused = activeCell.row === rowIndex && activeCell.col === colIndex
                    const isSelected = isCellSelected(rowIndex, colIndex)
                    const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex
                    const cellVal = row[col.key] || ''
                    const cellKey = `${rowIndex}_${colIndex}`
                    const style = cellStyles[cellKey] || {}
                    const phone = extractPhoneNumber(cellVal)
                    const isDuplicate = phone && phoneCounts[phone] > 1

                    const isSearchMatch = searchQuery && String(cellVal).toLowerCase().includes(searchQuery.toLowerCase())

                    // Cell Background determination
                    let cellBg = 'var(--bg-surface, #FFFFFF)'
                    if (isSearchMatch) {
                      cellBg = 'rgba(245, 158, 11, 0.25)'
                    } else if (style.bg) {
                      cellBg = style.bg
                    } else if (isSelected) {
                      cellBg = 'rgba(16, 124, 65, 0.12)'
                    }

                    return (
                      <td
                        key={col.key}
                        onMouseDown={(e) => handleCellMouseDown(e, rowIndex, colIndex)}
                        onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                        onDoubleClick={() => {
                          setActiveCell({ row: rowIndex, col: colIndex })
                          setSelection({ mode: 'cells', startRow: rowIndex, startCol: colIndex, endRow: rowIndex, endCol: colIndex, selectedRowIndices: [], selectedColIndices: [] })
                          setEditingCell({ row: rowIndex, col: colIndex, initialValue: cellVal })
                        }}
                        style={{
                          borderRight: '1px solid var(--border-light, #E5E7EB)',
                          borderBottom: '1px solid var(--border-light, #E5E7EB)',
                          padding: 0,
                          height: '32px',
                          position: 'relative',
                          background: cellBg,
                          outline: isFocused ? '2px solid #107C41' : 'none',
                          outlineOffset: '-2px',
                          zIndex: isFocused ? 5 : 1
                        }}
                      >
                        {isEditing ? (
                          <input
                            ref={cellInputRef}
                            type="text"
                            defaultValue={editingCell.initialValue !== undefined ? editingCell.initialValue : cellVal}
                            onBlur={(e) => {
                              updateCellValue(rowIndex, colIndex, e.target.value)
                              setEditingCell(null)
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, rowIndex, colIndex)}
                            style={{
                              width: '100%',
                              height: '100%',
                              background: 'var(--bg-surface, #FFFFFF)',
                              border: 'none',
                              color: 'var(--text-primary, #0D1117)',
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
                              color: isDuplicate ? '#EF4444' : 'inherit'
                            }}
                          >
                            <span style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {cellVal}
                            </span>

                            {/* Direct WhatsApp button on hover/selection if cell has phone number */}
                            {phone && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: isFocused ? 1 : 0.4 }}>
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

      {/* Bottom Sheets Tab Bar & Status Bar (Google Sheets style with Multi-Select Stats) */}
      <div style={{
        background: 'var(--bg-surface, #FFFFFF)',
        borderTop: '1px solid var(--border-light, #E5E7EB)',
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {/* Sheet Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', maxWidth: '55%' }}>
          <button
            onClick={handleAddSheet}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-subtle, #EEF1F8)',
              color: '#107C41',
              border: '1px solid var(--border-light, #E5E7EB)',
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
                  setSelection({ mode: 'cells', startRow: 0, startCol: 0, endRow: 0, endCol: 0, selectedRowIndices: [], selectedColIndices: [] })
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isActive ? '#107C41' : 'var(--bg-subtle, #EEF1F8)',
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary, #374151)',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  border: isActive ? '1px solid #107C41' : '1px solid var(--border-light, #E5E7EB)'
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
                      background: 'var(--bg-surface, #FFFFFF)',
                      border: 'none',
                      color: 'var(--text-primary, #0D1117)',
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
                      color: isActive ? '#FFFFFF' : 'var(--text-muted, #6B7280)',
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

        {/* Status Bar Metrics (Sum, Count, Selected Stats) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: 'var(--text-muted, #6B7280)', flexWrap: 'wrap' }}>
          {isMultiSelected ? (
            <>
              <span style={{
                background: 'rgba(16, 124, 65, 0.1)',
                color: '#107C41',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 600
              }}>
                Selected: <strong>{selectionMetrics.count}</strong> cells
              </span>
              {selectionMetrics.numericCount > 0 && (
                <>
                  <span>Sum: <strong style={{ color: '#107C41' }}>{selectionMetrics.sum.toLocaleString()}</strong></span>
                  <span>Avg: <strong>{selectionMetrics.avg.toFixed(1)}</strong></span>
                  <span>Count: <strong>{selectionMetrics.numericCount}</strong></span>
                  {selectionMetrics.min !== null && (
                    <span>Min: <strong>{selectionMetrics.min.toLocaleString()}</strong></span>
                  )}
                  {selectionMetrics.max !== null && (
                    <span>Max: <strong>{selectionMetrics.max.toLocaleString()}</strong></span>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <span>Cells: <strong style={{ color: 'var(--text-primary, #0D1117)' }}>{filledCellCount}</strong> filled</span>
              {hasNumericValues && (
                <span>Sum: <strong style={{ color: '#107C41' }}>{wholeSheetSum.toLocaleString()}</strong></span>
              )}
              <span>Grid: <strong style={{ color: 'var(--text-primary, #0D1117)' }}>{activeSheetTotalRows}</strong> rows × <strong style={{ color: 'var(--text-primary, #0D1117)' }}>{activeSheetTotalCols}</strong> cols</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

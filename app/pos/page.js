'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import { 
  ShoppingBag, Trash2, Printer, Settings, Award, User, RefreshCw, 
  Search, ClipboardList, Lock, Unlock, DollarSign, Layers, CheckCircle, 
  MapPin, Wifi, Info, Tag, Edit3, X, ChevronRight, AlertTriangle,
  Coffee, LayoutDashboard, LogOut
} from 'lucide-react'

export default function POSPage() {
  const router = useRouter()
  const { addToast } = useToast()
  
  const [currentUser, setCurrentUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  
  // State variables
  const [lang, setLang] = useState('en')
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState([])
  const [tableNumber, setTableNumber] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [member, setMember] = useState(null)
  const [checkingMember, setCheckingMember] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Shift Management State
  const [shift, setShift] = useState(null)
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [openingFloat, setOpeningFloat] = useState('')
  const [closingCash, setClosingCash] = useState('')
  const [actualCash, setActualCash] = useState('')
  const [shiftNotes, setShiftNotes] = useState('')
  const [staffList, setStaffList] = useState([])
  const [selectedStaff, setSelectedStaff] = useState('')

  // Settings Panel State
  const [showSettings, setShowSettings] = useState(false)
  const [posSettings, setPosSettings] = useState({
    vat_percent: '5',
    service_charge_percent: '10',
    receipt_header_title: 'Crown Coffee',
    receipt_header_subtitle: 'Premium Coffee & Bakery',
    receipt_address: 'Banani, Dhaka, Bangladesh',
    receipt_phone: '+880 1700-000000',
    receipt_bin: '123456789-BIN',
    receipt_wifi_pass: 'CrownCoffee@2026',
    cashier_printer_ip: '192.168.1.100',
    kitchen_printer_ip: '192.168.1.101',
    bar_printer_ip: '192.168.1.102',
    printer_port: '9100',
    receipt_width_mm: '80'
  })

  // Print Queue / Preview modal State
  const [receiptToPrint, setReceiptToPrint] = useState(null)
  const [isPrinting, setIsPrinting] = useState(false)

  // Translations
  const t = {
    en: {
      posTitle: "Point of Sale",
      shiftStatus: "Shift Status",
      shiftOpen: "Shift Open",
      shiftClosed: "Shift Closed",
      openShift: "Open Shift",
      closeShift: "Close Shift & Print Z-Report",
      searchPlaceholder: "Search menu item...",
      all: "All",
      itemsLeft: "left",
      outOfStock: "Out of stock",
      lowStock: "Low stock",
      cart: "Current Cart",
      emptyCart: "Cart is empty. Select items to begin.",
      tableNum: "Table #",
      memberSearch: "Member Phone",
      checkMember: "Validate Member",
      memberFound: "Member Verified",
      memberDiscount: "Membership Discount",
      subtotal: "Subtotal",
      vat: "VAT",
      serviceCharge: "Service Charge",
      grandTotal: "Grand Total",
      paymentMethod: "Payment Method",
      cash: "Cash",
      card: "Card",
      mobile: "Mobile Banking",
      checkout: "Place Order & Print Receipt",
      openingFloatLabel: "Enter Opening Float Amount (৳)",
      openingFloatPlaceholder: "e.g. 2000",
      selectStaffMember: "Select Staff Member",
      cancel: "Cancel",
      closeShiftTitle: "Close Cash Shift",
      closingCashLabel: "Expected Cash Drawer (৳)",
      actualCashLabel: "Actual Cash Counted (৳)",
      notes: "Shift Summary / Cash Difference Notes",
      submit: "Submit",
      settingsTitle: "POS Configurations",
      softwareSettings: "Software Configurations",
      hardwareSettings: "Hardware / Printer Setup",
      vatPercent: "VAT (%)",
      scPercent: "Service Charge (%)",
      cafeName: "Cafe Header Title",
      cafeSub: "Header Subtitle",
      address: "Street Address",
      phone: "Contact Phone",
      bin: "VAT / BIN Registration",
      wifi: "Customer Wi-Fi Password",
      cashierIP: "Cashier Printer IP",
      kitchenIP: "Kitchen Printer IP",
      barIP: "Bar Printer IP",
      port: "Port Number",
      receiptWidth: "Paper Width",
      saveSettings: "Save Settings",
      orderPlaced: "Order placed successfully!",
      stockWarning: "Item cannot be added due to out of stock ingredients.",
      printPreview: "Print Invoice",
      printKOTBar: "Print Bar KOT",
      printKOTKitchen: "Print Kitchen KOT",
      printClose: "Close Print View"
    },
    bn: {
      posTitle: "পয়েন্ট অব সেল (POS)",
      shiftStatus: "শিফট স্ট্যাটাস",
      shiftOpen: "শিফট চলমান",
      shiftClosed: "শিফট বন্ধ",
      openShift: "শিফট শুরু করুন",
      closeShift: "শিফট সমাপ্ত ও Z-রিপোর্ট প্রিন্ট",
      searchPlaceholder: "মেনু খুঁজুন...",
      all: "সব",
      itemsLeft: "বাকি",
      outOfStock: "স্টক নেই",
      lowStock: "কম স্টক",
      cart: "চলতি কার্ট",
      emptyCart: "কার্ট খালি। মেনু থেকে আইটেম যোগ করুন।",
      tableNum: "টেবিল নং",
      memberSearch: "সদস্যের ফোন নম্বর",
      checkMember: "সদস্য যাচাই করুন",
      memberFound: "সদস্য নিশ্চিত করা হয়েছে",
      memberDiscount: "মেম্বার ডিসকাউন্ট",
      subtotal: "সাবটোটাল",
      vat: "ভ্যাট",
      serviceCharge: "সার্ভিস চার্জ",
      grandTotal: "সর্বমোট বিল",
      paymentMethod: "পেমেন্ট মাধ্যম",
      cash: "নগদ",
      card: "কার্ড",
      mobile: "মোবাইল ব্যাংকিং",
      checkout: "অর্ডার সম্পন্ন ও রশিদ প্রিন্ট",
      openingFloatLabel: "প্রারম্ভিক ক্যাশ ফ্লোট এন্ট্রি করুন (৳)",
      openingFloatPlaceholder: "যেমন: ২০০০",
      selectStaffMember: "স্টাফ সদস্য নির্বাচন করুন",
      cancel: "বাতিল",
      closeShiftTitle: "ক্যাশ শিফট সমাপ্তি",
      closingCashLabel: "প্রত্যাশিত ক্যাশ ড্রয়ার (৳)",
      actualCashLabel: "প্রকৃত ক্যাশ গণনা (৳)",
      notes: "শিফট সারাংশ / ক্যাশ কম-বেশির মন্তব্য",
      submit: "দাখিল করুন",
      settingsTitle: "POS কনফিগারেশন",
      softwareSettings: "সফটওয়্যার কনফিগারেশন",
      hardwareSettings: "হার্ডওয়্যার / প্রিন্টার সেটআপ",
      vatPercent: "ভ্যাট (%)",
      scPercent: "সার্ভিস চার্জ (%)",
      cafeName: "ক্যাফে নাম (রশিদ হেডার)",
      cafeSub: "রশিদ সাবহেডার",
      address: "ঠিকানা",
      phone: "যোগাযোগ ফোন",
      bin: "ভ্যাট / বিন রেজিস্ট্রেশন",
      wifi: "গ্রাহক ওয়াই-ফাই পাসওয়ার্ড",
      cashierIP: "ক্যাশিয়ার প্রিন্টার IP",
      kitchenIP: "কিচেন প্রিন্টার IP",
      barIP: "বার প্রিন্টার IP",
      port: "পোর্ট নম্বর",
      receiptWidth: "কাগজের প্রস্থ",
      saveSettings: "সেটিংস সংরক্ষণ করুন",
      orderPlaced: "অর্ডারটি সফলভাবে সম্পন্ন হয়েছে!",
      stockWarning: "প্রয়োজনীয় উপাদানের স্টক না থাকায় আইটেমটি যোগ করা যাচ্ছে না।",
      printPreview: "ইনভয়েস প্রিন্ট করুন",
      printKOTBar: "বার KOT প্রিন্ট করুন",
      printKOTKitchen: "কিচেন KOT প্রিন্ট করুন",
      printClose: "প্রিন্ট ভিউ বন্ধ করুন"
    }
  }[lang]

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    const name = localStorage.getItem('cc_username') || localStorage.getItem('cc_staff_name')

    if (!token) {
      router.replace('/')
      return
    }

    setCurrentUser(name)
    setUserRole(role)

    fetchActiveShift()
    fetchMenuAndInventory()
    fetchStaffList()
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const { data, error } = await supabase.from('pos_settings').select('*')
      if (error) throw error
      if (data && data.length > 0) {
        const loadedSettings = {}
        data.forEach(item => {
          loadedSettings[item.key] = item.value
        })
        setPosSettings(prev => ({ ...prev, ...loadedSettings }))
      }
    } catch (e) {
      console.error("Failed to load POS settings:", e)
    }
  }

  async function fetchStaffList() {
    const { data } = await supabase.from('staff').select('id, name').eq('is_active', true)
    setStaffList(data || [])
  }

  async function fetchActiveShift() {
    try {
      const res = await fetch('/api/pos/shift?active=true')
      const result = await res.json()
      if (res.ok && result.shifts?.length > 0) {
        setShift(result.shifts[0])
      } else {
        setShift(null)
        setShowShiftModal(true) // force shift initiation if none active
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function fetchMenuAndInventory() {
    try {
      setLoading(true)
      // Pull menu_items with recipes and nested ingredients
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          *,
          recipes (
            id,
            quantity,
            unit,
            ingredients (
              id,
              name,
              current_stock,
              unit
            )
          )
        `)
        .eq('is_active', true)
      
      if (error) throw error

      setMenuItems(data || [])
      
      // Extract unique categories
      const cats = Array.from(new Set((data || []).map(item => item.category)))
      setCategories(cats)
    } catch (e) {
      console.error(e)
      addToast("Failed to load menu", "error")
    } finally {
      setLoading(false)
    }
  }

  // Calculate live ingredient inventory availability
  function getAvailability(item) {
    if (!item.recipes || item.recipes.length === 0) return { status: 'available', qty: 999 }
    
    let minAvail = Infinity
    for (const r of item.recipes) {
      const ing = r.ingredients
      if (!ing) continue
      const current = Number(ing.current_stock) || 0
      const needed = Number(r.quantity) || 0
      if (needed <= 0) continue
      const possible = Math.floor(current / needed)
      if (possible < minAvail) {
        minAvail = possible
      }
    }
    const qty = minAvail === Infinity ? 999 : minAvail
    return {
      qty,
      status: qty <= 0 ? 'out_of_stock' : qty <= 5 ? 'low_stock' : 'available'
    }
  }

  async function handleSearchMember() {
    if (!customerPhone) return
    try {
      setCheckingMember(true)
      const { data, error } = await supabase.from('members').select('*').eq('phone_number', customerPhone.trim()).single()
      if (error || !data) {
        addToast(lang === 'bn' ? "সদস্য খুঁজে পাওয়া যায়নি।" : "No member found with this phone number", "error")
        setMember(null)
      } else {
        setMember(data)
        addToast(t.memberFound + `: ${data.full_name} (${data.tier})`, "success")
      }
    } catch (e) {
      setMember(null)
    } finally {
      setCheckingMember(false)
    }
  }

  const addToCart = (item) => {
    if (!shift) {
      setShowShiftModal(true)
      return
    }

    const avail = getAvailability(item)
    if (avail.status === 'out_of_stock') {
      addToast(t.stockWarning, "error")
      return
    }

    setCart(prev => {
      const existing = prev.find(i => i.id === item.id)
      const cartQty = existing ? existing.cartQty : 0
      
      if (cartQty + 1 > avail.qty) {
        addToast(t.stockWarning, "error")
        return prev
      }

      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, cartQty: i.cartQty + 1 } : i)
      }
      return [...prev, { ...item, cartQty: 1 }]
    })
  }

  const updateCartQty = (itemId, change) => {
    const item = menuItems.find(i => i.id === itemId)
    const avail = getAvailability(item)

    setCart(prev => {
      return prev.map(i => {
        if (i.id === itemId) {
          const target = i.cartQty + change
          if (target <= 0) return null
          if (target > avail.qty) {
            addToast(t.stockWarning, "error")
            return i
          }
          return { ...i, cartQty: target }
        }
        return i
      }).filter(Boolean)
    })
  }

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(i => i.id !== itemId))
  }

  // Cost calculations
  const calculateTotals = () => {
    const subtotal = cart.reduce((s, i) => s + (i.selling_price * i.cartQty), 0)
    
    // Member Tier Discount calculation
    let discountPercent = 0
    if (member) {
      if (member.tier?.toLowerCase() === 'gold') discountPercent = 10
      else discountPercent = 5 // Silver/Standard
    }

    const discountAmount = Math.round((subtotal * discountPercent) / 100)
    const afterDiscount = subtotal - discountAmount

    const vatPercent = parseFloat(posSettings.vat_percent) || 0
    const scPercent = parseFloat(posSettings.service_charge_percent) || 0

    const vatAmount = Math.round((afterDiscount * vatPercent) / 100)
    const scAmount = Math.round((afterDiscount * scPercent) / 100)
    const grandTotal = afterDiscount + vatAmount + scAmount

    return {
      subtotal,
      discountPercent,
      discountAmount,
      vatAmount,
      scAmount,
      grandTotal
    }
  }

  const totals = calculateTotals()

  async function handleOpenShift(e) {
    e.preventDefault()
    if (!openingFloat || !selectedStaff) return
    try {
      const res = await fetch('/api/pos/shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'open',
          opened_by: selectedStaff,
          opening_float: openingFloat
        })
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      setShift(result.shift)
      setShowShiftModal(false)
      addToast(lang === 'bn' ? "শিফট সফলভাবে খোলা হয়েছে!" : "Cash shift opened successfully!", "success")
    } catch (err) {
      addToast(err.message, "error")
    }
  }

  async function handleCloseShift(e) {
    e.preventDefault()
    if (!shift) return
    try {
      const res = await fetch('/api/pos/shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close',
          shift_id: shift.id,
          closing_cash: closingCash,
          actual_cash: actualCash,
          notes: shiftNotes
        })
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      // Print Z report logic can be triggered here or simulated
      window.print()

      setShift(null)
      setClosingCash('')
      setActualCash('')
      setShiftNotes('')
      setShowShiftModal(true)
      addToast(lang === 'bn' ? "শিফট সমাপ্ত করা হয়েছে!" : "Cash shift closed successfully!", "success")
    } catch (err) {
      addToast(err.message, "error")
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault()
    try {
      const promises = Object.entries(posSettings).map(([key, value]) => {
        return supabase.from('pos_settings').upsert({
          key,
          value: value.toString(),
          category: ['cashier_printer_ip', 'kitchen_printer_ip', 'bar_printer_ip', 'printer_port', 'receipt_width_mm'].includes(key) ? 'hardware' : 'software'
        })
      })
      await Promise.all(promises)
      addToast(lang === 'bn' ? "কনফিগারেশন সফলভাবে সংরক্ষিত হয়েছে!" : "Configurations saved successfully!", "success")
      setShowSettings(false)
    } catch (err) {
      addToast(err.message, "error")
    }
  }

  // Main Checkout submit
  async function handleCheckout() {
    if (cart.length === 0) return
    if (!shift) {
      setShowShiftModal(true)
      return
    }

    try {
      setIsSubmitting(true)
      
      // 1. Log sales in database (which triggers stock deductions automatically)
      const salesInserts = cart.map(item => ({
        menu_item_id: item.id,
        quantity: item.cartQty,
        total_revenue: item.selling_price * item.cartQty, // trigger will overwrite if needed
        date: new Date().toISOString().split('T')[0]
      }))

      const { data: salesLogged, error: salesErr } = await supabase
        .from('sales')
        .insert(salesInserts)
        .select()

      if (salesErr) throw salesErr

      // 2. Increment member visits if customer verified
      if (member) {
        await supabase
          .from('members')
          .update({ total_visits: (member.total_visits || 0) + 1 })
          .eq('id', member.id)
      }

      // 3. Build receipt format
      const invoiceNum = salesLogged?.[0]?.id?.split('-')?.[0]?.toUpperCase() || 'INV-' + Math.floor(Math.random() * 10000)
      const receiptData = {
        invoice_id: invoiceNum,
        date: new Date().toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US'),
        table: tableNumber || 'N/A',
        cashier: shift?.opened_by?.name || 'Cashier',
        payment: paymentMethod,
        items: cart.map(i => ({
          name: i.name,
          category: i.category,
          price: i.selling_price,
          qty: i.cartQty,
          total: i.selling_price * i.cartQty
        })),
        ...totals
      }

      setReceiptToPrint(receiptData)

      // 4. Try network direct IP printing
      try {
        await triggerNetworkPrint(receiptData)
      } catch (printErr) {
        console.warn("Direct print issue:", printErr)
      }

      addToast(t.orderPlaced, "success")
      
      // Clear Cart & Form
      setCart([])
      setTableNumber('')
      setCustomerPhone('')
      setMember(null)
      
      // Refresh inventory stock metrics
      fetchMenuAndInventory()

    } catch (e) {
      console.error(e)
      addToast("Failed to complete checkout: " + e.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Connect to Nest.js printing route
  async function triggerNetworkPrint(receipt) {
    // Generate text for cashier printer
    let cashierReceiptText = `
========================================
             CROWN COFFEE               
        Premium Coffee & Bakery         
========================================
Invoice: ${receipt.invoice_id}
Date: ${receipt.date}
Table: ${receipt.table}
Cashier: ${receipt.cashier}
----------------------------------------
Item            Qty    Price    Total
----------------------------------------
`
    receipt.items.forEach(i => {
      const paddedName = i.name.padEnd(16, ' ').slice(0, 16)
      const paddedQty = i.qty.toString().padStart(4, ' ')
      const paddedPrice = i.price.toString().padStart(8, ' ')
      const paddedTotal = i.total.toString().padStart(8, ' ')
      cashierReceiptText += `${paddedName} ${paddedQty} ${paddedPrice} ${paddedTotal}\n`
    })

    cashierReceiptText += `----------------------------------------
Subtotal:              BDT ${receipt.subtotal}
Discount:              BDT ${receipt.discountAmount}
VAT (${posSettings.vat_percent}%):               BDT ${receipt.vatAmount}
S. Charge (${posSettings.service_charge_percent}%):          BDT ${receipt.scAmount}
----------------------------------------
GRAND TOTAL:           BDT ${receipt.grandTotal}
Payment Mode:          ${receipt.payment.toUpperCase()}
========================================
      Thank you! Come back again.       
========================================\n\n\n`

    // Hit local printing bridge API
    await fetch('/api/pos/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ip: posSettings.cashier_printer_ip,
        port: posSettings.printer_port,
        data: cashierReceiptText
      })
    })
  }

  const filteredMenuItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
      {/* Standalone POS Header */}
      <nav style={{
        height: '62px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Brand logo & status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #7C3A1E 0%, #D4933A 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 8px rgba(124,58,30,0.30)'
          }}>
            <Coffee size={17} color="white" />
          </div>
          <div>
            <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>Crown Coffee POS</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {currentUser ? `${lang === 'bn' ? 'স্টাফ: ' : 'Staff: '}${currentUser}` : ''}
            </span>
          </div>
        </div>

        {/* Dashboard toggle / logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {userRole === 'admin' && (
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '10px',
                border: '1.5px solid var(--border-light)',
                background: 'var(--bg-surface)', color: 'var(--text-primary)',
                cursor: 'pointer', fontWeight: 700, fontSize: '12px',
                transition: 'all 0.2s', fontFamily: 'var(--font-sans)'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}
            >
              <LayoutDashboard size={14} />
              <span>{lang === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard'}</span>
            </button>
          )}

          <button
            onClick={() => {
              localStorage.removeItem('cc_token')
              localStorage.removeItem('cc_role')
              localStorage.removeItem('cc_staff_id')
              localStorage.removeItem('cc_staff_name')
              localStorage.removeItem('cc_username')
              router.replace('/')
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '10px',
              border: '1.5px solid var(--danger-bg)',
              background: 'var(--danger-bg)', color: 'var(--danger)',
              cursor: 'pointer', fontWeight: 700, fontSize: '12px',
              transition: 'all 0.2s', fontFamily: 'var(--font-sans)'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = 'white' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)' }}
          >
            <LogOut size={14} />
            <span>{lang === 'bn' ? 'লগআউট' : 'Logout'}</span>
          </button>
        </div>
      </nav>

      {/* Main Grid View */}
      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
        
        {/* LEFT COLUMN: Categories & Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Top Panel (Title & Status) */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1.5px solid var(--border-light)',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{t.posTitle}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.shiftStatus}:</span>
                <span style={{ 
                  background: shift ? 'var(--success-bg)' : 'var(--danger-bg)', 
                  color: shift ? 'var(--success)' : 'var(--danger)',
                  fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px'
                }}>
                  {shift ? t.shiftOpen : t.shiftClosed}
                </span>
                {shift && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>— {shift.opened_by?.name}</span>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {/* Language Toggle */}
              <button 
                onClick={() => setLang(l => l === 'en' ? 'bn' : 'en')}
                style={{
                  background: 'var(--bg-subtle)', border: '1.5px solid var(--border-light)',
                  color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '10px',
                  fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                }}
              >
                {lang === 'en' ? 'বাংলা' : 'EN'}
              </button>

              {/* Configurations button */}
              <button 
                onClick={() => setShowSettings(true)}
                style={{
                  background: 'var(--bg-subtle)', border: '1.5px solid var(--border-light)',
                  color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '10px',
                  display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                }}
              >
                <Settings size={14} />
                {lang === 'bn' ? 'সেটিংস' : 'Settings'}
              </button>

              {/* Shift Control Button */}
              {shift ? (
                <button 
                  onClick={() => setShowShiftModal(true)}
                  style={{
                    background: 'var(--danger-bg)', border: '1.5px solid var(--danger)',
                    color: 'var(--danger)', padding: '8px 14px', borderRadius: '10px',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  {t.closeShift}
                </button>
              ) : (
                <button 
                  onClick={() => setShowShiftModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-brown) 0%, var(--accent-brown-light) 100%)',
                    color: 'white', border: 'none', padding: '8px 14px', borderRadius: '10px',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-glow-brown)'
                  }}
                >
                  {t.openShift}
                </button>
              )}
            </div>
          </div>

          {/* Search bar & Category filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 42px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--border-medium)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-sans)'
                }}
              />
            </div>

            {/* Horizontal Categories */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }} className="no-scrollbar">
              <button
                onClick={() => setSelectedCategory('All')}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                  background: selectedCategory === 'All' ? 'var(--accent-brown)' : 'var(--bg-surface)',
                  color: selectedCategory === 'All' ? 'white' : 'var(--text-secondary)',
                  boxShadow: selectedCategory === 'All' ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
                  border: selectedCategory === 'All' ? 'none' : '1px solid var(--border-light)'
                }}
              >
                {t.all}
              </button>
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                    background: selectedCategory === c ? 'var(--accent-brown)' : 'var(--bg-surface)',
                    color: selectedCategory === c ? 'white' : 'var(--text-secondary)',
                    boxShadow: selectedCategory === c ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
                    border: selectedCategory === c ? 'none' : '1px solid var(--border-light)'
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items Grid */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <div className="loader" />
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
              gap: '14px' 
            }}>
              {filteredMenuItems.map(item => {
                const avail = getAvailability(item)
                const isOutOfStock = avail.status === 'out_of_stock'
                const isLowStock = avail.status === 'low_stock'

                return (
                  <div 
                    key={item.id}
                    onClick={() => !isOutOfStock && addToCart(item)}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1.5px solid var(--border-light)',
                      borderRadius: '14px',
                      padding: '16px',
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '140px',
                      position: 'relative',
                      opacity: isOutOfStock ? 0.6 : 1,
                      boxShadow: 'var(--shadow-xs)',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={e => { if (!isOutOfStock) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; } }}
                    onMouseLeave={e => { if (!isOutOfStock) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; } }}
                  >
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {item.category}
                      </span>
                      <h3 style={{ fontSize: '14px', fontWeight: 800, margin: '4px 0 0 0', color: 'var(--text-primary)', lineHeight: 1.25 }}>
                        {item.name}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '12px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-brown)' }}>
                        ৳{item.selling_price}
                      </span>

                      {/* Stock availability indicator */}
                      <span style={{ 
                        fontSize: '9.5px', fontWeight: 800, padding: '3px 6px', borderRadius: '4px',
                        background: isOutOfStock ? 'var(--danger-bg)' : isLowStock ? 'var(--warning-bg)' : 'var(--success-bg)',
                        color: isOutOfStock ? 'var(--danger)' : isLowStock ? 'var(--warning)' : 'var(--success)'
                      }}>
                        {isOutOfStock ? t.outOfStock : isLowStock ? `${t.lowStock} (${avail.qty})` : `${avail.qty} ${t.itemsLeft}`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Current Cart */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1.5px solid var(--border-light)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          height: 'fit-content',
          position: 'sticky',
          top: '80px'
        }}>
          <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 16px 0', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={18} color="var(--accent-brown)" />
            {t.cart} ({cart.length})
          </h3>

          {/* Cart Items list */}
          {cart.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 10px', color: 'var(--text-muted)', textAlign: 'center' }}>
              <ShoppingBag size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
              <p style={{ fontSize: '13px', margin: 0 }}>{t.emptyCart}</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
                {cart.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-subtle)', borderRadius: '10px', padding: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--accent-brown)', fontWeight: 600, margin: '2px 0 0 0' }}>৳{item.selling_price}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button onClick={() => updateCartQty(item.id, -1)} style={{ width: '22px', height: '22px', border: '1px solid var(--border-medium)', background: 'var(--bg-surface)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800 }}>-</button>
                      <span style={{ fontSize: '13px', fontWeight: 700, width: '20px', textAlign: 'center' }}>{item.cartQty}</span>
                      <button onClick={() => updateCartQty(item.id, 1)} style={{ width: '22px', height: '22px', border: '1px solid var(--border-medium)', background: 'var(--bg-surface)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800 }}>+</button>
                      
                      <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', marginLeft: '6px' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table # & Member Validate */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-light)', paddingTop: '14px', marginBottom: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                    placeholder={t.tableNum}
                    style={{
                      padding: '10px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                      background: 'var(--bg-base)', color: 'var(--text-primary)',
                      fontFamily: 'var(--font-sans)', fontSize: '13px', textAlign: 'center'
                    }}
                  />
                  <div style={{ position: 'relative', display: 'flex', gap: '4px' }}>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder={t.memberSearch}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-medium)',
                        background: 'var(--bg-base)', color: 'var(--text-primary)',
                        fontFamily: 'var(--font-sans)', fontSize: '13px'
                      }}
                    />
                    <button
                      onClick={handleSearchMember}
                      disabled={checkingMember}
                      style={{
                        padding: '0 12px', background: 'var(--accent-brown)', color: 'white',
                        border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700
                      }}
                    >
                      Verify
                    </button>
                  </div>
                </div>

                {member && (
                  <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Award size={14} color="var(--success)" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--success)' }}>{member.full_name} ({member.tier})</span>
                    </div>
                    <span style={{ fontSize: '11px', background: 'var(--success)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                      -{totals.discountPercent}% Off
                    </span>
                  </div>
                )}
              </div>

              {/* Pricing breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-light)', paddingTop: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t.subtotal}</span>
                  <span style={{ fontWeight: 700 }}>৳{totals.subtotal.toLocaleString()}</span>
                </div>
                {member && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                    <span>{t.memberDiscount} (-{totals.discountPercent}%)</span>
                    <span>-৳{totals.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t.vat} ({posSettings.vat_percent}%)</span>
                  <span>৳{totals.vatAmount.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t.serviceCharge} ({posSettings.service_charge_percent}%)</span>
                  <span>৳{totals.scAmount.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', borderTop: '1px dashed var(--border-medium)', paddingTop: '8px', marginTop: '4px' }}>
                  <span>{t.grandTotal}</span>
                  <span style={{ color: 'var(--accent-brown)' }}>৳{totals.grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>{t.paymentMethod}</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {['cash', 'card', 'mobile'].map(m => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      style={{
                        padding: '10px 4px', borderRadius: '8px', border: '1.5px solid var(--border-medium)',
                        background: paymentMethod === m ? 'var(--accent-brown)' : 'var(--bg-surface)',
                        color: paymentMethod === m ? 'white' : 'var(--text-secondary)',
                        fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                        borderColor: paymentMethod === m ? 'var(--accent-brown)' : 'var(--border-light)'
                      }}
                    >
                      {m === 'cash' ? t.cash : m === 'card' ? t.card : t.mobile}
                    </button>
                  ))}
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                onClick={handleCheckout}
                disabled={isSubmitting}
                style={{
                  background: 'linear-gradient(135deg, var(--accent-brown) 0%, var(--accent-brown-light) 100%)',
                  color: 'white', border: 'none', padding: '14px', borderRadius: '12px',
                  fontWeight: 800, fontSize: '14px', cursor: 'pointer', width: '100%',
                  boxShadow: 'var(--shadow-glow-brown)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <Printer size={16} />
                {isSubmitting ? 'Processing...' : t.checkout}
              </button>
            </>
          )}

        </div>

      </main>

      {/* ── MODAL: SETTINGS (Software & Hardware Setup) ── */}
      {showSettings && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'var(--bg-surface)', width: '680px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '18px', padding: '24px', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-light)' }} className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={20} color="var(--accent-brown)" />
                {t.settingsTitle}
              </h3>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Software Settings */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-brown)', marginBottom: '14px', borderBottom: '1px dashed var(--border-light)', paddingBottom: '6px' }}>
                  {t.softwareSettings}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>{t.vatPercent}</label>
                    <input type="number" value={posSettings.vat_percent} onChange={e => setPosSettings({ ...posSettings, vat_percent: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-base)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>{t.scPercent}</label>
                    <input type="number" value={posSettings.service_charge_percent} onChange={e => setPosSettings({ ...posSettings, service_charge_percent: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-base)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>{t.cafeName}</label>
                    <input type="text" value={posSettings.receipt_header_title} onChange={e => setPosSettings({ ...posSettings, receipt_header_title: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-base)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>{t.cafeSub}</label>
                    <input type="text" value={posSettings.receipt_header_subtitle} onChange={e => setPosSettings({ ...posSettings, receipt_header_subtitle: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-base)', color: 'var(--text-primary)' }} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>{t.address}</label>
                    <input type="text" value={posSettings.receipt_address} onChange={e => setPosSettings({ ...posSettings, receipt_address: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-base)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>{t.phone}</label>
                    <input type="text" value={posSettings.receipt_phone} onChange={e => setPosSettings({ ...posSettings, receipt_phone: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-base)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>{t.bin}</label>
                    <input type="text" value={posSettings.receipt_bin} onChange={e => setPosSettings({ ...posSettings, receipt_bin: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-base)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>{t.wifi}</label>
                    <input type="text" value={posSettings.receipt_wifi_pass} onChange={e => setPosSettings({ ...posSettings, receipt_wifi_pass: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-base)', color: 'var(--text-primary)' }} />
                  </div>
                </div>
              </div>

              {/* Hardware Settings */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-brown)', marginBottom: '14px', borderBottom: '1px dashed var(--border-light)', paddingBottom: '6px' }}>
                  {t.hardwareSettings}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>{t.cashierIP}</label>
                    <input type="text" value={posSettings.cashier_printer_ip} onChange={e => setPosSettings({ ...posSettings, cashier_printer_ip: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-base)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>{t.kitchenIP}</label>
                    <input type="text" value={posSettings.kitchen_printer_ip} onChange={e => setPosSettings({ ...posSettings, kitchen_printer_ip: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-base)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>{t.barIP}</label>
                    <input type="text" value={posSettings.bar_printer_ip} onChange={e => setPosSettings({ ...posSettings, bar_printer_ip: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-base)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>{t.port}</label>
                    <input type="number" value={posSettings.printer_port} onChange={e => setPosSettings({ ...posSettings, printer_port: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-base)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>{t.receiptWidth} (mm)</label>
                    <select value={posSettings.receipt_width_mm} onChange={e => setPosSettings({ ...posSettings, receipt_width_mm: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
                      <option value="80">80mm (3 Inch Standard)</option>
                      <option value="58">58mm (2 Inch Compact)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowSettings(false)} style={{ padding: '10px 16px', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1.5px solid var(--border-light)', borderRadius: '8px', cursor: 'pointer' }}>{lang === 'bn' ? 'বাতিল' : 'Cancel'}</button>
                <button type="submit" style={{ padding: '10px 20px', background: 'var(--accent-brown)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>{t.saveSettings}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: SHIFT CONTROL ── */}
      {showShiftModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1999 }}>
          <div style={{ background: 'var(--bg-surface)', width: '420px', borderRadius: '18px', padding: '24px', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-light)' }}>
            
            {!shift ? (
              /* OPEN SHIFT FORM */
              <form onSubmit={handleOpenShift} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 10px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={18} color="var(--accent-brown)" />
                  {t.openShift}
                </h3>
                
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>{t.selectStaffMember}</label>
                  <select 
                    value={selectedStaff}
                    onChange={e => setSelectedStaff(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                  >
                    <option value="">-- {t.selectStaffMember} --</option>
                    {staffList.map(st => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>{t.openingFloatLabel}</label>
                  <input
                    type="number"
                    value={openingFloat}
                    onChange={e => setOpeningFloat(e.target.value)}
                    placeholder={t.openingFloatPlaceholder}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                  />
                </div>

                <button type="submit" style={{ width: '100%', padding: '12px', background: 'var(--accent-brown)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', marginTop: '10px' }}>
                  {t.openShift}
                </button>
              </form>
            ) : (
              /* CLOSE SHIFT FORM */
              <form onSubmit={handleCloseShift} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 10px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Unlock size={18} color="var(--danger)" />
                  {t.closeShiftTitle}
                </h3>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>{t.closingCashLabel}</label>
                  <input
                    type="number"
                    value={closingCash}
                    onChange={e => setClosingCash(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>{t.actualCashLabel}</label>
                  <input
                    type="number"
                    value={actualCash}
                    onChange={e => setActualCash(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>{t.notes}</label>
                  <textarea
                    value={shiftNotes}
                    onChange={e => setShiftNotes(e.target.value)}
                    rows={3}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-base)', color: 'var(--text-primary)', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setShowShiftModal(false)} style={{ flex: 1, padding: '10px', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1.5px solid var(--border-light)', borderRadius: '8px', cursor: 'pointer' }}>{t.cancel}</button>
                  <button type="submit" style={{ flex: 1, padding: '10px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>{t.submit}</button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ── PRINT MODAL / HTML PREVIEW ── */}
      {receiptToPrint && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, overflowY: 'auto', padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '380px', width: '100%' }}>
            
            {/* The thermal receipt content */}
            <div id="thermal-receipt" className="receipt-print-area" style={{
              background: 'white',
              color: 'black',
              padding: '24px',
              fontFamily: 'monospace',
              fontSize: '12.5px',
              lineHeight: 1.5,
              borderRadius: '12px',
              boxShadow: 'var(--shadow-lg)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px 0' }}>☕ {posSettings.receipt_header_title}</h2>
                <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: '#555' }}>{posSettings.receipt_header_subtitle}</p>
                <p style={{ margin: 0, fontSize: '10px', color: '#777' }}>{posSettings.receipt_address}</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#777' }}>Phone: {posSettings.receipt_phone}</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#777' }}>BIN: {posSettings.receipt_bin}</p>
              </div>

              <div style={{ borderTop: '1px dashed black', borderBottom: '1px dashed black', padding: '8px 0', marginBottom: '14px' }}>
                <p style={{ margin: '0 0 4px 0' }}><strong>Invoice:</strong> {receiptToPrint.invoice_id}</p>
                <p style={{ margin: '0 0 4px 0' }}><strong>Date:</strong> {receiptToPrint.date}</p>
                <p style={{ margin: '0 0 4px 0' }}><strong>Table:</strong> {receiptToPrint.table}</p>
                <p style={{ margin: '0' }}><strong>Cashier:</strong> {receiptToPrint.cashier}</p>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid black' }}>
                    <th style={{ textAlign: 'left', paddingBottom: '4px' }}>Item</th>
                    <th style={{ textAlign: 'center', paddingBottom: '4px' }}>Qty</th>
                    <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptToPrint.items.map((i, idx) => (
                    <tr key={idx}>
                      <td style={{ paddingTop: '6px', verticalAlign: 'top' }}>{i.name}</td>
                      <td style={{ textAlign: 'center', paddingTop: '6px', verticalAlign: 'top' }}>{i.qty}</td>
                      <td style={{ textAlign: 'right', paddingTop: '6px', verticalAlign: 'top' }}>৳{i.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ borderTop: '1px dashed black', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>৳{receiptToPrint.subtotal}</span>
                </div>
                {receiptToPrint.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>Discount:</span>
                    <span>-৳{receiptToPrint.discountAmount}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>VAT (${posSettings.vat_percent}%):</span>
                  <span>৳{receiptToPrint.vatAmount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Service Charge (${posSettings.service_charge_percent}%):</span>
                  <span>৳{receiptToPrint.scAmount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 'bold', borderTop: '1px solid black', paddingTop: '6px', marginTop: '4px' }}>
                  <span>GRAND TOTAL:</span>
                  <span>৳{receiptToPrint.grandTotal}</span>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed black', marginTop: '14px', paddingTop: '10px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', fontSize: '10px', marginBottom: '8px' }}>
                  <Wifi size={11} />
                  <span>Wi-Fi: {posSettings.receipt_wifi_pass}</span>
                </div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Thank you! Come back again.</p>
              </div>
            </div>

            {/* Print controller buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => window.print()}
                style={{
                  background: 'var(--success)', color: 'white', border: 'none', padding: '12px',
                  borderRadius: '10px', fontWeight: 700, cursor: 'pointer'
                }}
              >
                {t.printPreview}
              </button>
              <button
                onClick={() => setReceiptToPrint(null)}
                style={{
                  background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1.5px solid var(--border-light)',
                  padding: '10px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer'
                }}
              >
                {t.printClose}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Styled css print layout overrides */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt, #thermal-receipt * {
            visibility: visible;
          }
          #thermal-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: ${posSettings.receipt_width_mm === '80' ? '80mm' : '58mm'};
            margin: 0;
            padding: 0;
            box-shadow: none;
            border: none;
          }
        }
      `}</style>

    </div>
  )
}

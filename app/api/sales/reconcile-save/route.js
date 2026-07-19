import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function POST(request) {
  try {
    const auditData = await request.json()
    const {
      date = new Date().toISOString().split('T')[0],
      openingCash = 0,
      posTotalSales = 0,
      posCashSales = 0,
      posCardSales = 0,
      foodpandaDeclared = 0,
      foodpandaPortalTotal = 0,
      pathaoDeclared = 0,
      pathaoPortalTotal = 0,
      bazarExpenseTotal = 0,
      bazarReceipts = [],
      actualCashSubmitted = 0,
      expectedCash = 0,
      cashShortage = 0,
      status = 'PENDING',
      notes = '',
      approvedBy = 'Admin'
    } = auditData

    // 1. Insert into daily_reconciliations
    const { data: recData, error: recError } = await supabase
      .from('daily_reconciliations')
      .insert({
        date,
        opening_cash: openingCash,
        pos_total_sales: posTotalSales,
        pos_cash_sales: posCashSales,
        pos_card_sales: posCardSales,
        foodpanda_declared: foodpandaDeclared,
        foodpanda_portal_total: foodpandaPortalTotal,
        pathao_declared: pathaoDeclared,
        pathao_portal_total: pathaoPortalTotal,
        bazar_expense_total: bazarExpenseTotal,
        bazar_receipts_count: bazarReceipts.length,
        actual_cash_submitted: actualCashSubmitted,
        expected_cash: expectedCash,
        cash_shortage: cashShortage,
        status: status === 'MATCHED' ? 'APPROVED' : status,
        notes,
        approved_by: approvedBy,
        approved_at: new Date().toISOString()
      })
      .select()
      .single()

    if (recError) {
      console.error('Supabase reconciliation insert error:', recError)
      throw recError
    }

    const reconciliationId = recData.id

    // 2. Insert verified receipts if any
    if (bazarReceipts.length > 0) {
      const receiptRows = bazarReceipts.map(r => ({
        reconciliation_id: reconciliationId,
        vendor_name: r.vendor || 'Bazaar Vendor',
        extracted_total: Number(r.total || 0),
        line_items: r.items || [],
        is_approved: true
      }))

      const { error: rcptError } = await supabase
        .from('bazar_verified_receipts')
        .insert(receiptRows)

      if (rcptError) {
        console.error('Bazar receipts insert error:', rcptError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Daily Sales Audit & Reconciliation saved successfully!',
      reconciliationId
    })
  } catch (err) {
    console.error('Reconcile Save error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to save reconciliation log.' },
      { status: 500 }
    )
  }
}
